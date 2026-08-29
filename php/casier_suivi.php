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
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
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

    $logDir = __DIR__ . '/logs';
    if (!file_exists($logDir)) mkdir($logDir, 0755, true);

    switch ($method) {
        case 'GET':
            handleGet($pdo, $userId);
            break;
        case 'POST':
            handlePost($pdo, $userId, $logDir);
            break;
        case 'PUT':
            handlePut($pdo, $userId, $logDir);
            break;
        case 'DELETE':
            handleDelete($pdo, $userId, $logDir);
            break;
        default:
            http_response_code(405);
            ob_end_clean();
            echo json_encode(['success' => false, 'message' => 'Méthode non autorisée']);
    }
} catch (Exception $e) {
    error_log('casier_suivi error: ' . $e->getMessage());
    ob_end_clean();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erreur serveur']);
}

// ── GET ────────────────────────────────────────────────────

function handleGet($pdo, int $currentUserId): void {
    $targetUserId = $currentUserId;
    if (isset($_GET['user_id']) && canViewAllCasiers()) {
        $targetUserId = (int)$_GET['user_id'];
    }

    $stmt = $pdo->prepare("
        SELECT cs.*, u.name AS created_by_name, u.role AS created_by_role
        FROM casier_suivi cs
        JOIN users u ON cs.created_by = u.id
        WHERE cs.user_id = ?
        ORDER BY cs.created_at DESC
    ");
    $stmt->execute([$targetUserId]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    ob_end_clean();
    echo json_encode(['success' => true, 'data' => $rows]);
}

// ── POST : créer une entrée de suivi ───────────────────────
// Réservé à admin, gérant, administration

function handlePost($pdo, int $currentUserId, string $logDir): void {
    if (!canViewAllCasiers() && !canValidateExpenses()) {
        ob_end_clean();
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Accès refusé — réservé aux gestionnaires']);
        return;
    }

    $input       = json_decode(file_get_contents('php://input'), true);
    $targetUserId = isset($input['user_id']) ? (int)$input['user_id'] : 0;
    $title        = trim($input['title']    ?? '');
    $content      = trim($input['content']  ?? '');
    $category     = trim($input['category'] ?? 'note');

    if (!$targetUserId || !$title) {
        ob_end_clean();
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'user_id et title obligatoires']);
        return;
    }

    $stmt = $pdo->prepare("
        INSERT INTO casier_suivi (user_id, title, content, category, created_by)
        VALUES (?, ?, ?, ?, ?)
    ");
    $stmt->execute([$targetUserId, $title, $content, $category, $currentUserId]);

    $newId = $pdo->lastInsertId();
    file_put_contents("$logDir/casier.log",
        date('Y-m-d H:i:s') . " - Suivi ID=$newId créé pour user_id=$targetUserId par $currentUserId\n", FILE_APPEND);

    ob_end_clean();
    echo json_encode(['success' => true, 'id' => (int)$newId]);
}

// ── PUT : mettre à jour une entrée ────────────────────────

function handlePut($pdo, int $currentUserId, string $logDir): void {
    if (!canViewAllCasiers() && !canValidateExpenses()) {
        ob_end_clean();
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Accès refusé']);
        return;
    }

    $input   = json_decode(file_get_contents('php://input'), true);
    $id      = isset($input['id'])      ? (int)$input['id']       : 0;
    $title   = trim($input['title']    ?? '');
    $content = trim($input['content']  ?? '');
    $category = trim($input['category'] ?? 'note');

    if (!$id || !$title) {
        ob_end_clean();
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID et titre obligatoires']);
        return;
    }

    if (!canViewAllCasiers()) {
        $own = $pdo->prepare("SELECT user_id FROM casier_suivi WHERE id = ?");
        $own->execute([$id]);
        $row = $own->fetch();
        if (!$row || (int)$row['user_id'] !== $currentUserId) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Accès refusé']);
            exit();
        }
    }

    $stmt = $pdo->prepare("UPDATE casier_suivi SET title = ?, content = ?, category = ? WHERE id = ?");
    $stmt->execute([$title, $content, $category, $id]);

    ob_end_clean();
    echo json_encode(['success' => true]);
}

// ── DELETE ─────────────────────────────────────────────────

function handleDelete($pdo, int $currentUserId, string $logDir): void {
    if (!canViewAllCasiers() && !canValidateExpenses()) {
        ob_end_clean();
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Accès refusé']);
        return;
    }

    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    if (!$id) {
        ob_end_clean();
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID manquant']);
        return;
    }

    if (!canViewAllCasiers()) {
        $own = $pdo->prepare("SELECT user_id FROM casier_suivi WHERE id = ?");
        $own->execute([$id]);
        $row = $own->fetch();
        if (!$row || (int)$row['user_id'] !== $currentUserId) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Accès refusé']);
            exit();
        }
    }

    $del = $pdo->prepare("DELETE FROM casier_suivi WHERE id = ?");
    $del->execute([$id]);

    ob_end_clean();
    echo json_encode(['success' => true]);
}
