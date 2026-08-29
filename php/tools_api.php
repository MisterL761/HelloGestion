<?php
session_start();

if (!isset($_SESSION['user'])) {
    header('Content-Type: application/json');
    http_response_code(401);
    echo json_encode(['error' => true, 'message' => 'Non authentifié']);
    exit;
}

ini_set('display_errors', 0);
error_reporting(E_ALL);

$logDir   = __DIR__ . '/logs';
$uploadDir = __DIR__ . '/uploads/tools';
if (!file_exists($logDir))   mkdir($logDir,   0755, true);
if (!file_exists($uploadDir)) mkdir($uploadDir, 0755, true);

require_once __DIR__ . '/log_helper.php';
require_once __DIR__ . '/security.php';
setSecurityHeaders();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

ob_start();

function handleToolPhotoUpload(array $file): string {
    global $uploadDir, $logDir;

    validateUploadedFile($file);

    $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $fileName  = uniqid('tool_') . '.' . $extension;
    $filePath  = $uploadDir . '/' . $fileName;

    if (!move_uploaded_file($file['tmp_name'], $filePath)) {
        throw new Exception("Erreur lors de l'upload de la photo");
    }

    file_put_contents("$logDir/tools.log", date('Y-m-d H:i:s') . " - Photo uploadée: $fileName\n", FILE_APPEND);
    return '/hello-gestion/php/uploads/tools/' . $fileName;
}

function deleteToolPhoto(string $photoPath): void {
    if (!$photoPath) return;

    $relative = $photoPath;
    if (str_starts_with($relative, '/hello-gestion/php/')) {
        $relative = substr($relative, strlen('/hello-gestion/php/'));
    }
    $relative = ltrim($relative, '/');

    $safePath = validateUploadPath($relative, __DIR__);
    if ($safePath && file_exists($safePath)) {
        unlink($safePath);
    }
}

