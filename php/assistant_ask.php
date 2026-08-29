<?php
declare(strict_types=1);

session_start();

require_once __DIR__ . '/security.php';
setSecurityHeaders();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Non authentifié']);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Méthode non autorisée.']);
    exit();
}

$body     = json_decode(file_get_contents('php://input'), true) ?? [];
$question = trim($body['question'] ?? '');

if (empty($question)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Question vide.']);
    exit();
}

require_once __DIR__ . '/assistant_config.php';

$mistralKey = MISTRAL_API_KEY;
if (empty($mistralKey)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Clé API Mistral manquante.']);
    exit();
}

require_once __DIR__ . '/db.php';

// Récupérer le stock actuel pour le contexte IA
$stockContext = '';
try {
    $stockStmt = $pdo->query("
        SELECT material, supplier, category, stock, threshold, price,
               CASE
                   WHEN stock = 0 THEN 'Rupture'
                   WHEN stock < threshold THEN 'Stock faible'
                   ELSE 'Disponible'
               END as statut
        FROM inventory
        ORDER BY supplier, material
        LIMIT 200
    ");
    $stockItems = $stockStmt->fetchAll(PDO::FETCH_ASSOC);
    if (!empty($stockItems)) {
        $stockContext = "\n\nSTOCK ACTUEL DE L'ENTREPRISE (mis à jour en temps réel) :\n";
        foreach ($stockItems as $si) {
            $prix = $si['price'] ? number_format((float)$si['price'], 2, '.', '') . ' €' : 'N/A';
            $stockContext .= "- {$si['material']} (Fournisseur: {$si['supplier']}, Catégorie: {$si['category']}): {$si['stock']} en stock (seuil: {$si['threshold']}, prix: {$prix}) — {$si['statut']}\n";
        }
    }
} catch (\Exception $e) {
    // Silently fail if stock query fails
    $stockContext = '';
}

try {
    $count = (int) $pdo->query('SELECT COUNT(*) FROM assistant_chunks')->fetchColumn();
} catch (\PDOException $e) {
    $count = 0;
}

if ($count === 0) {
    echo json_encode([
        'success' => true,
        'answer'  => "Aucun document n'est encore indexé. Cliquez sur \"Gérer\" dans la sidebar pour uploader vos premières fiches techniques PDF.",
        'sources' => [],
    ]);
    exit();
}

function callMistral(string $endpoint, array $payload, string $apiKey): array {
    $ch = curl_init('https://api.mistral.ai/v1/' . $endpoint);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $apiKey,
        ],
        CURLOPT_POSTFIELDS        => json_encode($payload),
        CURLOPT_TIMEOUT           => 30,
        CURLOPT_CONNECTTIMEOUT    => 15,
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($httpCode !== 200) {
        throw new \RuntimeException('Erreur Mistral (HTTP ' . $httpCode . '): ' . $response);
    }
    return json_decode($response, true) ?? [];
}

try {
    $embResp = callMistral('embeddings', [
        'model' => 'mistral-embed',
        'input' => [$question],
    ], $mistralKey);
} catch (\RuntimeException $e) {
    http_response_code(502);
    echo json_encode(['success' => false, 'message' => 'Erreur vectorisation : ' . $e->getMessage()]);
    exit();
}

$questionVec = $embResp['data'][0]['embedding'] ?? null;
if (!$questionVec) {
    http_response_code(502);
    echo json_encode(['success' => false, 'message' => 'Impossible de vectoriser la question.']);
    exit();
}

$stmt = $pdo->query(
    'SELECT c.id, c.text, c.embedding, d.name AS doc_name, d.category, d.file_path
     FROM assistant_chunks c
     JOIN assistant_documents d ON d.id = c.doc_id'
);
$allChunks = $stmt->fetchAll(PDO::FETCH_ASSOC);

function cosineSimilarity(array $a, array $b): float {
    $dot = 0.0; $na = 0.0; $nb = 0.0;
    $len = min(count($a), count($b));
    for ($i = 0; $i < $len; $i++) {
        $dot += $a[$i] * $b[$i];
        $na  += $a[$i] * $a[$i];
        $nb  += $b[$i] * $b[$i];
    }
    if ($na == 0 || $nb == 0) return 0.0;
    return $dot / (sqrt($na) * sqrt($nb));
}

$scored = [];
foreach ($allChunks as $chunk) {
    $emb = json_decode($chunk['embedding'], true);
    if (empty($emb)) continue;
    $scored[] = [
        'score'     => cosineSimilarity($questionVec, $emb),
        'text'      => $chunk['text'],
        'doc_name'  => $chunk['doc_name'],
        'category'  => $chunk['category'],
        'file_path' => $chunk['file_path'] ?? null,
    ];
}

