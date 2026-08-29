<?php
/**
 * cron_monthly_report.php
 * ──────────────────────────────────────────────────────────────
 * Génère automatiquement le rapport du MOIS PRÉCÉDENT (complet)
 * et le sauvegarde dans la table `reports`.
 *
 * Crontab — le 1er de chaque mois à 07h00 :
 *   0 7 1 * * /usr/bin/php /chemin/vers/hello-gestion/php/cron_monthly_report.php >> /chemin/vers/hello-gestion/php/logs/cron_monthly_report.log 2>&1
 *
 * Test via URL (token requis) :
 *   https://hello-fermetures.com/hello-gestion/php/cron_monthly_report.php?cron_token=VOTRE_TOKEN
 * ──────────────────────────────────────────────────────────────
 */

// ── Contexte d'exécution ────────────────────────────────────────
$isCli = (php_sapi_name() === 'cli');

if (!$isCli) {
    require_once __DIR__ . '/config.php';
    $token = $_GET['cron_token'] ?? '';
    if ($token !== CRON_TOKEN) {
        http_response_code(403);
        header('Content-Type: application/json');
        echo json_encode(['error' => true, 'message' => 'Token invalide']);
        exit;
    }
    header('Content-Type: application/json; charset=utf-8');
}

ini_set('display_errors', 0);
error_reporting(E_ALL);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

// ── Garde : n'exécuter que le 1er du mois (sauf en CLI ou avec force=1) ──
if (!$isCli && !isset($_GET['force'])) {
    if ((int)date('j') !== 1) {
        header('Content-Type: application/json');
        echo json_encode(['success' => true, 'skipped' => true, 'message' => 'Pas le 1er du mois — rien à faire']);
        exit;
    }
}

// ── Logs ────────────────────────────────────────────────────────
$logDir  = __DIR__ . '/logs';
if (!file_exists($logDir)) mkdir($logDir, 0755, true);
$logFile = $logDir . '/cron_monthly_report.log';

function cLog(string $msg): void {
    global $logFile;
    $line = '[' . date('Y-m-d H:i:s') . '] ' . $msg . PHP_EOL;
    file_put_contents($logFile, $line, FILE_APPEND);
    if (php_sapi_name() === 'cli') echo $line;
}

// ── Période : mois PRÉCÉDENT (complet) ─────────────────────────
$firstOfPrevMonth = new DateTime('first day of last month 00:00:00');
$lastOfPrevMonth  = new DateTime('last day of last month 23:59:59');

$prevMonth  = (int)$firstOfPrevMonth->format('n');
$prevYear   = (int)$firstOfPrevMonth->format('Y');
$monthNames = [
    1=>'Janvier',  2=>'Février',   3=>'Mars',      4=>'Avril',
    5=>'Mai',      6=>'Juin',      7=>'Juillet',   8=>'Août',
    9=>'Septembre',10=>'Octobre',  11=>'Novembre', 12=>'Décembre',
];
$monthLabel  = $monthNames[$prevMonth] . ' ' . $prevYear;
$reportTitle = "Rapport mensuel — {$monthLabel}";

$dateStart = $firstOfPrevMonth->format('Y-m-d H:i:s');
$dateEnd   = $lastOfPrevMonth->format('Y-m-d H:i:s');

cLog("Démarrage — période : {$dateStart} → {$dateEnd}");

