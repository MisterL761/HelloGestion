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

// Ajoute la colonne du lien de commande si elle n'existe pas encore
try {
    $pdo->exec("ALTER TABLE `annulaire_fournisseurs` ADD COLUMN `order_url` VARCHAR(1000) NOT NULL DEFAULT ''");
} catch (\PDOException $e) {
    // Colonne déjà existante, on ignore
}

// Ajoute la colonne fax si elle n'existe pas encore
try {
    $pdo->exec("ALTER TABLE `annulaire_numeros` ADD COLUMN `fax` VARCHAR(30) NOT NULL DEFAULT ''");
} catch (\PDOException $e) {
    // Colonne déjà existante, on ignore
}

// Journal des suppressions (qui a supprimé quoi), consultable uniquement par ANNUAIRE_LOGS_VIEWERS
$pdo->exec("
    CREATE TABLE IF NOT EXISTS `annulaire_suppressions` (
        `id`         INT          NOT NULL AUTO_INCREMENT,
        `user_id`    INT          NOT NULL,
        `user_name`  VARCHAR(150) NOT NULL DEFAULT '',
        `type`       VARCHAR(20)  NOT NULL,
        `cible`      VARCHAR(255) NOT NULL DEFAULT '',
        `details`    TEXT         NULL,
        `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`),
        KEY `idx_created` (`created_at`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
");

// E-mails des comptes autorisés à voir le journal (surchargeable dans config.php)
const ANNUAIRE_LOGS_VIEWERS_DEFAULT = ['lotfi.ksantinipro@gmail.com'];

function annuaireCanViewLogs(): bool {
    $viewers = defined('ANNUAIRE_LOGS_VIEWERS') ? ANNUAIRE_LOGS_VIEWERS : ANNUAIRE_LOGS_VIEWERS_DEFAULT;
    $email = strtolower(trim((string) ($_SESSION['user']['email'] ?? '')));
    return $email !== '' && in_array($email, array_map('strtolower', $viewers), true);
}

function annuaireLogSuppression(PDO $pdo, string $type, string $cible, array $details): void {
    $pdo->prepare('INSERT INTO annulaire_suppressions (user_id, user_name, type, cible, details) VALUES (?, ?, ?, ?, ?)')
        ->execute([
            (int) ($_SESSION['user']['id'] ?? 0),
            (string) ($_SESSION['user']['name'] ?? ''),
            $type,
            mb_substr($cible, 0, 255),
            json_encode($details, JSON_UNESCAPED_UNICODE),
        ]);
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

if ($method === 'GET' && isset($_GET['logs'])) {
    if (!annuaireCanViewLogs()) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Accès refusé.']);
        exit();
    }
    $logs = $pdo->query(
        'SELECT id, user_name, type, cible, details, created_at FROM annulaire_suppressions ORDER BY created_at DESC, id DESC LIMIT 200'
    )->fetchAll(PDO::FETCH_ASSOC);
    foreach ($logs as &$log) {
        $log['id'] = (int) $log['id'];
        $log['details'] = json_decode((string) $log['details'], true) ?: [];
    }
    unset($log);
    echo json_encode(['success' => true, 'logs' => $logs], JSON_UNESCAPED_UNICODE);
    exit();
}

if ($method === 'GET') {
    $fournisseurs = $pdo->query(
        'SELECT id, nom, order_url, created_at FROM annulaire_fournisseurs ORDER BY nom ASC'
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
            'name'      => $f['nom'],
            'order_url' => $f['order_url'] ?? '',
            'phones'    => $numerosMap[$fid] ?? [],
        ];
    }

    echo json_encode(['success' => true, 'suppliers' => $result, 'can_view_logs' => annuaireCanViewLogs()], JSON_UNESCAPED_UNICODE);
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

    if ($type === 'supplier_url') {
        $orderUrl = trim((string) ($body['order_url'] ?? ''));
        if ($orderUrl !== '') {
            $parsedUrl = filter_var($orderUrl, FILTER_VALIDATE_URL);
            $scheme = strtolower((string) parse_url($orderUrl, PHP_URL_SCHEME));
            if (!$parsedUrl || !in_array($scheme, ['http', 'https'], true)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Le lien doit être une URL valide commençant par http:// ou https://.']);
                exit();
            }
        }
        $check = $pdo->prepare('SELECT id FROM annulaire_fournisseurs WHERE id = ?');
        $check->execute([$id]);
        if (!$check->fetch()) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Fournisseur introuvable.']);
            exit();
        }
        $stmt = $pdo->prepare('UPDATE annulaire_fournisseurs SET order_url = ? WHERE id = ?');
        $stmt->execute([$orderUrl, $id]);
        echo json_encode(['success' => true], JSON_UNESCAPED_UNICODE);
        exit();
    }

    if ($type === 'supplier') {
        // Tous les utilisateurs connectés peuvent renommer un fournisseur
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

    // Tous les utilisateurs connectés peuvent supprimer ; chaque suppression est journalisée
    // avec le contenu supprimé, pour pouvoir le retrouver.
    if ($type === 'supplier') {
        $check = $pdo->prepare('SELECT nom, order_url FROM annulaire_fournisseurs WHERE id = ?');
        $check->execute([$id]);
        $fournisseur = $check->fetch(PDO::FETCH_ASSOC);
        if (!$fournisseur) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Fournisseur introuvable.']);
            exit();
        }
        // Les contacts sont supprimés avec le fournisseur (ON DELETE CASCADE) : on les garde dans le journal
        $contacts = $pdo->prepare('SELECT label, numero, email, fax FROM annulaire_numeros WHERE fournisseur_id = ? ORDER BY created_at ASC');
        $contacts->execute([$id]);

        $pdo->beginTransaction();
        $pdo->prepare('DELETE FROM annulaire_fournisseurs WHERE id = ?')->execute([$id]);
        annuaireLogSuppression($pdo, 'supplier', $fournisseur['nom'], [
            'order_url' => $fournisseur['order_url'],
            'contacts'  => $contacts->fetchAll(PDO::FETCH_ASSOC),
        ]);
        $pdo->commit();

        echo json_encode(['success' => true]);
        exit();
    }

    if ($type === 'phone') {
        $check = $pdo->prepare('
            SELECT n.label, n.numero, n.email, n.fax, f.nom AS fournisseur
            FROM annulaire_numeros n
            JOIN annulaire_fournisseurs f ON f.id = n.fournisseur_id
            WHERE n.id = ?
        ');
        $check->execute([$id]);
        $contact = $check->fetch(PDO::FETCH_ASSOC);
        if (!$contact) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Numéro introuvable.']);
            exit();
        }

        $pdo->beginTransaction();
        $pdo->prepare('DELETE FROM annulaire_numeros WHERE id = ?')->execute([$id]);
        annuaireLogSuppression($pdo, 'phone', $contact['label'] !== '' ? $contact['label'] : $contact['numero'], [
            'fournisseur' => $contact['fournisseur'],
            'numero'      => $contact['numero'],
            'email'       => $contact['email'],
            'fax'         => $contact['fax'],
        ]);
        $pdo->commit();

        echo json_encode(['success' => true]);
        exit();
    }



    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Type invalide (supplier ou phone).']);
    exit();


}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Méthode non autorisée.']);


