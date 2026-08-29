<?php
session_start();

if (!isset($_SESSION['user'])) {
    header('Content-Type: application/json');
    http_response_code(401);
    echo json_encode(['error' => true, 'message' => 'Non authentifié']);
    exit;
}

ini_set('display_errors', 0);
error_reporting(E_ALL);

$logDir = __DIR__ . '/logs';
if (!file_exists($logDir)) mkdir($logDir, 0755, true);

require_once __DIR__ . '/log_helper.php';
require_once __DIR__ . '/security.php';
setSecurityHeaders();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

ob_start();

function sendReminderEmail(string $toEmail, string $toName, string $clientName, int $affaireId): void {
    $loginUrl = 'https://hello-fermetures.com/hello-gestion/';
    $firstName = trim(explode(' ', trim($toName))[0]) ?: 'toi';

    // Objet & accroche tirés au sort pour varier le ton
    $subjects = [
        '👀 Petit rappel en douceur…',
        '⏳ On t\'attend toujours !',
        '🔔 Toc toc, une affaire t\'appelle',
        '🚀 Une affaire n\'attend que toi',
        '😏 Alors, on oublie ses leads ?',
    ];
    $hooks = [
        'Pssst… cette affaire commence à se sentir un peu seule. 🥺',
        'Elle est encore là, bien au chaud, et elle compte sur toi. 🙌',
        'Un petit coup d\'œil suffirait à lui redonner le sourire. 😎',
        'Le client n\'attend qu\'un signe de ta part. Fonce ! 💪',
        'Avant qu\'elle ne prenne la poussière… c\'est le moment ! ✨',
    ];
    $i = $affaireId % count($subjects);
    $subject = $subjects[$i];
    $hook    = $hooks[$i];

    $clientSafe = htmlspecialchars($clientName);

    $html = '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>' . htmlspecialchars($subject) . '</title></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:24px 0;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);max-width:560px;width:100%;">
  <tr><td style="background:#1a1a1a;padding:28px 32px;text-align:center;">
    <p style="margin:0;font-size:22px;font-weight:900;color:#FFB103;letter-spacing:-.5px;">Hello Gestion</p>
    <p style="margin:4px 0 0;font-size:12px;color:#ffffff80;">Hello Fermetures</p>
  </td></tr>
  <tr><td style="padding:36px 32px 8px;text-align:center;">
    <div style="font-size:48px;line-height:1;">👋</div>
    <p style="margin:16px 0 4px;font-size:22px;font-weight:900;color:#111;">Hey ' . htmlspecialchars($firstName) . ' !</p>
    <p style="margin:0;font-size:15px;color:#666;line-height:1.5;">' . $hook . '</p>
  </td></tr>
  <tr><td style="padding:24px 32px 8px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#FFB103 0%,#ffcf52 100%);border-radius:14px;overflow:hidden;">
      <tr><td style="padding:20px 24px;text-align:center;">
        <p style="margin:0 0 4px;font-size:11px;color:#1a1a1a99;font-weight:800;text-transform:uppercase;letter-spacing:.08em;">L\'affaire en question</p>
        <p style="margin:0;font-size:20px;font-weight:900;color:#1a1a1a;">' . $clientSafe . '</p>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:8px 32px 28px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
      <tr><td align="center">
        <a href="' . $loginUrl . '" style="display:inline-block;background:#1a1a1a;color:#FFB103;text-decoration:none;font-weight:900;font-size:15px;padding:15px 36px;border-radius:12px;">
          Je m\'en occupe 🚀
        </a>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:18px 32px;background:#f9fafb;border-top:1px solid #f0f0f0;text-align:center;">
    <p style="margin:0;font-size:11px;color:#9ca3af;">Hello Fermetures · On compte sur toi 💛</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>';

    sendMail($toEmail, $toName, $subject, $html);
}

