<?php
session_set_cookie_params(['lifetime'=>1800,'path'=>'/','secure'=>true,'httponly'=>true,'samesite'=>'Strict']);
session_start();

$sessionTimeout = 1800;
if (isset($_SESSION['LAST_ACTIVITY']) && (time() - $_SESSION['LAST_ACTIVITY'] > $sessionTimeout)) {
    session_unset(); session_destroy(); session_start();
}
$_SESSION['LAST_ACTIVITY'] = time();

ini_set('display_errors', 0);
error_reporting(E_ALL);

header('Access-Control-Allow-Origin: https://hello-fermetures.com');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(0); }

ob_start();

try {
    require_once __DIR__ . '/db.php';
    require_once __DIR__ . '/roles.php';

    header('Content-Type: application/json; charset=utf-8');

    // Auth : tous les rôles sauf poseur
    $user = requireAuth();
    if ($user['role'] === 'poseur') {
        ob_end_clean();
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Accès refusé']);
        exit;
    }

    $userId   = (int)$user['id'];
    $userRole = $user['role'];
    $method   = $_SERVER['REQUEST_METHOD'];

    $logDir = __DIR__ . '/logs';
    if (!file_exists($logDir)) mkdir($logDir, 0755, true);

    // Création de la table si elle n'existe pas encore
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS chantiers (
            id                  INT AUTO_INCREMENT PRIMARY KEY,
            client_name         VARCHAR(255)        NOT NULL DEFAULT '',
            folder_month        VARCHAR(7)          NOT NULL DEFAULT '',
            sale_price          DECIMAL(12,2)       NOT NULL DEFAULT 0,
            order_client_date   DATE                DEFAULT NULL,
            our_order_date      DATE                DEFAULT NULL,
            goods_date          DATE                DEFAULT NULL,
            installation_days   DECIMAL(5,1)        NOT NULL DEFAULT 1,
            daily_cost          DECIMAL(10,2)       NOT NULL DEFAULT 2500,
            use_subcontractor   ENUM('oui','non')   NOT NULL DEFAULT 'non',
            subcontractor_amount DECIMAL(12,2)      NOT NULL DEFAULT 0,
            notes               TEXT,
            suppliers           JSON,
            clients_billing     JSON,
            vat_sales           JSON,
            total_suppliers_ht  DECIMAL(12,2)       DEFAULT 0,
            total_invoiced_ht   DECIMAL(12,2)       DEFAULT 0,
            total_paid          DECIMAL(12,2)       DEFAULT 0,
            operations_cost     DECIMAL(12,2)       DEFAULT 0,
            total_cost          DECIMAL(12,2)       DEFAULT 0,
            profit              DECIMAL(12,2)       DEFAULT 0,
            margin              DECIMAL(8,4)        DEFAULT NULL,
            remaining           DECIMAL(12,2)       DEFAULT 0,
            vat_deductible      DECIMAL(12,2)       DEFAULT 0,
            vat_collected       DECIMAL(12,2)       DEFAULT 0,
            vat_credit          DECIMAL(12,2)       DEFAULT 0,
            vat_to_pay          DECIMAL(12,2)       DEFAULT 0,
            subcontract_rate    DECIMAL(8,4)        DEFAULT 0,
            supply_only         TINYINT(1)          NOT NULL DEFAULT 0,
            commercial          VARCHAR(50)         NOT NULL DEFAULT 'sebastien',
            commission          DECIMAL(12,2)       DEFAULT 0,
            gross_profit        DECIMAL(12,2)       DEFAULT 0,
            created_by          INT                 NOT NULL,
            created_at          TIMESTAMP           DEFAULT CURRENT_TIMESTAMP,
            updated_at          TIMESTAMP           DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");

    // Migrations : ajout des colonnes si elles n'existent pas (table déjà créée)
    $cols = $pdo->query("SHOW COLUMNS FROM chantiers")->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('supply_only', $cols))  $pdo->exec("ALTER TABLE chantiers ADD COLUMN supply_only TINYINT(1) NOT NULL DEFAULT 0 AFTER subcontract_rate");
    if (!in_array('commercial', $cols))   $pdo->exec("ALTER TABLE chantiers ADD COLUMN commercial VARCHAR(50) NOT NULL DEFAULT 'sebastien' AFTER supply_only");
    if (!in_array('commission', $cols))   $pdo->exec("ALTER TABLE chantiers ADD COLUMN commission DECIMAL(12,2) DEFAULT 0 AFTER commercial");
    if (!in_array('gross_profit', $cols)) $pdo->exec("ALTER TABLE chantiers ADD COLUMN gross_profit DECIMAL(12,2) DEFAULT 0 AFTER commission");

    switch ($method) {
        case 'GET':    handleGet($pdo, $userId, $userRole); break;
        case 'POST':   handlePost($pdo, $userId, $logDir); break;
        case 'PUT':    handlePut($pdo, $userId, $userRole, $logDir); break;
        case 'DELETE': handleDelete($pdo, $userId, $userRole, $logDir); break;
        default:
            http_response_code(405);
            ob_end_clean();
            echo json_encode(['success' => false, 'message' => 'Méthode non autorisée']);
    }
} catch (Exception $e) {
    error_log('chantiers error: ' . $e->getMessage());
    ob_end_clean();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erreur serveur']);
}

