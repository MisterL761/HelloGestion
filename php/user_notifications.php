<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| Hello Gestion - Notifications utilisateurs
|--------------------------------------------------------------------------
| Notifications internes de rupture de stock.
|
| Table utilisée :
| stock_user_notifications
|
| Colonnes :
| id, user_id, claimed_by, claimed_at, inventory_id,
| title, message, is_read, created_at
|--------------------------------------------------------------------------
*/

require_once __DIR__ . '/config.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/db.php';

header('Content-Type: application/json; charset=utf-8');


// ============================================================================
// RÉPONSE JSON
// ============================================================================

function notificationJson(
    bool $success,
    array $data = [],
    int $status = 200
): void {

    http_response_code($status);

    echo json_encode(
        array_merge(
            [
                'success' => $success
            ],
            $data
        ),
        JSON_UNESCAPED_UNICODE |
        JSON_UNESCAPED_SLASHES
    );

    exit;
}


// ============================================================================
// UTILISATEUR CONNECTÉ
// ============================================================================

$userId = null;

if (
    isset($_SESSION['user']) &&
    is_array($_SESSION['user']) &&
    isset($_SESSION['user']['id'])
) {
    $userId = (int) $_SESSION['user']['id'];
}

if (!$userId) {

    notificationJson(
        false,
        [
            'message' => 'Utilisateur non connecté.'
        ],
        401
    );
}


// ============================================================================
// RÉCUPÉRATION DE L'ACTION
// ============================================================================

$action = '';

if (isset($_GET['action'])) {
    $action = trim((string) $_GET['action']);
}

if ($action === '' && isset($_POST['action'])) {
    $action = trim((string) $_POST['action']);
}


// ============================================================================
// JSON BODY
// ============================================================================

$jsonInput = [];

$rawInput = file_get_contents('php://input');

if ($rawInput !== false && trim($rawInput) !== '') {

    $decoded = json_decode(
        $rawInput,
        true
    );

    if (is_array($decoded)) {
        $jsonInput = $decoded;
    }
}

if (
    $action === '' &&
    isset($jsonInput['action'])
) {
    $action = trim(
        (string) $jsonInput['action']
    );
}


// ============================================================================
// ID NOTIFICATION
// ============================================================================

$notificationId = 0;

if (isset($_GET['id'])) {
    $notificationId = (int) $_GET['id'];
}

if (
    !$notificationId &&
    isset($_POST['id'])
) {
    $notificationId = (int) $_POST['id'];
}

if (
    !$notificationId &&
    isset($jsonInput['id'])
) {
    $notificationId = (int) $jsonInput['id'];
}


// ============================================================================
// CRÉATION DES NOTIFICATIONS DE RUPTURE
// ============================================================================

function createStockRuptureNotifications(
    PDO $pdo,
    int $inventoryId,
    string $material
): bool {

    $recipientIds = [
        24, // Lotfi
        8,  // Henrique
        1   // Sébastien
    ];

    $title = '⚠️ Rupture de stock';

    $message =
        trim($material) .
        ' est en rupture de stock';


    // ------------------------------------------------------------
    // Vérifier que l'article existe
    // ------------------------------------------------------------

    $inventoryCheck = $pdo->prepare(
        '
        SELECT id
        FROM inventory
        WHERE id = ?
        LIMIT 1
        '
    );

    $inventoryCheck->execute([
        $inventoryId
    ]);

    if (!$inventoryCheck->fetchColumn()) {
        return false;
    }


    // ------------------------------------------------------------
    // Transaction
    // ------------------------------------------------------------

    try {

        $pdo->beginTransaction();


        // --------------------------------------------------------
        // Pour chaque utilisateur
        // --------------------------------------------------------

        $duplicateCheck = $pdo->prepare(
            '
            SELECT id
            FROM stock_user_notifications
            WHERE user_id = ?
              AND inventory_id = ?
              AND title = ?
              AND claimed_by IS NULL
            LIMIT 1
            '
        );


        $insert = $pdo->prepare(
            '
            INSERT INTO stock_user_notifications
            (
                user_id,
                claimed_by,
                claimed_at,
                inventory_id,
                title,
                message,
                is_read,
                created_at
            )
            VALUES
            (
                ?,
                NULL,
                NULL,
                ?,
                ?,
                ?,
                0,
                NOW()
            )
            '
        );


        foreach ($recipientIds as $recipientId) {

            $duplicateCheck->execute([
                $recipientId,
                $inventoryId,
                $title
            ]);

            $alreadyExists =
                $duplicateCheck->fetchColumn();

            if ($alreadyExists) {
                continue;
            }


            $insert->execute([
                $recipientId,
                $inventoryId,
                $title,
                $message
            ]);
        }


        $pdo->commit();

        return true;

    } catch (Throwable $e) {

        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }

        error_log(
            '[Hello Gestion Notifications] ' .
            $e->getMessage()
        );

        return false;
    }
}


// ============================================================================
// ACTION : LIST
// ============================================================================

if ($action === 'list') {

    try {

        $stmt = $pdo->prepare(
            '
            SELECT
                n.id,
                n.user_id,
                n.claimed_by,
                n.claimed_at,
                n.inventory_id,
                n.title,
                n.message,
                n.is_read,
                n.created_at,

                claimer.name AS claimed_by_name

            FROM stock_user_notifications n

            LEFT JOIN users claimer
                ON claimer.id = n.claimed_by

            WHERE n.user_id = ?

            ORDER BY
                n.created_at DESC,
                n.id DESC
            '
        );

        $stmt->execute([
            $userId
        ]);

        $notifications =
            $stmt->fetchAll(
                PDO::FETCH_ASSOC
            );


        $unreadStmt = $pdo->prepare(
            '
            SELECT COUNT(*)
            FROM stock_user_notifications
            WHERE user_id = ?
              AND is_read = 0
            '
        );

        $unreadStmt->execute([
            $userId
        ]);

        $unreadCount =
            (int) $unreadStmt->fetchColumn();


        notificationJson(
            true,
            [
                'notifications' => $notifications,
                'unread_count' => $unreadCount
            ]
        );

    } catch (Throwable $e) {

        error_log(
            '[Hello Gestion Notifications] LIST : ' .
            $e->getMessage()
        );

        notificationJson(
            false,
            [
                'message' =>
                    'Impossible de récupérer les notifications.'
            ],
            500
        );
    }
}


