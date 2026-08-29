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

// Tables auto-create
$pdo->exec("
    CREATE TABLE IF NOT EXISTS `annulaire_fournisseurs` (
        `id`         INT          NOT NULL AUTO_INCREMENT,
        `nom`        VARCHAR(150) NOT NULL,
        `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
");

$pdo->exec("
    CREATE TABLE IF NOT EXISTS `annulaire_numeros` (
        `id`             INT          NOT NULL AUTO_INCREMENT,
        `fournisseur_id` INT          NOT NULL,
        `label`          VARCHAR(100) NOT NULL DEFAULT '',
        `numero`         VARCHAR(30)  NOT NULL,
        `email`          VARCHAR(150) NOT NULL DEFAULT '',
        `created_at`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`),
        KEY `idx_fournisseur` (`fournisseur_id`),
        CONSTRAINT `fk_numeros_fournisseur`
            FOREIGN KEY (`fournisseur_id`) REFERENCES `annulaire_fournisseurs`(`id`)
            ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
");

// Ajoute la colonne email si elle n'existe pas encore (migration)
try {
    $pdo->exec("ALTER TABLE `annulaire_numeros` ADD COLUMN `email` VARCHAR(150) NOT NULL DEFAULT ''");
} catch (\PDOException $e) {
    // Colonne déjà existante, on ignore
}

// Ajoute la colonne fax si elle n'existe pas encore
try {
    $pdo->exec("ALTER TABLE `annulaire_numeros` ADD COLUMN `fax` VARCHAR(30) NOT NULL DEFAULT ''");
} catch (\PDOException $e) {
    // Colonne déjà existante, on ignore
}

$count = (int) $pdo->query('SELECT COUNT(*) FROM annulaire_fournisseurs')->fetchColumn();
if ($count === 0) {
    $defaults = ['Proferm', 'Cetal', 'Somfy', 'Euradif', 'SDA', 'Hormann', 'Filtersun', 'Volpro', 'Voltech', 'Marquise', 'Serge Ferrari'];
    $stmt = $pdo->prepare('INSERT INTO annulaire_fournisseurs (nom) VALUES (?)');
    foreach ($defaults as $nom) {
        $stmt->execute([$nom]);
    }
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $fournisseurs = $pdo->query(
        'SELECT id, nom, created_at FROM annulaire_fournisseurs ORDER BY nom ASC'
    )->fetchAll(PDO::FETCH_ASSOC);

    $numeros = $pdo->query(
        'SELECT id, fournisseur_id, label, numero, email, fax FROM annulaire_numeros ORDER BY created_at ASC'
    )->fetchAll(PDO::FETCH_ASSOC);

    $numerosMap = [];
    foreach ($numeros as $n) {
        $fid = (int) $n['fournisseur_id'];
        if (!isset($numerosMap[$fid])) $numerosMap[$fid] = [];
        $numerosMap[$fid][] = [
            'id'     => (int) $n['id'],
            'label'  => $n['label'],
            'numero' => $n['numero'],
            'email'  => $n['email'],
            'fax'    => $n['fax'],
        ];
    }

    $result = [];
    foreach ($fournisseurs as $f) {
        $fid = (int) $f['id'];
        $result[] = [
            'id'     => $fid,
            'name'   => $f['nom'],
            'phones' => $numerosMap[$fid] ?? [],
        ];
    }

    echo json_encode(['success' => true, 'suppliers' => $result], JSON_UNESCAPED_UNICODE);
    exit();
}

if ($method === 'POST') {
    // Tout utilisateur connecté peut ajouter un fournisseur ou un numéro
    $body   = json_decode(file_get_contents('php://input'), true) ?? [];
    $action = trim($body['action'] ?? '');

    if ($action === 'add_supplier') {
        $nom = trim($body['name'] ?? '');
        if (empty($nom)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Le nom est requis.']);
            exit();
        }
        $stmt = $pdo->prepare('INSERT INTO annulaire_fournisseurs (nom) VALUES (?)');
        $stmt->execute([$nom]);
        $newId = (int) $pdo->lastInsertId();
        echo json_encode(['success' => true, 'supplier' => ['id' => $newId, 'name' => $nom, 'phones' => []]], JSON_UNESCAPED_UNICODE);
        exit();
    }

    if ($action === 'add_phone') {
        $fournisseurId = (int) ($body['supplier_id'] ?? 0);
        $numero        = trim($body['number'] ?? '');
        $label         = trim($body['label'] ?? '');
        $email         = trim($body['email'] ?? '');
        $fax           = trim($body['fax'] ?? '');

        if ($fournisseurId <= 0 || empty($numero)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'supplier_id et number sont requis.']);
            exit();
        }

        $check = $pdo->prepare('SELECT id FROM annulaire_fournisseurs WHERE id = ?');
        $check->execute([$fournisseurId]);
        if (!$check->fetch()) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Fournisseur introuvable.']);
            exit();
        }

        $stmt = $pdo->prepare('INSERT INTO annulaire_numeros (fournisseur_id, label, numero, email, fax) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([$fournisseurId, $label, $numero, $email, $fax]);
        $newId = (int) $pdo->lastInsertId();

        echo json_encode(['success' => true, 'phone' => ['id' => $newId, 'label' => $label, 'numero' => $numero, 'email' => $email, 'fax' => $fax]], JSON_UNESCAPED_UNICODE);
        exit();
    }

    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Action inconnue.']);
    exit();
}