try {
    require 'db.php';
    require_once __DIR__ . '/roles.php';

    header('Content-Type: application/json; charset=utf-8');

    // Support _method=PUT override (pour multipart/form-data)
    $method = $_SERVER['REQUEST_METHOD'];
    if ($method === 'POST' && !empty($_GET['_method']) && strtoupper($_GET['_method']) === 'PUT') {
        $method = 'PUT';
    }

    switch ($method) {
        case 'GET':
            // Vérifie si la colonne photo existe (migration éventuelle)
            $cols = $pdo->query("SHOW COLUMNS FROM tools LIKE 'photo'")->rowCount();
            $select = $cols > 0
                ? "SELECT id, name, supplier, quantity, photo FROM tools ORDER BY name ASC"
                : "SELECT id, name, supplier, quantity, NULL AS photo FROM tools ORDER BY name ASC";
            $stmt   = $pdo->query($select);
            $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
            ob_end_clean();
            echo json_encode($result);
            break;

        case 'POST':
            $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
            if (strpos($contentType, 'multipart/form-data') !== false) {
                $data = [
                    'name'     => trim($_POST['name']     ?? ''),
                    'supplier' => trim($_POST['supplier'] ?? ''),
                    'quantity' => $_POST['quantity'] ?? null,
                ];
            } else {
                $input = file_get_contents('php://input');
                $data  = json_decode($input, true);
                file_put_contents("$logDir/tools_post.log", date('Y-m-d H:i:s') . " - JSON: " . print_r($data, true) . "\n", FILE_APPEND);
            }

            if (empty($data['name']) || !isset($data['quantity'])) {
                throw new Exception("Données manquantes");
            }

            // Vérifier doublon
            $checkStmt = $pdo->prepare("SELECT id FROM tools WHERE name = ? AND supplier = ?");
            $checkStmt->execute([$data['name'], $data['supplier'] ?? '']);
            if ($checkStmt->rowCount() > 0) {
                $existingId = $checkStmt->fetchColumn();
                ob_end_clean();
                echo json_encode(['success' => true, 'id' => $existingId, 'message' => 'Outil similaire déjà existant']);
                exit;
            }

            $photoPath = null;
            if (!empty($_FILES['photo']) && $_FILES['photo']['error'] === UPLOAD_ERR_OK) {
                $photoPath = handleToolPhotoUpload($_FILES['photo']);
            }

            $stmt   = $pdo->prepare("INSERT INTO tools (name, supplier, quantity, photo) VALUES (?, ?, ?, ?)");
            $result = $stmt->execute([$data['name'], $data['supplier'] ?? '', intval($data['quantity']), $photoPath]);

            if ($result) {
                $insertId = $pdo->lastInsertId();
                appLog('outils', who() . " a ajouté l'outil « {$data['name']} » (qté : {$data['quantity']})");
                ob_end_clean();
                echo json_encode(['success' => true, 'id' => $insertId]);
            } else {
                throw new Exception("Erreur lors de l'opération.");
            }
            break;

        case 'PUT':
            $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
            if (strpos($contentType, 'multipart/form-data') !== false) {
                $data = [
                    'id'       => intval($_POST['id']       ?? 0),
                    'name'     => trim($_POST['name']       ?? ''),
                    'supplier' => trim($_POST['supplier']   ?? ''),
                    'quantity' => $_POST['quantity']        ?? null,
                ];
            } else {
                $input = file_get_contents('php://input');
                $data  = json_decode($input, true);
            }

            if (empty($data['id']) || empty($data['name']) || !isset($data['quantity'])) {
                throw new Exception("Données manquantes");
            }

            // Gestion photo
            $removePhoto = !empty($_POST['remove_photo']);
            if ($removePhoto) {
                // Supprimer l'ancienne photo
                $oldStmt = $pdo->prepare("SELECT photo FROM tools WHERE id = ?");
                $oldStmt->execute([$data['id']]);
                $oldPhoto = $oldStmt->fetchColumn();
                if ($oldPhoto) deleteToolPhoto($oldPhoto);

                $stmt   = $pdo->prepare("UPDATE tools SET name = ?, supplier = ?, quantity = ?, photo = NULL WHERE id = ?");
                $result = $stmt->execute([$data['name'], $data['supplier'], intval($data['quantity']), $data['id']]);
            } elseif (!empty($_FILES['photo']) && $_FILES['photo']['error'] === UPLOAD_ERR_OK) {
                // Remplacer la photo
                $oldStmt = $pdo->prepare("SELECT photo FROM tools WHERE id = ?");
                $oldStmt->execute([$data['id']]);
                $oldPhoto = $oldStmt->fetchColumn();
                if ($oldPhoto) deleteToolPhoto($oldPhoto);

                $newPhoto = handleToolPhotoUpload($_FILES['photo']);
                $stmt     = $pdo->prepare("UPDATE tools SET name = ?, supplier = ?, quantity = ?, photo = ? WHERE id = ?");
                $result   = $stmt->execute([$data['name'], $data['supplier'], intval($data['quantity']), $newPhoto, $data['id']]);
            } else {
                // Pas de changement photo
                $stmt   = $pdo->prepare("UPDATE tools SET name = ?, supplier = ?, quantity = ? WHERE id = ?");
                $result = $stmt->execute([$data['name'], $data['supplier'], intval($data['quantity']), $data['id']]);
            }

            if ($result) {
                appLog('outils', who() . " a modifié l'outil « {$data['name']} » (qté : {$data['quantity']})");
                ob_end_clean();
                echo json_encode(['success' => true]);
            } else {
                throw new Exception("Erreur lors de l'opération.");
            }
            break;

        case 'DELETE':
            $id = isset($_GET['id']) ? intval($_GET['id']) : null;
            if (!$id) throw new Exception("ID manquant");

            $tStmt = $pdo->prepare("SELECT name, photo FROM tools WHERE id = ?");
            $tStmt->execute([$id]);
            $tRow = $tStmt->fetch(PDO::FETCH_ASSOC);

            if ($tRow && $tRow['photo']) {
                deleteToolPhoto($tRow['photo']);
            }

            $stmt   = $pdo->prepare("DELETE FROM tools WHERE id = ?");
            $result = $stmt->execute([$id]);

            if ($result) {
                appLog('outils', who() . " a supprimé l'outil « " . ($tRow['name'] ?? "id $id") . " »");
                ob_end_clean();
                echo json_encode(['success' => true]);
            } else {
                throw new Exception("Erreur lors de l'opération.");
            }
            break;

        default:
            http_response_code(405);
            ob_end_clean();
            echo json_encode(['error' => true, 'message' => 'Méthode non autorisée']);
            break;
    }

} catch (Exception $e) {
    file_put_contents("$logDir/tools_error.log", date('Y-m-d H:i:s') . " - Erreur: " . $e->getMessage() . "\n", FILE_APPEND);
    http_response_code(500);
    ob_end_clean();
    echo json_encode(['error' => true, 'message' => $e->getMessage()]);
}
?>
