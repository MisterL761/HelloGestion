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

    // Auth : tous les rôles sauf poseur
    $user = requireAuth();
    if ($user['role'] === 'poseur') {
        ob_end_clean();
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Accès refusé']);
        exit;
    }

    $userId = (int)$user['id'];
    $method = $_SERVER['REQUEST_METHOD'];

    $uploadDir = __DIR__ . '/uploads/catalogue/';
    if (!file_exists($uploadDir)) mkdir($uploadDir, 0755, true);

    $logDir = __DIR__ . '/logs';
    if (!file_exists($logDir)) mkdir($logDir, 0755, true);

    // Création de la table si elle n'existe pas encore
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS catalogue (
            id                INT AUTO_INCREMENT PRIMARY KEY,
            name              VARCHAR(255)  NOT NULL,
            category          VARCHAR(50)   NOT NULL DEFAULT 'magasin',
            file_path         VARCHAR(500)  NOT NULL,
            original_filename VARCHAR(255)  DEFAULT NULL,
            file_size         VARCHAR(50)   DEFAULT NULL,
            uploaded_by       INT           NOT NULL,
            created_at        TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");

    // Migration : ajout de la colonne category si absente (tables existantes)
    try {
        $pdo->exec("ALTER TABLE catalogue ADD COLUMN category VARCHAR(50) NOT NULL DEFAULT 'magasin' AFTER name");
    } catch (PDOException $e) {
        // Colonne déjà présente, on ignore
    }

    switch ($method) {
        case 'GET':    handleGet($pdo); break;
        case 'POST':   handlePost($pdo, $userId, $uploadDir, $logDir); break;
        case 'PUT':    handlePut($pdo, $userId, $logDir); break;
        case 'DELETE': handleDelete($pdo, $userId, $uploadDir, $logDir); break;
        default:
            http_response_code(405);
            ob_end_clean();
            echo json_encode(['success' => false, 'message' => 'Méthode non autorisée']);
    }
} catch (Exception $e) {
    error_log('catalogue error: ' . $e->getMessage());
    ob_end_clean();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erreur serveur']);
}

// ── GET : liste tous les documents ────────────────────────────

function handleGet($pdo): void {
    $stmt = $pdo->query("
        SELECT c.*, u.name AS uploaded_by_name
        FROM catalogue c
        JOIN users u ON c.uploaded_by = u.id
        ORDER BY c.created_at DESC
    ");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    ob_end_clean();
    echo json_encode(['success' => true, 'data' => $rows]);
}

// ── POST : upload d'un PDF ────────────────────────────────────

function handlePost($pdo, int $userId, string $uploadDir, string $logDir): void {
    $name     = trim($_POST['name']     ?? '');
    $category = trim($_POST['category'] ?? 'magasin');
    if (!in_array($category, ['magasin', 'pro'], true)) $category = 'magasin';

    if (!$name) {
        ob_end_clean();
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Nom obligatoire']);
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

    if ($mime !== 'application/pdf') {
        ob_end_clean();
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Seuls les fichiers PDF sont acceptés']);
        return;
    }

    if ($file['size'] > 20 * 1024 * 1024) {
        ob_end_clean();
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Fichier trop volumineux (max 20 Mo)']);
        return;
    }

    $filename = uniqid('cat_', true) . '.pdf';
    $destPath = $uploadDir . $filename;

    if (!move_uploaded_file($file['tmp_name'], $destPath)) {
        ob_end_clean();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => "Erreur lors de l'upload"]);
        return;
    }

    $sizeKb   = round($file['size'] / 1024);
    $fileSize = $sizeKb >= 1024
        ? round($sizeKb / 1024, 1) . ' MB'
        : $sizeKb . ' KB';

    $stmt = $pdo->prepare("
        INSERT INTO catalogue (name, category, file_path, original_filename, file_size, uploaded_by)
        VALUES (?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $name,
        $category,
        'uploads/catalogue/' . $filename,
        basename($file['name']),
        $fileSize,
        $userId,
    ]);

    $newId = $pdo->lastInsertId();
    file_put_contents("$logDir/catalogue.log",
        date('Y-m-d H:i:s') . " - Document catalogue ID=$newId ajouté par user_id=$userId\n", FILE_APPEND);

    ob_end_clean();
    echo json_encode(['success' => true, 'id' => (int)$newId, 'message' => 'Document ajouté']);
}

// ── PUT : renommer ────────────────────────────────────────────

function handlePut($pdo, int $userId, string $logDir): void {
    $body = json_decode(file_get_contents('php://input'), true);
    $id   = (int)($body['id']   ?? 0);
    $name = trim($body['name']  ?? '');

    if (!$id || !$name) {
        ob_end_clean();
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID et nom requis']);
        return;
    }

    $stmt = $pdo->prepare("SELECT id FROM catalogue WHERE id = ?");
    $stmt->execute([$id]);
    if (!$stmt->fetch()) {
        ob_end_clean();
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Document introuvable']);
        return;
    }

    $pdo->prepare("UPDATE catalogue SET name = ? WHERE id = ?")->execute([$name, $id]);

    file_put_contents("$logDir/catalogue.log",
        date('Y-m-d H:i:s') . " - Document catalogue ID=$id renommé en '$name' par user_id=$userId\n", FILE_APPEND);

    ob_end_clean();
    echo json_encode(['success' => true]);
}

// ── DELETE ────────────────────────────────────────────────────

function handleDelete($pdo, int $userId, string $uploadDir, string $logDir): void {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    if (!$id) {
        ob_end_clean();
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID manquant']);
        return;
    }

    $stmt = $pdo->prepare("SELECT file_path FROM catalogue WHERE id = ?");
    $stmt->execute([$id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        ob_end_clean();
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Document introuvable']);
        return;
    }

    // Suppression du fichier physique
    $absPath = __DIR__ . '/' . $row['file_path'];
    if (file_exists($absPath) && strpos(realpath($absPath), realpath($uploadDir)) === 0) {
        unlink($absPath);
    }

    $pdo->prepare("DELETE FROM catalogue WHERE id = ?")->execute([$id]);

    file_put_contents("$logDir/catalogue.log",
        date('Y-m-d H:i:s') . " - Document catalogue ID=$id supprimé par user_id=$userId\n", FILE_APPEND);

    ob_end_clean();
    echo json_encode(['success' => true, 'message' => 'Document supprimé']);
}
