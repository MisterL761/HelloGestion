<?php

session_start();

if (!isset($_SESSION['user'])) {
    header('Content-Type: application/json');
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Non authentifié']);
    exit;
}

ini_set('display_errors', 0);
error_reporting(E_ALL);

require_once __DIR__ . '/security.php';
setSecurityHeaders();

header('Content-Type: application/json; charset=utf-8');

try {
    require 'db.php';

    // Créer la table si elle n'existe pas encore
    $pdo->exec("CREATE TABLE IF NOT EXISTS stock_movements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        inventory_id INT NOT NULL,
        user_id INT,
        delta INT NOT NULL,
        moved_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )");

    // Top 5 articles les plus consommés sur le mois courant
    $stmt = $pdo->prepare("
        SELECT
            i.id,
            i.material,
            i.supplier,
            i.category,
            i.stock,
            i.threshold,
            ABS(SUM(sm.delta)) AS consumed
        FROM stock_movements sm
        JOIN inventory i ON i.id = sm.inventory_id
        WHERE sm.delta < 0
          AND sm.moved_at >= DATE_FORMAT(NOW(), '%Y-%m-01')
        GROUP BY i.id, i.material, i.supplier, i.category, i.stock, i.threshold
        ORDER BY consumed DESC
        LIMIT 5
    ");
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['success' => true, 'data' => $rows]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
