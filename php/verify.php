<?php
declare(strict_types=1);

session_start();

if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Non authentifié.']);
    exit();
}

require_once __DIR__ . '/security.php';
setSecurityHeaders();

require_once __DIR__ . '/assistant_config.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Méthode non autorisée.']);
    exit();
}

$mistralApiKey = defined('MISTRAL_API_KEY') ? MISTRAL_API_KEY : '';
if (empty($mistralApiKey)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Configuration serveur manquante (MISTRAL_API_KEY).']);
    exit();
}

$allLabels = [
    'devis' => 'Devis',
    'arc'   => 'ARC Fournisseur',
    'bon'   => 'Bon de Commande',
];

$presentFields = [];
foreach (array_keys($allLabels) as $field) {
    if (isset($_FILES[$field]) && $_FILES[$field]['error'] === UPLOAD_ERR_OK) {
        $presentFields[] = $field;
    }
}

if (count($presentFields) < 2) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Veuillez fournir au moins 2 documents à comparer (Devis, ARC ou Bon de Commande).'
    ]);
    exit();
}

$labels = array_intersect_key($allLabels, array_flip($presentFields));

$maxSize = 10 * 1024 * 1024;
foreach ($presentFields as $field) {
    $file = $_FILES[$field];

    if ($file['size'] > $maxSize) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => "Le fichier \"{$labels[$field]}\" dépasse 10 Mo."
        ]);
        exit();
    }

    $handle = fopen($file['tmp_name'], 'rb');
    $magic  = fread($handle, 4);
    fclose($handle);

    if ($magic !== '%PDF') {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => "Le fichier \"{$labels[$field]}\" n'est pas un PDF valide."
        ]);
        exit();
    }
}

// Extraction du texte via Mistral OCR (pas de dépendance Composer)
$extractedTexts = [];
foreach ($presentFields as $field) {
    $tmpPath   = $_FILES[$field]['tmp_name'];
    $rawBytes  = file_get_contents($tmpPath);

    if ($rawBytes === false || strlen($rawBytes) === 0) {
        http_response_code(422);
        echo json_encode([
            'success' => false,
            'message' => "Impossible de lire le fichier \"{$labels[$field]}\"."
        ]);
        exit();
    }

    $base64 = base64_encode($rawBytes);
    unset($rawBytes);

    $text = callMistralOcr($mistralApiKey, $base64);

    if ($text === null || mb_strlen(trim($text)) < 20) {
        http_response_code(422);
        echo json_encode([
            'success' => false,
            'message' => "Impossible d'extraire le texte du fichier \"{$labels[$field]}\". "
                . "Vérifiez que le PDF n'est pas protégé ou corrompu."
        ]);
        exit();
    }

    $extractedTexts[$field] = $text;
    unset($base64, $text);
}

// Nettoyage des fichiers temporaires
foreach ($presentFields as $field) {
    $tmp = $_FILES[$field]['tmp_name'];
    if (file_exists($tmp)) unlink($tmp);
}

$result = callMistralApi($mistralApiKey, $extractedTexts, $labels);
unset($extractedTexts);

if ($result === null) {
    http_response_code(502);
    echo json_encode([
        'success' => false,
        'message' => $GLOBALS['lastMistralError'] ?? "Erreur lors de la communication avec l'IA Mistral."
    ]);
    exit();
}

echo json_encode(['success' => true, 'result' => $result], JSON_UNESCAPED_UNICODE);
exit();

// ── OCR via Mistral ──────────────────────────────────────────

