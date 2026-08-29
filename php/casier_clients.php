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
    $role   = $user['role'];
    $method = $_SERVER['REQUEST_METHOD'];

    $logDir = __DIR__ . '/logs';
    if (!file_exists($logDir)) mkdir($logDir, 0755, true);

    switch ($method) {
        case 'GET':
            handleGet($pdo, $userId, $role);
            break;
        case 'POST':
            handlePost($pdo, $userId, $role, $logDir);
            break;
        case 'DELETE':
            handleDelete($pdo, $userId, $role, $logDir);
            break;
        default:
            http_response_code(405);
            ob_end_clean();
            echo json_encode(['success' => false, 'message' => 'Méthode non autorisée']);
    }
} catch (Exception $e) {
    error_log('casier_clients error: ' . $e->getMessage());
    ob_end_clean();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erreur serveur']);
}

// ── GET ────────────────────────────────────────────────────

function handleGet($pdo, int $currentUserId, string $role): void {
    $canViewAll = canViewAllCasiers();
    $isChefEquipe = $role === 'chef_equipe';

    if (!$canViewAll && !$isChefEquipe) {
        ob_end_clean();
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Accès refusé']);
        return;
    }

    if (isset($_GET['user_id']) && $canViewAll) {
        $targetUserId = (int)$_GET['user_id'];
    } else {
        $targetUserId = $currentUserId;
    }

    $stmt = $pdo->prepare("
        SELECT cc.*, u.name AS created_by_name
        FROM casier_clients cc
        JOIN users u ON cc.created_by = u.id
        WHERE cc.user_id = ?
        ORDER BY cc.created_at DESC
    ");
    $stmt->execute([$targetUserId]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    ob_end_clean();
    echo json_encode(['success' => true, 'data' => $rows]);
}

// ── POST : ajouter un client ───────────────────────────────

function handlePost($pdo, int $currentUserId, string $role, string $logDir): void {
    $canManageAll = canViewAllCasiers();
    $isChefEquipe = $role === 'chef_equipe';

    if (!$canManageAll && !$isChefEquipe) {
        ob_end_clean();
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Accès refusé']);
        return;
    }

    $input          = json_decode(file_get_contents('php://input'), true);
    $targetUserId   = isset($input['user_id'])        ? (int)$input['user_id']           : 0;
    $clientName     = trim($input['client_name']      ?? '');
    $signatureDate  = trim($input['signature_date']   ?? '') ?: null;

    // Le chef d'équipe ne peut ajouter que dans son propre casier
    if ($isChefEquipe && !$canManageAll && $targetUserId !== $currentUserId) {
        ob_end_clean();
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Accès refusé']);
        return;
    }

    if (!$targetUserId || !$clientName) {
        ob_end_clean();
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'user_id et client_name obligatoires']);
        return;
    }

    if ($signatureDate !== null && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $signatureDate)) {
        ob_end_clean();
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Format de date invalide (YYYY-MM-DD)']);
        return;
    }

    $stmt = $pdo->prepare("
        INSERT INTO casier_clients (user_id, client_name, signature_date, created_by)
        VALUES (?, ?, ?, ?)
    ");
    $stmt->execute([$targetUserId, $clientName, $signatureDate, $currentUserId]);

    $newId = $pdo->lastInsertId();
    file_put_contents("$logDir/casier.log",
        date('Y-m-d H:i:s') . " - Client ID=$newId ajouté pour user_id=$targetUserId par $currentUserId\n", FILE_APPEND);

    ob_end_clean();
    echo json_encode(['success' => true, 'id' => (int)$newId]);
}

// ── DELETE ─────────────────────────────────────────────────

function handleDelete($pdo, int $currentUserId, string $role, string $logDir): void {
    $canManageAll = canViewAllCasiers();
    $isChefEquipe = $role === 'chef_equipe';

    if (!$canManageAll && !$isChefEquipe) {
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

    // Le chef d'équipe ne peut supprimer que ses propres entrées
    if ($isChefEquipe && !$canManageAll) {
        $check = $pdo->prepare("SELECT user_id FROM casier_clients WHERE id = ?");
        $check->execute([$id]);
        $row = $check->fetch();
        if (!$row || (int)$row['user_id'] !== $currentUserId) {
            ob_end_clean();
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Accès refusé']);
            return;
        }
    }

    $del = $pdo->prepare("DELETE FROM casier_clients WHERE id = ?");
    $del->execute([$id]);

    file_put_contents("$logDir/casier.log",
        date('Y-m-d H:i:s') . " - Client ID=$id supprimé par $currentUserId\n", FILE_APPEND);

    ob_end_clean();
    echo json_encode(['success' => true]);
}