usort($scored, fn($a, $b) => $b['score'] <=> $a['score']);

$topChunks = array_filter(array_slice($scored, 0, 3), fn($c) => $c['score'] > 0.40);

if (empty($topChunks)) {
    echo json_encode([
        'success' => true,
        'answer'  => "Je n'ai pas trouvé d'information pertinente dans les documents disponibles pour répondre à cette question. Vérifiez que la fiche technique correspondante est bien indexée.",
        'sources' => [],
    ]);
    exit();
}

$context = '';
$sources = [];

foreach ($topChunks as $chunk) {
    $context .= "--- Extrait de : " . $chunk['doc_name'] . " (" . $chunk['category'] . ") ---\n";
    $context .= $chunk['text'] . "\n\n";
    if (!array_key_exists($chunk['doc_name'], $sources)) {
        $sources[$chunk['doc_name']] = $chunk['file_path'];
    }
}

$systemPrompt = <<<PROMPT
Tu es un assistant technique interne pour Hello Fermetures, expert sur l'ensemble des gammes de produits suivantes :

OUVERTURES
- Fenêtres (PVC, aluminium, bois — simple, double et triple vitrage)
- Portes d'entrée (PVC, alu, bois, acier — sécurité, isolation thermique)
- Portes d'intérieur (bloc-porte, huisserie, quincaillerie)
- Portes de garage (sectionnelle, basculante, enroulable, coulissante, motorisation)

VOLETS
- Volets roulants (coffre monobloc, rénovation, tunnel — motorisés ou manuels)
- Volets battants (PVC, alu, bois — persiennes, persiennées, pleins)

EXTÉRIEUR
- Portails (battant, coulissant, autoportant — alu, acier, PVC)
- Pergolas (bioclimatique, adossée, autoportante — lames orientables)
- Clôtures (panneaux rigides, ganivelles, grillage souple, occultant)
- Vérandas (alu, acier, PVC — toiture plate, voûte, asymétrique)
- Carports (1 pente, 2 pentes, plat — alu, acier)
- Garde-corps (intérieur, extérieur, terrasse, escalier — alu, inox, verre)

PROTECTION SOLAIRE & CONFORT
- Stores intérieurs (vénitien, enrouleur, jour-nuit, plissé, cellulaire)
- Stores bannes (coffre intégré, bras articulés, vertical, zip — toile, lame)
- Moustiquaires (enroulable, plissée, fixe, galandage)

DOMOTIQUE & MOTORISATIONS
- Domotique Somfy (protocoles io-homecontrol, RTS, TaHoma, Connexoon)
- Motorisations (volets, portails, stores, pergolas — filaire, radio, solaire)

Tu réponds en français, de façon claire et structurée.
Utilise des listes numérotées pour les procédures de pose ou de réglage.
Utilise des listes à puces pour les caractéristiques ou options.
Cite toujours la source entre crochets à la fin de ta réponse.
Si la réponse n'est pas dans les extraits fournis, dis-le clairement — ne l'invente jamais.

Quand on te pose une question sur le stock, les quantités disponibles, les ruptures ou les prix, utilise les données de stock fournies ci-dessous pour répondre directement et précisément — pas besoin de consulter les fiches techniques dans ce cas.
PROMPT;

$systemPrompt .= $stockContext;

$userPrompt = "Extraits de fiches techniques internes :\n\n" . $context . "\n---\n\nQuestion : " . $question;

try {
    $chatResp = callMistral('chat/completions', [
        'model'       => 'mistral-small-latest',
        'messages'    => [
            ['role' => 'system', 'content' => $systemPrompt],
            ['role' => 'user',   'content' => $userPrompt],
        ],
        'temperature' => 0.2,
        'max_tokens'  => 600,
    ], $mistralKey);
} catch (\RuntimeException $e) {
    http_response_code(502);
    echo json_encode(['success' => false, 'message' => 'Erreur génération réponse : ' . $e->getMessage()]);
    exit();
}

$answer = $chatResp['choices'][0]['message']['content'] ?? 'Aucune réponse générée.';

$sourcesOut = [];
foreach ($sources as $name => $filePath) {
    $sourcesOut[] = [
        'name'      => $name,
        'file_path' => $filePath,
    ];
}

echo json_encode([
    'success' => true,
    'answer'  => $answer,
    'sources' => $sourcesOut,
], JSON_UNESCAPED_UNICODE);
