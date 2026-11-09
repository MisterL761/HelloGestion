<?php
declare(strict_types=1);

// Suivi des commandes fournisseurs + rapprochement BC / factures.
// Reprend les deux classeurs Excel d'Alexandra (« Suivi commandes » et « ARC + Factures ») :
// les données vivent dans la base du site, les fichiers Excel ne sont jamais modifiés.

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

// Accès par personne (e-mail de connexion), comme les deux classeurs Excel :
// « Suivi commandes » d'un côté, « ARC + Factures » (BC et factures) de l'autre.
// Même liste dans src/utils/suiviCommandes.js pour l'affichage du menu.
const SC_ACCES_SUIVI = [
    'henrique@hello-fermetures.com',
    'sebastien@hello-fermetures.com',
    'vanessa@hello-fermetures.com',
    'alexandra@hello-fermetures.com',
    'lotfi.ksantinipro@gmail.com',
];
const SC_ACCES_COMPTA = [
    'vanessa@hello-fermetures.com',
    'alexandra@hello-fermetures.com',
    'sebastien@hello-fermetures.com',
    'lotfi.ksantinipro@gmail.com',
];

// Journal détaillé de tout ce qui est fait sur la page : visible uniquement par le développeur
const SC_ACCES_LOGS = ['lotfi.ksantinipro@gmail.com'];

$scEmail = strtolower(trim((string) ($_SESSION['user']['email'] ?? '')));
$scAcces = [
    'suivi'  => in_array($scEmail, SC_ACCES_SUIVI, true),
    'compta' => in_array($scEmail, SC_ACCES_COMPTA, true),
    // Import des fichiers Excel : chacun peut importer le ou les fichiers auxquels il a accès (confirmation demandée)
    'import' => in_array($scEmail, SC_ACCES_SUIVI, true) || in_array($scEmail, SC_ACCES_COMPTA, true),
    'logs'   => in_array($scEmail, SC_ACCES_LOGS, true),
];

if (!$scAcces['suivi'] && !$scAcces['compta']) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Vous n\'avez pas accès au suivi des commandes.']);
    exit();
}

require_once __DIR__ . '/db.php';

