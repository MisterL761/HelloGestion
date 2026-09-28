<?php
// broadcast.php — Messages diffusés à tous les utilisateurs
session_set_cookie_params(['lifetime'=>1800,'path'=>'/','secure'=>true,'httponly'=>true,'samesite'=>'Strict']);
session_start();

$sessionTimeout = 1800;
if (isset($_SESSION['LAST_ACTIVITY']) && (time() - $_SESSION['LAST_ACTIVITY'] > $sessionTimeout)) {
    session_unset(); session_destroy(); session_start();
}
$_SESSION['LAST_ACTIVITY'] = time();

ini_set('display_errors', 0);
error_reporting(E_ALL);

header('Access-Control-Allow-Origin: ' . ALLOWED_ORIGIN);
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(0); }

ob_start();

try {
    require_once __DIR__ . '/db.php';
    require_once __DIR__ . '/push_helper.php';

    header('Content-Type: application/json; charset=utf-8');

    if (empty($_SESSION['user'])) {
        echo json_encode(['success' => false, 'message' => 'Non authentifié']);
        exit;
    }

    $userId   = (int) ($_SESSION['user']['id'] ?? 0);
    $userRole = $_SESSION['user']['role'] ?? '';
    $userName = $_SESSION['user']['name'] ?? 'Inconnu';

    // Rôles autorisés à envoyer un message
    $SENDER_ROLES = ['admin', 'gerant', 'administration'];

    // ─── Créer les tables si elles n'existent pas ───────────────────────────
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS broadcast_messages (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            sender_id   INT NOT NULL,
            sender_name VARCHAR(120) NOT NULL,
            sender_role VARCHAR(50)  NOT NULL DEFAULT '',
            message     TEXT         NOT NULL,
            created_at  DATETIME     DEFAULT NOW()
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS broadcast_reads (
            message_id  INT      NOT NULL,
            user_id     INT      NOT NULL,
            read_at     DATETIME DEFAULT NOW(),
            PRIMARY KEY (message_id, user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");

    $method = $_SERVER['REQUEST_METHOD'];

    // ─── GET — Messages non lus pour l'utilisateur courant ─────────────────
    if ($method === 'GET') {
        $action = $_GET['action'] ?? 'unread';

        if ($action === 'unread') {
            // Dernier message que cet user n'a pas encore lu
            $stmt = $pdo->prepare("
                SELECT bm.*
                FROM broadcast_messages bm
                LEFT JOIN broadcast_reads br
                    ON br.message_id = bm.id AND br.user_id = :uid
                WHERE br.message_id IS NULL
                ORDER BY bm.created_at DESC
                LIMIT 5
            ");
            $stmt->execute([':uid' => $userId]);
            $messages = $stmt->fetchAll();
            echo json_encode(['success' => true, 'messages' => $messages]);
        }

        elseif ($action === 'all') {
            // Liste complète (pour les expéditeurs autorisés)
            if (!in_array($userRole, $SENDER_ROLES)) {
                echo json_encode(['success' => false, 'message' => 'Accès refusé']);
                exit;
            }
            $stmt = $pdo->query("
                SELECT bm.*,
                    (SELECT COUNT(*) FROM broadcast_reads br WHERE br.message_id = bm.id) AS read_count
                FROM broadcast_messages bm
                ORDER BY bm.created_at DESC
                LIMIT 20
            ");
            echo json_encode(['success' => true, 'messages' => $stmt->fetchAll()]);
        }

        exit;
    }

    // ─── POST — Envoyer un message OU marquer comme lu ─────────────────────
    if ($method === 'POST') {
        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $action = $body['action'] ?? '';

        // Marquer comme lu
        if ($action === 'read') {
            $msgId = (int)($body['message_id'] ?? 0);
            if (!$msgId) { echo json_encode(['success' => false]); exit; }
            $stmt = $pdo->prepare("
                INSERT IGNORE INTO broadcast_reads (message_id, user_id) VALUES (:mid, :uid)
            ");
            $stmt->execute([':mid' => $msgId, ':uid' => $userId]);
            echo json_encode(['success' => true]);
            exit;
        }

        // Envoyer un nouveau message
        if ($action === 'send') {
            if (!in_array($userRole, $SENDER_ROLES)) {
                echo json_encode(['success' => false, 'message' => 'Accès refusé']);
                exit;
            }
            $message = trim($body['message'] ?? '');
            if (strlen($message) < 2) {
                echo json_encode(['success' => false, 'message' => 'Message trop court']);
                exit;
            }
            $stmt = $pdo->prepare("
                INSERT INTO broadcast_messages (sender_id, sender_name, sender_role, message)
                VALUES (:sid, :sname, :srole, :msg)
            ");
            $stmt->execute([
                ':sid'   => $userId,
                ':sname' => $userName,
                ':srole' => $userRole,
                ':msg'   => $message,
            ]);
            $newId = (int)$pdo->lastInsertId();

            // Notif push à toute l'équipe
            try {
                $push = new WebPushHelper(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
                $preview = mb_strlen($message) > 80 ? mb_substr($message, 0, 80) . '…' : $message;
                $push->sendAll($pdo, '📣 Annonce de ' . $userName, $preview, ['tag' => 'broadcast-' . $newId]);
            } catch (Throwable $pe) {
                error_log('Push broadcast error: ' . $pe->getMessage());
            }

            echo json_encode(['success' => true, 'id' => $newId]);
            exit;
        }

        echo json_encode(['success' => false, 'message' => 'Action inconnue']);
        exit;
    }

    // ─── DELETE — Supprimer un message ─────────────────────────────────────
    if ($method === 'DELETE') {
        if (!in_array($userRole, $SENDER_ROLES)) {
            echo json_encode(['success' => false, 'message' => 'Accès refusé']);
            exit;
        }
        $msgId = (int)($_GET['id'] ?? 0);
        if (!$msgId) { echo json_encode(['success' => false]); exit; }
        $pdo->prepare("DELETE FROM broadcast_reads WHERE message_id = ?")->execute([$msgId]);
        $pdo->prepare("DELETE FROM broadcast_messages WHERE id = ?")->execute([$msgId]);
        echo json_encode(['success' => true]);
        exit;
    }

    echo json_encode(['success' => false, 'message' => 'Méthode non supportée']);

} catch (Throwable $e) {
    ob_clean();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erreur serveur : ' . $e->getMessage()]);
}
ob_end_flush();
