<?php
session_start();

if (!isset($_SESSION['user'])) {
    header('Content-Type: application/json');
    http_response_code(401);
    echo json_encode(['error' => true, 'message' => 'Non authentifié']);
    exit;
}

require_once __DIR__ . '/security.php';
require_once __DIR__ . '/push_helper.php';
setSecurityHeaders();
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

$logDir = __DIR__ . '/logs';
if (!file_exists($logDir)) mkdir($logDir, 0755, true);
require_once __DIR__ . '/log_helper.php';

// Nettoyage buffer
ob_start();

try {
    require 'db.php';
    require_once __DIR__ . '/roles.php';

    switch ($_SERVER['REQUEST_METHOD']) {
        case 'GET':
            $stmt = $pdo->query("SELECT id, received_id, product, supplier, quantity, installed_date, client, photos_paths FROM installed ORDER BY installed_date DESC");
            $result = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($result as &$item) {
                $item['client'] = $item['client'] ?? '';
                if (!empty($item['photos_paths']) && $item['photos_paths'] !== 'NULL') {
                    $decoded = json_decode($item['photos_paths'], true);
                    $item['photos_paths'] = is_array($decoded) ? $decoded : [];
                } else {
                    $item['photos_paths'] = [];
                }
                $item['date'] = $item['installed_date'];
            }

            ob_end_clean();
            echo json_encode($result);
            break;

        case 'POST':
            $input = file_get_contents('php://input');
            $data = json_decode($input, true);

            // Le backend attend "id" (de la table received)
            if (!isset($data['id'])) {
                throw new Exception("ID du produit manquant");
            }

            $stmt = $pdo->prepare("SELECT * FROM received WHERE id = ?");
            $stmt->execute([$data['id']]);
            $product = $stmt->fetch();

            if (!$product) {
                throw new Exception("Produit non trouvé");
            }

            $client = $data['client'] ?? $product['client'] ?? '';
            $photos_paths = null;

            if (!empty($data['photos_paths']) && is_array($data['photos_paths'])) {
                $photos_paths = json_encode($data['photos_paths']);
            } elseif (!empty($product['photos_paths'])) {
                $photos_paths = $product['photos_paths'];
            } elseif (!empty($product['photo_path'])) {
                $photos_paths = json_encode([$product['photo_path']]);
            }

            $pdo->beginTransaction();

            $stmt = $pdo->prepare("INSERT INTO installed (received_id, product, supplier, quantity, installed_date, client, photos_paths) VALUES (?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $product['id'],
                $product['product'],
                $product['supplier'],
                $data['quantity'] ?? 1,
                date('Y-m-d H:i:s'), // Date et Heure actuelle
                $client,
                $photos_paths
            ]);

            $insertId = $pdo->lastInsertId();

            $stmt = $pdo->prepare("DELETE FROM received WHERE id = ?");
            $stmt->execute([$product['id']]);

            $pdo->commit();
            appLog('actions', who() . " a marqué « {$product['product']} » comme posé (client : $client)");
            notifyAll($pdo, '✅ Produit posé', "« {$product['product']} » posé chez $client", ['url' => '/hello-gestion/']);
            ob_end_clean();
            echo json_encode(['success' => true, 'id' => $insertId]);
            break;

        case 'DELETE':
            // Support suppression via URL (?id=X) ou JSON Body ({ "id": X })
            $id = intval($_GET['id'] ?? 0);
            if (!$id) {
                $input = file_get_contents('php://input');
                $data = json_decode($input, true);
                $id = intval($data['id'] ?? 0);
            }

            if (!$id) throw new Exception("ID manquant");

            $stmt = $pdo->prepare("DELETE FROM installed WHERE id = ?");
            $stmt->execute([$id]);

            ob_end_clean();
            echo json_encode(['success' => true]);
            break;

        default:
            http_response_code(405);
            ob_end_clean();
            echo json_encode(['error' => true, 'message' => 'Méthode non autorisée']);
    }

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    ob_end_clean();
    echo json_encode(['error' => true, 'message' => $e->getMessage()]);
}
?>