$pdo->exec("
    CREATE TABLE IF NOT EXISTS `sc_commandes` (
        `id`                    INT           NOT NULL AUTO_INCREMENT,
        `num_commande`          VARCHAR(100)  NOT NULL DEFAULT '',
        `client`                VARCHAR(255)  NOT NULL DEFAULT '',
        `fournisseur`           VARCHAR(150)  NOT NULL DEFAULT '',
        `date_commande`         DATE          NULL,
        `date_arc`              DATE          NULL,
        `relance`               VARCHAR(100)  NOT NULL DEFAULT '',
        `etat`                  VARCHAR(50)   NOT NULL DEFAULT '',
        `num_bc`                VARCHAR(100)  NOT NULL DEFAULT '',
        `montant_ht`            DECIMAL(12,2) NULL,
        `montant_ttc`           DECIMAL(12,2) NULL,
        `type_marchandise`      VARCHAR(255)  NOT NULL DEFAULT '',
        `motorisation`          VARCHAR(50)   NOT NULL DEFAULT '',
        `duree_pose`            DECIMAL(6,2)  NULL,
        `unite`                 VARCHAR(20)   NOT NULL DEFAULT '',
        `semaine_livraison`     VARCHAR(20)   NOT NULL DEFAULT '',
        `date_livraison_prevue` DATE          NULL,
        `date_pose`             DATE          NULL,
        `statut_pose`           VARCHAR(30)   NOT NULL DEFAULT '',
        `commentaire`           TEXT          NULL,
        `termine`               TINYINT(1)    NOT NULL DEFAULT 0,
        `statut_archive`        VARCHAR(50)   NOT NULL DEFAULT '',
        `ordre`                 INT           NOT NULL DEFAULT 0,
        `updated_by`            VARCHAR(150)  NOT NULL DEFAULT '',
        `updated_at`            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`),
        KEY `idx_num_commande` (`num_commande`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
");

$pdo->exec("
    CREATE TABLE IF NOT EXISTS `sc_bc` (
        `id`          INT           NOT NULL AUTO_INCREMENT,
        `client`      VARCHAR(255)  NOT NULL DEFAULT '',
        `num_bc`      VARCHAR(100)  NOT NULL DEFAULT '',
        `date_bc`     DATE          NULL,
        `fournisseur` VARCHAR(150)  NOT NULL DEFAULT '',
        `montant_ht`  DECIMAL(12,2) NULL,
        `montant_ttc` DECIMAL(12,2) NULL,
        `commentaire` TEXT          NULL,
        `ordre`       INT           NOT NULL DEFAULT 0,
        `updated_by`  VARCHAR(150)  NOT NULL DEFAULT '',
        `updated_at`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
");

$pdo->exec("
    CREATE TABLE IF NOT EXISTS `sc_factures` (
        `id`            INT           NOT NULL AUTO_INCREMENT,
        `num_facture`   VARCHAR(100)  NOT NULL DEFAULT '',
        `num_bc`        VARCHAR(100)  NOT NULL DEFAULT '',
        `date_facture`  DATE          NULL,
        `montant_ht`    DECIMAL(12,2) NULL,
        `montant_ttc`   DECIMAL(12,2) NULL,
        `date_paiement` DATE          NULL,
        `commentaire`   TEXT          NULL,
        `ordre`         INT           NOT NULL DEFAULT 0,
        `updated_by`    VARCHAR(150)  NOT NULL DEFAULT '',
        `updated_at`    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
");

// Journal : qui a fait quoi, et quand (jamais effacé par un import)
$pdo->exec("
    CREATE TABLE IF NOT EXISTS `sc_logs` (
        `id`         INT          NOT NULL AUTO_INCREMENT,
        `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        `user_email` VARCHAR(150) NOT NULL DEFAULT '',
        `user_name`  VARCHAR(150) NOT NULL DEFAULT '',
        `action`     VARCHAR(50)  NOT NULL DEFAULT '',
        `cible`      VARCHAR(255) NOT NULL DEFAULT '',
        `details`    LONGTEXT     NULL,
        `ip`         VARCHAR(45)  NOT NULL DEFAULT '',
        PRIMARY KEY (`id`),
        KEY `idx_created` (`created_at`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
");

// Listes déroulantes (onglets « Paramètres » des deux classeurs)
$pdo->exec("
    CREATE TABLE IF NOT EXISTS `sc_parametres` (
        `cle`     VARCHAR(50) NOT NULL,
        `valeurs` LONGTEXT    NOT NULL,
        PRIMARY KEY (`cle`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
");

// Lignes supprimées sur le site : un réimport Excel ne les fait pas revenir
$pdo->exec("
    CREATE TABLE IF NOT EXISTS `sc_supprimes` (
        `id`         INT          NOT NULL AUTO_INCREMENT,
        `table_nom`  VARCHAR(30)  NOT NULL,
        `cle`        VARCHAR(400) NOT NULL,
        `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`),
        KEY `idx_table` (`table_nom`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
");

/** Ajoute une colonne si elle n'existe pas encore (les données existantes sont conservées). */
function scAjouterColonne(PDO $pdo, string $table, string $colonne, string $definition): void {
    $st = $pdo->prepare('SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?');
    $st->execute([$table, $colonne]);
    if (!(int) $st->fetchColumn()) $pdo->exec("ALTER TABLE `$table` ADD COLUMN `$colonne` $definition");
}

// Pour l'import sans perte :
// - cle_import   : identifiant de la ligne dans le fichier Excel (fixé à l'import, ne change plus)
// - modifie_site : 1 dès que la ligne a été modifiée sur Hello Gestion → un réimport ne la touche plus
foreach (['sc_commandes', 'sc_bc', 'sc_factures'] as $t) {
    scAjouterColonne($pdo, $t, 'cle_import', "VARCHAR(400) NULL");
    scAjouterColonne($pdo, $t, 'modifie_site', "TINYINT(1) NOT NULL DEFAULT 0");
}

const SC_PARAMETRES_DEFAUT = [
    'produits'     => ['Fenêtre', 'Porte-fenêtre', 'Coulissant', "Porte d'entrée", "Porte d'intérieur", 'Volet roulant', 'Volet battant', 'Moustiquaire', 'Porte de garage', 'Portail', 'Portillon', 'Clôture', 'Pergola', 'Carport', 'Store', 'Autre', 'Tablier seul', 'Kit motorisation', 'Store de velux', 'Velux', 'Barreaudage', 'Vitrage'],
    'motorisation' => ['Motorisé', 'Non motorisé', 'Mixte', 'Non concerné'],
    'unites'       => ['Heure(s)', 'Jour(s)'],
    'etats'        => ['En cours', 'Modifiée', 'En attente', 'Annulée'],
    'fournisseurs' => [],
];

const SC_CHAMPS_COMMANDE = ['num_commande', 'client', 'fournisseur', 'date_commande', 'date_arc', 'relance', 'etat', 'num_bc', 'montant_ht', 'montant_ttc', 'type_marchandise', 'motorisation', 'duree_pose', 'unite', 'semaine_livraison', 'date_livraison_prevue', 'date_pose', 'statut_pose', 'commentaire', 'termine', 'statut_archive', 'ordre'];
const SC_CHAMPS_BC        = ['client', 'num_bc', 'date_bc', 'fournisseur', 'montant_ht', 'montant_ttc', 'commentaire', 'ordre'];
const SC_CHAMPS_FACTURE   = ['num_facture', 'num_bc', 'date_facture', 'montant_ht', 'montant_ttc', 'date_paiement', 'commentaire', 'ordre'];
const SC_DATES            = ['date_commande', 'date_arc', 'date_livraison_prevue', 'date_pose', 'date_bc', 'date_facture', 'date_paiement'];
const SC_NOMBRES          = ['montant_ht', 'montant_ttc', 'duree_pose'];
const SC_ENTIERS          = ['termine', 'ordre'];

function scValeur(string $champ, $v) {
    if (in_array($champ, SC_DATES, true)) {
        $v = trim((string) ($v ?? ''));
        return preg_match('/^\d{4}-\d{2}-\d{2}$/', $v) ? $v : null;
    }
    if (in_array($champ, SC_NOMBRES, true)) {
        if ($v === null || $v === '') return null;
        $n = is_numeric($v) ? (float) $v : (float) str_replace([' ', ',', '€'], ['', '.', ''], (string) $v);
        return round($n, 2);
    }
    if (in_array($champ, SC_ENTIERS, true)) return (int) ($v ?? 0);
    return trim((string) ($v ?? ''));
}

function scNettoyer(array $ligne, array $champs): array {
    $out = [];
    foreach ($champs as $c) {
        if (array_key_exists($c, $ligne)) $out[$c] = scValeur($c, $ligne[$c]);
    }
    return $out;
}

/** Insère ou met à jour une ligne ; renvoie son id. */
function scEnregistrer(PDO $pdo, string $table, array $champs, array $ligne, string $auteur): int {
    $id = (int) ($ligne['id'] ?? 0);
    $data = scNettoyer($ligne, $champs);
    $data['updated_by'] = $auteur;
    $cols = array_keys($data);
    if ($id) {
        $set = implode(', ', array_map(fn($c) => "`$c` = ?", $cols));
        $stmt = $pdo->prepare("UPDATE `$table` SET $set WHERE id = ?");
        $stmt->execute([...array_values($data), $id]);
        return $id;
    }
    $place = implode(', ', array_fill(0, count($cols), '?'));
    $pdo->prepare("INSERT INTO `$table` (`" . implode('`, `', $cols) . "`) VALUES ($place)")->execute(array_values($data));
    return (int) $pdo->lastInsertId();
}

/* ---------- Journal ---------- */

/** Enregistre une action dans le journal ; une erreur de journal ne bloque jamais l'action. */
function scLog(PDO $pdo, string $action, string $cible, array $details = []): void {
    global $scEmail;
    try {
        $pdo->prepare('INSERT INTO sc_logs (created_at, user_email, user_name, action, cible, details, ip) VALUES (?, ?, ?, ?, ?, ?, ?)')->execute([
            (new DateTime('now', new DateTimeZone('Europe/Paris')))->format('Y-m-d H:i:s'),
            $scEmail, (string) ($_SESSION['user']['name'] ?? ''), $action, mb_substr($cible, 0, 255),
            json_encode($details, JSON_UNESCAPED_UNICODE), (string) ($_SERVER['REMOTE_ADDR'] ?? ''),
        ]);
    } catch (Throwable $e) {
        error_log('suivi_commandes_api (journal): ' . $e->getMessage());
    }
}

function scLire(PDO $pdo, string $table, int $id): ?array {
    if (!$id) return null;
    $stmt = $pdo->prepare("SELECT * FROM `$table` WHERE id = ?");
    $stmt->execute([$id]);
    return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
}

/** Liste des champs modifiés : [{champ, avant, apres}]. Création : avant = null ; suppression : apres = null. */
function scDiff(?array $avant, ?array $apres): array {
    $norm = function ($v) {
        if ($v === null) return '';
        if (is_numeric($v) && preg_match('/^-?\d+(\.\d+)?$/', (string) $v)) return rtrim(rtrim(number_format((float) $v, 2, '.', ''), '0'), '.');
        return trim((string) $v);
    };
    $champs = array_unique(array_merge(array_keys($avant ?? []), array_keys($apres ?? [])));
    $out = [];
    foreach ($champs as $c) {
        if (in_array($c, ['id', 'ordre', 'updated_by', 'updated_at', 'cle_import', 'modifie_site'], true)) continue;
        $a = $avant === null ? null : $norm($avant[$c] ?? null);
        $b = $apres === null ? null : $norm($apres[$c] ?? null);
        if ($a === $b || (($a ?? '') === '' && ($b ?? '') === '')) continue;
        $out[] = ['champ' => $c, 'avant' => $a, 'apres' => $b];
    }
    return $out;
}

function scCible(string $table, ?array $r): string {
    $r = $r ?? [];
    return match ($table) {
        'sc_commandes' => trim('Commande ' . ($r['num_commande'] ?? '') . ' · ' . ($r['client'] ?? '') . ' · ' . ($r['fournisseur'] ?? ''), ' ·'),
        'sc_bc'        => trim('BC ' . ($r['num_bc'] ?? '') . ' · ' . ($r['client'] ?? '') . ' · ' . ($r['fournisseur'] ?? ''), ' ·'),
        'sc_factures'  => trim('Facture ' . ($r['num_facture'] ?? '') . ' · BC ' . ($r['num_bc'] ?? ''), ' ·'),
        default        => '',
    };
}

/** Enregistre une ligne et journalise la création ou la modification (avec avant / après). */
function scEnregistrerJournalise(PDO $pdo, string $table, array $champs, array $ligne, string $auteur, string $action): int {
    $avant = scLire($pdo, $table, (int) ($ligne['id'] ?? 0));
    $id = scEnregistrer($pdo, $table, $champs, $ligne, $auteur);
    $apres = scLire($pdo, $table, $id);
    $diff = scDiff($avant, $apres);
    // Saisie faite sur le site : un réimport Excel ne l'écrasera jamais
    if ($avant === null || $diff) $pdo->prepare("UPDATE `$table` SET modifie_site = 1 WHERE id = ?")->execute([$id]);
    if ($avant === null || $diff) scLog($pdo, $action . ($avant === null ? '_creation' : '_modification'), scCible($table, $apres), ['changements' => $diff]);
    return $id;
}

/** Supprime une ligne en gardant tout son contenu dans le journal. */
function scSupprimerJournalise(PDO $pdo, string $table, int $id, string $action): void {
    $avant = scLire($pdo, $table, $id);
    $pdo->prepare("DELETE FROM `$table` WHERE id = ?")->execute([$id]);
    // Mémorise la suppression pour qu'un réimport Excel ne fasse pas revenir la ligne
    if ($avant) $pdo->prepare('INSERT INTO sc_supprimes (table_nom, cle) VALUES (?, ?)')->execute([$table, scCleLigne($table, $avant)]);
    if ($avant) scLog($pdo, $action, scCible($table, $avant), ['changements' => scDiff($avant, null)]);
}

function scCle(string $numBc, string $fournisseur): string {
    return mb_strtolower(trim($numBc)) . '|' . mb_strtolower(trim($fournisseur));
}

/* ---------- Import sans perte (fusion) ---------- */

/**
 * Identifiant d'une ligne pour rapprocher le fichier Excel et le site :
 * - commande : n° de commande client + fournisseur (le n° de BC peut arriver plus tard)
 * - BC       : n° de BC + fournisseur
 * - facture  : n° de facture + n° de BC
 * Une ligne déjà importée garde l'identifiant de son import, même si on la modifie ensuite.
 */
function scCleLigne(string $table, array $r): string {
    if (!empty($r['cle_import'])) return (string) $r['cle_import'];
    $n = fn($v) => mb_strtolower(trim((string) ($v ?? '')));
    return match ($table) {
        'sc_commandes' => $n($r['num_commande'] ?? '') . '|' . $n($r['fournisseur'] ?? ''),
        'sc_bc'        => $n($r['num_bc'] ?? '') . '|' . $n($r['fournisseur'] ?? ''),
        'sc_factures'  => $n($r['num_facture'] ?? '') . '|' . $n($r['num_bc'] ?? ''),
        default        => '',
    };
}

/**
 * Fusionne les lignes d'un fichier Excel dans une table, sans jamais rien supprimer :
 * - ligne absente du site                 → ajoutée
 * - ligne modifiée sur le site            → conservée telle quelle (le site a priorité)
 * - ligne jamais modifiée sur le site     → mise à jour avec le fichier
 * - ligne supprimée sur le site           → ne revient pas
 * - ligne présente seulement sur le site  → conservée
 */
function scFusionner(PDO $pdo, string $table, array $champs, array $lignesExcel, string $auteur): array {
    $stats = ['ajoutees' => 0, 'mises_a_jour' => 0, 'conservees' => 0, 'identiques' => 0, 'ignorees' => 0];

    $site = [];
    foreach ($pdo->query("SELECT * FROM `$table` ORDER BY id") as $r) $site[scCleLigne($table, $r)][] = $r;

    $supprimes = [];
    $st = $pdo->prepare('SELECT cle, COUNT(*) FROM sc_supprimes WHERE table_nom = ? GROUP BY cle');
    $st->execute([$table]);
    foreach ($st->fetchAll(PDO::FETCH_NUM) as [$cle, $nb]) $supprimes[$cle] = (int) $nb;

    $excel = [];
    foreach ($lignesExcel as $l) {
        $l = (array) $l;
        unset($l['id'], $l['ordre'], $l['cle_import'], $l['modifie_site']);
        $excel[scCleLigne($table, $l)][] = $l;
    }

    $ordre = (int) $pdo->query("SELECT COALESCE(MAX(ordre), 0) FROM `$table`")->fetchColumn();
    foreach ($excel as $cle => $lignes) {
        $existantes = $site[$cle] ?? [];
        foreach ($lignes as $i => $l) {
            if (isset($existantes[$i])) {
                $r = $existantes[$i];
                if ((int) $r['modifie_site']) { $stats['conservees']++; continue; }
                $nouveau = scNettoyer($l, $champs);
                if (!scDiff(array_intersect_key($r, $nouveau), $nouveau)) { $stats['identiques']++; continue; }
                scEnregistrer($pdo, $table, $champs, ['id' => (int) $r['id']] + $l, $auteur);
                $stats['mises_a_jour']++;
                continue;
            }
            // Au-delà des lignes déjà sur le site : celles supprimées sur le site ne reviennent pas
            if (($supprimes[$cle] ?? 0) > 0) { $supprimes[$cle]--; $stats['ignorees']++; continue; }
            $id = scEnregistrer($pdo, $table, $champs, ['ordre' => ++$ordre] + $l, $auteur);
            $pdo->prepare("UPDATE `$table` SET cle_import = ? WHERE id = ?")->execute([$cle, $id]);
            $stats['ajoutees']++;
        }
    }
    return $stats;
}

/**
 * Remplace le bouton « IMPORTER LES NOUVEAUX BC » : chaque BC du suivi (en cours ou terminé)
 * absent de la compta y est ajouté, comparaison sur n° de BC + fournisseur, comme la macro.
 */
function scSynchroniserBC(PDO $pdo, string $auteur): int {
    $existants = [];
    foreach ($pdo->query('SELECT num_bc, fournisseur FROM sc_bc') as $r) $existants[scCle($r['num_bc'], $r['fournisseur'])] = true;
    $ordre = (int) $pdo->query('SELECT COALESCE(MAX(ordre), 0) FROM sc_bc')->fetchColumn();

    $lignes = $pdo->query("SELECT client, num_bc, date_arc, fournisseur, montant_ht, montant_ttc FROM sc_commandes WHERE TRIM(num_bc) <> '' ORDER BY termine DESC, ordre, id")->fetchAll(PDO::FETCH_ASSOC);
    $vus = [];
    $ajoutes = 0;
    foreach ($lignes as $l) {
        $numBc = trim($l['num_bc']);
        // Comme la requête Power Query : un même n° de BC n'est pris qu'une fois
        if (isset($vus[mb_strtolower($numBc)])) continue;
        $vus[mb_strtolower($numBc)] = true;
        if (isset($existants[scCle($numBc, $l['fournisseur'])])) continue;
        scEnregistrer($pdo, 'sc_bc', SC_CHAMPS_BC, [
            'client' => $l['client'], 'num_bc' => $numBc, 'date_bc' => $l['date_arc'], 'fournisseur' => $l['fournisseur'],
            'montant_ht' => $l['montant_ht'], 'montant_ttc' => $l['montant_ttc'], 'ordre' => ++$ordre,
        ], $auteur);
        scLog($pdo, 'bc_auto', scCible('sc_bc', ['num_bc' => $numBc] + $l), ['changements' => scDiff(null, [
            'client' => $l['client'], 'num_bc' => $numBc, 'date_bc' => $l['date_arc'], 'fournisseur' => $l['fournisseur'],
            'montant_ht' => $l['montant_ht'], 'montant_ttc' => $l['montant_ttc'],
        ])]);
        $existants[scCle($numBc, $l['fournisseur'])] = true;
        $ajoutes++;
    }
    return $ajoutes;
}

function scParametres(PDO $pdo): array {
    $p = SC_PARAMETRES_DEFAUT;
    foreach ($pdo->query('SELECT cle, valeurs FROM sc_parametres') as $r) {
        $v = json_decode($r['valeurs'], true);
        if (is_array($v)) $p[$r['cle']] = $v;
    }
    return $p;
}

/** Ne renvoie que les parties auxquelles l'utilisateur a accès. */
function scToutCharger(PDO $pdo): array {
    global $scAcces;
    $lire = fn(string $table) => $pdo->query("SELECT * FROM `$table` ORDER BY ordre, id")->fetchAll(PDO::FETCH_ASSOC);
    $typer = function (array $rows) {
        return array_map(function ($r) {
            foreach ($r as $k => $v) {
                if (in_array($k, SC_NOMBRES, true)) $r[$k] = $v === null ? null : (float) $v;
                elseif (in_array($k, ['id', 'termine', 'ordre'], true)) $r[$k] = (int) $v;
                elseif ($v === null && !in_array($k, SC_DATES, true)) $r[$k] = '';
            }
            return $r;
        }, $rows);
    };
    return [
        'success'    => true,
        // Le droit au journal n'est envoyé qu'au développeur
        'acces'      => array_filter($scAcces, fn($v, $k) => $v || $k !== 'logs', ARRAY_FILTER_USE_BOTH),
        'commandes'  => $scAcces['suivi'] ? $typer($lire('sc_commandes')) : [],
        'bc'         => $scAcces['compta'] ? $typer($lire('sc_bc')) : [],
        'factures'   => $scAcces['compta'] ? $typer($lire('sc_factures')) : [],
        'parametres' => scParametres($pdo),
    ];
}

function scRepondre(PDO $pdo, array $extra = []): void {
    echo json_encode(scToutCharger($pdo) + $extra, JSON_UNESCAPED_UNICODE);
    exit();
}

function scErreur(int $code, string $message): void {
    http_response_code($code);
    echo json_encode(['success' => false, 'message' => $message], JSON_UNESCAPED_UNICODE);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];
$auteur = (string) ($_SESSION['user']['name'] ?? '');

// Le journal n'existe que pour le développeur : pour les autres, la demande est traitée comme un chargement normal
if ($method === 'GET' && isset($_GET['logs']) && $scAcces['logs']) {
    $logs = $pdo->query('SELECT * FROM sc_logs ORDER BY id DESC LIMIT 2000')->fetchAll(PDO::FETCH_ASSOC);
    foreach ($logs as &$l) { $l['id'] = (int) $l['id']; $l['details'] = json_decode((string) $l['details'], true) ?: []; }
    unset($l);
    echo json_encode(['success' => true, 'logs' => $logs], JSON_UNESCAPED_UNICODE);
    exit();
}
if ($method === 'GET') scRepondre($pdo);

if ($method !== 'POST') scErreur(405, 'Méthode non autorisée.');

$body   = json_decode(file_get_contents('php://input'), true) ?? [];
$action = (string) ($body['action'] ?? '');

$besoin = match (true) {
    in_array($action, ['commande_save', 'commande_delete', 'pose', 'terminer'], true) => 'suivi',
    in_array($action, ['bc_save', 'bc_delete', 'facture_save', 'facture_delete', 'export'], true) => 'compta',
    default => null,
};
if ($besoin && !$scAcces[$besoin]) scErreur(403, $besoin === 'suivi' ? 'Vous n\'avez pas accès au suivi des commandes.' : 'Vous n\'avez pas accès aux BC et factures.');
if ($action === 'import') {
    if (!$scAcces['import']) scErreur(403, "Vous n'avez pas accès à l'import des fichiers Excel.");
    if (is_array($body['suivi'] ?? null) && !$scAcces['suivi']) scErreur(403, 'Vous n\'avez pas accès au fichier Suivi commandes.');
    if (is_array($body['compta'] ?? null) && !$scAcces['compta']) scErreur(403, 'Vous n\'avez pas accès au fichier ARC + Factures.');
}

try {
    switch ($action) {

        case 'commande_save': {
            $ligne = (array) ($body['ligne'] ?? []);
            if (trim((string) ($ligne['num_commande'] ?? '')) === '' || trim((string) ($ligne['fournisseur'] ?? '')) === '') {
                scErreur(400, 'Le n° de commande client et le fournisseur sont requis.');
            }
            if (empty($ligne['id'])) $ligne['ordre'] = (int) $pdo->query('SELECT COALESCE(MAX(ordre), 0) + 1 FROM sc_commandes')->fetchColumn();
            scEnregistrerJournalise($pdo, 'sc_commandes', SC_CHAMPS_COMMANDE, $ligne, $auteur, 'commande');
            $ajoutes = scSynchroniserBC($pdo, $auteur);
            scRepondre($pdo, ['bc_ajoutes' => $ajoutes]);
        }

        case 'commande_delete': {
            scSupprimerJournalise($pdo, 'sc_commandes', (int) ($body['id'] ?? 0), 'commande_suppression');
            scRepondre($pdo);
        }

        // Comme la macro du classeur : la date de pose s'applique à toutes les lignes de la commande client
        case 'pose': {
            $num = trim((string) ($body['num_commande'] ?? ''));
            $date = scValeur('date_pose', $body['date_pose'] ?? '');
            $statut = $date ? (($body['statut_pose'] ?? '') === 'PRÉPLANIFIÉ' ? 'PRÉPLANIFIÉ' : 'PLANIFIÉ') : '';
            $st = $pdo->prepare('SELECT client, date_pose, statut_pose, COUNT(*) AS nb FROM sc_commandes WHERE num_commande = ? AND termine = 0 GROUP BY client, date_pose, statut_pose');
            $st->execute([$num]);
            $avant = $st->fetch(PDO::FETCH_ASSOC) ?: [];
            scLog($pdo, 'pose', trim("Commande $num · " . ($avant['client'] ?? ''), ' ·'), ['changements' => scDiff(
                ['date_pose' => $avant['date_pose'] ?? null, 'statut_pose' => $avant['statut_pose'] ?? null],
                ['date_pose' => $date, 'statut_pose' => $statut]
            ), 'lignes' => (int) ($avant['nb'] ?? 0)]);
            $pdo->prepare('UPDATE sc_commandes SET date_pose = ?, statut_pose = ?, updated_by = ?, modifie_site = 1 WHERE num_commande = ? AND termine = 0')
                ->execute([$date, $statut, $auteur, $num]);
            scRepondre($pdo);
        }

        // « Chantier terminé » : toute la commande passe dans les archives (ou en revient)
        case 'terminer': {
            $num = trim((string) ($body['num_commande'] ?? ''));
            $termine = !empty($body['termine']) ? 1 : 0;
            $statut = $termine ? trim((string) ($body['statut_archive'] ?? '')) : '';
            $st = $pdo->prepare('SELECT client, COUNT(*) AS nb FROM sc_commandes WHERE num_commande = ? AND termine = ? GROUP BY client');
            $st->execute([$num, 1 - $termine]);
            $avant = $st->fetch(PDO::FETCH_ASSOC) ?: [];
            scLog($pdo, $termine ? 'chantier_termine' : 'chantier_restaure', trim("Commande $num · " . ($avant['client'] ?? ''), ' ·'),
                ['statut_archive' => $statut, 'lignes' => (int) ($avant['nb'] ?? 0)]);
            $pdo->prepare('UPDATE sc_commandes SET termine = ?, statut_archive = ?, updated_by = ?, modifie_site = 1 WHERE num_commande = ? AND termine = ?')
                ->execute([$termine, $statut, $auteur, $num, 1 - $termine]);
            scRepondre($pdo);
        }

        case 'bc_save': {
            $bc = (array) ($body['bc'] ?? []);
            if (trim((string) ($bc['num_bc'] ?? '')) === '') scErreur(400, 'Le n° de BC est requis.');
            if (empty($bc['id'])) $bc['ordre'] = (int) $pdo->query('SELECT COALESCE(MAX(ordre), 0) + 1 FROM sc_bc')->fetchColumn();
            scEnregistrerJournalise($pdo, 'sc_bc', SC_CHAMPS_BC, $bc, $auteur, 'bc');
            scRepondre($pdo);
        }

        case 'bc_delete': {
            scSupprimerJournalise($pdo, 'sc_bc', (int) ($body['id'] ?? 0), 'bc_suppression');
            scRepondre($pdo);
        }

        case 'facture_save': {
            $f = (array) ($body['facture'] ?? []);
            if (trim((string) ($f['num_bc'] ?? '')) === '') scErreur(400, 'Le n° de BC est requis.');
            if (empty($f['id'])) $f['ordre'] = (int) $pdo->query('SELECT COALESCE(MAX(ordre), 0) + 1 FROM sc_factures')->fetchColumn();
            scEnregistrerJournalise($pdo, 'sc_factures', SC_CHAMPS_FACTURE, $f, $auteur, 'facture');
            scRepondre($pdo);
        }

        case 'facture_delete': {
            scSupprimerJournalise($pdo, 'sc_factures', (int) ($body['id'] ?? 0), 'facture_suppression');
            scRepondre($pdo);
        }

        // Export Excel de la facturation (le fichier est créé dans le navigateur) : seulement journalisé
        case 'export': {
            scLog($pdo, 'export_facturation', (string) ($body['fichier'] ?? ''), [
                'bc' => (int) ($body['nb_bc'] ?? 0), 'factures' => (int) ($body['nb_factures'] ?? 0),
            ]);
            echo json_encode(['success' => true]);
            exit();
        }

        // Import des fichiers Excel : FUSION avec les données du site, rien n'est jamais supprimé ni écrasé
        // (voir scFusionner : ce qui a été saisi ou modifié sur Hello Gestion reste tel quel)
        case 'import': {
            $suivi  = $body['suivi'] ?? null;
            $compta = $body['compta'] ?? null;
            if (!is_array($suivi) && !is_array($compta)) scErreur(400, 'Aucune donnée à importer.');

            $pdo->beginTransaction();
            $parametres = scParametres($pdo);
            // Listes déroulantes : on ajoute les valeurs du fichier, on ne retire rien
            $unir = fn(array $site, array $fichier) => array_values(array_unique(array_merge($site, array_map('strval', $fichier))));
            $resultat = [];

            if (is_array($suivi)) {
                $resultat['commandes'] = scFusionner($pdo, 'sc_commandes', SC_CHAMPS_COMMANDE, (array) ($suivi['commandes'] ?? []), $auteur);
                foreach (['produits', 'motorisation', 'unites', 'etats'] as $cle) {
                    if (!empty($suivi['parametres'][$cle])) $parametres[$cle] = $unir($parametres[$cle] ?? [], $suivi['parametres'][$cle]);
                }
                if (!empty($suivi['parametres']['fournisseurs'])) $parametres['fournisseurs'] = array_merge($parametres['fournisseurs'], $suivi['parametres']['fournisseurs']);
            }
            if (is_array($compta)) {
                $resultat['bc'] = scFusionner($pdo, 'sc_bc', SC_CHAMPS_BC, (array) ($compta['bc'] ?? []), $auteur);
                $resultat['factures'] = scFusionner($pdo, 'sc_factures', SC_CHAMPS_FACTURE, (array) ($compta['factures'] ?? []), $auteur);
                if (!empty($compta['fournisseurs'])) $parametres['fournisseurs'] = array_merge($parametres['fournisseurs'], $compta['fournisseurs']);
            }

            $fournisseurs = array_values(array_unique(array_filter(array_map(fn($f) => trim((string) $f), $parametres['fournisseurs']), fn($f) => $f !== '')));
            natcasesort($fournisseurs);
            $parametres['fournisseurs'] = array_values($fournisseurs);

            $stmt = $pdo->prepare('REPLACE INTO sc_parametres (cle, valeurs) VALUES (?, ?)');
            foreach ($parametres as $cle => $valeurs) $stmt->execute([$cle, json_encode(array_values($valeurs), JSON_UNESCAPED_UNICODE)]);

            $ajoutes = scSynchroniserBC($pdo, $auteur);
            scLog($pdo, 'import', 'Fichiers Excel', [
                'fichiers'   => array_values(array_filter([is_array($suivi) ? 'Suivi commandes' : null, is_array($compta) ? 'ARC + Factures' : null])),
                'commandes'  => is_array($suivi) ? count((array) ($suivi['commandes'] ?? [])) : null,
                'bc'         => is_array($compta) ? count((array) ($compta['bc'] ?? [])) : null,
                'factures'   => is_array($compta) ? count((array) ($compta['factures'] ?? [])) : null,
                'bc_ajoutes' => $ajoutes,
                'fusion'     => $resultat,
            ]);
            $pdo->commit();
            scRepondre($pdo, ['bc_ajoutes' => $ajoutes, 'fusion' => $resultat]);
        }

        default:
            scErreur(400, 'Action inconnue.');
    }
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log('suivi_commandes_api: ' . $e->getMessage());
    scErreur(500, 'Erreur serveur : ' . $e->getMessage());
}