if ($method === 'PUT') {
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $type = trim($body['type'] ?? '');
    $id   = (int) ($body['id'] ?? 0);

    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID invalide.']);
        exit();
    }

    if ($type === 'supplier') {
        // Keep admin-only for supplier edit
        if (($_SESSION['user']['role'] ?? '') !== 'admin') {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Accès réservé aux administrateurs.']);
            exit();
        }
        $nom = trim($body['name'] ?? '');
        if (empty($nom)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Le nom est requis.']);
            exit();
        }
        $stmt = $pdo->prepare('UPDATE annulaire_fournisseurs SET nom = ? WHERE id = ?');
        $stmt->execute([$nom, $id]);
        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Fournisseur introuvable.']);
            exit();
        }
        echo json_encode(['success' => true], JSON_UNESCAPED_UNICODE);
        exit();
    }

    if ($type === 'phone') {
        // Tous les utilisateurs connectés peuvent modifier un numéro
        $numero = trim($body['number'] ?? '');
        $label  = trim($body['label'] ?? '');
        $email  = trim($body['email'] ?? '');
        $fax    = trim($body['fax'] ?? '');
        if (empty($numero)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Le numéro est requis.']);
            exit();
        }
        $stmt = $pdo->prepare('UPDATE annulaire_numeros SET numero = ?, label = ?, email = ?, fax = ? WHERE id = ?');
        $stmt->execute([$numero, $label, $email, $fax, $id]);
        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Numéro introuvable.']);
            exit();
        }
        echo json_encode(['success' => true], JSON_UNESCAPED_UNICODE);
        exit();
    }

    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Type invalide (supplier ou phone).']);
    exit();
}

if ($method === 'DELETE') {
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $type = trim($body['type'] ?? '');
    $id   = (int) ($body['id'] ?? 0);

    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID invalide.']);
        exit();
    }

    if ($type === 'supplier') {
        if (($_SESSION['user']['role'] ?? '') !== 'admin') {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Accès réservé aux administrateurs.']);
            exit();
        }
        $stmt = $pdo->prepare('DELETE FROM annulaire_fournisseurs WHERE id = ?');
        $stmt->execute([$id]);
        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Fournisseur introuvable.']);
            exit();
        }
        echo json_encode(['success' => true]);
        exit();
    }

    if ($type === 'phone') {

        $stmt = $pdo->prepare('DELETE FROM annulaire_numeros WHERE id = ?');
        $stmt->execute([$id]);
        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Numéro introuvable.']);
            exit();
        }
        echo json_encode(['success' => true]);
        exit();
    }



    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Type invalide (supplier ou phone).']);
    exit();


}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Méthode non autorisée.']);


