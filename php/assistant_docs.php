<?php
declare(strict_types=1);

session_start();

require_once __DIR__ . '/security.php';
setSecurityHeaders();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Non authentifié']);
    exit();
}

require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    try {
        $stmt = $pdo->query(
            'SELECT id, name, category, chunks, created_at
             FROM assistant_documents
             ORDER BY created_at DESC'
        );
        $docs = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'documents' => $docs], JSON_UNESCAPED_UNICODE);
    } catch (\PDOException $e) {
        // Table may not exist yet
        echo json_encode(['success' => true, 'documents' => []], JSON_UNESCAPED_UNICODE);
    }
    exit();
}

if ($method === 'DELETE') {
    if (($_SESSION['user']['role'] ?? '') !== 'admin') {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Accès réservé aux administrateurs.']);
        exit();
    }

    $body  = json_decode(file_get_contents('php://input'), true) ?? [];
    $docId = trim($body['id'] ?? '');

    if (empty($docId)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID manquant.']);
        exit();
    }

    $stmt = $pdo->prepare('DELETE FROM assistant_documents WHERE id = ?');
    $stmt->execute([$docId]);

    if ($stmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Document introuvable.']);
        exit();
    }

    echo json_encode(['success' => true, 'message' => 'Document supprimé.']);
    exit();
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Méthode non autorisée.']);
