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

if (!isset($_FILES['arc']) || $_FILES['arc']['error'] !== UPLOAD_ERR_OK) {
    $errCode = $_FILES['arc']['error'] ?? -1;
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => "Fichier ARC manquant ou corrompu (code: {$errCode})."]);
    exit();
}

$maxSize = 10 * 1024 * 1024;
if ($_FILES['arc']['size'] > $maxSize) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Le fichier ARC dépasse 10 Mo.']);
    exit();
}

$handle = fopen($_FILES['arc']['tmp_name'], 'rb');
$magic  = fread($handle, 4);
fclose($handle);
if ($magic !== '%PDF') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => "Le fichier ARC n'est pas un PDF valide."]);
    exit();
}

// Extraction via Mistral OCR (sans dépendance Composer)
$rawContent = file_get_contents($_FILES['arc']['tmp_name']);
$tmp = $_FILES['arc']['tmp_name'];
if (file_exists($tmp)) unlink($tmp);

if ($rawContent === false || strlen($rawContent) === 0) {
    http_response_code(422);
    echo json_encode([
        'success' => false,
        'message' => 'Impossible de lire ce PDF (fichier corrompu ou vide).',
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

$pdfBase64 = base64_encode($rawContent);
unset($rawContent);

$text = callMistralOcr($mistralApiKey, $pdfBase64);
unset($pdfBase64);

if ($text === null || mb_strlen(trim($text)) < 30) {
    http_response_code(422);
    echo json_encode([
        'success' => false,
        'message' => "Impossible d'extraire le texte de ce PDF. "
            . "Solution : ouvrez le PDF dans Chrome et faites Fichier → Imprimer → Enregistrer en PDF.",
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

$result = callMistralExtract($mistralApiKey, $text);

if ($result === null) {
    http_response_code(502);
    echo json_encode([
        'success' => false,
        'message' => $GLOBALS['lastMistralError'] ?? "Erreur lors de la communication avec l'IA Mistral."
    ]);
    exit();
}

echo json_encode(['success' => true, 'arc' => $result], JSON_UNESCAPED_UNICODE);
exit();

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
            $decoded = json_decode($response, true);
            $pages   = $decoded['pages'] ?? [];
            $fullText = '';
            foreach ($pages as $page) {
                $fullText .= ($page['markdown'] ?? '') . "\n\n";
            }
            return trim($fullText) ?: null;
        }
    }

    if (ini_get('allow_url_fopen')) {
        $context = stream_context_create([
            'http' => [
                'method'        => 'POST',
                'header'        => implode("\r\n", [
                    'Content-Type: application/json',
                    'Authorization: Bearer ' . $apiKey,
                    'Content-Length: ' . strlen($payload),
                ]),
                'content'       => $payload,
                'timeout'       => 120,
                'ignore_errors' => true,
            ],
            'ssl'  => ['verify_peer' => true],
        ]);

        $response = @file_get_contents($url, false, $context);
        if ($response !== false) {
            $httpCode = 0;
            if (isset($http_response_header)) {
                preg_match('#HTTP/\d\.\d\s+(\d+)#', $http_response_header[0], $m);
                $httpCode = (int)($m[1] ?? 0);
            }
            if ($httpCode === 200) {
                $decoded = json_decode($response, true);
                $pages   = $decoded['pages'] ?? [];
                $fullText = '';
                foreach ($pages as $page) {
                    $fullText .= ($page['markdown'] ?? '') . "\n\n";
                }
                return trim($fullText) ?: null;
            }
        }
    }

    return null;
}

function callMistralExtract(string $apiKey, string $text): ?array
{
    $prompt  = buildExtractionPrompt($text);

    $payload = json_encode([
        'model'           => 'mistral-small-latest',
        'temperature'     => 0.0,
        'messages'        => [['role' => 'user', 'content' => $prompt]],
        'response_format' => ['type' => 'json_object'],
    ]);

    $url = 'https://api.mistral.ai/v1/chat/completions';

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
            CURLOPT_TIMEOUT        => 90,
            CURLOPT_CONNECTTIMEOUT => 15,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);

        $response  = curl_exec($ch);
        $httpCode  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($response !== false && $httpCode === 200) {
            return parseExtractResponse($response);
        }

        if ($response === false) {
            $GLOBALS['lastMistralError'] = "cURL échoue : {$curlError}.";
        } else {
            $body   = json_decode($response, true);
            $detail = $body['message'] ?? $body['error']['message'] ?? "HTTP {$httpCode}";
            $GLOBALS['lastMistralError'] = "Mistral HTTP {$httpCode} : {$detail}";
            if (in_array($httpCode, [401, 403])) return null;
        }
    }

    if (ini_get('allow_url_fopen')) {
        $context  = stream_context_create([
            'http' => [
                'method'        => 'POST',
                'header'        => implode("\r\n", [
                    'Content-Type: application/json',
                    'Authorization: Bearer ' . $apiKey,
                    'Content-Length: ' . strlen($payload),
                ]),
                'content'       => $payload,
                'timeout'       => 90,
                'ignore_errors' => true,
            ],
            'ssl'  => ['verify_peer' => true],
        ]);

        $response = @file_get_contents($url, false, $context);
        if ($response !== false) {
            $httpCode = 0;
            if (isset($http_response_header)) {
                preg_match('#HTTP/\d\.\d\s+(\d+)#', $http_response_header[0], $m);
                $httpCode = (int)($m[1] ?? 0);
            }
            if ($httpCode === 200) return parseExtractResponse($response);

            $body   = json_decode($response, true);
            $detail = $body['message'] ?? $body['error']['message'] ?? "HTTP {$httpCode}";
            $GLOBALS['lastMistralError'] = "Mistral HTTP {$httpCode} : {$detail}";
            return null;
        }
        $GLOBALS['lastMistralError'] = "Impossible de contacter api.mistral.ai.";
    } else {
        $GLOBALS['lastMistralError'] = "cURL et allow_url_fopen désactivés.";
    }

    return null;
}

function parseExtractResponse(string $response): ?array
{
    $decoded = json_decode($response, true);
    $content = $decoded['choices'][0]['message']['content'] ?? null;
    if ($content === null) return null;

    $cleaned = trim($content);
    $cleaned = preg_replace('/^```json\s*/i', '', $cleaned);
    $cleaned = preg_replace('/^```\s*/i',     '', $cleaned);
    $cleaned = preg_replace('/\s*```\s*$/i',  '', $cleaned);
    $cleaned = trim($cleaned);

    if (!str_starts_with($cleaned, '{')) {
        preg_match('/\{.*\}/s', $cleaned, $matches);
        $cleaned = $matches[0] ?? $cleaned;
    }

    $parsed = json_decode($cleaned, true);
    if (json_last_error() === JSON_ERROR_NONE && is_array($parsed)) {
        return $parsed;
    }

    return ['erreur' => 'Impossible de parser la réponse.', 'brut' => $content];
}

function buildExtractionPrompt(string $text): string
{
    $safeText = substr($text, 0, 12000);

    return <<<PROMPT
Tu es un extracteur de données pour documents ARC Fournisseur (Accusé de Réception de Commande) dans le secteur de la fermeture du bâtiment.

DOCUMENT ARC :
```
{$safeText}
```

MISSION : Extrais UNIQUEMENT les informations présentes dans le document ci-dessus et retourne-les en JSON structuré.
⛔ INTERDIT D'INVENTER : toute valeur absente du document doit être null. Ne jamais compléter, deviner ou supposer une valeur.
⛔ Si tu ne retrouves pas clairement une information dans le texte fourni, tu mets null — jamais une valeur inventée.
✅ Chaque valeur retournée DOIT être directement visible dans le texte du document.

CONSIGNES :
- Valeurs courtes et factuelles, pas de phrases
- Largeur et hauteur SÉPARÉES en mm (ex: largeur="1200", hauteur="1400")
- cote_type : indique "HT" si cote hors tout, "tableau" si cote tableau, null si non précisé
- Coloris : code RAL + désignation si disponibles
- Prix : chiffres uniquement, sans symbole € (ex: "485.00")
- options : tableau de strings — liste TOUTES les options/accessoires/finitions trouvées pour ce produit, une par entrée. Si aucune option, mettre tableau vide []
- Pour chaque ligne produit, extraire le maximum de détails techniques

RÉPONDS UNIQUEMENT EN JSON :
{
  "reference_arc": "référence du document ARC ou null",
  "date_arc": "date du document ou null",
  "fournisseur": {
    "nom": "nom du fournisseur ou null",
    "adresse": "adresse complète ou null",
    "telephone": "tel ou null",
    "email": "email ou null",
    "siret": "siret ou null"
  },
  "client": {
    "nom": "nom du client/acheteur ou null",
    "adresse": "adresse ou null",
    "reference_commande": "numéro BC ou null",
    "contact": "nom contact ou null"
  },
  "chantier": {
    "nom": "nom du chantier ou null",
    "adresse": "adresse chantier ou null"
  },
  "delai_livraison": "délai ou date ou null",
  "date_livraison_prevue": "date précise ou null",
  "conditions_paiement": "conditions ou null",
  "lignes": [
    {
      "numero": "numéro de ligne",
      "designation": "désignation complète du produit",
      "reference": "référence article fournisseur ou null",
      "largeur": "largeur en mm uniquement (ex: '1200') ou null",
      "hauteur": "hauteur en mm uniquement (ex: '1400') ou null",
      "cote_type": "'HT' si hors tout, 'tableau' si cote tableau, null si non précisé",
      "coloris_ext": "coloris extérieur (RAL + nom) ou null",
      "coloris_int": "coloris intérieur (RAL + nom) ou null",
      "vitrage": "type de vitrage ou null",
      "type_pose": "type de pose ou null",
      "sens_ouverture": "sens ou null",
      "type_coffre": "type de coffre ou null",
      "motorisation": "type motorisation + marque ou null",
      "toile_reference": "référence toile ou null",
      "toile_couleur": "couleur toile ou null",
      "options": ["option 1", "option 2", "..."],
      "quantite": "quantité",
      "prix_unitaire_ht": "prix unitaire HT ou null",
      "prix_total_ht": "prix total ligne HT ou null"
    }
  ],
  "sous_total_ht": "sous-total HT ou null",
  "remise": "remise ou null",
  "total_ht": "total HT ou null",
  "taux_tva": "taux TVA ou null",
  "montant_tva": "montant TVA ou null",
  "total_ttc": "total TTC ou null",
  "notes": "mentions particulières, conditions spéciales ou null",
  "validite": "validité de l'ARC ou null"
}
PROMPT;
}