function callMistralOcr(string $apiKey, string $base64Pdf): ?string
{
    $payload = json_encode([
        'model'    => 'mistral-ocr-latest',
        'document' => [
            'type'         => 'document_url',
            'document_url' => 'data:application/pdf;base64,' . $base64Pdf,
        ],
    ]);

    $url = 'https://api.mistral.ai/v1/ocr';

    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $payload,
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $apiKey,
            ],
            CURLOPT_TIMEOUT        => 120,
            CURLOPT_CONNECTTIMEOUT => 15,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($response !== false && $httpCode === 200) {
            return parseOcrResponse($response);
        }
    }

    if (ini_get('allow_url_fopen')) {
        $context = stream_context_create([
            'http' => [
                'method'  => 'POST',
                'header'  => "Content-Type: application/json\r\nAuthorization: Bearer {$apiKey}\r\nContent-Length: " . strlen($payload),
                'content' => $payload,
                'timeout' => 120,
                'ignore_errors' => true,
            ],
        ]);
        $response = @file_get_contents($url, false, $context);
        if ($response !== false) {
            $code = 0;
            if (isset($http_response_header)) {
                preg_match('#HTTP/\d\.\d\s+(\d+)#', $http_response_header[0], $m);
                $code = (int)($m[1] ?? 0);
            }
            if ($code === 200) return parseOcrResponse($response);
        }
    }

    return null;
}

function parseOcrResponse(string $response): ?string
{
    $decoded = json_decode($response, true);
    $pages   = $decoded['pages'] ?? [];
    $full    = '';
    foreach ($pages as $page) {
        $full .= ($page['markdown'] ?? '') . "\n\n";
    }
    $full = trim($full);
    return $full !== '' ? $full : null;
}

// ── Comparaison via agent Mistral ────────────────────────────

function callMistralApi(
    string $apiKey,
    array  $texts,
    array  $labels
): ?array {
    $prompt   = buildComparisonPrompt($texts, $labels);
    $messages = [['role' => 'user', 'content' => $prompt]];

    $payload = json_encode([
        'agent_id'        => 'ag_019c71413e63706ea606fe6c4d20ee0f',
        'messages'        => $messages,
        'response_format' => ['type' => 'json_object'],
    ]);

    if ($payload === false) {
        $GLOBALS['lastMistralError'] = "Impossible d'encoder le contenu des documents.";
        return null;
    }

    $url = 'https://api.mistral.ai/v1/agents/completions';

    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $payload,
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $apiKey,
            ],
            CURLOPT_TIMEOUT        => 120,
            CURLOPT_CONNECTTIMEOUT => 15,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($response !== false && $httpCode === 200) {
            return parseResponse($response);
        }

        if ($response === false) {
            $GLOBALS['lastMistralError'] = "cURL échoue : {$curlError}. Connexions sortantes peut-être bloquées par l'hébergeur.";
        } else {
            $body   = json_decode($response, true);
            $detail = $body['message'] ?? $body['error']['message'] ?? "HTTP {$httpCode}";
            $GLOBALS['lastMistralError'] = "Mistral a répondu HTTP {$httpCode} : {$detail}";
        }
    }

    if (ini_get('allow_url_fopen')) {
        $context = stream_context_create([
            'http' => [
                'method'  => 'POST',
                'header'  => implode("\r\n", [
                    'Content-Type: application/json',
                    'Authorization: Bearer ' . $apiKey,
                    'Content-Length: ' . strlen($payload),
                ]),
                'content' => $payload,
                'timeout' => 120,
                'ignore_errors' => true,
            ],
        ]);

        $response = @file_get_contents($url, false, $context);

        if ($response !== false) {
            $httpCode = 0;
            if (isset($http_response_header)) {
                preg_match('#HTTP/\d\.\d\s+(\d+)#', $http_response_header[0], $m);
                $httpCode = (int)($m[1] ?? 0);
            }
            if ($httpCode === 200) return parseResponse($response);

            $body   = json_decode($response, true);
            $detail = $body['message'] ?? $body['error']['message'] ?? "HTTP {$httpCode}";
            $GLOBALS['lastMistralError'] = "Mistral a répondu HTTP {$httpCode} : {$detail}";
            return null;
        }

        $GLOBALS['lastMistralError'] = "Impossible de contacter api.mistral.ai. Vérifiez que votre hébergeur autorise les connexions sortantes HTTPS.";
    } else {
        $GLOBALS['lastMistralError'] = "cURL et allow_url_fopen sont désactivés sur ce serveur. Contactez votre hébergeur.";
    }

    return null;
}

