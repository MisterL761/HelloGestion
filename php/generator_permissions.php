<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| Hello Gestion - Droits du Générateur de descriptifs
|--------------------------------------------------------------------------
| Lotfi (ID 24) est le seul administrateur de cette gestion.
|
| Actions :
|   GET  ?action=me
|   GET  ?action=list
|   POST {action:"save", user_id, can_add, can_edit, can_delete}
|
| La session existante de Hello Gestion est utilisée.
|--------------------------------------------------------------------------
*/

require_once __DIR__ . '/config.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/db.php';

header('Content-Type: application/json; charset=utf-8');

const GENERATOR_ADMIN_ID = 24;

function jsonResponse(bool $success, array $data = [], int $status = 200): void
{
    http_response_code($status);

    echo json_encode(
        array_merge(
            ['success' => $success],
            $data
        ),
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );

    exit;
}

function currentUser(): array
{
    if (
        !isset($_SESSION['user']) ||
        !is_array($_SESSION['user']) ||
        !isset($_SESSION['user']['id'])
    ) {
        jsonResponse(
            false,
            ['message' => 'Utilisateur non connecté.'],
            401
        );
    }

    return $_SESSION['user'];
}

function requireAdmin(array $user): void
{
    if ((int)$user['id'] !== GENERATOR_ADMIN_ID) {
        jsonResponse(
            false,
            ['message' => 'Accès réservé à Lotfi.'],
            403
        );
    }
}

function ensureTables(PDO $pdo): void
{
    $pdo->exec("\n        CREATE TABLE IF NOT EXISTS generator_permissions (\n            id INT NOT NULL AUTO_INCREMENT,\n            user_id INT NOT NULL,\n            can_add TINYINT(1) NOT NULL DEFAULT 0,\n            can_edit TINYINT(1) NOT NULL DEFAULT 0,\n            can_delete TINYINT(1) NOT NULL DEFAULT 0,\n            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,\n            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,\n            PRIMARY KEY (id),\n            UNIQUE KEY unique_user (user_id)\n        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci\n    ");

    $pdo->exec("\n        CREATE TABLE IF NOT EXISTS generator_permission_notifications (\n            id INT NOT NULL AUTO_INCREMENT,\n            user_id INT NOT NULL,\n            title VARCHAR(255) NOT NULL,\n            message TEXT NOT NULL,\n            is_read TINYINT(1) NOT NULL DEFAULT 0,\n            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,\n            PRIMARY KEY (id),\n            KEY idx_user_read (user_id, is_read, created_at)\n        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci\n    ");
}

