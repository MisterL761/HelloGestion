<?php
session_set_cookie_params(['lifetime'=>1800,'path'=>'/','secure'=>true,'httponly'=>true,'samesite'=>'Strict']);
session_start();

$sessionTimeout = 1800;
if (isset($_SESSION['LAST_ACTIVITY']) && (time() - $_SESSION['LAST_ACTIVITY'] > $sessionTimeout)) {
    session_unset(); session_destroy(); session_start();
}
$_SESSION['LAST_ACTIVITY'] = time();

ini_set('display_errors', 0);
error_reporting(E_ALL);

header('Access-Control-Allow-Origin: https://hello-fermetures.com');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(0); }

ob_start();

try {
    require_once __DIR__ . '/db.php';
    require_once __DIR__ . '/roles.php';

    header('Content-Type: application/json; charset=utf-8');

    // Seul l'admin peut accéder aux logs
    requireRole(ROLES_LOGS);

    $logDir = __DIR__ . '/logs';
    if (!file_exists($logDir)) {
        ob_end_clean();
        echo json_encode(['success' => true, 'data' => []]);
        exit;
    }

    $entries = [];

    // Parcourir tous les fichiers .log du dossier
    $files = glob($logDir . '/*.log');
    if ($files === false) $files = [];

    foreach ($files as $filepath) {
        $filename = basename($filepath);
        // Ignorer les fichiers rate-limit (rl_*.json n'est pas .log, safe)
        $lines = file($filepath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if ($lines === false) continue;

        foreach ($lines as $line) {
            $parsed = parseLine($line, $filename);
            if ($parsed) $entries[] = $parsed;
        }
    }

    // Trier du plus récent au plus ancien
    usort($entries, fn($a, $b) => strcmp($b['date'] ?? '', $a['date'] ?? ''));

    // Limiter à 500 entrées max
    $entries = array_slice($entries, 0, 500);

    ob_end_clean();
    echo json_encode(['success' => true, 'data' => $entries]);

} catch (Exception $e) {
    error_log('logs.php error: ' . $e->getMessage());
    ob_end_clean();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erreur serveur']);
}

// ── Parser une ligne de log ────────────────────────────────

function parseLine(string $line, string $filename): ?array {
    // Format standard : "2026-03-20 14:30:00 - Message…"
    if (!preg_match('/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) - (.+)$/', $line, $m)) {
        return null;
    }

    $date    = $m[1];
    $message = trim($m[2]);

    // Détecter le niveau
    $level = detectLevel($message, $filename);

    // Extraire l'utilisateur/IP si présent
    $user    = extractUser($message);
    $ip      = extractIP($message);
    $action  = guessAction($filename);
    $details = $message;

    return [
        'date'    => $date,
        'level'   => $level,
        'action'  => $action,
        'message' => $message,
        'details' => strlen($message) > 120 ? substr($message, 0, 120) . '…' : null,
        'user'    => $user,
        'ip'      => $ip,
        'source'  => $filename,
    ];
}

function detectLevel(string $msg, string $file): string {
    $msgLower  = strtolower($msg);
    $fileLower = strtolower($file);

    if (str_contains($fileLower, 'error') || str_contains($msgLower, 'erreur') || str_contains($msgLower, 'error') || str_contains($msgLower, 'failed') || str_contains($msgLower, 'échoué') || str_contains($msgLower, 'incorrect')) {
        return 'ERROR';
    }
    if (str_contains($msgLower, 'réussie') || str_contains($msgLower, 'réussi') || str_contains($msgLower, 'success') || str_contains($msgLower, 'créée') || str_contains($msgLower, 'validée') || str_contains($msgLower, 'mis à jour') || str_contains($msgLower, 'supprimée') || str_contains($msgLower, 'connexion réussie')) {
        return 'SUCCESS';
    }
    if (str_contains($msgLower, 'tentative') || str_contains($msgLower, 'warning') || str_contains($msgLower, 'rejetée') || str_contains($msgLower, 'trop de')) {
        return 'WARNING';
    }
    return 'INFO';
}

function extractUser(string $msg): ?string {
    // Cherche "pour 'email@...' (ID: X)" ou "user_id=X"
    if (preg_match("/pour '([^']+)'/", $msg, $m)) return $m[1];
    if (preg_match('/user_id=(\d+)/', $msg, $m)) return 'ID#' . $m[1];
    return null;
}

function extractIP(string $msg): ?string {
    if (preg_match('/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/', $msg, $m)) return $m[1];
    return null;
}

function guessAction(string $filename): string {
    $map = [
        'inventaire'      => 'Inventaire',
        'actions'         => 'Actions terrain',
        'commandes'       => 'Commandes',
        'outils'          => 'Outils',
        'frais'           => 'Notes de frais',
        'auth_login'      => 'Connexion',
        'auth_logout'     => 'Déconnexion',
        'auth_check'      => 'Vérif. session',
        'auth'            => 'Auth',
        'expense_reports' => 'Notes de frais',
        'inventory'       => 'Inventaire',
        'received'        => 'Produits reçus',
        'defective'       => 'Défectueux',
        'installed'       => 'Posés',
        'orders'          => 'Commandes',
        'casier'          => 'Casier',
        'profile'         => 'Profil',
        'tools'           => 'Outils',
    ];
    foreach ($map as $key => $label) {
        if (str_contains(strtolower($filename), $key)) return $label;
    }
    return str_replace(['.log', '_'], ['', ' '], $filename);
}