function parseResponse(string $response): ?array
{
    $decoded = json_decode($response, true);
    $content = $decoded['choices'][0]['message']['content'] ?? null;

    if ($content === null) return null;

    $cleaned = trim($content);
    $cleaned = preg_replace('/^```json\s*/i', '', $cleaned);
    $cleaned = preg_replace('/^```\s*/i', '', $cleaned);
    $cleaned = preg_replace('/\s*```\s*$/i', '', $cleaned);
    $cleaned = trim($cleaned);

    if (!str_starts_with($cleaned, '{')) {
        preg_match('/\{.*\}/s', $cleaned, $matches);
        $cleaned = $matches[0] ?? $cleaned;
    }

    $parsed = json_decode($cleaned, true);

    if (json_last_error() === JSON_ERROR_NONE && is_array($parsed)) {
        return $parsed;
    }

    return [
        'statut'           => 'INDETERMINE',
        'statut_libelle'   => 'Analyse disponible',
        'anomalies'        => [],
        'points_conformes' => [],
        'recommandations'  => '',
        'rapport_detaille' => $content,
    ];
}

function buildComparisonPrompt(array $texts, array $labels): string
{
    $docSections = '';
    foreach ($texts as $field => $text) {
        $label        = $labels[$field] ?? $field;
        $docSections .= "\n\n=== {$label} ===\n" . substr($text, 0, 6000);
    }

    $hasDevis = isset($texts['devis']);
    $hasArc   = isset($texts['arc']);
    $hasBon   = isset($texts['bon']);

    if (!$hasDevis && $hasArc && $hasBon) {
        $reglePrix = "BC et ARC sont tous deux au prix ACHAT fournisseur : les écarts de prix BC↔ARC sont de vraies anomalies. Si prix absent sur BC → pas une erreur.";
    } else {
        $reglePrix = "Le Devis est au prix de VENTE (avec marge). L'ARC/BC est au prix d'ACHAT. L'écart de prix Devis↔ARC/BC est NORMAL et ne doit JAMAIS être signalé. Si prix absent sur BC → pas une erreur.";
    }

    return <<<PROMPT
Tu es un expert contrôle qualité pour un revendeur de menuiseries/fermetures (fenêtres, portes, volets, portails, stores, pergolas, vérandas).

Documents à comparer (même commande) :
{$docSections}

RÈGLES STRICTES :
1. PRIX : {$reglePrix}
2. DIMENSIONS : Les cotes "Tableau" (Devis) sont l'ouverture dans le mur. Les cotes "Hors tout/Fabrication" (ARC) incluent le cadre/ailes → plus grandes. Écart Tableau vs HT = NORMAL, ne jamais signaler.
3. DATES : Date du Devis ≠ date de livraison ARC. NORMAL, ne jamais signaler.
4. ADRESSE : ARC livre au dépôt, Devis indique le chantier client. NORMAL. Anomalie uniquement si adresse ARC ≠ adresse demandée sur BC.
5. ÉQUIVALENCES : "Gris Anthracite" = "RAL 7016", etc. Ne pas signaler si c'est la même chose exprimée différemment.
6. BICOLORATION : Si Devis/BC indique 2 couleurs et ARC n'en indique qu'une seule → anomalie CRITIQUE.

Vérifie méthodiquement : couleurs/RAL, dimensions, quantités, références, options, motorisation, vitrage, pose, toile.
Sois télégraphique. Valeur absente = null.

Réponds UNIQUEMENT avec un JSON valide, sans texte autour :
{
  "statut": "CONFORME|NON_CONFORME|ATTENTION",
  "statut_libelle": "Résumé court",
  "anomalies": [
    {
      "type": "COLORIS|DIMENSION|QUANTITE|REFERENCE|PRIX|MOTORISATION|VITRAGE|POSE|TOILE|PORTAIL|AUTRE",
      "severite": "CRITIQUE|MAJEUR|MINEUR",
      "description": "Description télégraphique",
      "valeurs": {"Devis": "val ou null", "ARC Fournisseur": "val ou null", "Bon de Commande": "val ou null"}
    }
  ],
  "points_conformes": ["Point conforme 1", "Point conforme 2"],
  "recommandations": "Actions correctives directes",
  "rapport_detaille": "Synthèse concise"
}
PROMPT;
}
