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
    require_once __DIR__ . '/push_helper.php';
    require_once __DIR__ . '/roles.php';

    header('Content-Type: application/json; charset=utf-8');

    $user   = requireAuth();
    $userId = (int)$user['id'];
    $method = $_SERVER['REQUEST_METHOD'];

    $logDir   = __DIR__ . '/logs';
    if (!file_exists($logDir)) mkdir($logDir, 0755, true);

    $uploadDir = __DIR__ . '/uploads/casier/';
    if (!file_exists($uploadDir)) mkdir($uploadDir, 0755, true);

    switch ($method) {
        case 'GET':
            handleGet($pdo, $userId);
            break;
        case 'POST':
            handlePost($pdo, $userId, $uploadDir, $logDir);
            break;
        case 'PUT':
            handlePut($pdo, $userId, $logDir);
            break;
        case 'DELETE':
            handleDelete($pdo, $userId, $uploadDir, $logDir);
            break;
        default:
            http_response_code(405);
            ob_end_clean();
            echo json_encode(['success' => false, 'message' => 'Méthode non autorisée']);
    }
} catch (Exception $e) {
    error_log('casier_documents error: ' . $e->getMessage());
    ob_end_clean();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erreur serveur']);
}

// ── GET ────────────────────────────────────────────────────
// Lecture depuis la table `documents` existante

