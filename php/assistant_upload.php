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

if (($_SESSION['user']['role'] ?? '') !== 'admin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Accès réservé aux administrateurs.']);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Méthode non autorisée.']);
    exit();
}

if (empty($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Aucun fichier valide reçu.']);
    exit();
}

$file     = $_FILES['file'];
$category = htmlspecialchars(trim($_POST['category'] ?? 'Autre'));

$finfo = finfo_open(FILEINFO_MIME_TYPE);
$detectedMime = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);
if ($detectedMime !== 'application/pdf') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Seuls les fichiers PDF sont acceptés.']);
    exit();
}

if ($file['size'] > 20 * 1024 * 1024) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Fichier trop volumineux (max 20 Mo).']);
    exit();
}

require_once __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/assistant_config.php';
require_once __DIR__ . '/db.php';

use Smalot\PdfParser\Parser;

// Create tables if not exist
$pdo->exec("
    CREATE TABLE IF NOT EXISTS `assistant_documents` (
        `id`         VARCHAR(32)  NOT NULL,
        `name`       VARCHAR(255) NOT NULL,
        `category`   VARCHAR(100) NOT NULL DEFAULT 'Autre',
        `chunks`     INT          NOT NULL DEFAULT 0,
        `file_path`  VARCHAR(500) DEFAULT NULL,
        `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`),
        UNIQUE KEY `uk_name` (`name`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
");

$pdo->exec("
    CREATE TABLE IF NOT EXISTS `assistant_chunks` (
        `id`        INT          NOT NULL AUTO_INCREMENT,
        `doc_id`    VARCHAR(32)  NOT NULL,
        `chunk_idx` INT          NOT NULL DEFAULT 0,
        `text`      MEDIUMTEXT   NOT NULL,
        `embedding` MEDIUMTEXT   DEFAULT NULL,
        PRIMARY KEY (`id`),
        KEY `idx_doc` (`doc_id`),
        CONSTRAINT `fk_chunks_doc`
            FOREIGN KEY (`doc_id`) REFERENCES `assistant_documents`(`id`)
            ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
");

try {
    $parser  = new Parser();
    $pdf     = $parser->parseFile($file['tmp_name']);
    $rawText = $pdf->getText();
} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Impossible de lire le PDF : ' . $e->getMessage()]);
    exit();
}

if (empty(trim($rawText))) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Le PDF ne contient pas de texte extractible (PDF image ?)']);
    exit();
}

function chunkText(string $text, int $chunkSize = 2000, int $overlap = 200): array {
    $text   = preg_replace('/\s+/', ' ', trim($text));
    $chunks = [];
    $len    = mb_strlen($text);
    $pos    = 0;
    while ($pos < $len) {
        $chunk = mb_substr($text, $pos, $chunkSize);
        if ($pos + $chunkSize < $len) {
            $lastSpace = mb_strrpos($chunk, ' ');
            if ($lastSpace !== false && $lastSpace > $chunkSize * 0.7) {
                $chunk = mb_substr($chunk, 0, $lastSpace);
            }
        }
        $chunks[] = trim($chunk);
        $advance  = mb_strlen($chunk) - $overlap;
        if ($advance <= 0) break;
        $pos += $advance;
    }
    return array_values(array_filter($chunks, fn($c) => mb_strlen(trim($c)) > 50));
}

$chunks = chunkText($rawText);

$mistralKey = MISTRAL_API_KEY;
if (empty($mistralKey)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Clé API Mistral manquante.']);
    exit();
}

function getMistralEmbeddings(array $inputs, string $apiKey): array {
    $ch = curl_init('https://api.mistral.ai/v1/embeddings');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $apiKey,
        ],
        CURLOPT_POSTFIELDS     => json_encode(['model' => 'mistral-embed', 'input' => $inputs]),
        CURLOPT_TIMEOUT        => 60,
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($httpCode !== 200) {
        throw new \RuntimeException('Erreur API embeddings (HTTP ' . $httpCode . '): ' . $response);
    }
    $data = json_decode($response, true);
    return array_column($data['data'] ?? [], 'embedding');
}

$allEmbeddings = [];
$batchSize = 32;
for ($i = 0; $i < count($chunks); $i += $batchSize) {
    $batch = array_slice($chunks, $i, $batchSize);
    try {
        $embeddings    = getMistralEmbeddings($batch, $mistralKey);
        $allEmbeddings = array_merge($allEmbeddings, $embeddings);
    } catch (\RuntimeException $e) {
        http_response_code(502);
        echo json_encode(['success' => false, 'message' => 'Erreur vectorisation : ' . $e->getMessage()]);
        exit();
    }
}

$docName  = pathinfo($file['name'], PATHINFO_FILENAME);
$force    = ($_POST['force'] ?? 'false') === 'true';

$stmtCheck = $pdo->prepare('SELECT id, file_path FROM assistant_documents WHERE name = ? LIMIT 1');
$stmtCheck->execute([$docName]);
$existing  = $stmtCheck->fetch(PDO::FETCH_ASSOC);

if ($existing && !$force) {
    echo json_encode([
        'success'   => false,
        'duplicate' => true,
        'doc_name'  => $docName,
        'message'   => 'Un document avec ce nom existe déjà.',
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

$pdfDir = __DIR__ . '/data/pdfs';
if (!is_dir($pdfDir)) mkdir($pdfDir, 0755, true);

$safeName = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $docName) . '.pdf';
$pdfPath  = $pdfDir . '/' . $safeName;

if ($existing && $force && !empty($existing['file_path'])) {
    $oldPath = __DIR__ . '/' . $existing['file_path'];
    if (file_exists($oldPath)) @unlink($oldPath);
}

if (!move_uploaded_file($file['tmp_name'], $pdfPath)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Impossible de sauvegarder le fichier PDF.']);
    exit();
}

$relPath = 'data/pdfs/' . $safeName;

$docId = uniqid('doc_', true);

try {
    $pdo->beginTransaction();

    if ($existing && $force) {
        $pdo->prepare('DELETE FROM assistant_documents WHERE name = ?')->execute([$docName]);
    }

    $stmtDoc = $pdo->prepare(
        'INSERT INTO assistant_documents (id, name, category, chunks, file_path) VALUES (?, ?, ?, ?, ?)'
    );
    $stmtDoc->execute([$docId, $docName, $category, count($chunks), $relPath]);

    $stmtChunk = $pdo->prepare(
        'INSERT INTO assistant_chunks (doc_id, chunk_idx, text, embedding) VALUES (?, ?, ?, ?)'
    );
    foreach ($chunks as $ci => $chunk) {
        $embeddingJson = json_encode($allEmbeddings[$ci] ?? []);
        $stmtChunk->execute([$docId, $ci, $chunk, $embeddingJson]);
    }

    $pdo->commit();

} catch (\PDOException $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erreur base de données : ' . $e->getMessage()]);
    exit();
}

echo json_encode([
    'success'   => true,
    'message'   => 'Document indexé avec succès.',
    'doc_id'    => $docId,
    'doc_name'  => $docName,
    'category'  => $category,
    'chunks'    => count($chunks),
    'file_path' => $relPath,
], JSON_UNESCAPED_UNICODE);