function getPermissions(PDO $pdo, int $userId): array
{
    $stmt = $pdo->prepare("\n        SELECT can_add, can_edit, can_delete\n        FROM generator_permissions\n        WHERE user_id = ?\n        LIMIT 1\n    ");

    $stmt->execute([$userId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        return [
            'can_add' => false,
            'can_edit' => false,
            'can_delete' => false
        ];
    }

    return [
        'can_add' => (bool)$row['can_add'],
        'can_edit' => (bool)$row['can_edit'],
        'can_delete' => (bool)$row['can_delete']
    ];
}

function readJsonBody(): array
{
    $raw = file_get_contents('php://input');

    if ($raw === false || trim($raw) === '') {
        return [];
    }

    $data = json_decode($raw, true);

    return is_array($data) ? $data : [];
}

try {
    $user = currentUser();
    ensureTables($pdo);

    $action = trim((string)($_GET['action'] ?? $_POST['action'] ?? ''));
    $json = readJsonBody();

    if ($action === '' && isset($json['action'])) {
        $action = trim((string)$json['action']);
    }

    /* ----------------------------------------------------------------------
       ME : permet au React de savoir immédiatement si l'utilisateur est Lotfi
       ---------------------------------------------------------------------- */
    if ($action === 'me') {
        $userId = (int)$user['id'];
        $isAdmin = $userId === GENERATOR_ADMIN_ID;

        jsonResponse(true, [
            'user' => [
                'id' => $userId,
                'name' => $user['name'] ?? '',
                'email' => $user['email'] ?? '',
                'role' => $user['role'] ?? ''
            ],
            'is_admin' => $isAdmin,
            'permissions' => $isAdmin
                ? [
                    'can_add' => true,
                    'can_edit' => true,
                    'can_delete' => true
                ]
                : getPermissions($pdo, $userId)
        ]);
    }

    /* ----------------------------------------------------------------------
       LIST : réservé à Lotfi
       ---------------------------------------------------------------------- */
    if ($action === 'list') {
        requireAdmin($user);

        $stmt = $pdo->query("\n            SELECT\n                u.id,\n                u.name,\n                u.email,\n                u.role,\n                u.position,\n                COALESCE(gp.can_add, 0) AS can_add,\n                COALESCE(gp.can_edit, 0) AS can_edit,\n                COALESCE(gp.can_delete, 0) AS can_delete\n            FROM users u\n            LEFT JOIN generator_permissions gp\n                ON gp.user_id = u.id\n            WHERE u.status = 'active'\n              AND u.id <> " . GENERATOR_ADMIN_ID . "\n            ORDER BY u.name ASC\n        ");

        $users = [];

        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $users[] = [
                'id' => (int)$row['id'],
                'name' => $row['name'] ?? '',
                'email' => $row['email'] ?? '',
                'role' => $row['role'] ?? '',
                'position' => $row['position'] ?? '',
                'permissions' => [
                    'can_add' => (bool)$row['can_add'],
                    'can_edit' => (bool)$row['can_edit'],
                    'can_delete' => (bool)$row['can_delete']
                ]
            ];
        }

        jsonResponse(true, ['users' => $users]);
    }

    /* ----------------------------------------------------------------------
       SAVE : réservé à Lotfi
       ---------------------------------------------------------------------- */
    if ($action === 'save') {
        requireAdmin($user);

        $targetUserId = (int)($json['user_id'] ?? $_POST['user_id'] ?? 0);

        if ($targetUserId <= 0) {
            jsonResponse(
                false,
                ['message' => 'Utilisateur cible manquant.'],
                400
            );
        }

        if ($targetUserId === GENERATOR_ADMIN_ID) {
            jsonResponse(
                false,
                ['message' => 'Les droits de Lotfi ne peuvent pas être modifiés ici.'],
                400
            );
        }

        $checkUser = $pdo->prepare("\n            SELECT id, name\n            FROM users\n            WHERE id = ?\n              AND status = 'active'\n            LIMIT 1\n        ");

        $checkUser->execute([$targetUserId]);
        $target = $checkUser->fetch(PDO::FETCH_ASSOC);

        if (!$target) {
            jsonResponse(
                false,
                ['message' => 'Utilisateur introuvable ou inactif.'],
                404
            );
        }

        $canAdd = !empty($json['can_add']) ? 1 : 0;
        $canEdit = !empty($json['can_edit']) ? 1 : 0;
        $canDelete = !empty($json['can_delete']) ? 1 : 0;

        $stmt = $pdo->prepare("\n            INSERT INTO generator_permissions\n                (user_id, can_add, can_edit, can_delete)\n            VALUES\n                (?, ?, ?, ?)\n            ON DUPLICATE KEY UPDATE\n                can_add = VALUES(can_add),\n                can_edit = VALUES(can_edit),\n                can_delete = VALUES(can_delete)\n        ");

        $stmt->execute([
            $targetUserId,
            $canAdd,
            $canEdit,
            $canDelete
        ]);

        $enabled = [];
        if ($canAdd) $enabled[] = 'Ajouter';
        if ($canEdit) $enabled[] = 'Modifier';
        if ($canDelete) $enabled[] = 'Supprimer';

        $rightsText = $enabled
            ? implode(', ', $enabled)
            : 'aucun droit';

        $notification = $pdo->prepare("\n            INSERT INTO generator_permission_notifications\n                (user_id, title, message, is_read, created_at)\n            VALUES\n                (?, ?, ?, 0, NOW())\n        ");

        $notification->execute([
            $targetUserId,
            'Nouveaux droits du générateur',
            'Lotfi vous a donné les droits suivants pour le Générateur de descriptifs : ' . $rightsText . '.'
        ]);

        jsonResponse(true, [
            'message' => 'Droits enregistrés.',
            'user_id' => $targetUserId,
            'permissions' => [
                'can_add' => (bool)$canAdd,
                'can_edit' => (bool)$canEdit,
                'can_delete' => (bool)$canDelete
            ]
        ]);
    }

    /* ----------------------------------------------------------------------
       NOTIFICATIONS : lecture pour l'utilisateur connecté
       ---------------------------------------------------------------------- */
    if ($action === 'notifications') {
        $stmt = $pdo->prepare("\n            SELECT id, title, message, is_read, created_at\n            FROM generator_permission_notifications\n            WHERE user_id = ?\n            ORDER BY created_at DESC\n            LIMIT 20\n        ");

        $stmt->execute([(int)$user['id']]);

        $notifications = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $notifications[] = [
                'id' => (int)$row['id'],
                'title' => $row['title'],
                'message' => $row['message'],
                'is_read' => (bool)$row['is_read'],
                'created_at' => $row['created_at']
            ];
        }

        $unread = 0;
        foreach ($notifications as $notification) {
            if (!$notification['is_read']) {
                $unread++;
            }
        }

        jsonResponse(true, [
            'notifications' => $notifications,
            'unread_count' => $unread
        ]);
    }

    /* ----------------------------------------------------------------------
       MARK READ
       ---------------------------------------------------------------------- */
    if ($action === 'mark_notification_read') {
        $notificationId = (int)($json['id'] ?? $_POST['id'] ?? 0);

        if ($notificationId <= 0) {
            jsonResponse(false, ['message' => 'Notification manquante.'], 400);
        }

        $stmt = $pdo->prepare("\n            UPDATE generator_permission_notifications\n            SET is_read = 1\n            WHERE id = ?\n              AND user_id = ?\n        ");

        $stmt->execute([
            $notificationId,
            (int)$user['id']
        ]);

        jsonResponse(true);
    }

    /* ----------------------------------------------------------------------
       MARK ALL NOTIFICATIONS READ
       ---------------------------------------------------------------------- */
    if ($action === 'mark_all_notifications_read') {
        $stmt = $pdo->prepare("
            UPDATE generator_permission_notifications
            SET is_read = 1
            WHERE user_id = ?
              AND is_read = 0
        ");

        $stmt->execute([
            (int)$user['id']
        ]);

        jsonResponse(true, [
            'message' => 'Toutes les notifications de droits ont été marquées comme lues.'
        ]);
    }

    /* ----------------------------------------------------------------------
       CLEAR NOTIFICATIONS
       ---------------------------------------------------------------------- */
    if ($action === 'clear_notifications') {
        $stmt = $pdo->prepare("
            DELETE FROM generator_permission_notifications
            WHERE user_id = ?
        ");

        $stmt->execute([
            (int)$user['id']
        ]);

        jsonResponse(true, [
            'message' => 'Historique des notifications de droits supprimé.'
        ]);
    }

    jsonResponse(
        false,
        [
            'message' => 'Action inconnue.'
        ],
        400
    );

} catch (Throwable $e) {
    error_log(
        'generator_permissions.php : ' .
        $e->getMessage()
    );

    jsonResponse(
        false,
        [
            'message' => 'Erreur serveur lors de la gestion des droits.'
        ],
        500
    );
}