try {
    // ── Auto-création de la table reports ──────────────────────
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `reports` (
          `id`           INT AUTO_INCREMENT PRIMARY KEY,
          `title`        VARCHAR(255)  NOT NULL,
          `type`         VARCHAR(50)   NOT NULL DEFAULT 'monthly',
          `month`        TINYINT       NULL,
          `year`         SMALLINT      NULL,
          `generated_at` DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
          `user_id`      INT           NULL,
          `user_name`    VARCHAR(100)  NULL,
          `stats`        JSON          NULL,
          INDEX idx_year_month   (`year`, `month`),
          INDEX idx_generated_at (`generated_at`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    // ── Anti-doublon ────────────────────────────────────────────
    $check = $pdo->prepare("SELECT id FROM `reports` WHERE `type` = 'monthly' AND `month` = ? AND `year` = ? LIMIT 1");
    $check->execute([$prevMonth, $prevYear]);
    if ($check->fetch()) {
        cLog("Rapport de {$monthLabel} déjà existant — arrêt.");
        if (!$isCli) echo json_encode(['success' => true, 'skipped' => true, 'message' => "Rapport {$monthLabel} déjà existant"]);
        exit;
    }

    // ── 1. Produits posés ───────────────────────────────────────
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM installed WHERE installed_date BETWEEN ? AND ?");
    $stmt->execute([$dateStart, $dateEnd]);
    $monthInstalled = (int)$stmt->fetchColumn();
    cLog("Produits posés : {$monthInstalled}");

    // ── 2. Produits reçus ───────────────────────────────────────
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM received WHERE `date` BETWEEN ? AND ?");
    $stmt->execute([$dateStart, $dateEnd]);
    $monthReceived = (int)$stmt->fetchColumn();
    cLog("Produits reçus : {$monthReceived}");

    // ── 3. État stock consommables ──────────────────────────────
    $rows = $pdo->query("SELECT stock, threshold, price FROM inventory")->fetchAll(PDO::FETCH_ASSOC);
    $outOfStock = 0; $lowStock = 0; $totalValue = 0.0;
    foreach ($rows as $r) {
        $s = (int)$r['stock']; $t = (int)$r['threshold']; $p = (float)$r['price'];
        if ($s === 0)                $outOfStock++;
        elseif ($s > 0 && $s < $t)  $lowStock++;
        $totalValue += $s * $p;
    }
    cLog("Consommables — ruptures:{$outOfStock} faible:{$lowStock} valeur:" . round($totalValue));

    // ── 4. Articles consommés ce mois ───────────────────────────
    $topConsumedCount = 0;
    if ($pdo->query("SHOW TABLES LIKE 'stock_movements'")->fetchAll()) {
        $stmt = $pdo->prepare("SELECT COUNT(DISTINCT item_id) FROM stock_movements WHERE delta < 0 AND moved_at BETWEEN ? AND ?");
        $stmt->execute([$dateStart, $dateEnd]);
        $topConsumedCount = (int)$stmt->fetchColumn();
    }
    cLog("Articles consommés : {$topConsumedCount}");

    // ── 5. Outils ───────────────────────────────────────────────
    $toolsCount = 0;
    if ($pdo->query("SHOW TABLES LIKE 'tools'")->fetchAll()) {
        $toolsCount = (int)$pdo->query("SELECT COUNT(*) FROM tools")->fetchColumn();
    }
    cLog("Outils : {$toolsCount}");

    // ── 6. Sauvegarde ───────────────────────────────────────────
    $stats = [
        'monthInstalled'   => $monthInstalled,
        'monthReceived'    => $monthReceived,
        'outOfStock'       => $outOfStock,
        'lowStock'         => $lowStock,
        'totalValue'       => (int)round($totalValue),
        'topConsumedCount' => $topConsumedCount,
        'toolsCount'       => $toolsCount,
    ];

    $stmt = $pdo->prepare("INSERT INTO `reports` (`title`, `type`, `month`, `year`, `user_id`, `user_name`, `stats`) VALUES (?, 'monthly', ?, ?, NULL, 'Automatique (cron)', ?)");
    $stmt->execute([$reportTitle, $prevMonth, $prevYear, json_encode($stats, JSON_UNESCAPED_UNICODE)]);
    $reportId = (int)$pdo->lastInsertId();
    cLog("Rapport sauvegardé id={$reportId}");

    // ── 7. Email ────────────────────────────────────────────────
    sendReportEmail($monthLabel, $stats);

    cLog("Terminé avec succès.");
    if (!$isCli) echo json_encode(['success' => true, 'report_id' => $reportId, 'title' => $reportTitle, 'stats' => $stats], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (Exception $e) {
    cLog("ERREUR : " . $e->getMessage());
    if (!$isCli) { http_response_code(500); echo json_encode(['success' => false, 'message' => $e->getMessage()]); }
}

// ── Email HTML ──────────────────────────────────────────────────

function sendReportEmail(string $monthLabel, array $stats): void {
    $urgence = $stats['outOfStock'] > 0 ? ' ⚠ ' . $stats['outOfStock'] . ' rupture(s)' : '';
    $subject = "Rapport mensuel — {$monthLabel}{$urgence}";

    $html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
      body{font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:20px}
      .card{background:#fff;border-radius:10px;max-width:600px;margin:auto;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1)}
      .hdr{background:#1a1a1a;padding:28px 30px;text-align:center}
      .brand{font-size:22px;font-weight:900;color:#FFB103}
      .sub{color:#888;font-size:13px;margin-top:4px}
      .body{padding:30px}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:20px 0}
      .kpi{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;text-align:center}
      .val{font-size:26px;font-weight:900;color:#1a1a1a}
      .val.g{color:#16a34a}.val.r{color:#dc2626}.val.y{color:#FFB103}
      .lbl{font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;margin-top:4px}
      .ftr{background:#f9fafb;border-top:1px solid #e5e7eb;padding:14px 30px;text-align:center;font-size:11px;color:#9ca3af}
    </style></head><body><div class="card">
      <div class="hdr"><div class="brand">Hello Gestion</div>
        <div class="sub">Rapport mensuel — ' . htmlspecialchars($monthLabel) . '</div></div>
      <div class="body">
        <p style="color:#374151;font-size:14px">Le rapport de <strong>' . htmlspecialchars($monthLabel) . '</strong> est disponible.</p>
        <div class="grid">
          <div class="kpi"><div class="val g">' . $stats['monthInstalled'] . '</div><div class="lbl">Produits posés</div></div>
          <div class="kpi"><div class="val">' . $stats['monthReceived'] . '</div><div class="lbl">Produits reçus</div></div>
          <div class="kpi"><div class="val r">' . $stats['outOfStock'] . '</div><div class="lbl">Ruptures stock</div></div>
          <div class="kpi"><div class="val y">' . $stats['lowStock'] . '</div><div class="lbl">Stock faible</div></div>
          <div class="kpi"><div class="val">' . number_format($stats['totalValue'], 0, ',', ' ') . ' €</div><div class="lbl">Valeur stock</div></div>
          <div class="kpi"><div class="val">' . $stats['toolsCount'] . '</div><div class="lbl">Outils</div></div>
        </div>
        <p style="font-size:13px;color:#6b7280">Retrouve le détail dans <strong>Hello Gestion → Rapports</strong>.</p>
      </div>
      <div class="ftr">Rapport automatique · Hello Fermetures</div>
    </div></body></html>';

    $headers  = "MIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n";
    $headers .= "From: " . FROM_NAME . " <" . FROM_EMAIL . ">\r\n";
    $sent = mail(TO_EMAIL, $subject, $html, $headers);
    cLog("Email : " . ($sent ? 'OK' : 'ECHEC') . " → " . TO_EMAIL);
}
