<?php
session_start();
require_once 'security.php';
setSecurityHeaders();
require_once 'db.php';

if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Non autorisé']);
    exit;
}

header('Content-Type: application/json');

try {
    $inventoryId = isset($_GET['inventory_id']) ? intval($_GET['inventory_id']) : null;

    $pdo->exec("CREATE TABLE IF NOT EXISTS price_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        inventory_id INT NOT NULL,
        user_id INT,
        old_price DECIMAL(10,2),
        new_price DECIMAL(10,2),
        changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )");

    if ($inventoryId) {
        $stmt = $pdo->prepare("
            SELECT ph.id, ph.old_price, ph.new_price, ph.changed_at,
                   COALESCE(u.name, 'Inconnu') as user_name
            FROM price_history ph
            LEFT JOIN users u ON ph.user_id = u.id
            WHERE ph.inventory_id = ?
            ORDER BY ph.changed_at DESC
            LIMIT 20
        ");
        $stmt->execute([$inventoryId]);
    } else {
        $stmt = $pdo->prepare("
            SELECT ph.id, ph.old_price, ph.new_price, ph.changed_at,
                   COALESCE(i.material, 'Article supprimé') as material,
                   COALESCE(i.supplier, '') as supplier,
                   COALESCE(u.name, 'Inconnu') as user_name
            FROM price_history ph
            LEFT JOIN inventory i ON ph.inventory_id = i.id
            LEFT JOIN users u ON ph.user_id = u.id
            ORDER BY ph.changed_at DESC
            LIMIT 100
        ");
        $stmt->execute();
    }

    $history = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($history);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
