<?php
session_start();

if (!isset($_SESSION['user'])) {
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Non authentifié']);
    exit;
}

ini_set('display_errors', '0');
error_reporting(E_ALL);

require_once __DIR__ . '/security.php';
setSecurityHeaders();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

ob_start();

try {
    require_once __DIR__ . '/db.php';
    header('Content-Type: application/json; charset=utf-8');

    // Créer la table si elle n'existe pas. Aucune donnée existante n'est supprimée.
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS commission_records (
            id               INT AUTO_INCREMENT PRIMARY KEY,
            user_id          INT NOT NULL,
            commercial_name  VARCHAR(150),
            month            TINYINT NOT NULL,
            year             SMALLINT NOT NULL,
            data             LONGTEXT NOT NULL,
            created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uq_commission (user_id, month, year)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");

    $method  = $_SERVER['REQUEST_METHOD'];
    $current = $_SESSION['user'];
    $currentId = (int)($current['id'] ?? 0);
    $role = (string)($current['role'] ?? '');

    // Ces rôles conservent les droits globaux déjà présents dans l'application.
    $canAccessAll = in_array($role, ['admin', 'gerant', 'administration'], true);

    /**
     * Vérifie qu'un utilisateur peut accéder aux commissions d'une cible.
     * Les administrateurs/gérants/administration gardent leurs droits existants.
     * Les autres utilisateurs doivent consulter leurs propres données et avoir
     * commission_access = 1 dans la table users.
     */
    $authorizeCommissionAccess = static function (int $targetUserId) use ($pdo, $currentId, $canAccessAll): bool {
        if ($targetUserId <= 0) {
            return false;
        }

        if ($canAccessAll) {
            return true;
        }

        if ($currentId !== $targetUserId) {
            return false;
        }

        $accessStmt = $pdo->prepare('SELECT commission_access FROM users WHERE id = ? LIMIT 1');
        $accessStmt->execute([$targetUserId]);
        $access = $accessStmt->fetchColumn();

        return (int)$access === 1;
    };

    // ── GET : consulter les commissions ──────────────────────
    if ($method === 'GET') {
        $userId = (int)($_GET['user_id'] ?? 0);

        if (!$userId) {
            ob_end_clean();
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'user_id requis']);
            exit;
        }

        if (!$authorizeCommissionAccess($userId)) {
            ob_end_clean();
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Accès aux commissions non autorisé']);
            exit;
        }

        $stmt = $pdo->prepare("
            SELECT id, user_id, commercial_name, month, year, data, created_at
            FROM commission_records
            WHERE user_id = ?
            ORDER BY year DESC, month DESC
        ");
        $stmt->execute([$userId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($rows as &$row) {
            $row['month'] = (int)$row['month'];
            $row['year'] = (int)$row['year'];
            $decoded = json_decode($row['data'], true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $row['data'] = $decoded;
            }
        }
        unset($row);

        ob_end_clean();
        echo json_encode(['success' => true, 'data' => $rows], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // ── POST : enregistrer les commissions ───────────────────
    if ($method === 'POST') {
        $body = json_decode(file_get_contents('php://input'), true);
        if (!is_array($body)) {
            ob_end_clean();
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Corps de requête JSON invalide']);
            exit;
        }

        $userId = (int)($body['user_id'] ?? 0);
        $month = (int)($body['month'] ?? 0);
        $year = (int)($body['year'] ?? 0);
        $commercialName = trim((string)($body['commercial_name'] ?? ''));
        $data = $body['data'] ?? [];

        if (!$userId || $month < 1 || $month > 12 || $year < 2020 || !is_array($data)) {
            ob_end_clean();
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Paramètres invalides']);
            exit;
        }

        if (!$authorizeCommissionAccess($userId)) {
            ob_end_clean();
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Accès aux commissions non autorisé']);
            exit;
        }

        if ($commercialName === '') {
            $uStmt = $pdo->prepare('SELECT name FROM users WHERE id = ? LIMIT 1');
            $uStmt->execute([$userId]);
            $uRow = $uStmt->fetch(PDO::FETCH_ASSOC);
            if ($uRow) {
                $commercialName = (string)$uRow['name'];
            }
        }

        $dataJson = json_encode($data, JSON_UNESCAPED_UNICODE);
        if ($dataJson === false) {
            ob_end_clean();
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Données de commission invalides']);
            exit;
        }

        $stmt = $pdo->prepare("
            INSERT INTO commission_records (user_id, commercial_name, month, year, data)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                commercial_name = VALUES(commercial_name),
                data = VALUES(data),
                updated_at = NOW()
        ");
        $stmt->execute([$userId, $commercialName, $month, $year, $dataJson]);

        $id = (int)$pdo->lastInsertId();
        if (!$id) {
            $find = $pdo->prepare('SELECT id FROM commission_records WHERE user_id = ? AND month = ? AND year = ?');
            $find->execute([$userId, $month, $year]);
            $found = $find->fetch(PDO::FETCH_ASSOC);
            $id = $found ? (int)$found['id'] : null;
        }

        ob_end_clean();
        echo json_encode(['success' => true, 'id' => $id]);
        exit;
    }

    // ── DELETE : supprimer une commission ────────────────────
    if ($method === 'DELETE') {
        $id = (int)($_GET['id'] ?? 0);

        if (!$id) {
            ob_end_clean();
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'id requis']);
            exit;
        }

        // Seuls admin et gerant peuvent supprimer les commissions de n'importe qui.
        if (!in_array($role, ['admin', 'gerant'], true)) {
            $check = $pdo->prepare('SELECT user_id FROM commission_records WHERE id = ? LIMIT 1');
            $check->execute([$id]);
            $row = $check->fetch(PDO::FETCH_ASSOC);

            if (!$row || (int)$row['user_id'] !== $currentId || !$authorizeCommissionAccess($currentId)) {
                ob_end_clean();
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Accès refusé']);
                exit;
            }
        }

        $stmt = $pdo->prepare('DELETE FROM commission_records WHERE id = ?');
        $stmt->execute([$id]);

        ob_end_clean();
        echo json_encode(['success' => true]);
        exit;
    }

    ob_end_clean();
    header('Allow: GET, POST, DELETE, OPTIONS');
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Méthode non supportée']);
}
catch (PDOException $e) {
    error_log('commissions.php PDO error: ' . $e->getMessage());
    if (ob_get_level() > 0) ob_end_clean();
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'message' => 'Erreur base de données']);
}
catch (Throwable $e) {
    error_log('commissions.php error: ' . $e->getMessage());
    if (ob_get_level() > 0) ob_end_clean();
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'message' => 'Erreur serveur']);
}
