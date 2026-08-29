<?php
declare(strict_types=1);

session_start();

require_once __DIR__ . '/security.php';
setSecurityHeaders();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo 'Non authentifié';
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    exit();
}

$requestedFile = $_GET['file'] ?? '';

if (empty($requestedFile)) {
    http_response_code(400);
    echo 'Fichier non spécifié.';
    exit();
}

$requestedFile = ltrim($requestedFile, '/');
$realRequested = realpath(__DIR__ . '/' . $requestedFile);
$allowedDir    = realpath(__DIR__ . '/data/pdfs');

if ($realRequested === false || $allowedDir === false || strpos($realRequested, $allowedDir) !== 0) {
    http_response_code(403);
    echo 'Accès refusé.';
    exit();
}

if (!file_exists($realRequested) || !is_file($realRequested)) {
    http_response_code(404);
    echo 'Fichier introuvable.';
    exit();
}

$filename = basename($realRequested);

header('Content-Type: application/pdf');
header('Content-Disposition: inline; filename="' . $filename . '"');
header('Content-Length: ' . filesize($realRequested));
header('Cache-Control: private, max-age=3600');
header('X-Content-Type-Options: nosniff');

readfile($realRequested);
