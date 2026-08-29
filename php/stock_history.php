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
    $limit = isset($_GET['limit']) ? min(intval($_GET['limit']), 500) : 200;

    // Auto-create table if needed
    $pdo->exec("CREATE TABLE IF NOT EXISTS stock_movements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        inventory_id INT NOT NULL,
        user_id INT,
        delta INT NOT NULL,
        moved_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )");

    $stmt = $pdo->prepare("
        SELECT
            sm.id,
            sm.delta,
            sm.moved_at,
            COALESCE(i.material, 'Article supprimé') AS material,
            COALESCE(i.supplier, '') AS supplier,
            COALESCE(u.name, 'Inconnu') AS user_name
        FROM stock_movements sm
        LEFT JOIN inventory i ON sm.inventory_id = i.id
        LEFT JOIN users u ON sm.user_id = u.id
        ORDER BY sm.moved_at DESC
        LIMIT ?
    ");
    $stmt->execute([$limit]);
    $movements = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode($movements);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
