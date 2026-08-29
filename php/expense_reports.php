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
    require_once __DIR__ . '/log_helper.php';
    require_once __DIR__ . '/push_helper.php';

    header('Content-Type: application/json; charset=utf-8');

    $user    = requireAuth();
    $userId  = (int)$user['id'];
    $method  = $_SERVER['REQUEST_METHOD'];

    $logDir = __DIR__ . '/logs';
    if (!file_exists($logDir)) mkdir($logDir, 0755, true);

    $uploadDir = __DIR__ . '/uploads/receipts/';
    if (!file_exists($uploadDir)) mkdir($uploadDir, 0755, true);

    switch ($method) {
        case 'GET':
            handleGet($pdo, $userId, $user);
            break;
        case 'POST':
            handlePost($pdo, $userId, $uploadDir, $logDir);
            break;
        case 'PUT':
            handlePut($pdo, $userId, $user, $logDir);
            break;
        case 'DELETE':
            handleDelete($pdo, $userId, $user, $uploadDir, $logDir);
            break;
        default:
            http_response_code(405);
            ob_end_clean();
            echo json_encode(['success' => false, 'message' => 'Méthode non autorisée']);
    }
} catch (Exception $e) {
    error_log('expense_reports error: ' . $e->getMessage());
    ob_end_clean();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erreur serveur']);
}

// ── GET : liste des notes de frais ─────────────────────────

function handleGet($pdo, int $currentUserId, array $currentUser): void {
    // Admin/gérant/administration voient tout ou filtrent par user_id
    $targetUserId = null;
    if (isset($_GET['user_id']) && canViewAllCasiers()) {
        $targetUserId = (int)$_GET['user_id'];
    }

    if (canValidateExpenses() && !$targetUserId) {
        // Retourne TOUTES les notes + infos utilisateur pour la vue superviseur
        $stmt = $pdo->prepare("
            SELECT er.*, u.name AS user_name, u.email, u.role AS user_role,
                   vb.name AS validated_by_name
            FROM expense_reports er
            JOIN users u  ON er.user_id = u.id
            LEFT JOIN users vb ON er.validated_by = vb.id
            ORDER BY er.created_at DESC
        ");
        $stmt->execute();
    } elseif ($targetUserId && canViewAllCasiers()) {
        $stmt = $pdo->prepare("
            SELECT er.*, u.name AS user_name, u.email, u.role AS user_role,
                   vb.name AS validated_by_name
            FROM expense_reports er
            JOIN users u  ON er.user_id = u.id
            LEFT JOIN users vb ON er.validated_by = vb.id
            WHERE er.user_id = ?
            ORDER BY er.created_at DESC
        ");
        $stmt->execute([$targetUserId]);
    } else {
        $stmt = $pdo->prepare("
            SELECT er.*, vb.name AS validated_by_name
            FROM expense_reports er
            LEFT JOIN users vb ON er.validated_by = vb.id
            WHERE er.user_id = ?
            ORDER BY er.created_at DESC
        ");
        $stmt->execute([$currentUserId]);
    }

    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    ob_end_clean();
    echo json_encode(['success' => true, 'data' => $rows]);
}

// ── POST : créer une note de frais ─────────────────────────

function handlePost($pdo, int $userId, string $uploadDir, string $logDir): void {
    $title       = trim($_POST['title']       ?? '');
    $category    = trim($_POST['category']    ?? '');
    $amount      = 0;   // champ supprimé du formulaire
    $description = '';  // champ supprimé du formulaire
    $expenseDate = date('Y-m-d'); // date automatique

    if (!$title || !$category) {
        ob_end_clean();
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Titre et catégorie obligatoires']);
        return;
    }

    // Justificatif (optionnel)
    $receiptPath = null;
    $receiptName = null;
    $receiptType = null;

    if (!empty($_FILES['receipt']) && $_FILES['receipt']['error'] === UPLOAD_ERR_OK) {
        $file     = $_FILES['receipt'];
        $finfo    = finfo_open(FILEINFO_MIME_TYPE);
        $mime     = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);

        $allowed = ['image/jpeg','image/png','image/gif','image/webp','application/pdf'];
        if (!in_array($mime, $allowed, true)) {
            ob_end_clean();
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Type de fichier non autorisé']);
            return;
        }

        if ($file['size'] > 5 * 1024 * 1024) {
            ob_end_clean();
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Fichier trop volumineux (max 5 Mo)']);
            return;
        }

        $ext      = pathinfo($file['name'], PATHINFO_EXTENSION);
        $filename = uniqid('receipt_', true) . '.' . strtolower($ext);
        $destPath = $uploadDir . $filename;

        if (!move_uploaded_file($file['tmp_name'], $destPath)) {
            ob_end_clean();
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => "Erreur lors de l'upload"]);
            return;
        }

        $receiptPath = 'uploads/receipts/' . $filename;
        $receiptName = basename($file['name']);
        $receiptType = $mime;
    }

    $stmt = $pdo->prepare("
        INSERT INTO expense_reports (user_id, title, amount, category, description, expense_date,
                                     receipt_path, receipt_name, receipt_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $userId, $title, (float)$amount, $category, $description, $expenseDate,
        $receiptPath, $receiptName, $receiptType
    ]);

    $newId = $pdo->lastInsertId();
    appLog('frais', who() . " a soumis la note de frais « $title » (catégorie : $category, id: $newId)");

    // Notifier les managers d'une nouvelle note de frais
    $submitterName = $_SESSION['user']['name'] ?? 'Un employé';
    $mgrIds = $pdo->query("SELECT id FROM users WHERE role IN ('admin','gerant','administration') AND status='active'")->fetchAll(PDO::FETCH_COLUMN);
    notifyAll($pdo, '💸 Note de frais soumise', "$submitterName a soumis une note de frais : « $title » ($category)", ['url' => '/hello-gestion/'], $mgrIds);

    ob_end_clean();
    echo json_encode(['success' => true, 'id' => (int)$newId, 'message' => 'Note de frais créée']);
}

