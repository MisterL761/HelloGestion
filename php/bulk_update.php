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
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(0); }

ob_start();

try {
    require_once __DIR__ . '/db.php';
    require_once __DIR__ . '/roles.php';

    $user = requireAuth();

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        ob_end_clean();
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Méthode non autorisée']);
        exit;
    }

    $input = json_decode(file_get_contents('php://input'), true);
    $ids     = $input['ids']     ?? [];
    $updates = $input['updates'] ?? [];

    if (empty($ids) || !is_array($ids) || empty($updates)) {
        ob_end_clean();
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Données invalides']);
        exit;
    }

    // Champs autorisés à mettre à jour
    $allowed = ['material', 'supplier', 'category', 'stock', 'threshold', 'price', 'conditionnement'];

    $setClauses = [];
    $params     = [];

    foreach ($updates as $field => $value) {
        if (!in_array($field, $allowed, true)) continue;

        if ($field === 'stock' || $field === 'threshold') {
            $params[] = (int)$value;
        } elseif ($field === 'price') {
            $params[] = $value !== null && $value !== '' ? (float)$value : null;
        } else {
            $params[] = (string)$value;
        }
        $setClauses[] = "`$field` = ?";
    }

    if (empty($setClauses)) {
        ob_end_clean();
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Aucun champ valide à mettre à jour']);
        exit;
    }

    // Construire les placeholders pour les IDs
    $idPlaceholders = implode(',', array_fill(0, count($ids), '?'));
    $sql = 'UPDATE inventory SET ' . implode(', ', $setClauses) . " WHERE id IN ($idPlaceholders)";

    // Ajouter les IDs en fin de params
    foreach ($ids as $id) {
        $params[] = (int)$id;
    }

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    ob_end_clean();
    echo json_encode(['success' => true, 'updated' => $stmt->rowCount()]);

} catch (Exception $e) {
    error_log('bulk_update error: ' . $e->getMessage());
    ob_end_clean();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erreur serveur']);
}
