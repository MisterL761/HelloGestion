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
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
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
    $action = $_GET['action'] ?? '';

    $logDir   = __DIR__ . '/logs';
    if (!file_exists($logDir)) mkdir($logDir, 0755, true);

    $avatarDir = __DIR__ . '/uploads/avatars/';
    if (!file_exists($avatarDir)) mkdir($avatarDir, 0755, true);

    if ($method === 'GET' && $action === 'me') {
        handleGetProfile($pdo, $userId);
    } elseif ($method === 'POST' && $action === 'avatar') {
        handleUploadAvatar($pdo, $userId, $avatarDir, $logDir);
    } elseif ($method === 'POST' && $action === 'password') {
        handleChangePassword($pdo, $userId, $logDir);
    } elseif ($method === 'POST' && $action === 'update') {
        handleUpdateProfile($pdo, $userId);
    } else {
        http_response_code(400);
        ob_end_clean();
        echo json_encode(['success' => false, 'message' => 'Action invalide']);
    }
} catch (Exception $e) {
    error_log('profile error: ' . $e->getMessage());
    ob_end_clean();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erreur serveur']);
}

// ── GET profil ─────────────────────────────────────────────

function handleGetProfile($pdo, int $userId): void {
    $stmt = $pdo->prepare("SELECT id, email, name, position, role, avatar_path, avatar_name FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        ob_end_clean();
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Utilisateur introuvable']);
        return;
    }

    ob_end_clean();
    echo json_encode(['success' => true, 'data' => $row]);
}

// ── POST avatar ────────────────────────────────────────────

function handleUploadAvatar($pdo, int $userId, string $avatarDir, string $logDir): void {
    if (empty($_FILES['avatar']) || $_FILES['avatar']['error'] !== UPLOAD_ERR_OK) {
        ob_end_clean();
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Fichier manquant']);
        return;
    }

    $file  = $_FILES['avatar'];
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime  = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    $allowed = ['image/jpeg','image/png','image/gif','image/webp'];
    if (!in_array($mime, $allowed, true)) {
        ob_end_clean();
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Format non autorisé (jpg/png/webp uniquement)']);
        return;
    }

    if ($file['size'] > 2 * 1024 * 1024) {
        ob_end_clean();
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Image trop volumineuse (max 2 Mo)']);
        return;
    }

    // Supprimer l'ancien avatar
    $old = $pdo->prepare("SELECT avatar_path FROM users WHERE id = ?");
    $old->execute([$userId]);
    $oldRow = $old->fetch(PDO::FETCH_ASSOC);
    if ($oldRow && $oldRow['avatar_path']) {
        $oldAbs = __DIR__ . '/' . $oldRow['avatar_path'];
        if (file_exists($oldAbs) && strpos(realpath($oldAbs), realpath($avatarDir)) === 0) {
            unlink($oldAbs);
        }
    }

    $ext      = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = 'avatar_' . $userId . '_' . uniqid() . '.' . strtolower($ext);
    $destPath = $avatarDir . $filename;

    if (!move_uploaded_file($file['tmp_name'], $destPath)) {
        ob_end_clean();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => "Erreur upload"]);
        return;
    }

    $avatarRelPath = 'uploads/avatars/' . $filename;

    $stmt = $pdo->prepare("UPDATE users SET avatar_path = ?, avatar_name = ? WHERE id = ?");
    $stmt->execute([$avatarRelPath, basename($file['name']), $userId]);

    // Mettre à jour la session
    $_SESSION['user']['avatar_path'] = $avatarRelPath;

    file_put_contents("$logDir/profile.log",
        date('Y-m-d H:i:s') . " - Avatar mis à jour pour user_id=$userId\n", FILE_APPEND);

    ob_end_clean();
    echo json_encode(['success' => true, 'avatar_path' => $avatarRelPath]);
}

// ── POST update (nom / poste) ───────────────────────────

function handleUpdateProfile($pdo, int $userId): void {
    $input    = json_decode(file_get_contents('php://input'), true);
    $name     = trim($input['name']     ?? '');
    $position = trim($input['position'] ?? '');

    if (!$name) {
        ob_end_clean();
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Le nom est requis']);
        return;
    }

    $stmt = $pdo->prepare("UPDATE users SET name = ?, position = ? WHERE id = ?");
    $stmt->execute([$name, $position, $userId]);

    $_SESSION['user']['name']     = $name;
    $_SESSION['user']['position'] = $position;

    ob_end_clean();
    echo json_encode(['success' => true, 'message' => 'Profil mis à jour']);
}

// ── POST password ──────────────────────────────────────────

function handleChangePassword($pdo, int $userId, string $logDir): void {
    $input       = json_decode(file_get_contents('php://input'), true);
    $currentPwd  = $input['current_password']  ?? '';
    $newPwd      = $input['new_password']       ?? '';
    $confirmPwd  = $input['confirm_password']   ?? '';

    if (!$currentPwd || !$newPwd || !$confirmPwd) {
        ob_end_clean();
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Tous les champs sont requis']);
        return;
    }

    if ($newPwd !== $confirmPwd) {
        ob_end_clean();
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Les nouveaux mots de passe ne correspondent pas']);
        return;
    }

    if (strlen($newPwd) < 8) {
        ob_end_clean();
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Le mot de passe doit contenir au moins 8 caractères']);
        return;
    }

    // Vérifier l'ancien mot de passe
    $stmt = $pdo->prepare("SELECT password FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row || !password_verify($currentPwd, $row['password'])) {
        ob_end_clean();
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Mot de passe actuel incorrect']);
        return;
    }


    $hash = password_hash($newPwd, PASSWORD_BCRYPT);
    $upd  = $pdo->prepare("UPDATE users SET password = ?, force_password_change = 0 WHERE id = ?");
    $upd->execute([$hash, $userId]);
    // Mettre à jour la session
    if (isset($_SESSION['user'])) {
        $_SESSION['user']['force_password_change'] = false;
    }

    file_put_contents("$logDir/profile.log",
        date('Y-m-d H:i:s') . " - Mot de passe changé pour user_id=$userId\n", FILE_APPEND);

    ob_end_clean();
    echo json_encode(['success' => true, 'message' => 'Mot de passe modifié avec succès']);
}
