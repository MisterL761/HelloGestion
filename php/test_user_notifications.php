<?php

require_once __DIR__ . '/config.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/user_notifications.php';

header('Content-Type: application/json; charset=utf-8');

try {

    /*
    |--------------------------------------------------------------------------
    | RÉCUPÉRER UN ARTICLE DE TEST
    |--------------------------------------------------------------------------
    */

    $stmt = $pdo->query(
        "SELECT id, material
         FROM inventory
         ORDER BY id ASC
         LIMIT 1"
    );

    $inventory = $stmt->fetch(PDO::FETCH_ASSOC);


    if (!$inventory) {

        echo json_encode([
            'success' => false,
            'message' => 'Aucun article trouvé dans inventory'
        ], JSON_UNESCAPED_UNICODE);

        exit;
    }


    /*
    |--------------------------------------------------------------------------
    | CRÉER LES NOTIFICATIONS
    |--------------------------------------------------------------------------
    */

    $result = createStockRuptureNotifications(
        $pdo,
        (int) $inventory['id'],
        $inventory['material']
    );


    /*
    |--------------------------------------------------------------------------
    | RÉSULTAT
    |--------------------------------------------------------------------------
    */

    echo json_encode([
        'success' => $result,
        'message' => $result
            ? 'Notifications créées avec succès'
            : 'Impossible de créer les notifications',

        'inventory_id' => (int) $inventory['id'],

        'inventory_material' => $inventory['material'],

        'users' => [
            24,
            8,
            1
        ]

    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);


} catch (Throwable $e) {

    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' => 'Erreur',
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}