function sendLeadNotification(string $toEmail, string $toName, array $affaire, string $patrontName, string $ccEmail = null): void {
    $loginUrl = 'https://hello-fermetures.com/hello-gestion/';
    $subject  = 'Nouveau lead recu : ' . $affaire['prenom'] . ' ' . $affaire['nom'];
    $msgId    = '<lead-' . time() . '-' . rand(1000,9999) . '@hello-fermetures.com>';
    $date     = date('r');

    $contact = trim($affaire['prenom'] . ' ' . $affaire['nom']);
    $ville   = $affaire['ville']     ? htmlspecialchars($affaire['ville'])     : '—';
    $tel     = $affaire['telephone'] ? htmlspecialchars($affaire['telephone']) : '—';
    $email   = $affaire['email']     ? htmlspecialchars($affaire['email'])     : '—';
    $donnePar = !empty($affaire['donne_par']) ? htmlspecialchars($affaire['donne_par']) : null;
    $desc    = $affaire['description'] ? '<p style="color:#555;font-size:14px;margin:12px 0 0">' . nl2br(htmlspecialchars($affaire['description'])) . '</p>' : '';

    $html = '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>' . htmlspecialchars($subject) . '</title></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:24px 0;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);max-width:560px;width:100%;">
  <tr><td style="background:#1a1a1a;padding:28px 32px;text-align:center;">
    <p style="margin:0;font-size:22px;font-weight:900;color:#FFB103;letter-spacing:-.5px;">Hello Gestion</p>
    <p style="margin:4px 0 0;font-size:12px;color:#ffffff80;">Hello Fermetures</p>
  </td></tr>
  <tr><td style="padding:32px;">
    <p style="margin:0 0 4px;font-size:18px;font-weight:800;color:#111;">Nouveau lead pour vous !</p>
    <p style="margin:0 0 24px;font-size:14px;color:#666;">' . htmlspecialchars($patrontName) . ' vous a assigné un nouveau lead.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
      <tr><td style="padding:16px 20px;border-bottom:1px solid #f0f0f0;">
        <p style="margin:0 0 2px;font-size:10px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:.06em;">Contact</p>
        <p style="margin:0;font-size:16px;font-weight:800;color:#111;">' . htmlspecialchars($contact) . '</p>
      </td></tr>
      <tr><td style="padding:12px 20px;border-bottom:1px solid #f0f0f0;">
        <p style="margin:0 0 2px;font-size:10px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:.06em;">Téléphone</p>
        <p style="margin:0;font-size:14px;color:#374151;">' . $tel . '</p>
      </td></tr>
      <tr><td style="padding:12px 20px;border-bottom:1px solid #f0f0f0;">
        <p style="margin:0 0 2px;font-size:10px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:.06em;">Email</p>
        <p style="margin:0;font-size:14px;color:#374151;">' . $email . '</p>
      </td></tr>
      <tr><td style="padding:12px 20px;' . ($donnePar ? 'border-bottom:1px solid #f0f0f0;' : '') . '">
        <p style="margin:0 0 2px;font-size:10px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:.06em;">Ville</p>
        <p style="margin:0;font-size:14px;color:#374151;">' . $ville . '</p>
      </td></tr>
      ' . ($donnePar ? '<tr><td style="padding:12px 20px;">
        <p style="margin:0 0 2px;font-size:10px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:.06em;">Affaire donnée par</p>
        <p style="margin:0;font-size:14px;color:#374151;">' . $donnePar . '</p>
      </td></tr>' : '') . '
    </table>
    ' . $desc . '
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
      <tr><td align="center">
        <a href="' . $loginUrl . '" style="display:inline-block;background:#FFB103;color:#1a1a1a;text-decoration:none;font-weight:800;font-size:15px;padding:14px 32px;border-radius:12px;">
          Voir mes affaires
        </a>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:20px 32px;background:#f9fafb;border-top:1px solid #f0f0f0;text-align:center;">
    <p style="margin:0;font-size:11px;color:#9ca3af;">Hello Fermetures · Ce message vous est destiné en tant que collaborateur</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>';

    sendMail($toEmail, $toName, $subject, $html, $ccEmail);
}

