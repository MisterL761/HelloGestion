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
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(0); }

ob_start();

try {
    require_once __DIR__ . '/db.php';
    require_once __DIR__ . '/roles.php';

    header('Content-Type: application/json; charset=utf-8');

    $user   = requireAuth();
    $userId = (int)$user['id'];
    $method = $_SERVER['REQUEST_METHOD'];

    // ── Auto-création de la table si elle n'existe pas ──────
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `reports` (
          `id`           INT AUTO_INCREMENT PRIMARY KEY,
          `title`        VARCHAR(255)  NOT NULL,
          `type`         VARCHAR(50)   NOT NULL DEFAULT 'monthly',
          `month`        TINYINT       NULL,
          `year`         SMALLINT      NULL,
          `generated_at` DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
          `user_id`      INT           NULL,
          `user_name`    VARCHAR(100)  NULL,
          `stats`        JSON          NULL,
          INDEX idx_year_month   (`year`, `month`),
          INDEX idx_generated_at (`generated_at`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    switch ($method) {
        case 'GET':    handleGet($pdo, $user);    break;
        case 'POST':   handlePost($pdo, $userId, $user); break;
        case 'DELETE': handleDelete($pdo, $userId, $user); break;
        default:
            http_response_code(405);
            ob_end_clean();
            echo json_encode(['success' => false, 'message' => 'Méthode non autorisée']);
    }
} catch (Exception $e) {
    error_log('reports.php error: ' . $e->getMessage());
    ob_end_clean();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erreur serveur']);
}

// ── GET : liste des rapports ────────────────────────────────

function handleGet($pdo, array $user): void {
    if (!canAccessDashboard()) {
        ob_end_clean();
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Accès refusé']);
        return;
    }

    $where  = [];
    $params = [];

    if (!empty($_GET['year'])) {
        $where[]  = '`year` = ?';
        $params[] = (int)$_GET['year'];
    }
    if (!empty($_GET['month'])) {
        $where[]  = '`month` = ?';
        $params[] = (int)$_GET['month'];
    }
    if (!empty($_GET['type'])) {
        $where[]  = '`type` = ?';
        $params[] = $_GET['type'];
    }

    $sql  = 'SELECT * FROM `reports`';
    if ($where) $sql .= ' WHERE ' . implode(' AND ', $where);
    $sql .= ' ORDER BY `generated_at` DESC LIMIT 200';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Décoder le champ JSON stats
    foreach ($rows as &$row) {
        if ($row['stats']) {
            $row['stats'] = json_decode($row['stats'], true);
        }
    }

    ob_end_clean();
    echo json_encode(['success' => true, 'data' => $rows]);
}

// ── POST : enregistrer un nouveau rapport ──────────────────

function handlePost($pdo, int $userId, array $user): void {
    if (!canAccessDashboard()) {
        ob_end_clean();
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Accès refusé']);
        return;
    }

    $body  = json_decode(file_get_contents('php://input'), true) ?? [];

    $title     = trim($body['title']     ?? '');
    $type      = trim($body['type']      ?? 'monthly');
    $month     = isset($body['month'])   ? (int)$body['month']  : null;
    $year      = isset($body['year'])    ? (int)$body['year']   : null;
    $stats     = isset($body['stats'])   ? $body['stats']       : null;
    $userName  = $user['name'] ?? $user['email'] ?? 'Inconnu';

    if (!$title) {
        ob_end_clean();
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Titre obligatoire']);
        return;
    }

    $statsJson = $stats ? json_encode($stats, JSON_UNESCAPED_UNICODE) : null;

    $stmt = $pdo->prepare("
        INSERT INTO `reports` (`title`, `type`, `month`, `year`, `user_id`, `user_name`, `stats`)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([$title, $type, $month, $year, $userId, $userName, $statsJson]);

    $newId = (int)$pdo->lastInsertId();

    $row = $pdo->prepare("SELECT * FROM `reports` WHERE `id` = ?");
    $row->execute([$newId]);
    $report = $row->fetch(PDO::FETCH_ASSOC);
    if ($report['stats']) $report['stats'] = json_decode($report['stats'], true);

    ob_end_clean();
    http_response_code(201);
    echo json_encode(['success' => true, 'data' => $report]);
}

// ── DELETE : supprimer un rapport ─────────────────────────

function handleDelete($pdo, int $userId, array $user): void {
    if (!in_array($user['role'], ['admin', 'gerant'], true)) {
        ob_end_clean();
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Seuls admin/gérant peuvent supprimer un rapport']);
        return;
    }

    $id = (int)($_GET['id'] ?? 0);
    if (!$id) {
        ob_end_clean();
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID manquant']);
        return;
    }

    $stmt = $pdo->prepare("DELETE FROM `reports` WHERE `id` = ?");
    $stmt->execute([$id]);

    ob_end_clean();
    echo json_encode(['success' => true]);
}
