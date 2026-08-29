<?php
declare(strict_types=1);
session_start();
if (!isset($_SESSION['user'])) { http_response_code(401); echo json_encode(['success'=>false]); exit(); }
require_once __DIR__ . '/security.php';
setSecurityHeaders();
require_once __DIR__ . '/db.php';
header('Content-Type: application/json; charset=utf-8');

$userId = (int)$_SESSION['user']['id'];
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    $data     = json_decode(file_get_contents('php://input'), true);
    $endpoint = trim($data['endpoint'] ?? '');
    $p256dh   = trim($data['p256dh'] ?? '');
    $auth     = trim($data['auth'] ?? '');
    $ua       = substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255);

    if (!$endpoint || !$p256dh || !$auth) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Données manquantes']);
        exit();
    }

    $stmt = $pdo->prepare("
        INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE user_id=VALUES(user_id), p256dh=VALUES(p256dh), auth=VALUES(auth)
    ");
    $ok = $stmt->execute([$userId, $endpoint, $p256dh, $auth, $ua]);
    echo json_encode(['success' => $ok]);

} elseif ($method === 'DELETE') {
    $data     = json_decode(file_get_contents('php://input'), true);
    $endpoint = trim($data['endpoint'] ?? '');
    if ($endpoint) {
        $pdo->prepare("DELETE FROM push_subscriptions WHERE endpoint = ? AND user_id = ?")->execute([$endpoint, $userId]);
    }
    echo json_encode(['success' => true]);
} else {
    // Check if user has a subscription
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM push_subscriptions WHERE user_id = ?");
    $stmt->execute([$userId]);
    echo json_encode(['success' => true, 'subscribed' => (int)$stmt->fetchColumn() > 0]);
}
