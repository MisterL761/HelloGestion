<?php
session_start();

ini_set('display_errors', 0);
error_reporting(E_ALL);

require_once __DIR__ . '/security.php';
setSecurityHeaders();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(0); }

ob_start();

// Appel API Mistral (même pattern local que assistant_ask.php / verify.php)
function courrierCallMistral(array $payload): array {
    $ch = curl_init('https://api.mistral.ai/v1/chat/completions');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . MISTRAL_API_KEY,
        ],
        CURLOPT_POSTFIELDS     => json_encode($payload),
        CURLOPT_TIMEOUT        => 40,
        CURLOPT_CONNECTTIMEOUT => 15,
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($httpCode !== 200) {
        throw new RuntimeException('Erreur Mistral (HTTP ' . $httpCode . ')');
    }
    return json_decode($response, true) ?? [];
}

try {
    require 'db.php';
    require_once __DIR__ . '/roles.php';

    // Courriers : rôles rédaction (tous les internes sauf poseur)
    $user = requireRole(['admin', 'gerant', 'administration', 'chef_equipe', 'commercial']);

    header('Content-Type: application/json; charset=utf-8');

    $method = $_SERVER['REQUEST_METHOD'];
    $action = $_GET['action'] ?? '';

    $TYPES_COURRIER = ['simple','recommande','recommande_ar','client','fournisseur','administratif','mise_en_demeure','relance','sav','autre'];
    $TONS           = ['simple','professionnel','ferme','commercial','administratif'];
    $TYPE_LABELS    = [
        'simple' => 'Courrier simple', 'recommande' => 'Lettre recommandée',
        'recommande_ar' => 'Lettre recommandée avec accusé de réception',
        'client' => 'Courrier client', 'fournisseur' => 'Courrier fournisseur',
        'administratif' => 'Courrier administratif', 'mise_en_demeure' => 'Mise en demeure',
        'relance' => 'Relance', 'sav' => 'Courrier SAV', 'autre' => 'Autre',
    ];

    // ── POST ?action=reformuler : brouillon → corps propre ────
    if ($method === 'POST' && $action === 'reformuler') {
        $input     = json_decode(file_get_contents('php://input'), true) ?? [];
        $brouillon = trim($input['brouillon'] ?? '');
        $ton       = in_array($input['ton'] ?? '', $TONS, true) ? $input['ton'] : 'professionnel';
        $type      = in_array($input['type_courrier'] ?? '', $TYPES_COURRIER, true) ? $input['type_courrier'] : 'simple';
        $objet     = trim($input['objet'] ?? '');
        $reference = trim($input['reference'] ?? '');
        $contact   = is_array($input['contact'] ?? null) ? $input['contact'] : null;

        if ($brouillon === '') throw new Exception('Brouillon vide');
        if (mb_strlen($brouillon) > 8000) throw new Exception('Brouillon trop long (8000 caractères max)');

        $dest = 'Non précisé';
        if ($contact) {
            $parts = array_filter([
                trim(($contact['civilite'] ?? '') . ' ' . ($contact['prenom'] ?? '') . ' ' . ($contact['nom'] ?? '')),
                ($contact['societe'] ?? '') !== '' ? 'Société : ' . $contact['societe'] : '',
                ($contact['type'] ?? '') !== '' ? 'Catégorie : ' . $contact['type'] : '',
            ]);
            if ($parts) $dest = implode(' — ', $parts);
        }

        $systemPrompt = <<<PROMPT
Tu es l'assistant de rédaction de courriers de l'entreprise Hello Fermetures (menuiserie : fenêtres, volets, portails, pergolas, stores).
On te donne un brouillon dicté ou tapé rapidement, parfois mal formulé. Tu le transformes en corps de courrier professionnel, en français irréprochable.

Règles impératives :
- Tu renvoies UNIQUEMENT le corps du courrier : commence par la formule d'appel (« Madame, Monsieur, », « Madame, », « Monsieur, »… adaptée au destinataire) et termine par la formule de politesse.
- N'ajoute NI en-tête, NI adresse, NI date, NI objet, NI signature, NI mention de pièce jointe : uniquement le texte du courrier.
- Conserve tous les faits, montants, dates et références du brouillon. N'invente aucune information.
- Structure en paragraphes courts, séparés par une ligne vide.
- Adapte le contenu au type de courrier : une mise en demeure rappelle les faits, formule une exigence précise et fixe un délai ; une relance rappelle la demande initiale et sollicite une réponse ; un courrier SAV est factuel et rassurant.
- Respecte le ton demandé : simple (phrases courtes, accessibles), professionnel (neutre et soigné), ferme (sans agressivité mais sans ambiguïté), commercial (chaleureux, orienté relation client), administratif (formel et précis).
PROMPT;

        $userPrompt = "Destinataire : {$dest}\n"
            . "Type de courrier : {$TYPE_LABELS[$type]}\n"
            . "Ton souhaité : {$ton}\n"
            . ($objet !== '' ? "Objet : {$objet}\n" : '')
            . ($reference !== '' ? "Référence dossier : {$reference}\n" : '')
            . "\nBrouillon :\n{$brouillon}";

        $resp = courrierCallMistral([
            'model'       => 'mistral-small-latest',
            'messages'    => [
                ['role' => 'system', 'content' => $systemPrompt],
                ['role' => 'user',   'content' => $userPrompt],
            ],
            'temperature' => 0.4,
            'max_tokens'  => 1200,
        ]);
        $corps = trim($resp['choices'][0]['message']['content'] ?? '');
        if ($corps === '') throw new Exception('Aucun texte généré, réessayez');

        ob_end_clean();
        echo json_encode(['success' => true, 'corps' => $corps], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // ── CRUD ──────────────────────────────────────────────────
    switch ($method) {

        case 'GET':
            if (!empty($_GET['id'])) {
                $stmt = $pdo->prepare("
                    SELECT c.*, u.name AS created_by_name
                    FROM courriers c LEFT JOIN users u ON u.id = c.created_by
                    WHERE c.id = ?
                ");
                $stmt->execute([intval($_GET['id'])]);
                $courrier = $stmt->fetch();
                if (!$courrier) throw new Exception('Courrier introuvable');
                ob_end_clean();
                echo json_encode(['success' => true, 'data' => $courrier], JSON_UNESCAPED_UNICODE);
                break;
            }
            $contactId = intval($_GET['contact_id'] ?? 0);
            if (!$contactId) throw new Exception('contact_id manquant');
            $stmt = $pdo->prepare("
                SELECT c.*, u.name AS created_by_name
                FROM courriers c LEFT JOIN users u ON u.id = c.created_by
                WHERE c.contact_id = ?
                ORDER BY c.created_at DESC
            ");
            $stmt->execute([$contactId]);
            ob_end_clean();
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll()], JSON_UNESCAPED_UNICODE);
            break;

        case 'POST':
        case 'PUT':
            $input = json_decode(file_get_contents('php://input'), true) ?? [];
            $contactId = intval($input['contact_id'] ?? 0);
            $objet     = trim(strip_tags($input['objet'] ?? ''));
            $type      = $input['type_courrier'] ?? 'simple';
            $ton       = $input['ton'] ?? 'professionnel';
            $reference = trim(strip_tags($input['reference'] ?? ''));
            $brouillon = trim($input['brouillon'] ?? '');
            $corps     = trim($input['corps'] ?? '');

            if (!$contactId) throw new Exception('Destinataire manquant');
            if ($objet === '') throw new Exception('Objet manquant');
            if ($corps === '') throw new Exception('Le courrier est vide');
            if (!in_array($type, $TYPES_COURRIER, true)) throw new Exception('Type de courrier invalide');
            if (!in_array($ton, $TONS, true)) throw new Exception('Ton invalide');

            $check = $pdo->prepare("SELECT id FROM courrier_contacts WHERE id = ?");
            $check->execute([$contactId]);
            if (!$check->fetch()) throw new Exception('Interlocuteur introuvable');

            if ($method === 'POST') {
                $stmt = $pdo->prepare("
                    INSERT INTO courriers (contact_id, reference, objet, type_courrier, ton, brouillon, corps, created_by)
                    VALUES (?,?,?,?,?,?,?,?)
                ");
                $stmt->execute([$contactId, $reference, $objet, $type, $ton, $brouillon, $corps, intval($user['id'] ?? 0) ?: null]);
                $id = intval($pdo->lastInsertId());
            } else {
                $id = intval($input['id'] ?? 0);
                if (!$id) throw new Exception('ID manquant');
                $stmt = $pdo->prepare("
                    UPDATE courriers SET contact_id=?, reference=?, objet=?, type_courrier=?, ton=?, brouillon=?, corps=?
                    WHERE id=?
                ");
                $stmt->execute([$contactId, $reference, $objet, $type, $ton, $brouillon, $corps, $id]);
            }
            $stmt = $pdo->prepare("
                SELECT c.*, u.name AS created_by_name
                FROM courriers c LEFT JOIN users u ON u.id = c.created_by
                WHERE c.id = ?
            ");
            $stmt->execute([$id]);
            ob_end_clean();
            echo json_encode(['success' => true, 'data' => $stmt->fetch()], JSON_UNESCAPED_UNICODE);
            break;

        case 'DELETE':
            requireRole(['admin', 'gerant']);
            $id = intval($_GET['id'] ?? 0);
            if (!$id) throw new Exception('ID manquant');
            $pdo->prepare("DELETE FROM courriers WHERE id = ?")->execute([$id]);
            ob_end_clean();
            echo json_encode(['success' => true]);
            break;

        default:
            throw new Exception('Méthode non supportée');
    }
} catch (RuntimeException $e) {
    ob_end_clean();
    http_response_code(502);
    echo json_encode(['success' => false, 'message' => 'Reformulation indisponible : ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    ob_end_clean();
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