require_once __DIR__ . '/mailer.php';

try {
    require 'db.php';
    require_once __DIR__ . '/affaire_dossiers_lib.php';
    ensureDossierTables($pdo);
    require_once __DIR__ . '/roles.php';

    header('Content-Type: application/json; charset=utf-8');

    $userRole = $_SESSION['user']['role'] ?? '';
    $userId   = (int)($_SESSION['user']['id'] ?? 0);

    $isAdmin         = in_array($userRole, ['admin', 'gerant', 'administration'], true);
    $isCollaborateur = $userRole === 'collaborateur';

    if (!$isAdmin && !$isCollaborateur) {
        http_response_code(403);
        ob_end_clean();
        echo json_encode(['error' => true, 'message' => 'Accès refusé']);
        exit;
    }

    $method = $_SERVER['REQUEST_METHOD'];

    switch ($method) {

        // ── GET ───────────────────────────────────────────────
        case 'GET':
            // Endpoint spécial : liste des collaborateurs pour le select
            if (!empty($_GET['collaborateurs'])) {
                if (!$isAdmin) { http_response_code(403); ob_end_clean(); echo json_encode(['error'=>true,'message'=>'Accès refusé']); exit; }
                $stmt = $pdo->query("SELECT id, name FROM users WHERE role = 'collaborateur' AND status = 'active' ORDER BY name ASC");
                ob_end_clean();
                echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
                break;
            }

            // Endpoint spécial : liste des options pour "donne_par"
            if (!empty($_GET['donne_par_options'])) {
                $stmt = $pdo->query("SELECT id, name FROM affaires_donne_par_options ORDER BY name ASC");
                ob_end_clean();
                echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
                break;
            }

            if ($isAdmin) {
                $stmt = $pdo->query("
                    SELECT a.*,
                           uc.name AS created_by_name,
                           ua.name AS assigned_to_name,
                           ci.name AS interlocuteur_name,
                           ci.email AS interlocuteur_email
                    FROM affaires a
                    LEFT JOIN users uc ON uc.id = a.created_by
                    LEFT JOIN users ua ON ua.id = a.assigned_to
                    LEFT JOIN collaborateur_interlocuteurs ci ON ci.id = a.interlocuteur_id
                    ORDER BY a.created_at DESC
                ");
                $affaires = $stmt->fetchAll(PDO::FETCH_ASSOC);

                // Récupérer les vues de tous les leads
                $viewRows = $pdo->query("
                    SELECT av.affaire_id, u.name AS viewer_name, av.view_count, av.last_viewed
                    FROM affaire_views av
                    JOIN users u ON u.id = av.user_id
                    ORDER BY av.affaire_id, av.view_count DESC
                ")->fetchAll(PDO::FETCH_ASSOC);

                $viewsMap = [];
                foreach ($viewRows as $v) {
                    $aid = $v['affaire_id'];
                    if (!isset($viewsMap[$aid])) $viewsMap[$aid] = ['total' => 0, 'viewers' => [], 'last_view' => null];
                    $viewsMap[$aid]['total'] += (int)$v['view_count'];
                    $viewsMap[$aid]['viewers'][] = [
                        'name'        => $v['viewer_name'],
                        'count'       => (int)$v['view_count'],
                        'last_viewed' => $v['last_viewed'],
                    ];
                    // Garder la consultation la plus récente, tous viewers confondus
                    if ($v['last_viewed'] && $v['last_viewed'] > $viewsMap[$aid]['last_view']) {
                        $viewsMap[$aid]['last_view'] = $v['last_viewed'];
                    }
                }
                foreach ($affaires as &$a) {
                    $aid = $a['id'];
                    $a['views_total']  = $viewsMap[$aid]['total']     ?? 0;
                    $a['views_detail'] = $viewsMap[$aid]['viewers']   ?? [];
                    $a['last_view_at'] = $viewsMap[$aid]['last_view'] ?? null;
                }
                unset($a);

                ob_end_clean();
                echo json_encode(['success' => true, 'data' => $affaires]);
            } else {
                // Collaborateur : seulement ses affaires
                $stmt = $pdo->prepare("
                    SELECT a.*,
                           uc.name AS created_by_name,
                           ua.name AS assigned_to_name,
                           ci.name AS interlocuteur_name,
                           ci.email AS interlocuteur_email
                    FROM affaires a
                    LEFT JOIN users uc ON uc.id = a.created_by
                    LEFT JOIN users ua ON ua.id = a.assigned_to
                    LEFT JOIN collaborateur_interlocuteurs ci ON ci.id = a.interlocuteur_id
                    WHERE a.assigned_to = ?
                    ORDER BY a.created_at DESC
                ");
                $stmt->execute([$userId]);
                $affaires = $stmt->fetchAll(PDO::FETCH_ASSOC);

                ob_end_clean();
                echo json_encode(['success' => true, 'data' => $affaires]);
            }
            break;

        // ── POST ──────────────────────────────────────────────
        case 'POST':
            // Enregistrer une vue sur un lead ouvert (collaborateur uniquement)
            if (!empty($_GET['track_view'])) {
                $id = intval($_POST['id'] ?? 0);
                if ($id) {
                    $pdo->prepare("
                        INSERT INTO affaire_views (affaire_id, user_id, view_count, last_viewed)
                        VALUES (?, ?, 1, NOW())
                        ON DUPLICATE KEY UPDATE view_count = view_count + 1, last_viewed = NOW()
                    ")->execute([$id, $userId]);
                }
                ob_end_clean();
                echo json_encode(['success' => true]);
                break;
            }

            // Envoyer une relance au collaborateur (admin uniquement)
            if (!empty($_GET['action']) && $_GET['action'] === 'send_reminder') {
                if (!$isAdmin) { http_response_code(403); ob_end_clean(); echo json_encode(['error'=>true,'message'=>'Accès refusé']); exit; }

                $data = json_decode(file_get_contents('php://input'), true);
                $affaireId = intval($data['affaire_id'] ?? 0);

                if (!$affaireId) {
                    throw new Exception("Données manquantes (affaire_id requis)");
                }

                // Récupérer l'affaire + l'email du collaborateur assigné (source de vérité : la BDD)
                $stmt = $pdo->prepare("
                    SELECT a.prenom, a.nom, u.email, u.name AS collab_name
                    FROM affaires a
                    LEFT JOIN users u ON u.id = a.assigned_to
                    WHERE a.id = ?
                ");
                $stmt->execute([$affaireId]);
                $row = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$row) {
                    throw new Exception("Affaire introuvable");
                }
                if (empty($row['email'])) {
                    throw new Exception("Le collaborateur assigné n'a pas d'adresse email");
                }

                $clientName = trim($row['prenom'] . ' ' . $row['nom']);

                // Envoyer l'email de relance
                sendReminderEmail($row['email'], $row['collab_name'] ?? 'Collaborateur', $clientName, $affaireId);

                // Mémoriser la date de relance (non bloquant : la colonne peut ne pas encore exister)
                $reminderAt = null;
                try {
                    $pdo->prepare("UPDATE affaires SET last_reminder_at = NOW() WHERE id = ?")->execute([$affaireId]);
                    $reminderAt = date('Y-m-d H:i:s');
                } catch (Exception $e) {
                    // colonne last_reminder_at absente → on ignore, l'email reste envoyé
                }

                appLog('affaires', who() . " a envoyé une relance pour l'affaire #{$affaireId} à {$row['collab_name']}");

                ob_end_clean();
                echo json_encode(['success' => true, 'message' => 'Relance envoyée', 'last_reminder_at' => $reminderAt]);
                break;
            }

            // Mise à jour pièce jointe sur lead existant (admin + collaborateur sur sa propre affaire)
            if (!empty($_GET['upload_attachment'])) {
                $id = intval($_POST['id'] ?? 0);
                if (!$id) throw new Exception("ID manquant");

                // Collaborateur : vérifier que l'affaire lui est assignée
                if ($isCollaborateur) {
                    $check = $pdo->prepare("SELECT id FROM affaires WHERE id = ? AND assigned_to = ?");
                    $check->execute([$id, $userId]);
                    if ($check->rowCount() === 0) {
                        http_response_code(403); ob_end_clean();
                        echo json_encode(['error'=>true,'message'=>'Affaire introuvable ou non autorisée']);
                        exit;
                    }
                }

                if (empty($_FILES['attachment']) || $_FILES['attachment']['error'] !== UPLOAD_ERR_OK) {
                    throw new Exception("Fichier manquant ou erreur upload");
                }
                $file         = $_FILES['attachment'];
                $allowedMimes = ['image/jpeg','image/png','image/gif','image/webp','application/pdf'];
                $finfo        = new finfo(FILEINFO_MIME_TYPE);
                $mime         = finfo_file($finfo, $file['tmp_name']);
                if (!in_array($mime, $allowedMimes, true)) throw new Exception("Type non autorisé (image ou PDF uniquement)");
                if ($file['size'] > 10 * 1024 * 1024)      throw new Exception("Fichier trop volumineux (max 10 Mo)");

                $uploadDir = __DIR__ . '/uploads/affaires/';
                if (!file_exists($uploadDir)) mkdir($uploadDir, 0755, true);

                // Supprimer l'ancien fichier
                $oldRow = $pdo->prepare("SELECT attachment FROM affaires WHERE id = ?");
                $oldRow->execute([$id]);
                $old = $oldRow->fetch(PDO::FETCH_ASSOC);
                if (!empty($old['attachment'])) {
                    $oldPath = __DIR__ . '/' . $old['attachment'];
                    if (file_exists($oldPath)) unlink($oldPath);
                }

                $ext      = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
                $filename = 'att_' . $id . '_' . uniqid('', true) . '.' . $ext;
                if (!move_uploaded_file($file['tmp_name'], $uploadDir . $filename)) {
                    throw new Exception("Erreur lors de l'enregistrement du fichier");
                }

                $newPath = 'uploads/affaires/' . $filename;
                $pdo->prepare("UPDATE affaires SET attachment = ? WHERE id = ?")->execute([$newPath, $id]);
                appLog('affaires', who() . " a mis à jour la pièce jointe de l'affaire #{$id}");

                ob_end_clean();
                echo json_encode(['success' => true, 'attachment' => $newPath]);
                break;
            }

            // Le reste du POST est réservé aux admins
            if (!$isAdmin) { http_response_code(403); ob_end_clean(); echo json_encode(['error'=>true,'message'=>'Accès refusé']); exit; }

            // Gestion de l'ajout d'une nouvelle option "donne_par"
            if (!empty($_GET['donne_par_options'])) {
                $data = json_decode(file_get_contents('php://input'), true);
                if (empty($data['name'])) {
                    throw new Exception("Nom de l'apporteur d'affaire manquant");
                }
                $name = trim($data['name']);
                $stmt = $pdo->prepare("INSERT IGNORE INTO affaires_donne_par_options (name) VALUES (?)");
                $stmt->execute([$name]);
                ob_end_clean();
                echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
                break;
            }

            // Multipart (avec fichier) ou JSON standard
            $hasFile = !empty($_FILES['attachment']) && $_FILES['attachment']['error'] !== UPLOAD_ERR_NO_FILE;
            $data    = $hasFile ? $_POST : json_decode(file_get_contents('php://input'), true);

            if (empty($data['nom']) || empty($data['prenom']) || empty($data['assigned_to'])) {
                throw new Exception("Données manquantes (nom, prenom, assigned_to requis)");
            }

            $stmt = $pdo->prepare("
                INSERT INTO affaires (nom, prenom, telephone, email, adresse, ville, description, status, created_by, assigned_to, donne_par, observation_collaborateur, interlocuteur_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'a_traiter', ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                trim($data['nom']),
                trim($data['prenom']),
                trim($data['telephone'] ?? ''),
                trim($data['email']     ?? ''),
                trim($data['adresse']   ?? ''),
                trim($data['ville']     ?? ''),
                trim($data['description'] ?? ''),
                $userId,
                intval($data['assigned_to']),
                trim($data['donne_par'] ?? ''),
                trim($data['observation_collaborateur'] ?? ''),
                !empty($data['interlocuteur_id']) ? intval($data['interlocuteur_id']) : null,
            ]);

            $insertId   = $pdo->lastInsertId();
            $attachment = null;

            // ── Upload pièce jointe (image ou PDF) ───────────────
            if ($hasFile && $_FILES['attachment']['error'] === UPLOAD_ERR_OK) {
                $file      = $_FILES['attachment'];
                $uploadDir = __DIR__ . '/uploads/affaires/';
                if (!file_exists($uploadDir)) mkdir($uploadDir, 0755, true);

                $allowedMimes = ['image/jpeg','image/png','image/gif','image/webp','application/pdf'];
                $finfo        = new finfo(FILEINFO_MIME_TYPE);
                $mime         = finfo_file($finfo, $file['tmp_name']);

                if (!in_array($mime, $allowedMimes, true)) {
                    throw new Exception("Type de fichier non autorisé (image ou PDF uniquement)");
                }
                if ($file['size'] > 10 * 1024 * 1024) {
                    throw new Exception("Fichier trop volumineux (max 10 Mo)");
                }

                $ext      = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
                $filename = 'att_' . $insertId . '_' . uniqid('', true) . '.' . $ext;
                if (move_uploaded_file($file['tmp_name'], $uploadDir . $filename)) {
                    $attachment = 'uploads/affaires/' . $filename;
                    $pdo->prepare("UPDATE affaires SET attachment = ? WHERE id = ?")
                        ->execute([$attachment, $insertId]);
                }
            }

            appLog('affaires', who() . " a créé l'affaire #{$insertId} pour {$data['prenom']} {$data['nom']}");

            // Notification email au collaborateur (et éventuellement interlocuteur + CC)
            $collabStmt = $pdo->prepare("SELECT email, name FROM users WHERE id = ?");
            $collabStmt->execute([intval($data['assigned_to'])]);
            $collab = $collabStmt->fetch(PDO::FETCH_ASSOC);
            if ($collab) {
                $toEmail = $collab['email'];
                $toName  = $collab['name'];
                $ccEmail = null;

                $interlocuteurId = !empty($data['interlocuteur_id']) ? intval($data['interlocuteur_id']) : null;
                if ($interlocuteurId) {
                    $intStmt = $pdo->prepare("SELECT name, email, role FROM collaborateur_interlocuteurs WHERE id = ?");
                    $intStmt->execute([$interlocuteurId]);
                    $interlocuteur = $intStmt->fetch(PDO::FETCH_ASSOC);
                    if ($interlocuteur) {
                        $toEmail = $interlocuteur['email'];
                        $toName  = $interlocuteur['name'] . ' (' . $collab['name'] . ')';

                        if ($interlocuteur['role'] !== 'patron') {
                            $patronStmt = $pdo->prepare("SELECT email FROM collaborateur_interlocuteurs WHERE collaborateur_id = ? AND role = 'patron' LIMIT 1");
                            $patronStmt->execute([intval($data['assigned_to'])]);
                            $patronRow = $patronStmt->fetch(PDO::FETCH_ASSOC);
                            if ($patronRow) {
                                $ccEmail = $patronRow['email'];
                            }
                        }
                    }
                } else {
                    $patronStmt = $pdo->prepare("SELECT email FROM collaborateur_interlocuteurs WHERE collaborateur_id = ? AND role = 'patron' LIMIT 1");
                    $patronStmt->execute([intval($data['assigned_to'])]);
                    $patronRow = $patronStmt->fetch(PDO::FETCH_ASSOC);
                    if ($patronRow && strtolower($patronRow['email']) !== strtolower($collab['email'])) {
                        $ccEmail = $patronRow['email'];
                    }
                }

                if ($toEmail) {
                    $patronName = $_SESSION['user']['name'] ?? 'Hello Fermetures';
                    sendLeadNotification($toEmail, $toName, [
                        'prenom'      => trim($data['prenom']),
                        'nom'         => trim($data['nom']),
                        'telephone'   => trim($data['telephone']   ?? ''),
                        'email'       => trim($data['email']       ?? ''),
                        'ville'       => trim($data['ville']       ?? ''),
                        'description' => trim($data['description'] ?? ''),
                        'donne_par'   => trim($data['donne_par']   ?? ''),
                    ], $patronName, $ccEmail);
                }
            }

            ob_end_clean();
            echo json_encode(['success' => true, 'id' => $insertId, 'attachment' => $attachment]);
            break;

        // ── PUT ───────────────────────────────────────────────
        case 'PUT':
            $data = json_decode(file_get_contents('php://input'), true) ?? [];
            $id   = intval($data['id'] ?? 0);
            if (!$id) throw new Exception("ID manquant");

            if ($isCollaborateur) {
                // Collaborateur : seulement le statut et l'observation collaborateur, et seulement sur ses affaires
                $check = $pdo->prepare("SELECT id FROM affaires WHERE id = ? AND assigned_to = ?");
                $check->execute([$id, $userId]);
                if ($check->rowCount() === 0) {
                    http_response_code(403); ob_end_clean();
                    echo json_encode(['error'=>true,'message'=>'Affaire introuvable ou non autorisée']);
                    exit;
                }
                $allowedStatuses = ['a_traiter','en_cours','rdv_pris','accepte','refuse','sans_suite'];
                $status = in_array($data['status'] ?? '', $allowedStatuses, true) ? $data['status'] : null;
                if (!$status) throw new Exception("Statut invalide");

                $commission = isset($data['commission']) && $data['commission'] !== '' ? floatval($data['commission']) : null;
                $stmt = $pdo->prepare("UPDATE affaires SET status = ?, observation_collaborateur = ?, commission = ? WHERE id = ?");
                $stmt->execute([
                    $status,
                    trim($data['observation_collaborateur'] ?? ''),
                    $commission,
                    $id,
                ]);
                appLog('affaires', who() . " a changé le statut de l'affaire #{$id} → {$status}");
            } else {
                // Admin : mise à jour complète
                if (empty($data['nom']) || empty($data['prenom'])) throw new Exception("Données manquantes");

                // Commission payée : bascule vers/depuis le dossier système « Payé »
                $prevStmt = $pdo->prepare("SELECT dossier_id, commission_payee, dossier_id_before_payee FROM affaires WHERE id = ?");
                $prevStmt->execute([$id]);
                $prevRow = $prevStmt->fetch(PDO::FETCH_ASSOC);
                if (!$prevRow) throw new Exception("Affaire introuvable");

                $wasPayee = !empty($prevRow['commission_payee']);
                $isPayee  = !empty($data['commission_payee']);

                if ($isPayee && !$wasPayee) {
                    $payeDossierId       = ensurePayeDossier($pdo);
                    $dossierId           = $payeDossierId;
                    $dossierIdBeforePayee = $prevRow['dossier_id'];
                } elseif (!$isPayee && $wasPayee) {
                    $dossierId            = $prevRow['dossier_id_before_payee'];
                    $dossierIdBeforePayee = null;
                } else {
                    $dossierId            = $prevRow['dossier_id'];
                    $dossierIdBeforePayee = $prevRow['dossier_id_before_payee'];
                }

                $stmt = $pdo->prepare("
                    UPDATE affaires SET
                        nom = ?, prenom = ?, telephone = ?, email = ?,
                        adresse = ?, ville = ?, description = ?, status = ?, assigned_to = ?,
                        donne_par = ?, observation_collaborateur = ?, commission = ?, interlocuteur_id = ?,
                        commission_payee = ?, dossier_id = ?, dossier_id_before_payee = ?
                    WHERE id = ?
                ");
                $allowedStatuses = ['a_traiter','en_cours','rdv_pris','accepte','refuse','sans_suite'];
                $status     = in_array($data['status'] ?? '', $allowedStatuses, true) ? $data['status'] : 'a_traiter';
                $commission = isset($data['commission']) && $data['commission'] !== '' ? floatval($data['commission']) : null;
                $stmt->execute([
                    trim($data['nom']),
                    trim($data['prenom']),
                    trim($data['telephone'] ?? ''),
                    trim($data['email']     ?? ''),
                    trim($data['adresse']   ?? ''),
                    trim($data['ville']     ?? ''),
                    trim($data['description'] ?? ''),
                    $status,
                    intval($data['assigned_to']),
                    trim($data['donne_par'] ?? ''),
                    trim($data['observation_collaborateur'] ?? ''),
                    $commission,
                    !empty($data['interlocuteur_id']) ? intval($data['interlocuteur_id']) : null,
                    $isPayee ? 1 : 0,
                    $dossierId,
                    $dossierIdBeforePayee,
                    $id,
                ]);
                // Suppression pièce jointe si demandé
                if (!empty($data['remove_attachment'])) {
                    $oldRow = $pdo->prepare("SELECT attachment FROM affaires WHERE id = ?");
                    $oldRow->execute([$id]);
                    $old = $oldRow->fetch(PDO::FETCH_ASSOC);
                    if (!empty($old['attachment'])) {
                        $oldPath = __DIR__ . '/' . $old['attachment'];
                        if (file_exists($oldPath)) unlink($oldPath);
                    }
                    $pdo->prepare("UPDATE affaires SET attachment = NULL WHERE id = ?")->execute([$id]);
                }

                if ($isPayee !== $wasPayee) {
                    $verb = $isPayee ? 'a marqué la commission payée (archivage)' : 'a réactivé';
                    appLog('affaires', who() . " {$verb} pour l'affaire #{$id}");
                }
                appLog('affaires', who() . " a modifié l'affaire #{$id}");
            }

            ob_end_clean();
            echo json_encode(['success' => true]);
            break;

        // ── DELETE ────────────────────────────────────────────
        case 'DELETE':
            if (!$isAdmin) { http_response_code(403); ob_end_clean(); echo json_encode(['error'=>true,'message'=>'Accès refusé']); exit; }

            // Gestion de la suppression d'une option "donne_par"
            if (!empty($_GET['donne_par_options'])) {
                $id = intval($_GET['id'] ?? 0);
                if (!$id) throw new Exception("ID manquant");
                $stmt = $pdo->prepare("DELETE FROM affaires_donne_par_options WHERE id = ?");
                $stmt->execute([$id]);
                ob_end_clean();
                echo json_encode(['success' => true]);
                break;
            }

            $id = intval($_GET['id'] ?? 0);
            if (!$id) throw new Exception("ID manquant");

            $tStmt = $pdo->prepare("SELECT nom, prenom FROM affaires WHERE id = ?");
            $tStmt->execute([$id]);
            $row = $tStmt->fetch(PDO::FETCH_ASSOC);

            $stmt = $pdo->prepare("DELETE FROM affaires WHERE id = ?");
            $stmt->execute([$id]);
            appLog('affaires', who() . " a supprimé l'affaire #{$id} ({$row['prenom']} {$row['nom']})");
            ob_end_clean();
            echo json_encode(['success' => true]);
            break;

        default:
            http_response_code(405);
            ob_end_clean();
            echo json_encode(['error' => true, 'message' => 'Méthode non autorisée']);
            break;
    }

} catch (Exception $e) {
    file_put_contents("$logDir/affaires_error.log", date('Y-m-d H:i:s') . " - " . $e->getMessage() . "\n", FILE_APPEND);
    http_response_code(500);
    ob_end_clean();
    echo json_encode(['error' => true, 'message' => $e->getMessage()]);
}
?>
