<?php
declare(strict_types=1);
/**
 * Logique métier pure de la Boîte Fournisseurs — aucune dépendance BDD/HTTP.
 */

function normalizeText(string $s): string {
    $s = mb_strtolower(trim($s), 'UTF-8');
    $map = [
        'à' => 'a', 'á' => 'a', 'â' => 'a', 'ã' => 'a', 'ä' => 'a', 'å' => 'a',
        'è' => 'e', 'é' => 'e', 'ê' => 'e', 'ë' => 'e',
        'ì' => 'i', 'í' => 'i', 'î' => 'i', 'ï' => 'i',
        'ò' => 'o', 'ó' => 'o', 'ô' => 'o', 'õ' => 'o', 'ö' => 'o',
        'ù' => 'u', 'ú' => 'u', 'û' => 'u', 'ü' => 'u',
        'ç' => 'c', 'ñ' => 'n',
    ];
    return strtr($s, $map);
}

/**
 * Retourne le supplier_id de la première règle qui matche, sinon null.
 * sender_pattern : adresse exacte ou '@domaine.tld'. subject_keywords : CSV.
 * Sémantique : les deux champs renseignés = ET ; un seul = suffit ; aucun = règle ignorée.
 */
function matchSupplierRule(string $fromEmail, string $subject, array $rules): ?int {
    $from = normalizeText($fromEmail);
    $subj = normalizeText($subject);
    foreach ($rules as $r) {
        $sender = trim((string)($r['sender_pattern'] ?? ''));
        $kwCsv  = trim((string)($r['subject_keywords'] ?? ''));
        if ($sender === '' && $kwCsv === '') continue;

        $senderOk = true;
        if ($sender !== '') {
            $sender = normalizeText($sender);
            $senderOk = str_starts_with($sender, '@')
                ? str_ends_with($from, $sender)
                : $from === $sender;
        }
        $kwOk = true;
        if ($kwCsv !== '') {
            $kwOk = false;
            foreach (explode(',', $kwCsv) as $kw) {
                $kw = normalizeText($kw);
                if ($kw !== '' && str_contains($subj, $kw)) { $kwOk = true; break; }
            }
        }
        if ($senderOk && $kwOk) return (int)$r['supplier_id'];
    }
    return null;
}

/** Classe une réponse du Gérant d'après son texte. */
function classifyReplyBody(string $bodyText): string {
    $html = preg_replace('/<(br|\/p|\/div|\/td|\/li|\/tr)[^>]*>/i', ' ', $bodyText);
    $t = normalizeText(preg_replace('/\s+/', ' ', strip_tags($html)));
    if (str_contains($t, 'bon pour accord')) return 'approved';
    if (str_contains($t, 'a modifier') || str_contains($t, 'merci de modifier')) return 'awaiting_modification';
    return 'replied_unclassified';
}

/** Une relance J+3 est-elle due ? (répétée tous les 3 jours tant que pending) */
function isReminderDue(string $status, string $receivedAt, ?string $lastReminderAt, int $nowTs): bool {
    if ($status !== 'pending') return false;
    if ($nowTs - strtotime($receivedAt) < 3 * 86400) return false;
    if ($lastReminderAt !== null && $nowTs - strtotime($lastReminderAt) < 3 * 86400) return false;
    return true;
}

/** Normalise un message du delta Graph en ligne BDD. null si @removed ou sans expéditeur. */
function parseGraphMessage(array $msg): ?array {
    if (isset($msg['@removed']) || empty($msg['from']['emailAddress']['address'])) return null;
    $ts = strtotime($msg['receivedDateTime'] ?? '');
    return [
        'graph_message_id' => (string)$msg['id'],
        'conversation_id'  => (string)($msg['conversationId'] ?? ''),
        'from_email'       => (string)$msg['from']['emailAddress']['address'],
        'from_name'        => (string)($msg['from']['emailAddress']['name'] ?? ''),
        'subject'          => (string)($msg['subject'] ?? ''),
        'body_html'        => (string)($msg['body']['content'] ?? ''),
        'received_at'      => $ts ? gmdate('Y-m-d H:i:s', $ts) : gmdate('Y-m-d H:i:s'),
        'has_attachments'  => !empty($msg['hasAttachments']),
    ];
}

/** Chiffrement AES-256-GCM des tokens (clé dérivée de EMAILS_ENC_KEY). */
function sendersEncrypt(string $plain): string {
    $key = hash('sha256', EMAILS_ENC_KEY, true);
    $iv  = random_bytes(12);
    $tag = '';
    $ct  = openssl_encrypt($plain, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag);
    return base64_encode($iv . $tag . $ct);
}

