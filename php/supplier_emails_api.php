<?php
// SameSite=Lax (et non Strict) : le retour OAuth de Microsoft est une navigation
// de haut niveau depuis un site externe ; en Strict le cookie de session n'est pas
// envoyé → "Non authentifié" sur oauth_callback. Lax l'autorise tout en bloquant les POST cross-site.
session_set_cookie_params(['lifetime'=>1800,'path'=>'/','secure'=>true,'httponly'=>true,'samesite'=>'Lax']);
session_start();
if (!isset($_SESSION['user'])) {
    header('Content-Type: application/json'); http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Non authentifié']); exit;
}
ini_set('display_errors', 0); error_reporting(E_ALL);
require_once __DIR__ . '/security.php';
setSecurityHeaders();
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(0); }
ob_start();
try {
    require_once __DIR__ . '/db.php';
    require_once __DIR__ . '/supplier_email_lib.php';
    require_once __DIR__ . '/ms_graph.php';
    header('Content-Type: application/json; charset=utf-8');

    supplierEmailsEnsureTables($pdo);
    $MANAGEMENT_ROLES = ['admin', 'gerant', 'administration'];
    $current = $_SESSION['user'];
    $rawRole = $current['role'] ?? '';
    // Tolérer les variantes de casse/accents du rôle stocké en base
    // (ex. « Gérant » ou « GÉRANT » au lieu de « gerant »).
    $role = function_exists('mb_strtolower') ? mb_strtolower(trim($rawRole), 'UTF-8') : strtolower(trim($rawRole));
    $role = strtr($role, ['é'=>'e','è'=>'e','ê'=>'e','ë'=>'e','à'=>'a','â'=>'a','ï'=>'i','î'=>'i','ô'=>'o','ù'=>'u','û'=>'u','ç'=>'c']);
    $action  = $_GET['action'] ?? '';
    $input   = json_decode(file_get_contents('php://input'), true) ?: [];

    if (!in_array($role, $MANAGEMENT_ROLES, true)) {
        ob_end_clean(); http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Accès refusé (rôle vu : ' . $rawRole . ')']); exit;
    }
    $isAdmin = ($role === 'admin');
    $graph   = new MsGraph($pdo);

    function respond(array $payload): void { ob_end_clean(); echo json_encode($payload); exit; }
    function denyUnlessAdmin(bool $isAdmin): void {
        if (!$isAdmin) { ob_end_clean(); http_response_code(403); echo json_encode(['success' => false, 'message' => 'Réservé admin']); exit; }
    }
    function requirePost(): void {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') { ob_end_clean(); http_response_code(405); echo json_encode(['success' => false, 'message' => 'Méthode non autorisée']); exit; }
    }

    switch ($action) {
        // ── OAuth ────────────────────────────────────────────
        case 'oauth_start':
            // Ouvert aux rôles de gestion (admin/gérant/administration) : le gérant
            // doit pouvoir connecter/reconnecter sa propre boîte lui-même.
            // Diagnostic : vérifier que les réglages Microsoft de config.php sont présents.
            $missingConf = [];
            foreach (['MSGRAPH_CLIENT_ID', 'MSGRAPH_CLIENT_SECRET', 'MSGRAPH_TENANT', 'MSGRAPH_REDIRECT_URI'] as $c) {
                if (!defined($c) || trim((string) constant($c)) === '') $missingConf[] = $c;
            }
            if ($missingConf) {
                respond(['success' => false, 'message' => 'Réglages manquants dans config.php : ' . implode(', ', $missingConf)]);
            }
            try {
                $state = bin2hex(random_bytes(16));
                $_SESSION['msgraph_state'] = $state;
                respond(['success' => true, 'data' => ['url' => $graph->authorizeUrl($state)]]);
            } catch (Throwable $e) {
                respond(['success' => false, 'message' => 'Diagnostic connexion : ' . $e->getMessage()]);
            }

        case 'oauth_callback':
            // Retour de Microsoft (GET avec code + state)
            $expectedState = $_SESSION['msgraph_state'] ?? null;
            unset($_SESSION['msgraph_state']);
            if ($expectedState === null || !hash_equals($expectedState, (string)($_GET['state'] ?? ''))) {
                respond(['success' => false, 'message' => 'State invalide']);
            }
            $ok = isset($_GET['code']) ? $graph->handleCallback($_GET['code']) : false;
            ob_end_clean();
            if (!$ok) {
                // Diagnostic : montrer la vraie raison de l'échec (erreur renvoyée par Microsoft)
                $reason = $_GET['error_description'] ?? $_GET['error'] ?? $graph->lastError ?? "Code d'autorisation manquant";
                header('Content-Type: text/html; charset=utf-8');
                echo '<!doctype html><meta charset="utf-8"><div style="font-family:system-ui,Arial;max-width:640px;margin:40px auto;padding:0 16px">'
                   . '<h2>Échec de la connexion à la boîte Outlook</h2>'
                   . '<p>Détail technique renvoyé par Microsoft (copie-le à Claude) :</p>'
                   . '<pre style="white-space:pre-wrap;background:#f6f6f6;border:1px solid #e5e5e5;padding:14px;border-radius:8px">'
                   . htmlspecialchars((string) $reason) . '</pre>'
                   . '<p><a href="/hello-gestion/">← Retour au CRM</a></p></div>';
                exit;
            }
            header('Location: /hello-gestion/?fournisseurs=connected');
            exit;

        case 'connection_status':
            $row = $pdo->query("SELECT mailbox_email FROM ms_graph_tokens WHERE id = 1")->fetch(PDO::FETCH_ASSOC);
            respond(['success' => true, 'data' => ['connected' => $graph->isConnected(), 'mailbox_email' => $row['mailbox_email'] ?? null]]);

        // ── Config (admin) ───────────────────────────────────
        case 'list_config':
            denyUnlessAdmin($isAdmin);
            $suppliers = $pdo->query("SELECT * FROM suppliers_config WHERE is_active = 1 ORDER BY name")->fetchAll(PDO::FETCH_ASSOC);
            $rules     = $pdo->query("SELECT * FROM supplier_rules ORDER BY id")->fetchAll(PDO::FETCH_ASSOC);
            $templates = $pdo->query("SELECT * FROM email_templates")->fetchAll(PDO::FETCH_KEY_PAIR);
            respond(['success' => true, 'data' => compact('suppliers', 'rules', 'templates')]);

        case 'save_supplier':
            requirePost();
            denyUnlessAdmin($isAdmin);
            $name = trim($input['name'] ?? '');
            if ($name === '') respond(['success' => false, 'message' => 'Nom requis']);
            if (!empty($input['id'])) {
                $pdo->prepare("UPDATE suppliers_config SET name = ? WHERE id = ?")->execute([$name, (int)$input['id']]);
                respond(['success' => true, 'data' => ['id' => (int)$input['id']]]);
            }
            $pdo->prepare("INSERT INTO suppliers_config (name) VALUES (?)")->execute([$name]);
            respond(['success' => true, 'data' => ['id' => (int)$pdo->lastInsertId()]]);

        case 'delete_supplier': // désactivation, jamais de suppression physique (spec §5)
            requirePost();
            denyUnlessAdmin($isAdmin);
            $pdo->prepare("UPDATE suppliers_config SET is_active = 0 WHERE id = ?")->execute([(int)($input['id'] ?? 0)]);
            respond(['success' => true]);

        case 'save_rule':
            requirePost();
            denyUnlessAdmin($isAdmin);
            $sid = (int)($input['supplier_id'] ?? 0);
            $sender = trim($input['sender_pattern'] ?? '') ?: null;
            $kw     = trim($input['subject_keywords'] ?? '') ?: null;
            if (!$sid || ($sender === null && $kw === null)) respond(['success' => false, 'message' => 'Renseigner au moins une adresse ou des mots-clés']);
            if (!empty($input['id'])) {
                $pdo->prepare("UPDATE supplier_rules SET sender_pattern = ?, subject_keywords = ? WHERE id = ?")->execute([$sender, $kw, (int)$input['id']]);
            } else {
                $pdo->prepare("INSERT INTO supplier_rules (supplier_id, sender_pattern, subject_keywords) VALUES (?,?,?)")->execute([$sid, $sender, $kw]);
            }
            respond(['success' => true]);

        case 'delete_rule':
            requirePost();
            denyUnlessAdmin($isAdmin);
            $pdo->prepare("DELETE FROM supplier_rules WHERE id = ?")->execute([(int)($input['id'] ?? 0)]);
            respond(['success' => true]);

        case 'save_template':
            requirePost();
            denyUnlessAdmin($isAdmin);
            $key = $input['template_key'] ?? '';
            if (!in_array($key, ['approval', 'modification_prefix'])) respond(['success' => false, 'message' => 'Clé invalide']);
            $pdo->prepare("UPDATE email_templates SET body = ? WHERE template_key = ?")->execute([(string)($input['body'] ?? ''), $key]);
            respond(['success' => true]);

        // ── Synchronisation ──────────────────────────────────
        case 'sync':
            requirePost();
            respond(runEmailSync($pdo, $graph));

        case 'list_suppliers': {
            $rows = $pdo->query("
                SELECT s.id, s.name,
                    COALESCE(SUM(e.direction = 'received' AND e.is_read = 0), 0) AS unread_count,
                    COALESCE(SUM(e.status = 'pending'), 0) AS pending_count,
                    COALESCE(SUM(e.status = 'pending' AND e.received_at < UTC_TIMESTAMP() - INTERVAL 3 DAY), 0) AS overdue_count
                FROM suppliers_config s
                LEFT JOIN supplier_emails e ON e.supplier_id = s.id
                WHERE s.is_active = 1
                GROUP BY s.id, s.name ORDER BY s.name")->fetchAll(PDO::FETCH_ASSOC);
            foreach ($rows as &$r) foreach (['unread_count','pending_count','overdue_count'] as $k) $r[$k] = (int)$r[$k];
            $sync = $pdo->query("SELECT updated_at FROM ms_graph_tokens WHERE id = 1")->fetchColumn();
            respond(['success' => true, 'data' => $rows, 'last_sync' => $sync ?: null]);
        }

        case 'list_emails': {
            $sid = (int)($_GET['supplier_id'] ?? 0);
            $tab = $_GET['tab'] ?? 'encours';
            if (!$sid) respond(['success' => false, 'message' => 'supplier_id requis']);
            if ($tab === 'passees') {
                $sql = "SELECT e.*, TIMESTAMPDIFF(DAY, e.received_at, UTC_TIMESTAMP()) AS days_waiting,
                               0 AS is_overdue
                        FROM supplier_emails e
                        WHERE e.supplier_id = ? AND e.direction = 'received' AND e.status = 'approved'
                        ORDER BY e.received_at DESC";
            } else {
                $sql = "SELECT e.*, TIMESTAMPDIFF(DAY, e.received_at, UTC_TIMESTAMP()) AS days_waiting,
                               (e.status = 'pending' AND e.received_at < UTC_TIMESTAMP() - INTERVAL 3 DAY) AS is_overdue
                        FROM supplier_emails e
                        WHERE e.supplier_id = ? AND e.direction = 'received'
                          AND e.status IN ('pending','awaiting_modification','replied_unclassified')
                        ORDER BY is_overdue DESC,
                                 CASE WHEN (e.status = 'pending' AND e.received_at < UTC_TIMESTAMP() - INTERVAL 3 DAY) THEN e.received_at END ASC,
                                 e.received_at DESC";
            }
            $stmt = $pdo->prepare($sql); $stmt->execute([$sid]);
            $emails = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $ids = array_column($emails, 'id');
            $repliesByParent = []; $attCount = [];
            if ($ids) {
                $ph = implode(',', array_fill(0, count($ids), '?'));
                $rs = $pdo->prepare("SELECT * FROM supplier_emails WHERE direction = 'sent' AND reply_to_email_id IN ($ph) ORDER BY received_at");
                $rs->execute($ids);
                foreach ($rs->fetchAll(PDO::FETCH_ASSOC) as $rep) $repliesByParent[$rep['reply_to_email_id']][] = $rep;
                $ac = $pdo->prepare("SELECT email_id, COUNT(*) c FROM supplier_email_attachments WHERE email_id IN ($ph) GROUP BY email_id");
                $ac->execute($ids);
                foreach ($ac->fetchAll(PDO::FETCH_ASSOC) as $a) $attCount[$a['email_id']] = (int)$a['c'];
            }
            foreach ($emails as &$e) {
                $e['is_overdue'] = (bool)$e['is_overdue']; $e['days_waiting'] = (int)$e['days_waiting'];
                $e['is_read'] = (bool)$e['is_read'];
                $e['replies'] = $repliesByParent[$e['id']] ?? [];
                $e['attachments_count'] = $attCount[$e['id']] ?? 0;
                unset($e['body_html']); // liste allégée ; le corps vient via email_detail
            }
            respond(['success' => true, 'data' => $emails]);
        }

        case 'email_detail': {
            $id = (int)($_GET['id'] ?? 0);
            $stmt = $pdo->prepare("SELECT * FROM supplier_emails WHERE id = ?"); $stmt->execute([$id]);
            $email = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$email) respond(['success' => false, 'message' => 'Mail introuvable']);
            $att = $pdo->prepare("SELECT id, filename, mime_type, size FROM supplier_email_attachments WHERE email_id = ?");
            $att->execute([$id]);
            $email['attachments'] = $att->fetchAll(PDO::FETCH_ASSOC);
            respond(['success' => true, 'data' => $email]);
        }

        case 'mark_read': {
            requirePost();
            $pdo->prepare("UPDATE supplier_emails SET is_read = 1 WHERE id = ?")->execute([(int)($input['id'] ?? 0)]);
            respond(['success' => true]);
        }

        case 'download_attachment': {
            $id = (int)($_GET['id'] ?? 0);
            $stmt = $pdo->prepare("SELECT filename, mime_type, storage_path FROM supplier_email_attachments WHERE id = ?");
            $stmt->execute([$id]);
            $att = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$att) respond(['success' => false, 'message' => 'Pièce jointe introuvable']);
            $path = validateUploadPath($att['storage_path'], __DIR__); // anti path-traversal (security.php)
            if ($path === null || !is_file($path)) respond(['success' => false, 'message' => 'Fichier absent']);
            ob_end_clean();
            header('Content-Type: ' . $att['mime_type']);
            header('Content-Disposition: attachment; filename="' . rawurlencode($att['filename']) . '"');
            header('Content-Length: ' . filesize($path));
            readfile($path); exit;
        }

        case 'reply_approve': {
            requirePost();
            $id = (int)($input['id'] ?? 0);
            $stmt = $pdo->prepare("SELECT * FROM supplier_emails WHERE id = ? AND direction = 'received'");
            $stmt->execute([$id]);
            $email = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$email) respond(['success' => false, 'message' => 'Mail introuvable']);
            if (!$email || !in_array($email['status'], ['pending','replied_unclassified'], true)) respond(['success' => false, 'message' => 'Ce mail a déjà reçu une réponse']);
            $tpl = $pdo->query("SELECT body FROM email_templates WHERE template_key = 'approval'")->fetchColumn();
            $comment = (string)$tpl;
            $precision = trim($input['precision'] ?? '');
            if ($precision !== '') $comment .= "\n\nPrécision : " . $precision;
            $r = $graph->api('POST', '/me/messages/' . rawurlencode($email['graph_message_id']) . '/reply',
                             ['comment' => nl2br(htmlspecialchars($comment))]);
            if (!in_array($r['status'], [202, 200], true)) {
                respond(['success' => false, 'message' => 'Échec de l\'envoi (Graph HTTP ' . $r['status'] . ') — le mail reste en attente']);
            }
            $now = gmdate('Y-m-d H:i:s');
            $pdo->prepare("INSERT INTO supplier_emails (supplier_id, graph_message_id, conversation_id, direction, from_email, subject, body_html, received_at, status, reply_type, reply_to_email_id)
                VALUES (?,?,?,?,?,?,?,?, 'approved', 'approval', ?)")
                ->execute([$email['supplier_id'], 'crm-reply-' . $id . '-' . time(), $email['conversation_id'], 'sent',
                           'CRM', 'RE: ' . $email['subject'], nl2br(htmlspecialchars($comment)), $now, $id]);
            $pdo->prepare("UPDATE supplier_emails SET status = 'approved', reply_type = 'approval', replied_at = ? WHERE id = ?")->execute([$now, $id]);
            respond(['success' => true]);
        }

        case 'reply_modify': {
            requirePost();
            $id   = (int)($_POST['id'] ?? 0);
            $body = trim($_POST['body'] ?? '');
            if (!$id || $body === '') respond(['success' => false, 'message' => 'Message requis']);
            $stmt = $pdo->prepare("SELECT * FROM supplier_emails WHERE id = ? AND direction = 'received'");
            $stmt->execute([$id]);
            $email = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$email) respond(['success' => false, 'message' => 'Mail introuvable']);
            if (!$email || !in_array($email['status'], ['pending','replied_unclassified'], true)) respond(['success' => false, 'message' => 'Ce mail a déjà reçu une réponse']);

            $prefix = $pdo->query("SELECT body FROM email_templates WHERE template_key = 'modification_prefix'")->fetchColumn();
            $fullBody = ($prefix ? $prefix . "\n\n" : '') . $body;

            // 1. Créer le brouillon de réponse
            $draft = $graph->api('POST', '/me/messages/' . rawurlencode($email['graph_message_id']) . '/createReply');
            if ($draft['status'] !== 201 || empty($draft['json']['id'])) respond(['success' => false, 'message' => 'Échec création du brouillon (Graph)']);
            $draftId = $draft['json']['id'];
            // 2. Poser le corps
            $patch = $graph->api('PATCH', '/me/messages/' . rawurlencode($draftId),
                        ['body' => ['contentType' => 'html', 'content' => nl2br(htmlspecialchars($fullBody))]]);
            if (!in_array($patch['status'], [200, 204], true)) {
                respond(['success' => false, 'message' => 'Échec de la mise en forme de la réponse (Graph) — rien n\'a été envoyé']);
            }
            // 3. Pièces jointes éventuelles (limite upload PHP existante)
            if (!empty($_FILES['attachments'])) {
                $files = $_FILES['attachments'];
                for ($i = 0; $i < count((array)$files['name']); $i++) {
                    if (($files['error'][$i] ?? 1) !== UPLOAD_ERR_OK) continue;
                    $att = $graph->api('POST', '/me/messages/' . rawurlencode($draftId) . '/attachments', [
                        '@odata.type' => '#microsoft.graph.fileAttachment',
                        'name' => (string)$files['name'][$i],
                        'contentBytes' => base64_encode(file_get_contents($files['tmp_name'][$i])),
                    ]);
                    if (!in_array($att['status'], [200, 201], true)) {
                        respond(['success' => false, 'message' => 'Échec de l\'ajout d\'une pièce jointe — réponse non envoyée, réessayez']);
                    }
                }
            }
            // 4. Envoyer
            $send = $graph->api('POST', '/me/messages/' . rawurlencode($draftId) . '/send');
            if (!in_array($send['status'], [202, 200], true)) respond(['success' => false, 'message' => 'Échec de l\'envoi — votre brouillon est conservé, réessayez']);

            $now = gmdate('Y-m-d H:i:s');
            $pdo->prepare("INSERT INTO supplier_emails (supplier_id, graph_message_id, conversation_id, direction, from_email, subject, body_html, received_at, status, reply_type, reply_to_email_id)
                VALUES (?,?,?,?,?,?,?,?, 'approved', 'modification', ?)")
                ->execute([$email['supplier_id'], 'crm-reply-' . $id . '-' . time(), $email['conversation_id'], 'sent',
                           'CRM', 'RE: ' . $email['subject'], nl2br(htmlspecialchars($fullBody)), $now, $id]);
            $pdo->prepare("UPDATE supplier_emails SET status = 'awaiting_modification', reply_type = 'modification', replied_at = ? WHERE id = ?")->execute([$now, $id]);
            respond(['success' => true]);
        }

        case 'classify': {
            requirePost();
            $id = (int)($input['id'] ?? 0);
            $decision = $input['decision'] ?? '';
            if (!in_array($decision, ['approved', 'awaiting_modification'])) respond(['success' => false, 'message' => 'Décision invalide']);
            $pdo->prepare("UPDATE supplier_emails SET status = ? WHERE id = ? AND status = 'replied_unclassified'")->execute([$decision, $id]);
            respond(['success' => true]);
        }

        case 'reformulate': {
            requirePost();
            $text = trim($input['text'] ?? '');
            if ($text === '') respond(['success' => false, 'message' => 'Texte vide']);
            $ch = curl_init('https://api.mistral.ai/v1/chat/completions');
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true, CURLOPT_TIMEOUT => 25,
                CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Authorization: Bearer ' . MISTRAL_API_KEY],
                CURLOPT_POSTFIELDS => json_encode([
                    'model' => 'mistral-small-latest',
                    'messages' => [
                        ['role' => 'system', 'content' => "Tu reformules des emails professionnels en français pour une entreprise de menuiserie (Hello Fermetures) qui écrit à ses fournisseurs. Reformule le texte de l'utilisateur de façon professionnelle, claire et courtoise, sans ajouter d'informations. Réponds uniquement avec le texte reformulé."],
                        ['role' => 'user', 'content' => $text],
                    ],
                    'temperature' => 0.3,
                ]),
            ]);
            $res = curl_exec($ch);
            $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            $json = is_string($res) ? json_decode($res, true) : null;
            $out = $json['choices'][0]['message']['content'] ?? null;
            if ($status !== 200 || !$out) respond(['success' => false, 'message' => 'Reformulation indisponible — votre texte est conservé']);
            respond(['success' => true, 'data' => ['text' => trim($out)]]);
        }

        default:
            respond(['success' => false, 'message' => 'Action inconnue']);
    }
} catch (Throwable $e) {
    ob_end_clean();
    require_once __DIR__ . '/security.php';
    echo json_encode(['success' => false, 'message' => safeError($e->getMessage(), __DIR__ . '/logs/emails.log')]);
}
