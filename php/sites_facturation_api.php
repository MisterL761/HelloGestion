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

$role = $_SESSION['user']['role'] ?? '';
$ADMIN_ROLES = ['admin', 'gerant', 'administration'];
$isAdmin = in_array($role, $ADMIN_ROLES);

require_once __DIR__ . '/db.php';

// Création automatique de la table
$pdo->exec("
    CREATE TABLE IF NOT EXISTS `sites_facturation` (
        `id`         INT           NOT NULL AUTO_INCREMENT,
        `nom`        VARCHAR(255)  NOT NULL,
        `url`        VARCHAR(1000) NOT NULL,
        `identifiant` VARCHAR(255) NOT NULL DEFAULT '',
        `notes`      TEXT,
        `created_at` DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        `updated_at` DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
");

$method = $_SERVER['REQUEST_METHOD'];

// ── GET : liste tous les sites ────────────────────────────────
if ($method === 'GET') {
    $stmt = $pdo->query("SELECT * FROM sites_facturation ORDER BY nom ASC");
    echo json_encode(['success' => true, 'data' => $stmt->fetchAll(\PDO::FETCH_ASSOC)]);
    exit();
}

// Les opérations d'écriture sont réservées aux admins/gérants
if (!$isAdmin) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Accès refusé']);
    exit();
}

$body = json_decode(file_get_contents('php://input'), true) ?? [];

// ── POST : créer un site ──────────────────────────────────────
if ($method === 'POST') {
    $nom  = trim($body['nom']  ?? '');
    $url  = trim($body['url']  ?? '');
    $iden = trim($body['identifiant'] ?? '');
    $notes = trim($body['notes'] ?? '');

    if (!$nom || !$url) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Nom et URL requis']);
        exit();
    }

    $stmt = $pdo->prepare("INSERT INTO sites_facturation (nom, url, identifiant, notes) VALUES (?,?,?,?)");
    $stmt->execute([$nom, $url, $iden, $notes ?: null]);
    echo json_encode(['success' => true, 'id' => (int)$pdo->lastInsertId()]);
    exit();
}

// ── PUT : modifier un site ────────────────────────────────────
if ($method === 'PUT') {
    $id   = (int)($body['id']  ?? 0);
    $nom  = trim($body['nom']  ?? '');
    $url  = trim($body['url']  ?? '');
    $iden = trim($body['identifiant'] ?? '');
    $notes = trim($body['notes'] ?? '');

    if (!$id || !$nom || !$url) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Données invalides']);
        exit();
    }

    $stmt = $pdo->prepare("UPDATE sites_facturation SET nom=?, url=?, identifiant=?, notes=?, updated_at=NOW() WHERE id=?");
    $stmt->execute([$nom, $url, $iden, $notes ?: null, $id]);
    echo json_encode(['success' => true]);
    exit();
}

// ── DELETE : supprimer un site ────────────────────────────────
if ($method === 'DELETE') {
    $id = (int)($body['id'] ?? 0);
    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID manquant']);
        exit();
    }
    $pdo->prepare("DELETE FROM sites_facturation WHERE id=?")->execute([$id]);
    echo json_encode(['success' => true]);
    exit();
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Méthode non autorisée']);
