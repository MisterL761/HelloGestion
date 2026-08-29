<?php

ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/logs/php-error.log');
error_reporting(E_ALL);

session_set_cookie_params([
    'lifetime' => 1800, 'path' => '/',
    'secure'   => true, 'httponly' => true, 'samesite' => 'Strict',
]);
session_start();

require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: ' . ALLOWED_ORIGIN);
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ── Authentification obligatoire ──────────────────────────────────────────────
if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Non authentifié']);
    exit;
}

require_once __DIR__ . '/db.php';

$rawInput = file_get_contents('php://input');
$input    = $rawInput ? json_decode($rawInput, true) : null;

if ($rawInput && json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Format JSON invalide']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if (!function_exists('sendResponse')) {
    function sendResponse($success, $message, $data = null) {
        echo json_encode([
            'success' => $success,
            'message' => $message,
            'data'    => $data
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

switch ($action) {
    case 'products_received':
        handleProductsReceived($pdo, $method, $input);
        break;
    case 'products_installed':
        handleProductsInstalled($pdo, $method, $input);
        break;
    case 'inventory':
        handleInventory($pdo, $method, $input);
        break;
    case 'test':
        if (($_SESSION['user']['role'] ?? '') !== 'admin') {
            http_response_code(403);
            sendResponse(false, 'Accès refusé');
        }
        handleTest($pdo);
        break;
    default:
        http_response_code(400);
        sendResponse(false, 'Action non spécifiée');
}
function handleProductsReceived($pdo, $method, $input) {
    switch ($method) {
        case 'GET':    getProductsReceived($pdo); break;
        case 'POST':   addProductReceived($pdo, $input); break;
        case 'PUT':    updateProductReceived($pdo, $input); break;
        case 'DELETE': deleteProductReceived($pdo, $input); break;
        default:
            http_response_code(405);
            sendResponse(false, 'Méthode non autorisée');
    }
}

function getProductsReceived($pdo) {
    try {
        $stmt = $pdo->prepare("SELECT * FROM products_received ORDER BY date DESC");
        $stmt->execute();
        sendResponse(true, 'OK', $stmt->fetchAll(PDO::FETCH_ASSOC));
    } catch (PDOException $e) {
        http_response_code(500);
        error_log('BDD error: ' . $e->getMessage());
        sendResponse(false, 'Erreur base de données');
    }
}

function addProductReceived($pdo, $data) {
    if (!isset($data['product'], $data['supplier'], $data['quantity'], $data['date'])) {
        http_response_code(400);
        sendResponse(false, 'Données manquantes');
    }

    try {
        $stmt = $pdo->query("SELECT id FROM products_received ORDER BY id DESC LIMIT 1");
        $last = $stmt->fetch(PDO::FETCH_ASSOC);

        $newId = ($last && preg_match('/^#PR-(\d{4})$/', $last['id'], $m))
            ? '#PR-' . str_pad($m[1] + 1, 4, '0', STR_PAD_LEFT)
            : '#PR-1001';

        $stmt = $pdo->prepare("
            INSERT INTO products_received (id, product, supplier, quantity, date, status)
            VALUES (:id, :product, :supplier, :quantity, :date, 'Reçu')
        ");
        $stmt->execute([
            ':id'        => $newId,
            ':product'   => sanitizeInput($data['product']),
            ':supplier'  => sanitizeInput($data['supplier']),
            ':quantity'  => $data['quantity'],
            ':date'      => $data['date']
        ]);

        sendResponse(true, 'Produit ajouté', ['id' => $newId]);
    } catch (PDOException $e) {
        http_response_code(500);
        error_log('Error: ' . $e->getMessage());
        sendResponse(false, 'Une erreur est survenue');
    }
}

function updateProductReceived($pdo, $data) {
    if (empty($data['id'])) {
        http_response_code(400);
        sendResponse(false, 'ID manquant');
    }

    try {
        $fields = [];
        $params = [':id' => $data['id']];

        foreach (['product', 'supplier', 'quantity', 'date', 'status'] as $field) {
            if (isset($data[$field])) {
                $fields[] = "$field = :$field";
                $params[":$field"] = in_array($field, ['quantity']) ? $data[$field] : sanitizeInput($data[$field]);
            }
        }

        if (empty($fields)) {
            http_response_code(400);
            sendResponse(false, 'Aucune donnée à mettre à jour');
        }

        $stmt = $pdo->prepare("UPDATE products_received SET " . implode(', ', $fields) . " WHERE id = :id");
        $stmt->execute($params);
        sendResponse(true, 'Produit mis à jour');
    } catch (PDOException $e) {
        http_response_code(500);
        error_log('Error: ' . $e->getMessage());
        sendResponse(false, 'Une erreur est survenue');
    }
}

function deleteProductReceived($pdo, $data) {
    if (empty($data['id'])) {
        http_response_code(400);
        sendResponse(false, 'ID manquant');
    }

    try {
        $stmt = $pdo->prepare("DELETE FROM products_received WHERE id = :id");
        $stmt->execute([':id' => $data['id']]);
        sendResponse(true, 'Produit supprimé');
    } catch (PDOException $e) {
        http_response_code(500);
        error_log('Error: ' . $e->getMessage());
        sendResponse(false, 'Une erreur est survenue');
    }
}

function handleProductsInstalled($pdo, $method, $input) {
    switch ($method) {
        case 'GET':  getProductsInstalled($pdo); break;
        case 'POST': markAsInstalled($pdo, $input); break;
        default:
            http_response_code(405);
            sendResponse(false, 'Méthode non autorisée');
    }
}

function getProductsInstalled($pdo) {
    try {
        $stmt = $pdo->query("SELECT * FROM products_installed ORDER BY installed_date DESC");
        sendResponse(true, 'OK', $stmt->fetchAll(PDO::FETCH_ASSOC));
    } catch (PDOException $e) {
        http_response_code(500);
        error_log('Error: ' . $e->getMessage());
        sendResponse(false, 'Une erreur est survenue');

    }
}

function markAsInstalled($pdo, $data) {
    if (empty($data['product_id']) || empty($data['installed_date'])) {
        http_response_code(400);
        sendResponse(false, 'Données manquantes');
    }

    try {
        $stmt = $pdo->prepare("SELECT * FROM products_received WHERE id = :id");
        $stmt->execute([':id' => $data['product_id']]);
        $product = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$product) {
            http_response_code(404);
            sendResponse(false, 'Produit non trouvé');
        }

        $stmt = $pdo->query("SELECT id FROM products_installed ORDER BY id DESC LIMIT 1");
        $last = $stmt->fetch(PDO::FETCH_ASSOC);

        $newId = ($last && preg_match('/^#PI-(\d{4})$/', $last['id'], $m))
            ? '#PI-' . str_pad($m[1] + 1, 4, '0', STR_PAD_LEFT)
            : '#PI-1001';

        $stmt = $pdo->prepare("
            INSERT INTO products_installed (id, product, supplier, quantity, date, installed_date)
            VALUES (:id, :product, :supplier, :quantity, :date, :installed_date)
        ");
        $stmt->execute([
            ':id'             => $newId,
            ':product'        => $product['product'],
            ':supplier'       => $product['supplier'],
            ':quantity'       => $product['quantity'],
            ':date'           => $product['date'],
            ':installed_date' => $data['installed_date']
        ]);

        $stmt = $pdo->prepare("UPDATE products_received SET status = 'Posé' WHERE id = :id");
        $stmt->execute([':id' => $data['product_id']]);

        sendResponse(true, 'Produit posé', ['id' => $newId]);
    } catch (PDOException $e) {
        http_response_code(500);
        error_log('Error: ' . $e->getMessage());
        sendResponse(false, 'Une erreur est survenue');
    }
}

function handleInventory($pdo, $method, $input) {
    switch ($method) {
        case 'GET':    getInventoryItems($pdo); break;
        case 'POST':   addInventoryItem($pdo, $input); break;
        case 'PUT':    updateInventoryItem($pdo, $input); break;
        case 'DELETE': deleteInventoryItem($pdo, $input); break;
        default:
            http_response_code(405);
            sendResponse(false, 'Méthode non autorisée');
    }
}

function getInventoryItems($pdo) {
    try {
        $stmt = $pdo->query("SELECT * FROM inventory_items ORDER BY material ASC");
        sendResponse(true, 'OK', $stmt->fetchAll(PDO::FETCH_ASSOC));
    } catch (PDOException $e) {
        http_response_code(500);
        error_log('Error: ' . $e->getMessage());
        sendResponse(false, 'Une erreur est survenue');
    }
}

function addInventoryItem($pdo, $data) {
    if (!isset($data['material'], $data['supplier'], $data['category'], $data['stock'], $data['threshold'])) {
        http_response_code(400);
        sendResponse(false, 'Données manquantes');
    }

    try {
        $stmt = $pdo->query("SELECT id FROM inventory_items ORDER BY id DESC LIMIT 1");
        $last = $stmt->fetch(PDO::FETCH_ASSOC);

        $newId = ($last && preg_match('/^#INV-(\d{4})$/', $last['id'], $m))
            ? '#INV-' . str_pad($m[1] + 1, 4, '0', STR_PAD_LEFT)
            : '#INV-1001';

        $status = $data['stock'] == 0 ? 'Rupture' :
            ($data['stock'] < $data['threshold'] ? 'Faible Stock' : 'Disponible');

        $stmt = $pdo->prepare("
            INSERT INTO inventory_items (id, material, supplier, category, stock, threshold, status)
            VALUES (:id, :material, :supplier, :category, :stock, :threshold, :status)
        ");
        $stmt->execute([
            ':id'        => $newId,
            ':material'  => sanitizeInput($data['material']),
            ':supplier'  => sanitizeInput($data['supplier']),
            ':category'  => sanitizeInput($data['category']),
            ':stock'     => $data['stock'],
            ':threshold' => $data['threshold'],
            ':status'    => $status
        ]);

        sendResponse(true, 'Article ajouté', ['id' => $newId, 'status' => $status]);
    } catch (PDOException $e) {
        http_response_code(500);
        error_log('Error: ' . $e->getMessage());
        sendResponse(false, 'Une erreur est survenue');
    }
}

function updateInventoryItem($pdo, $data) {
    if (empty($data['id'])) {
        http_response_code(400);
        sendResponse(false, 'ID manquant');
    }

    try {
        $fields = [];
        $params = [':id' => $data['id']];

        foreach (['material', 'supplier', 'category', 'stock', 'threshold'] as $field) {
            if (isset($data[$field])) {
                $fields[] = "$field = :$field";
                $params[":$field"] = in_array($field, ['stock', 'threshold'])
                    ? $data[$field]
                    : sanitizeInput($data[$field]);
            }
        }

        if (!empty($data['stock']) || !empty($data['threshold'])) {
            $stmt = $pdo->prepare("SELECT stock, threshold FROM inventory_items WHERE id = :id");
            $stmt->execute([':id' => $data['id']]);
            $current = $stmt->fetch(PDO::FETCH_ASSOC);

            $stock = $data['stock'] ?? $current['stock'];
            $threshold = $data['threshold'] ?? $current['threshold'];
            $status = $stock == 0 ? 'Rupture' : ($stock < $threshold ? 'Faible Stock' : 'Disponible');

            $fields[] = "status = :status";
            $params[':status'] = $status;
        }

        if (empty($fields)) {
            http_response_code(400);
            sendResponse(false, 'Aucune donnée à mettre à jour');
        }

        $stmt = $pdo->prepare("UPDATE inventory_items SET " . implode(', ', $fields) . " WHERE id = :id");
        $stmt->execute($params);

        sendResponse(true, 'Article mis à jour');
    } catch (PDOException $e) {
        http_response_code(500);
        error_log('Error: ' . $e->getMessage());
        sendResponse(false, 'Une erreur est survenue');
    }
}

function deleteInventoryItem($pdo, $data) {
    if (empty($data['id'])) {
        http_response_code(400);
        sendResponse(false, 'ID manquant');
    }

    try {
        $stmt = $pdo->prepare("DELETE FROM inventory_items WHERE id = :id");
        $stmt->execute([':id' => $data['id']]);
        sendResponse(true, 'Article supprimé');
    } catch (PDOException $e) {
        http_response_code(500);
        error_log('Error: ' . $e->getMessage());
        sendResponse(false, 'Une erreur est survenue');
    }

}

function sanitizeInput($input) {
    return htmlspecialchars(strip_tags(trim($input)), ENT_QUOTES, 'UTF-8');
}

function handleTest($pdo) {
    try {
        $stmt = $pdo->query("SELECT NOW() AS server_time");
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        sendResponse(true, 'API opérationnelle ✅', [
            'server_time' => $result['server_time'],
            'database_status' => 'Connectée',
        ]);
    } catch (PDOException $e) {
        error_log('api.php test error: ' . $e->getMessage());
        http_response_code(500);
        sendResponse(false, 'Erreur de connexion BDD');
    }
}


?>