function sendersDecrypt(string $b64): ?string {
    $raw = base64_decode($b64, true);
    if ($raw === false || strlen($raw) < 29) return null;
    $key = hash('sha256', EMAILS_ENC_KEY, true);
    $pt  = openssl_decrypt(substr($raw, 28), 'aes-256-gcm', $key, OPENSSL_RAW_DATA, substr($raw, 0, 12), substr($raw, 12, 16));
    return $pt === false ? null : $pt;
}

/** Crée les 7 tables de la Boîte Fournisseurs si absentes. */
function supplierEmailsEnsureTables(PDO $pdo): void {
    $pdo->exec("CREATE TABLE IF NOT EXISTS suppliers_config (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(150) NOT NULL,
    is_active  TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $pdo->exec("CREATE TABLE IF NOT EXISTS supplier_rules (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    supplier_id      INT NOT NULL,
    sender_pattern   VARCHAR(190) NULL,
    subject_keywords VARCHAR(500) NULL,
    KEY idx_supplier (supplier_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $pdo->exec("CREATE TABLE IF NOT EXISTS supplier_emails (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    supplier_id       INT NOT NULL,
    graph_message_id  VARCHAR(300) NOT NULL,
    conversation_id   VARCHAR(300) NULL,
    direction         ENUM('received','sent') NOT NULL DEFAULT 'received',
    from_email        VARCHAR(190) NOT NULL DEFAULT '',
    from_name         VARCHAR(190) NOT NULL DEFAULT '',
    subject           VARCHAR(500) NOT NULL DEFAULT '',
    body_html         MEDIUMTEXT NULL,
    received_at       DATETIME NOT NULL,
    is_read           TINYINT(1) NOT NULL DEFAULT 0,
    status            ENUM('pending','awaiting_modification','approved','replied_unclassified') NOT NULL DEFAULT 'pending',
    reply_type        ENUM('approval','modification') NULL,
    replied_at        DATETIME NULL,
    last_reminder_at  DATETIME NULL,
    reminder_count    INT NOT NULL DEFAULT 0,
    reply_to_email_id INT NULL,
    UNIQUE KEY uq_graph_msg (graph_message_id(190)),
    KEY idx_supplier_status (supplier_id, status),
    KEY idx_conversation (conversation_id(190))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $pdo->exec("CREATE TABLE IF NOT EXISTS supplier_email_attachments (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    email_id     INT NOT NULL,
    filename     VARCHAR(255) NOT NULL,
    mime_type    VARCHAR(120) NOT NULL DEFAULT 'application/octet-stream',
    size         INT NOT NULL DEFAULT 0,
    storage_path VARCHAR(300) NOT NULL,
    KEY idx_email (email_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $pdo->exec("CREATE TABLE IF NOT EXISTS email_templates (
    template_key VARCHAR(40) PRIMARY KEY,
    body         TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $pdo->exec("CREATE TABLE IF NOT EXISTS ms_graph_tokens (
    id             TINYINT PRIMARY KEY DEFAULT 1,
    refresh_token  TEXT NULL,
    delta_inbox    TEXT NULL,
    delta_sent     TEXT NULL,
    mailbox_email  VARCHAR(190) NULL,
    updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $pdo->exec("CREATE TABLE IF NOT EXISTS email_sync_lock (
    lock_key   VARCHAR(40) PRIMARY KEY,
    locked_at  DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $pdo->exec("INSERT IGNORE INTO email_templates (template_key, body) VALUES
 ('approval', 'Bonjour,\n\nBon pour accord.\n\nCordialement,\nHello Fermetures'),
 ('modification_prefix', 'Bonjour,\n\nMerci de modifier les points suivants sur cet ARC :\n')");
}

/** Synchronise inbox + éléments envoyés. Retourne les compteurs. */
function runEmailSync(PDO $pdo, MsGraph $graph): array {
    if (!$graph->isConnected()) return ['success' => false, 'new_received' => 0, 'new_sent' => 0, 'message' => 'Boîte Outlook non connectée'];

    $rules = $pdo->query("
        SELECT r.supplier_id, r.sender_pattern, r.subject_keywords
        FROM supplier_rules r JOIN suppliers_config s ON s.id = r.supplier_id
        WHERE s.is_active = 1 ORDER BY r.id")->fetchAll(PDO::FETCH_ASSOC);

    $tok = $pdo->query("SELECT delta_inbox, delta_sent FROM ms_graph_tokens WHERE id = 1")->fetch(PDO::FETCH_ASSOC);
    $newReceived = 0; $newSent = 0;

    // ── 1. Delta boîte de réception ──
    $url = $tok['delta_inbox'] ?: '/me/mailFolders/inbox/messages/delta?$select=id,conversationId,subject,from,body,receivedDateTime,hasAttachments';
    while (true) {
        $r = $graph->api('GET', $url);
        if ($r['status'] !== 200 || !isset($r['json']['value'])) {
            if ($r['status'] === 410 && $tok['delta_inbox']) { // delta token expiré → repartir de zéro
                $pdo->exec("UPDATE ms_graph_tokens SET delta_inbox = NULL WHERE id = 1");
            }
            return ['success' => false, 'new_received' => $newReceived, 'new_sent' => $newSent, 'message' => 'Erreur Graph inbox (HTTP ' . $r['status'] . ')'];
        }
        foreach ($r['json']['value'] as $msg) {
            $p = parseGraphMessage($msg);
            if ($p === null) continue;
            $supplierId = matchSupplierRule($p['from_email'], $p['subject'], $rules);
            if ($supplierId === null) continue; // pas un fournisseur → jamais stocké
            $ins = $pdo->prepare("INSERT IGNORE INTO supplier_emails
                (supplier_id, graph_message_id, conversation_id, direction, from_email, from_name, subject, body_html, received_at, status)
                VALUES (?,?,?,?,?,?,?,?,?, 'pending')");
            $ins->execute([$supplierId, $p['graph_message_id'], $p['conversation_id'], 'received',
                $p['from_email'], $p['from_name'], $p['subject'], $p['body_html'], $p['received_at']]);
            if ($ins->rowCount() > 0) {
                $emailId = (int)$pdo->lastInsertId();
                $newReceived++;
                if ($p['has_attachments']) downloadAttachments($pdo, $graph, $emailId, $p['graph_message_id']);
                // Nouveau mail reçu = nouvelle ligne pending ; les anciens mails de la
                // conversation gardent leur statut (historique).
            }
        }
        if (isset($r['json']['@odata.nextLink'])) { $url = $r['json']['@odata.nextLink']; continue; }
        $pdo->prepare("UPDATE ms_graph_tokens SET delta_inbox = ? WHERE id = 1")->execute([$r['json']['@odata.deltaLink'] ?? null]);
        break;
    }

    // ── 2. Delta éléments envoyés : détecter les réponses faites depuis Outlook ──
    $url = $tok['delta_sent'] ?: '/me/mailFolders/sentitems/messages/delta?$select=id,conversationId,subject,body,sentDateTime,toRecipients';
    while (true) {
        $r = $graph->api('GET', $url);
        if ($r['status'] !== 200 || !isset($r['json']['value'])) break; // non bloquant
        foreach ($r['json']['value'] as $msg) {
            if (isset($msg['@removed']) || empty($msg['conversationId'])) continue;
            // Ce message envoyé répond-il à un ARC stocké encore actif ?
            $stmt = $pdo->prepare("SELECT id FROM supplier_emails
                WHERE conversation_id = ? AND direction = 'received' AND status IN ('pending','replied_unclassified')
                ORDER BY received_at DESC LIMIT 1");
            $stmt->execute([$msg['conversationId']]);
            $parent = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$parent) continue;
            // Déduplication : ne pas re-traiter une réponse déjà enregistrée (envoyée depuis le CRM)
            $dup = $pdo->prepare("SELECT COUNT(*) FROM supplier_emails WHERE graph_message_id = ?");
            $dup->execute([(string)$msg['id']]);
            if ((int)$dup->fetchColumn() > 0) continue;
            $body   = (string)($msg['body']['content'] ?? '');
            $status = classifyReplyBody($body); // approved | awaiting_modification | replied_unclassified
            $sentAt = ($t = strtotime($msg['sentDateTime'] ?? '')) ? gmdate('Y-m-d H:i:s', $t) : gmdate('Y-m-d H:i:s');
            $pdo->prepare("INSERT IGNORE INTO supplier_emails
                (supplier_id, graph_message_id, conversation_id, direction, from_email, subject, body_html, received_at, status, reply_type, reply_to_email_id)
                SELECT supplier_id, ?, ?, 'sent', COALESCE((SELECT mailbox_email FROM ms_graph_tokens WHERE id = 1), ''), ?, ?, ?, 'approved', ?, id
                FROM supplier_emails WHERE id = ?")
                ->execute([(string)$msg['id'], $msg['conversationId'], (string)($msg['subject'] ?? ''), $body, $sentAt,
                           $status === 'awaiting_modification' ? 'modification' : ($status === 'approved' ? 'approval' : null), (int)$parent['id']]);
            $pdo->prepare("UPDATE supplier_emails SET status = ?, replied_at = ? WHERE id = ?")
                ->execute([$status, $sentAt, (int)$parent['id']]);
            $newSent++;
        }
        if (isset($r['json']['@odata.nextLink'])) { $url = $r['json']['@odata.nextLink']; continue; }
        $pdo->prepare("UPDATE ms_graph_tokens SET delta_sent = ? WHERE id = 1")->execute([$r['json']['@odata.deltaLink'] ?? null]);
        break;
    }

    return ['success' => true, 'new_received' => $newReceived, 'new_sent' => $newSent, 'message' => null];
}

/** Télécharge et stocke les PJ d'un message dans php/uploads/supplier_emails/<email_id>/ */
function downloadAttachments(PDO $pdo, MsGraph $graph, int $emailId, string $graphMessageId): void {
    $r = $graph->api('GET', '/me/messages/' . rawurlencode($graphMessageId) . '/attachments');
    if ($r['status'] !== 200 || empty($r['json']['value'])) return;
    $dir = __DIR__ . '/uploads/supplier_emails/' . $emailId;
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    foreach ($r['json']['value'] as $att) {
        if (($att['@odata.type'] ?? '') !== '#microsoft.graph.fileAttachment' || empty($att['contentBytes'])) continue;
        if ((int)($att['size'] ?? 0) > 15 * 1024 * 1024) continue; // garde-fou mémoire/disque
        $displayName = preg_replace('/[^A-Za-z0-9._-]/', '_', (string)($att['name'] ?? 'piece_jointe'));
        if ($displayName === '' || $displayName[0] === '.') $displayName = 'piece_jointe' . $displayName;
        // Stockage sous nom aléatoire neutre : neutralise .php/.htaccess/.user.ini même si la
        // protection du dossier parent saute ; le nom d'origine ne sert qu'à l'affichage (BDD).
        $storedName = bin2hex(random_bytes(16)) . '.bin';
        $data = base64_decode($att['contentBytes'], true);
        if ($data === false) continue;
        file_put_contents("$dir/$storedName", $data);
        $pdo->prepare("INSERT INTO supplier_email_attachments (email_id, filename, mime_type, size, storage_path) VALUES (?,?,?,?,?)")
            ->execute([$emailId, $displayName, (string)($att['contentType'] ?? 'application/octet-stream'),
                       (int)($att['size'] ?? 0), "uploads/supplier_emails/$emailId/$storedName"]);
    }
}

/** Envoie les relances J+3 dues aux Gérants. Retourne le nombre de pushes. */
function runEmailReminders(PDO $pdo): int {
    require_once __DIR__ . '/push_helper.php';
    $now = time();
    $stmt = $pdo->query("
        SELECT e.id, e.subject, e.received_at, e.last_reminder_at, e.status, s.name AS supplier_name
        FROM supplier_emails e JOIN suppliers_config s ON s.id = e.supplier_id
        WHERE e.direction = 'received' AND e.status = 'pending'
          AND e.received_at < UTC_TIMESTAMP() - INTERVAL 3 DAY");
    $due = [];
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $e) {
        if (isReminderDue($e['status'], $e['received_at'], $e['last_reminder_at'], $now)) $due[] = $e;
    }
    if (!$due) return 0;
    $gerants = $pdo->query("SELECT id FROM users WHERE role = 'gerant'")->fetchAll(PDO::FETCH_COLUMN);
    if (!$gerants) return 0;
    $push = new WebPushHelper(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    $sent = 0;
    foreach ($due as $e) {
        $days = (int)floor(($now - strtotime($e['received_at'])) / 86400);
        $date = date('d/m', strtotime($e['received_at']));
        $sent += $push->sendAll($pdo, '⏰ ARC en attente de réponse',
            "ARC {$e['supplier_name']} du $date sans réponse depuis $days jours", [], array_map('intval', $gerants));
        $pdo->prepare("UPDATE supplier_emails SET last_reminder_at = UTC_TIMESTAMP(), reminder_count = reminder_count + 1 WHERE id = ?")
            ->execute([(int)$e['id']]);
    }
    return $sent;
}

/** Maintenance throttlée et silencieuse : sync + relances, sous verrou. */
function runEmailMaintenance(PDO $pdo, int $throttleSeconds = 900): void {
    try {
        supplierEmailsEnsureTables($pdo);
        // Verrou atomique : on ne prend le verrou que si le dernier passage est assez vieux
        $upd = $pdo->prepare("UPDATE email_sync_lock SET locked_at = UTC_TIMESTAMP()
            WHERE lock_key = 'maintenance' AND (locked_at IS NULL OR locked_at < UTC_TIMESTAMP() - INTERVAL ? SECOND)");
        $pdo->prepare("INSERT IGNORE INTO email_sync_lock (lock_key, locked_at) VALUES ('maintenance', NULL)")->execute();
        $upd->execute([$throttleSeconds]);
        if ($upd->rowCount() === 0) return; // passage récent ou concurrent → on ne fait rien
        require_once __DIR__ . '/ms_graph.php';
        $graph = new MsGraph($pdo);
        runEmailSync($pdo, $graph);
        runEmailReminders($pdo);
    } catch (Throwable $e) {
        @file_put_contents(__DIR__ . '/logs/emails.log', gmdate('Y-m-d H:i:s') . ' - MAINTENANCE ERREUR: ' . $e->getMessage() . "\n", FILE_APPEND);
    }
}
