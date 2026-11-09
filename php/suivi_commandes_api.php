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

$scEmail = strtolower(trim((string) ($_SESSION['user']['email'] ?? '')));
$scAcces = [
    'suivi'  => in_array($scEmail, SC_ACCES_SUIVI, true),
    'compta' => in_array($scEmail, SC_ACCES_COMPTA, true),
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

// Listes déroulantes (onglets « Paramètres » des deux classeurs)
$pdo->exec("
    CREATE TABLE IF NOT EXISTS `sc_parametres` (
        `cle`     VARCHAR(50) NOT NULL,
        `valeurs` LONGTEXT    NOT NULL,
        PRIMARY KEY (`cle`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
");

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

function scCle(string $numBc, string $fournisseur): string {
    return mb_strtolower(trim($numBc)) . '|' . mb_strtolower(trim($fournisseur));
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
        'acces'      => $scAcces,
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

if ($method === 'GET') scRepondre($pdo);

if ($method !== 'POST') scErreur(405, 'Méthode non autorisée.');

$body   = json_decode(file_get_contents('php://input'), true) ?? [];
$action = (string) ($body['action'] ?? '');

$besoin = match (true) {
    in_array($action, ['commande_save', 'commande_delete', 'pose', 'terminer'], true) => 'suivi',
    in_array($action, ['bc_save', 'bc_delete', 'facture_save', 'facture_delete'], true) => 'compta',
    default => null,
};
if ($besoin && !$scAcces[$besoin]) scErreur(403, $besoin === 'suivi' ? 'Vous n\'avez pas accès au suivi des commandes.' : 'Vous n\'avez pas accès aux BC et factures.');
if ($action === 'import') {
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
            scEnregistrer($pdo, 'sc_commandes', SC_CHAMPS_COMMANDE, $ligne, $auteur);
            $ajoutes = scSynchroniserBC($pdo, $auteur);
            scRepondre($pdo, ['bc_ajoutes' => $ajoutes]);
        }

        case 'commande_delete': {
            $pdo->prepare('DELETE FROM sc_commandes WHERE id = ?')->execute([(int) ($body['id'] ?? 0)]);
            scRepondre($pdo);
        }

        // Comme la macro du classeur : la date de pose s'applique à toutes les lignes de la commande client
        case 'pose': {
            $num = trim((string) ($body['num_commande'] ?? ''));
            $date = scValeur('date_pose', $body['date_pose'] ?? '');
            $statut = $date ? (($body['statut_pose'] ?? '') === 'PRÉPLANIFIÉ' ? 'PRÉPLANIFIÉ' : 'PLANIFIÉ') : '';
            $pdo->prepare('UPDATE sc_commandes SET date_pose = ?, statut_pose = ?, updated_by = ? WHERE num_commande = ? AND termine = 0')
                ->execute([$date, $statut, $auteur, $num]);
            scRepondre($pdo);
        }

        // « Chantier terminé » : toute la commande passe dans les archives (ou en revient)
        case 'terminer': {
            $num = trim((string) ($body['num_commande'] ?? ''));
            $termine = !empty($body['termine']) ? 1 : 0;
            $statut = $termine ? trim((string) ($body['statut_archive'] ?? '')) : '';
            $pdo->prepare('UPDATE sc_commandes SET termine = ?, statut_archive = ?, updated_by = ? WHERE num_commande = ? AND termine = ?')
                ->execute([$termine, $statut, $auteur, $num, 1 - $termine]);
            scRepondre($pdo);
        }

        case 'bc_save': {
            $bc = (array) ($body['bc'] ?? []);
            if (trim((string) ($bc['num_bc'] ?? '')) === '') scErreur(400, 'Le n° de BC est requis.');
            if (empty($bc['id'])) $bc['ordre'] = (int) $pdo->query('SELECT COALESCE(MAX(ordre), 0) + 1 FROM sc_bc')->fetchColumn();
            scEnregistrer($pdo, 'sc_bc', SC_CHAMPS_BC, $bc, $auteur);
            scRepondre($pdo);
        }

        case 'bc_delete': {
            $pdo->prepare('DELETE FROM sc_bc WHERE id = ?')->execute([(int) ($body['id'] ?? 0)]);
            scRepondre($pdo);
        }

        case 'facture_save': {
            $f = (array) ($body['facture'] ?? []);
            if (trim((string) ($f['num_bc'] ?? '')) === '') scErreur(400, 'Le n° de BC est requis.');
            if (empty($f['id'])) $f['ordre'] = (int) $pdo->query('SELECT COALESCE(MAX(ordre), 0) + 1 FROM sc_factures')->fetchColumn();
            scEnregistrer($pdo, 'sc_factures', SC_CHAMPS_FACTURE, $f, $auteur);
            scRepondre($pdo);
        }

        case 'facture_delete': {
            $pdo->prepare('DELETE FROM sc_factures WHERE id = ?')->execute([(int) ($body['id'] ?? 0)]);
            scRepondre($pdo);
        }

        // Import des fichiers Excel : remplace les données du site par celles du ou des classeurs envoyés
        case 'import': {
            $suivi  = $body['suivi'] ?? null;
            $compta = $body['compta'] ?? null;
            if (!is_array($suivi) && !is_array($compta)) scErreur(400, 'Aucune donnée à importer.');

            $pdo->beginTransaction();
            $parametres = scParametres($pdo);

            if (is_array($suivi)) {
                $pdo->exec('DELETE FROM sc_commandes');
                $ordre = 0;
                foreach ((array) ($suivi['commandes'] ?? []) as $l) scEnregistrer($pdo, 'sc_commandes', SC_CHAMPS_COMMANDE, ['ordre' => ++$ordre] + $l, $auteur);
                foreach (['produits', 'motorisation', 'unites', 'etats'] as $cle) {
                    if (!empty($suivi['parametres'][$cle])) $parametres[$cle] = array_values(array_unique(array_map('strval', $suivi['parametres'][$cle])));
                }
                if (!empty($suivi['parametres']['fournisseurs'])) $parametres['fournisseurs'] = array_merge($parametres['fournisseurs'], $suivi['parametres']['fournisseurs']);
            }
            if (is_array($compta)) {
                $pdo->exec('DELETE FROM sc_bc');
                $pdo->exec('DELETE FROM sc_factures');
                $ordre = 0;
                foreach ((array) ($compta['bc'] ?? []) as $b) scEnregistrer($pdo, 'sc_bc', SC_CHAMPS_BC, ['ordre' => ++$ordre] + $b, $auteur);
                $ordre = 0;
                foreach ((array) ($compta['factures'] ?? []) as $f) scEnregistrer($pdo, 'sc_factures', SC_CHAMPS_FACTURE, ['ordre' => ++$ordre] + $f, $auteur);
                if (!empty($compta['fournisseurs'])) $parametres['fournisseurs'] = array_merge($parametres['fournisseurs'], $compta['fournisseurs']);
            }

            $fournisseurs = array_values(array_unique(array_filter(array_map(fn($f) => trim((string) $f), $parametres['fournisseurs']), fn($f) => $f !== '')));
            natcasesort($fournisseurs);
            $parametres['fournisseurs'] = array_values($fournisseurs);

            $stmt = $pdo->prepare('REPLACE INTO sc_parametres (cle, valeurs) VALUES (?, ?)');
            foreach ($parametres as $cle => $valeurs) $stmt->execute([$cle, json_encode(array_values($valeurs), JSON_UNESCAPED_UNICODE)]);

            $ajoutes = scSynchroniserBC($pdo, $auteur);
            $pdo->commit();
            scRepondre($pdo, ['bc_ajoutes' => $ajoutes]);
        }

        default:
            scErreur(400, 'Action inconnue.');
    }
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log('suivi_commandes_api: ' . $e->getMessage());
    scErreur(500, 'Erreur serveur : ' . $e->getMessage());
}