function handleGet($pdo, int $currentUserId): void {
    $targetUserId = $currentUserId;
    if (isset($_GET['user_id']) && canViewAllCasiers()) {
        $targetUserId = (int)$_GET['user_id'];
    }

    // Filtre optionnel par catégorie
    $catFilter = $_GET['category'] ?? null;

    // Catégories casier : tout sauf les bulletins de paie natifs
    // On expose toutes les catégories ; le front filtrera si besoin
    if ($catFilter) {
        $stmt = $pdo->prepare("
            SELECT d.*, u.name AS uploaded_by_name
            FROM documents d
            JOIN users u ON d.uploaded_by = u.id
            WHERE d.user_id = ? AND d.category = ?
            ORDER BY d.created_at DESC
        ");
        $stmt->execute([$targetUserId, $catFilter]);
    } else {
        $stmt = $pdo->prepare("
            SELECT d.*, u.name AS uploaded_by_name
            FROM documents d
            JOIN users u ON d.uploaded_by = u.id
            WHERE d.user_id = ?
            ORDER BY d.created_at DESC
        ");
        $stmt->execute([$targetUserId]);
    }

    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    ob_end_clean();
    echo json_encode(['success' => true, 'data' => $rows]);
}

// ── POST : upload d'un document dans la table documents ────

function handlePost($pdo, int $currentUserId, string $uploadDir, string $logDir): void {
    // Seuls admin/administration peuvent uploader pour autrui
    $targetUserId = $currentUserId;
    if (!empty($_POST['user_id']) && canViewAllCasiers()) {
        $targetUserId = (int)$_POST['user_id'];
    }

    $name        = trim($_POST['title']       ?? '');
    $category    = trim($_POST['category']    ?? '');
    $description = trim($_POST['description'] ?? '');

    if (!$name || !$category) {
        ob_end_clean();
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Nom et catégorie obligatoires']);
        return;
    }

    if (empty($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        ob_end_clean();
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Fichier manquant ou erreur upload']);
        return;
    }

    $file  = $_FILES['file'];
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime  = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    $allowed = ['image/jpeg','image/png','image/gif','image/webp','application/pdf'];
    if (!in_array($mime, $allowed, true)) {
        ob_end_clean();
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Type de fichier non autorisé (jpg/png/pdf uniquement)']);
        return;
    }

    if ($file['size'] > 10 * 1024 * 1024) {
        ob_end_clean();
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Fichier trop volumineux (max 10 Mo)']);
        return;
    }

    $ext      = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = uniqid('doc_', true) . '.' . strtolower($ext);
    $destPath = $uploadDir . $filename;

    if (!move_uploaded_file($file['tmp_name'], $destPath)) {
        ob_end_clean();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => "Erreur lors de l'upload"]);
        return;
    }

    // Taille lisible (ex: "256 KB")
    $sizeKb   = round($file['size'] / 1024);
    $fileSize = $sizeKb >= 1024
        ? round($sizeKb / 1024, 1) . ' MB'
        : $sizeKb . ' KB';

    $stmt = $pdo->prepare("
        INSERT INTO documents (user_id, name, original_filename, file_path, category, file_size, uploaded_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $targetUserId,
        $name,
        basename($file['name']),
        'uploads/casier/' . $filename,
        $category,
        $fileSize,
        $currentUserId,
    ]);

    $newId = $pdo->lastInsertId();
    file_put_contents("$logDir/casier.log",
        date('Y-m-d H:i:s') . " - Document ID=$newId ajouté pour user_id=$targetUserId par $currentUserId\n", FILE_APPEND);

    // Notify managers about new document
    $managers = $pdo->query("SELECT id FROM users WHERE role IN ('admin','gerant','administration') AND status='active'")->fetchAll(PDO::FETCH_COLUMN);
    notifyAll($pdo, '📄 Nouveau document', $name . ' a été ajouté au casier', [
        'tag' => 'casier-doc',
        'url' => '/hello-gestion/?tab=casier'
    ], $managers);

    ob_end_clean();
    echo json_encode(['success' => true, 'id' => (int)$newId, 'message' => 'Document ajouté']);
}

// ── PUT : renommer/recatégoriser un document ────────────────

function handlePut($pdo, int $currentUserId, string $logDir): void {
    $body     = json_decode(file_get_contents('php://input'), true);
    $id       = (int)($body['id']       ?? 0);
    $name     = trim($body['name']      ?? '');
    $category = trim($body['category']  ?? '');

    if (!$id || !$name) {
        ob_end_clean();
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID et nom requis']);
        return;
    }

    $stmt = $pdo->prepare("SELECT user_id FROM documents WHERE id = ?");
    $stmt->execute([$id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        ob_end_clean();
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Document introuvable']);
        return;
    }

    if (!canViewAllCasiers() && (int)$row['user_id'] !== $currentUserId) {
        ob_end_clean();
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Accès refusé']);
        return;
    }

    if ($category) {
        $upd = $pdo->prepare("UPDATE documents SET name = ?, category = ? WHERE id = ?");
        $upd->execute([$name, $category, $id]);
    } else {
        $upd = $pdo->prepare("UPDATE documents SET name = ? WHERE id = ?");
        $upd->execute([$name, $id]);
    }

    file_put_contents("$logDir/casier.log",
        date('Y-m-d H:i:s') . " - Document ID=$id renommé en '$name'" . ($category ? " (cat: $category)" : '') . " par user_id=$currentUserId\n", FILE_APPEND);

    ob_end_clean();
    echo json_encode(['success' => true]);
}

// ── DELETE ─────────────────────────────────────────────────

function handleDelete($pdo, int $currentUserId, string $uploadDir, string $logDir): void {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    if (!$id) {
        ob_end_clean();
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID manquant']);
        return;
    }

    $stmt = $pdo->prepare("SELECT user_id, file_path FROM documents WHERE id = ?");
    $stmt->execute([$id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        ob_end_clean();
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Document introuvable']);
        return;
    }

    $isOwner = ($row['user_id'] === $currentUserId);
    $isAdmin = canViewAllCasiers();

    if (!$isOwner && !$isAdmin) {
        ob_end_clean();
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Accès refusé']);
        return;
    }

    // Supprimer le fichier physique uniquement s'il est dans le dossier casier
    $absPath = __DIR__ . '/' . $row['file_path'];
    if (
        file_exists($absPath) &&
        strpos(realpath($absPath), realpath($uploadDir)) === 0
    ) {
        unlink($absPath);
    }

    $del = $pdo->prepare("DELETE FROM documents WHERE id = ?");
    $del->execute([$id]);

    file_put_contents("$logDir/casier.log",
        date('Y-m-d H:i:s') . " - Document ID=$id supprimé par user_id=$currentUserId\n", FILE_APPEND);

    ob_end_clean();
    echo json_encode(['success' => true, 'message' => 'Document supprimé']);
}