// ── Helpers ───────────────────────────────────────────────────

/**
 * Rôles pouvant voir tous les chantiers (pas seulement les leurs).
 */
function canViewAll(string $role): bool {
    return in_array($role, ['admin', 'gerant', 'administration'], true);
}

/**
 * Convertit une date vide/null en NULL pour PDO.
 */
function nullableDate(?string $val): ?string {
    $v = trim($val ?? '');
    return ($v === '' || $v === '0000-00-00') ? null : $v;
}

// ── GET : liste ou détail ─────────────────────────────────────

function handleGet($pdo, int $userId, string $userRole): void {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

    if ($id) {
        // ── Détail complet d'un seul chantier ────────────────
        $stmt = $pdo->prepare("
            SELECT c.*, u.name AS created_by_name
            FROM chantiers c
            LEFT JOIN users u ON c.created_by = u.id
            WHERE c.id = ?
        ");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            ob_end_clean();
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Chantier introuvable']);
            return;
        }

        // Accès : seul le créateur ou un rôle supérieur peut lire
        if (!canViewAll($userRole) && (int)$row['created_by'] !== $userId) {
            ob_end_clean();
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Accès refusé']);
            return;
        }

        // Décoder les champs JSON en tableaux
        foreach (['suppliers', 'clients_billing', 'vat_sales'] as $field) {
            $row[$field] = isset($row[$field]) ? json_decode($row[$field], true) ?? [] : [];
        }

        ob_end_clean();
        echo json_encode(['success' => true, 'data' => $row]);
        return;
    }

    // ── Liste ─────────────────────────────────────────────────
    $where  = [];
    $params = [];

    // Filtrage par propriétaire pour les rôles non-admin
    if (!canViewAll($userRole)) {
        $where[]  = 'c.created_by = ?';
        $params[] = $userId;
    }

    // Filtrage par année
    if (!empty($_GET['year'])) {
        $year = preg_replace('/[^0-9]/', '', $_GET['year']);
        if (strlen($year) === 4) {
            $where[]  = "c.folder_month LIKE ?";
            $params[] = $year . '-%';
        }
    }

    // Filtrage par mois (format YYYY-MM)
    if (!empty($_GET['month'])) {
        $month = preg_replace('/[^0-9\-]/', '', $_GET['month']);
        if (preg_match('/^\d{4}-\d{2}$/', $month)) {
            $where[]  = 'c.folder_month = ?';
            $params[] = $month;
        }
    }

    // Filtrage par rentabilité
    if (!empty($_GET['rentability'])) {
        switch ($_GET['rentability']) {
            case 'good':
                // profit > 0 ET margin >= 20 %
                $where[] = 'c.profit > 0 AND c.margin >= 20';
                break;
            case 'warn':
                // profit >= 0 mais pas "good"
                $where[] = 'c.profit >= 0 AND NOT (c.profit > 0 AND c.margin >= 20)';
                break;
            case 'bad':
                // profit < 0
                $where[] = 'c.profit < 0';
                break;
        }
    }

    $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

    // Colonnes de la liste : on exclut les champs JSON volumineux pour les performances
    $stmt = $pdo->prepare("
        SELECT
            c.id,
            c.client_name,
            c.folder_month,
            c.sale_price,
            c.order_client_date,
            c.our_order_date,
            c.goods_date,
            c.installation_days,
            c.daily_cost,
            c.use_subcontractor,
            c.subcontractor_amount,
            c.notes,
            c.total_suppliers_ht,
            c.total_invoiced_ht,
            c.total_paid,
            c.operations_cost,
            c.total_cost,
            c.profit,
            c.margin,
            c.remaining,
            c.vat_deductible,
            c.vat_collected,
            c.vat_credit,
            c.vat_to_pay,
            c.subcontract_rate,
            c.created_by,
            c.created_at,
            c.updated_at,
            u.name AS created_by_name
        FROM chantiers c
        LEFT JOIN users u ON c.created_by = u.id
        $whereSql
        ORDER BY c.folder_month ASC, c.created_at ASC
    ");
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    ob_end_clean();
    echo json_encode(['success' => true, 'data' => $rows]);
}

// ── POST : créer un chantier ──────────────────────────────────

function handlePost($pdo, int $userId, string $logDir): void {
    $body = json_decode(file_get_contents('php://input'), true);

    if (!is_array($body)) {
        ob_end_clean();
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Corps JSON invalide']);
        return;
    }

    $clientName = trim($body['client_name'] ?? '');
    if ($clientName === '') {
        ob_end_clean();
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Le nom du client est obligatoire']);
        return;
    }

    $totals = $body['totals'] ?? [];

    $stmt = $pdo->prepare("
        INSERT INTO chantiers (
            client_name, folder_month, sale_price,
            order_client_date, our_order_date, goods_date,
            installation_days, daily_cost,
            use_subcontractor, subcontractor_amount,
            supply_only, commercial,
            notes, suppliers, clients_billing, vat_sales,
            total_suppliers_ht, total_invoiced_ht, total_paid,
            operations_cost, total_cost, gross_profit, profit, margin,
            remaining, vat_deductible, vat_collected, vat_credit,
            vat_to_pay, subcontract_rate, commission,
            created_by
        ) VALUES (
            ?, ?, ?,
            ?, ?, ?,
            ?, ?,
            ?, ?,
            ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?,
            ?
        )
    ");

    $useSubcontractor = in_array($body['use_subcontractor'] ?? 'non', ['oui', 'non'], true)
        ? $body['use_subcontractor']
        : 'non';

    $commercial = in_array($body['commercial'] ?? 'sebastien', ['sebastien', 'aurelien'], true)
        ? $body['commercial']
        : 'sebastien';

    $margin = isset($totals['margin']) && $totals['margin'] !== '' && $totals['margin'] !== null
        ? (float)$totals['margin']
        : null;

    $stmt->execute([
        $clientName,
        trim($body['folder_month']             ?? ''),
        (float)($body['sale_price']            ?? 0),
        nullableDate($body['order_client_date'] ?? null),
        nullableDate($body['our_order_date']    ?? null),
        nullableDate($body['goods_date']        ?? null),
        (float)($body['installation_days']     ?? 1),
        (float)($body['daily_cost']            ?? 2500),
        $useSubcontractor,
        (float)($body['subcontractor_amount']  ?? 0),
        (int)($body['supply_only']             ?? 0),
        $commercial,
        $body['notes']                          ?? null,
        json_encode($body['suppliers']          ?? []),
        json_encode($body['clients_billing']    ?? []),
        json_encode($body['vat_sales']          ?? []),
        (float)($totals['totalSuppliersHT']    ?? 0),
        (float)($totals['totalInvoicedHT']     ?? 0),
        (float)($totals['totalPaid']           ?? 0),
        (float)($totals['operationsCost']      ?? 0),
        (float)($totals['totalCost']           ?? 0),
        (float)($totals['grossProfit']         ?? 0),
        (float)($totals['profit']              ?? 0),
        $margin,
        (float)($totals['remaining']           ?? 0),
        (float)($totals['totalDeductibleVAT']  ?? 0),
        (float)($totals['totalCollectedVAT']   ?? 0),
        (float)($totals['creditVAT']           ?? 0),
        (float)($totals['vatToPay']            ?? 0),
        (float)($totals['subcontractRate']     ?? 0),
        (float)($totals['commission']          ?? 0),
        $userId,
    ]);

    $newId = (int)$pdo->lastInsertId();

    file_put_contents("$logDir/chantiers.log",
        date('Y-m-d H:i:s') . " - Chantier ID=$newId créé par user_id=$userId (client: $clientName)\n",
        FILE_APPEND);

    ob_end_clean();
    echo json_encode(['success' => true, 'id' => $newId, 'message' => 'Chantier créé']);
}

// ── PUT : mettre à jour un chantier ──────────────────────────

function handlePut($pdo, int $userId, string $userRole, string $logDir): void {
    $body = json_decode(file_get_contents('php://input'), true);

    if (!is_array($body)) {
        ob_end_clean();
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Corps JSON invalide']);
        return;
    }

    $id = (int)($body['id'] ?? 0);
    if (!$id) {
        ob_end_clean();
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID manquant']);
        return;
    }

    // Vérifier que le chantier existe et récupérer le créateur
    $stmt = $pdo->prepare("SELECT id, created_by FROM chantiers WHERE id = ?");
    $stmt->execute([$id]);
    $existing = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$existing) {
        ob_end_clean();
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Chantier introuvable']);
        return;
    }

    // Seul le créateur ou un rôle supérieur peut modifier
    if (!canViewAll($userRole) && (int)$existing['created_by'] !== $userId) {
        ob_end_clean();
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Accès refusé']);
        return;
    }

    $clientName = trim($body['client_name'] ?? '');
    if ($clientName === '') {
        ob_end_clean();
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Le nom du client est obligatoire']);
        return;
    }

    $totals = $body['totals'] ?? [];

    $useSubcontractor = in_array($body['use_subcontractor'] ?? 'non', ['oui', 'non'], true)
        ? $body['use_subcontractor']
        : 'non';

    $commercial = in_array($body['commercial'] ?? 'sebastien', ['sebastien', 'aurelien'], true)
        ? $body['commercial']
        : 'sebastien';

    $margin = isset($totals['margin']) && $totals['margin'] !== '' && $totals['margin'] !== null
        ? (float)$totals['margin']
        : null;

    $stmt = $pdo->prepare("
        UPDATE chantiers SET
            client_name          = ?,
            folder_month         = ?,
            sale_price           = ?,
            order_client_date    = ?,
            our_order_date       = ?,
            goods_date           = ?,
            installation_days    = ?,
            daily_cost           = ?,
            use_subcontractor    = ?,
            subcontractor_amount = ?,
            supply_only          = ?,
            commercial           = ?,
            notes                = ?,
            suppliers            = ?,
            clients_billing      = ?,
            vat_sales            = ?,
            total_suppliers_ht   = ?,
            total_invoiced_ht    = ?,
            total_paid           = ?,
            operations_cost      = ?,
            total_cost           = ?,
            gross_profit         = ?,
            profit               = ?,
            margin               = ?,
            remaining            = ?,
            vat_deductible       = ?,
            vat_collected        = ?,
            vat_credit           = ?,
            vat_to_pay           = ?,
            subcontract_rate     = ?,
            commission           = ?
        WHERE id = ?
    ");

    $stmt->execute([
        $clientName,
        trim($body['folder_month']             ?? ''),
        (float)($body['sale_price']            ?? 0),
        nullableDate($body['order_client_date'] ?? null),
        nullableDate($body['our_order_date']    ?? null),
        nullableDate($body['goods_date']        ?? null),
        (float)($body['installation_days']     ?? 1),
        (float)($body['daily_cost']            ?? 2500),
        $useSubcontractor,
        (float)($body['subcontractor_amount']  ?? 0),
        (int)($body['supply_only']             ?? 0),
        $commercial,
        $body['notes']                          ?? null,
        json_encode($body['suppliers']          ?? []),
        json_encode($body['clients_billing']    ?? []),
        json_encode($body['vat_sales']          ?? []),
        (float)($totals['totalSuppliersHT']    ?? 0),
        (float)($totals['totalInvoicedHT']     ?? 0),
        (float)($totals['totalPaid']           ?? 0),
        (float)($totals['operationsCost']      ?? 0),
        (float)($totals['totalCost']           ?? 0),
        (float)($totals['grossProfit']         ?? 0),
        (float)($totals['profit']              ?? 0),
        $margin,
        (float)($totals['remaining']           ?? 0),
        (float)($totals['totalDeductibleVAT']  ?? 0),
        (float)($totals['totalCollectedVAT']   ?? 0),
        (float)($totals['creditVAT']           ?? 0),
        (float)($totals['vatToPay']            ?? 0),
        (float)($totals['subcontractRate']     ?? 0),
        (float)($totals['commission']          ?? 0),
        $id,
    ]);

    file_put_contents("$logDir/chantiers.log",
        date('Y-m-d H:i:s') . " - Chantier ID=$id mis à jour par user_id=$userId\n",
        FILE_APPEND);

    ob_end_clean();
    echo json_encode(['success' => true, 'message' => 'Chantier mis à jour']);
}

// ── DELETE : supprimer un chantier ────────────────────────────

function handleDelete($pdo, int $userId, string $userRole, string $logDir): void {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    if (!$id) {
        ob_end_clean();
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID manquant']);
        return;
    }

    $stmt = $pdo->prepare("SELECT id, created_by, client_name FROM chantiers WHERE id = ?");
    $stmt->execute([$id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        ob_end_clean();
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Chantier introuvable']);
        return;
    }

    // Seul le créateur ou admin/gérant peut supprimer
    $canDelete = in_array($userRole, ['admin', 'gerant'], true)
        || (int)$row['created_by'] === $userId;

    if (!$canDelete) {
        ob_end_clean();
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Accès refusé']);
        return;
    }

    $pdo->prepare("DELETE FROM chantiers WHERE id = ?")->execute([$id]);

    file_put_contents("$logDir/chantiers.log",
        date('Y-m-d H:i:s') . " - Chantier ID=$id (client: {$row['client_name']}) supprimé par user_id=$userId\n",
        FILE_APPEND);

    ob_end_clean();
    echo json_encode(['success' => true, 'message' => 'Chantier supprimé']);
}
