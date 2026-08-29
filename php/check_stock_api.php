<?php

session_start();

// Headers CORS
require_once __DIR__ . '/security.php';
setSecurityHeaders();
header('Content-Type: application/json; charset=utf-8');

// Gérer la requête OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

// Configuration des logs
$logDir = __DIR__ . '/logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

try {
    // Vérifier l'authentification pour les requêtes web
    if (isset($_SESSION) && !isset($_SESSION['user'])) {
        // Si c'est une requête web et que l'utilisateur n'est pas connecté
        if (!isset($_GET['cron_token'])) {
            http_response_code(401);
            echo json_encode(['error' => true, 'message' => 'Non authentifié']);
            exit;
        }
    }

    // Vérification du token pour les tâches cron (optionnel)
    require_once __DIR__ . '/config.php';
    $cronToken = $_GET['cron_token'] ?? null;
    $expectedCronToken = CRON_TOKEN;

    // Si un token cron est fourni, le vérifier
    if ($cronToken && $cronToken !== $expectedCronToken) {
        http_response_code(403);
        echo json_encode(['error' => true, 'message' => 'Token invalide']);
        exit;
    }

    require_once __DIR__ . '/stock_notifications.php';


} catch (Exception $e) {
    // Log de l'erreur
    file_put_contents($logDir . '/notifications_api_error.log',
        date('Y-m-d H:i:s') . " - Erreur API: " . $e->getMessage() . "\n",
        FILE_APPEND
    );

    http_response_code(500);
    error_log(date('Y-m-d H:i:s') . ' - Cron error: ' . $e->getMessage());
    echo json_encode(['success' => false, 'error' => 'Erreur lors de l\'exécution']);
}
?>