// ── PUT : valider / rejeter une note de frais ──────────────

function handlePut($pdo, int $currentUserId, array $currentUser, string $logDir): void {
    $input = json_decode(file_get_contents('php://input'), true);
    $id     = isset($input['id'])     ? (int)$input['id']     : 0;
    $action = trim($input['action']  ?? ''); // 'validate' | 'reject'

    if (!$id || !$action) {
        ob_end_clean();
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Paramètres manquants']);
        return;
    }

    // Seuls gérant/admin peuvent valider/rejeter
    if (!canValidateExpenses()) {
        ob_end_clean();
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Accès refusé']);
        return;
    }

    if ($action === 'validate') {
        $stmt = $pdo->prepare("
            UPDATE expense_reports
            SET status = 'validee', validated_by = ?, validated_at = NOW(), rejection_reason = NULL
            WHERE id = ?
        ");
        $stmt->execute([$currentUserId, $id]);
    } elseif ($action === 'reject') {
        $reason = trim($input['rejection_reason'] ?? '');
        $stmt = $pdo->prepare("
            UPDATE expense_reports
            SET status = 'rejetee', validated_by = ?, validated_at = NOW(), rejection_reason = ?
            WHERE id = ?
        ");
        $stmt->execute([$currentUserId, $reason, $id]);
    } else {
        ob_end_clean();
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Action invalide']);
        return;
    }

    $expStmt = $pdo->prepare("SELECT er.title, er.user_id, u.name AS owner FROM expense_reports er JOIN users u ON er.user_id = u.id WHERE er.id = ?");
    $expStmt->execute([$id]);
    $expRow = $expStmt->fetch(PDO::FETCH_ASSOC);
    $expTitle = $expRow['title'] ?? "note #$id";
    $expOwner = $expRow['owner'] ?? '';
    $ownerId  = $expRow['user_id'] ?? null;
    if ($action === 'validate') {
        appLog('frais', who() . " a validé la note « $expTitle »" . ($expOwner ? " de $expOwner" : ""));
        // Notifier l'employé que sa note est validée
        if ($ownerId) notifyAll($pdo, '✅ Note de frais validée', "Votre note « $expTitle » a été validée.", ['url' => '/hello-gestion/'], [(int)$ownerId]);
    } else {
        appLog('frais', who() . " a rejeté la note « $expTitle »" . ($expOwner ? " de $expOwner" : ""));
        // Notifier l'employé que sa note est rejetée
        if ($ownerId) notifyAll($pdo, '❌ Note de frais rejetée', "Votre note « $expTitle » a été rejetée.", ['url' => '/hello-gestion/'], [(int)$ownerId]);
    }

    ob_end_clean();
    echo json_encode(['success' => true, 'message' => 'Statut mis à jour']);
}

// ── DELETE : supprimer une note de frais ───────────────────

function handleDelete($pdo, int $currentUserId, array $currentUser, string $uploadDir, string $logDir): void {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    if (!$id) {
        ob_end_clean();
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID manquant']);
        return;
    }

    // Vérifier que la note appartient à l'utilisateur (ou admin/gérant)
    $stmt = $pdo->prepare("SELECT user_id, receipt_path, status FROM expense_reports WHERE id = ?");
    $stmt->execute([$id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        ob_end_clean();
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Note introuvable']);
        return;
    }

    $isOwner = ($row['user_id'] === $currentUserId);
    $isAdmin = hasAnyRole(['admin', 'gerant']);

    if (!$isOwner && !$isAdmin) {
        ob_end_clean();
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Accès refusé']);
        return;
    }

    if ($row['status'] === 'validee' && !$isAdmin) {
        ob_end_clean();
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Impossible de supprimer une note déjà validée']);
        return;
    }

    if ($row['receipt_path']) {
        $absPath = __DIR__ . '/' . $row['receipt_path'];
        if (file_exists($absPath) && strpos(realpath($absPath), realpath($uploadDir)) === 0) {
            unlink($absPath);
        }
    }


    $del = $pdo->prepare("DELETE FROM expense_reports WHERE id = ?");
    $del->execute([$id]);

    file_put_contents("$logDir/expense_reports.log",
        date('Y-m-d H:i:s') . " - Note ID=$id supprimée par user_id=$currentUserId\n", FILE_APPEND);

    ob_end_clean();
    echo json_encode(['success' => true, 'message' => 'Note supprimée']);
}
