<?php
/**
 * Endpoint de maintenance Boîte Fournisseurs — appelé par UptimeRobot toutes les 5 min.
 * Usage : cron_emails.php?key=<EMAILS_CRON_KEY>
 */
declare(strict_types=1);
ini_set('display_errors', 0); error_reporting(E_ALL);
require_once __DIR__ . '/config.php';
header('Content-Type: application/json; charset=utf-8');

if (!defined('EMAILS_CRON_KEY') || EMAILS_CRON_KEY === '' || !hash_equals(EMAILS_CRON_KEY, (string)($_GET['key'] ?? ''))) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Clé invalide']);
    exit;
}
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/supplier_email_lib.php';
runEmailMaintenance($pdo, 240); // throttle 4 min : chaque ping UptimeRobot (5 min) passe
echo json_encode(['success' => true, 'message' => 'Maintenance exécutée', 'ts' => gmdate('c')]);
