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

// Une ligne par fournisseur ; le détail (remises, promotions, contact) est stocké en JSON
$pdo->exec("
    CREATE TABLE IF NOT EXISTS `remises_fournisseurs` (
        `id`         INT          NOT NULL AUTO_INCREMENT,
        `nom`        VARCHAR(150) NOT NULL,
        `data`       LONGTEXT     NOT NULL,
        `updated_by` VARCHAR(150) NOT NULL DEFAULT '',
        `updated_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
");

/** Nettoie un fournisseur reçu du formulaire : textes coupés, lignes vides retirées. */
function remiseNormaliser(array $f): array {
    $txt = fn($v) => trim((string) ($v ?? ''));

    $remises = [];
    foreach (($f['remises'] ?? []) as $r) {
        $r = ['taux' => $txt($r['taux'] ?? ''), 'produit' => $txt($r['produit'] ?? ''), 'conditions' => $txt($r['conditions'] ?? '')];
        if ($r['taux'] !== '' || $r['produit'] !== '' || $r['conditions'] !== '') $remises[] = $r;
    }

    $promotions = [];
    foreach (($f['promotions'] ?? []) as $p) {
        $dates = array_values(array_filter(array_map($txt, (array) ($p['dates'] ?? [])), fn($d) => $d !== ''));
        $p = ['titre' => $txt($p['titre'] ?? ''), 'produit' => $txt($p['produit'] ?? ''), 'dates' => $dates, 'conditions' => $txt($p['conditions'] ?? '')];
        if ($p['titre'] !== '' || $p['produit'] !== '' || $p['conditions'] !== '' || $dates) $promotions[] = $p;
    }

    return [
        'nom'        => $txt($f['nom'] ?? ''),
        'categorie'  => $txt($f['categorie'] ?? ''),
        'remises'    => $remises,
        'promotions' => $promotions,
        'contact'    => $txt($f['contact'] ?? ''),
        'email'      => $txt($f['email'] ?? ''),
        'telephone'  => $txt($f['telephone'] ?? ''),
    ];
}

function remiseEnregistrer(PDO $pdo, ?int $id, array $f, string $auteur): int {
    $json = json_encode($f, JSON_UNESCAPED_UNICODE);
    if ($id) {
        $pdo->prepare('UPDATE remises_fournisseurs SET nom = ?, data = ?, updated_by = ? WHERE id = ?')
            ->execute([$f['nom'], $json, $auteur, $id]);
        return $id;
    }
    $pdo->prepare('INSERT INTO remises_fournisseurs (nom, data, updated_by) VALUES (?, ?, ?)')
        ->execute([$f['nom'], $json, $auteur]);
    return (int) $pdo->lastInsertId();
}

// Premier lancement : on remplit la table avec les données du dépliant PROFERM 2026
if ((int) $pdo->query('SELECT COUNT(*) FROM remises_fournisseurs')->fetchColumn() === 0) {
    $defaut = json_decode((string) file_get_contents(__DIR__ . '/data/remises_fournisseurs_defaut.json'), true) ?: [];
    foreach ($defaut as $f) remiseEnregistrer($pdo, null, remiseNormaliser($f), ''); // pas d'auteur : données d'origine
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $rows = $pdo->query('SELECT id, data, updated_by, updated_at FROM remises_fournisseurs ORDER BY nom ASC')
        ->fetchAll(PDO::FETCH_ASSOC);
    $fournisseurs = array_map(fn($r) => ['id' => (int) $r['id']] + (json_decode($r['data'], true) ?: []) + [
        'updated_by' => $r['updated_by'],
        'updated_at' => $r['updated_at'],
    ], $rows);
    echo json_encode(['success' => true, 'fournisseurs' => $fournisseurs], JSON_UNESCAPED_UNICODE);
    exit();
}

// Création ou modification d'un fournisseur (tous les utilisateurs connectés)
if ($method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $id   = (int) ($body['id'] ?? 0);
    $f    = remiseNormaliser((array) ($body['fournisseur'] ?? []));

    if ($f['nom'] === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Le nom du fournisseur est requis.']);
        exit();
    }
    if ($id) {
        $check = $pdo->prepare('SELECT id FROM remises_fournisseurs WHERE id = ?');
        $check->execute([$id]);
        if (!$check->fetch()) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Fournisseur introuvable.']);
            exit();
        }
    }

    $id = remiseEnregistrer($pdo, $id ?: null, $f, (string) ($_SESSION['user']['name'] ?? ''));
    echo json_encode(['success' => true, 'fournisseur' => ['id' => $id] + $f], JSON_UNESCAPED_UNICODE);
    exit();
}

if ($method === 'DELETE') {
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $stmt = $pdo->prepare('DELETE FROM remises_fournisseurs WHERE id = ?');
    $stmt->execute([(int) ($body['id'] ?? 0)]);
    if ($stmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Fournisseur introuvable.']);
        exit();
    }
    echo json_encode(['success' => true]);
    exit();
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Méthode non autorisée.']);