// ============================================================================
// ACTION : UNREAD COUNT
// ============================================================================

if ($action === 'unread_count') {

    try {

        $stmt = $pdo->prepare(
            '
            SELECT COUNT(*)
            FROM stock_user_notifications
            WHERE user_id = ?
              AND is_read = 0
            '
        );

        $stmt->execute([
            $userId
        ]);

        $count =
            (int) $stmt->fetchColumn();


        notificationJson(
            true,
            [
                'unread_count' => $count
            ]
        );

    } catch (Throwable $e) {

        notificationJson(
            false,
            [
                'message' =>
                    'Impossible de récupérer le compteur.'
            ],
            500
        );
    }
}


// ============================================================================
// ACTION : MARK READ
// ============================================================================

if ($action === 'mark_read') {

    if ($notificationId <= 0) {

        notificationJson(
            false,
            [
                'message' =>
                    'Notification invalide.'
            ],
            400
        );
    }


    $stmt = $pdo->prepare(
        '
        UPDATE stock_user_notifications

        SET is_read = 1

        WHERE id = ?
          AND user_id = ?
        '
    );

    $stmt->execute([
        $notificationId,
        $userId
    ]);


    notificationJson(
        true,
        [
            'message' =>
                'Notification marquée comme lue.'
        ]
    );
}


// ============================================================================
// ACTION : MARK ALL READ
// ============================================================================

if ($action === 'mark_all_read') {

    $stmt = $pdo->prepare(
        '
        UPDATE stock_user_notifications

        SET is_read = 1

        WHERE user_id = ?
          AND is_read = 0
        '
    );

    $stmt->execute([
        $userId
    ]);


    notificationJson(
        true,
        [
            'message' =>
                'Toutes les notifications ont été marquées comme lues.'
        ]
    );
}


// ============================================================================
// ACTION : CLAIM
// ============================================================================

if ($action === 'claim') {

    if ($notificationId <= 0) {

        notificationJson(
            false,
            [
                'message' =>
                    'Notification invalide.'
            ],
            400
        );
    }


    try {

        $pdo->beginTransaction();


        // --------------------------------------------------------
        // Vérifier la notification
        // --------------------------------------------------------

        $check = $pdo->prepare(
            '
            SELECT
                id,
                inventory_id,
                claimed_by

            FROM stock_user_notifications

            WHERE id = ?
              AND user_id = ?

            FOR UPDATE
            '
        );

        $check->execute([
            $notificationId,
            $userId
        ]);

        $notification =
            $check->fetch(
                PDO::FETCH_ASSOC
            );


        if (!$notification) {

            $pdo->rollBack();

            notificationJson(
                false,
                [
                    'message' =>
                        'Notification introuvable.'
                ],
                404
            );
        }


        if (
            !empty($notification['claimed_by'])
        ) {

            $pdo->rollBack();

            notificationJson(
                false,
                [
                    'message' =>
                        'Cette notification a déjà été prise en charge.'
                ],
                409
            );
        }


        // --------------------------------------------------------
        // Prise en charge de toutes les notifications
        // correspondant à la même rupture de stock
        // --------------------------------------------------------

        $update = $pdo->prepare(
            '
            UPDATE stock_user_notifications

            SET
                claimed_by = ?,
                claimed_at = NOW(),
                is_read = 1

            WHERE inventory_id = ?
              AND claimed_by IS NULL
            '
        );

        $update->execute([
            $userId,
            (int) $notification['inventory_id']
        ]);


        $pdo->commit();


        notificationJson(
            true,
            [
                'message' =>
                    'Notification prise en charge.'
            ]
        );

    } catch (Throwable $e) {

        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }

        error_log(
            '[Hello Gestion Notifications] CLAIM : ' .
            $e->getMessage()
        );

        notificationJson(
            false,
            [
                'message' =>
                    'Impossible de prendre en charge la notification.'
            ],
            500
        );
    }
}


// ============================================================================
// ACTION : CLEAR HISTORY
// ============================================================================
//
// IMPORTANT :
// On supprime réellement les lignes de l'utilisateur connecté.
// Elles ne réapparaîtront donc pas après F5.
//
// Cela ne supprime PAS les notifications des autres utilisateurs.
// ============================================================================

if ($action === 'clear_history') {

    try {

        $stmt = $pdo->prepare(
            '
            DELETE FROM stock_user_notifications
            WHERE user_id = ?
            '
        );

        $stmt->execute([
            $userId
        ]);


        $deletedCount =
            $stmt->rowCount();


        notificationJson(
            true,
            [
                'message' =>
                    'Historique des notifications supprimé.',
                'deleted_count' =>
                    $deletedCount
            ]
        );

    } catch (Throwable $e) {

        error_log(
            '[Hello Gestion Notifications] CLEAR HISTORY : ' .
            $e->getMessage()
        );

        notificationJson(
            false,
            [
                'message' =>
                    'Impossible de supprimer l’historique.'
            ],
            500
        );
    }
}


// ============================================================================
// ACTION INCONNUE
// ============================================================================

notificationJson(
    false,
    [
        'message' =>
            'Action inconnue.'
    ],
    400
);
?>
