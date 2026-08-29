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

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

ob_start();

try {
    require_once __DIR__ . '/db.php';
    header('Content-Type: application/json; charset=utf-8');

    // Créer la table si elle n'existe pas
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

    // ── GET ──────────────────────────────────────────────────
    if ($method === 'GET') {
        $userId = intval($_GET['user_id'] ?? 0);
        if (!$userId) {
            ob_end_clean();
            echo json_encode(['success' => false, 'message' => 'user_id requis']);
            exit;
        }

        $role = $current['role'] ?? '';
        if (!in_array($role, ['admin', 'gerant', 'administration']) && $current['id'] != $userId) {
            ob_end_clean();
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Accès refusé']);
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
            $row['year']  = (int)$row['year'];
            $decoded = json_decode($row['data'], true);
            if ($decoded !== null) $row['data'] = $decoded;
        }

        ob_end_clean();
        echo json_encode(['success' => true, 'data' => $rows]);
        exit;
    }

    // ── POST ─────────────────────────────────────────────────
    if ($method === 'POST') {
        $body  = json_decode(file_get_contents('php://input'), true);
        $userId = intval($body['user_id'] ?? 0);
        $month  = intval($body['month']   ?? 0);
        $year   = intval($body['year']    ?? 0);
        $commercialName = trim($body['commercial_name'] ?? '');
        $data   = $body['data'] ?? [];

        if (!$userId || $month < 1 || $month > 12 || $year < 2020) {
            ob_end_clean();
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Paramètres invalides']);
            exit;
        }

        $role = $current['role'] ?? '';
        if (!in_array($role, ['admin', 'gerant', 'administration']) && $current['id'] != $userId) {
            ob_end_clean();
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Accès refusé']);
            exit;
        }

        if (!$commercialName) {
            $uStmt = $pdo->prepare("SELECT name FROM users WHERE id = ?");
            $uStmt->execute([$userId]);
            $uRow = $uStmt->fetch(PDO::FETCH_ASSOC);
            if ($uRow) $commercialName = $uRow['name'];
        }

        $dataJson = json_encode($data, JSON_UNESCAPED_UNICODE);

        $stmt = $pdo->prepare("
            INSERT INTO commission_records (user_id, commercial_name, month, year, data)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                commercial_name = VALUES(commercial_name),
                data            = VALUES(data),
                updated_at      = NOW()
        ");
        $stmt->execute([$userId, $commercialName, $month, $year, $dataJson]);

        $id = (int)$pdo->lastInsertId();
        if (!$id) {
            $find = $pdo->prepare("SELECT id FROM commission_records WHERE user_id = ? AND month = ? AND year = ?");
            $find->execute([$userId, $month, $year]);
            $found = $find->fetch(PDO::FETCH_ASSOC);
            $id = $found ? (int)$found['id'] : null;
        }

        ob_end_clean();
        echo json_encode(['success' => true, 'id' => $id]);
        exit;
    }

    if ($method === 'DELETE') {
        $id   = intval($_GET['id'] ?? 0);
        $role = $current['role'] ?? '';

        if (!$id) {
            ob_end_clean();
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'id requis']);
            exit;
        }

        if (!in_array($role, ['admin', 'gerant'])) {
            $check = $pdo->prepare("SELECT user_id FROM commission_records WHERE id = ?");
            $check->execute([$id]);
            $row = $check->fetch(PDO::FETCH_ASSOC);
            if (!$row || $row['user_id'] != $current['id']) {
                ob_end_clean();
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Accès refusé']);
                exit;
            }
        }

        $stmt = $pdo->prepare("DELETE FROM commission_records WHERE id = ?");
        $stmt->execute([$id]);

        ob_end_clean();
        echo json_encode(['success' => true]);
        exit;
    }

    ob_end_clean();
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Méthode non supportée']);

}

catch (PDOException $e) {
    error_log('commissions.php PDO error: ' . $e->getMessage());
    ob_end_clean();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erreur base de données']);

}

catch (Exception $e) {
    error_log('commissions.php error: ' . $e->getMessage());
    ob_end_clean();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erreur serveur']);
}
