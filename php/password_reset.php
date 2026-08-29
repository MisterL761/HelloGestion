<?php
ini_set('display_errors', 0);
error_reporting(E_ALL);

require_once __DIR__ . '/security.php';
setSecurityHeaders();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(0); }

ob_start();

function sendResetEmail(string $toEmail, string $toName, string $token): bool {
    require_once __DIR__ . '/mailer.php';
    $resetUrl = 'https://hello-fermetures.com/hello-gestion/?reset_token=' . urlencode($token);
    $subject  = 'Reinitialisation de votre mot de passe Hello Gestion';
    $msgId    = '<reset-' . time() . '-' . rand(1000,9999) . '@hello-fermetures.com>';
    $date     = date('r');

    $html = '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Réinitialisation mot de passe</title></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:24px 0;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);max-width:560px;width:100%;">
  <tr><td style="background:#1a1a1a;padding:28px 32px;text-align:center;">
    <p style="margin:0;font-size:22px;font-weight:900;color:#FFB103;">Hello Gestion</p>
    <p style="margin:4px 0 0;font-size:12px;color:#ffffff80;">Hello Fermetures</p>
  </td></tr>
  <tr><td style="padding:32px;">
    <p style="margin:0 0 8px;font-size:18px;font-weight:800;color:#111;">Réinitialisation de mot de passe</p>
    <p style="margin:0 0 24px;font-size:14px;color:#666;">Bonjour ' . htmlspecialchars($toName) . ',</p>
    <p style="margin:0 0 24px;font-size:14px;color:#555;line-height:1.6;">
      Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour en choisir un nouveau.<br><br>
      Ce lien est valable <strong>1 heure</strong>. Si vous n\'êtes pas à l\'origine de cette demande, ignorez cet email.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center">
        <a href="' . $resetUrl . '" style="display:inline-block;background:#FFB103;color:#1a1a1a;text-decoration:none;font-weight:800;font-size:15px;padding:14px 32px;border-radius:12px;">
          Réinitialiser mon mot de passe
        </a>
      </td></tr>
    </table>
    <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;word-break:break-all;">
      Ou copiez ce lien : ' . $resetUrl . '
    </p>
  </td></tr>
  <tr><td style="padding:20px 32px;background:#f9fafb;border-top:1px solid #f0f0f0;text-align:center;">
    <p style="margin:0;font-size:11px;color:#9ca3af;">Hello Fermetures · Si vous n\'avez pas fait cette demande, ignorez cet email.</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>';

    return sendMail($toEmail, $toName, $subject, $html);
}

try {
    require __DIR__ . '/db.php';
    header('Content-Type: application/json; charset=utf-8');

    $input  = json_decode(file_get_contents('php://input'), true) ?? [];
    $action = trim($input['action'] ?? $_GET['action'] ?? '');

    // ── Demande de reset ───────────────────────────────────
    if ($action === 'request') {
        $email = trim($input['email'] ?? '');

        if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new Exception("Email invalide");
        }

        $stmt = $pdo->prepare("SELECT id, name FROM users WHERE email = ? AND status = 'active'");
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            ob_end_clean();
            echo json_encode(['success' => false, 'message' => 'Aucun compte associé à cette adresse email']);
            exit;
        }

        // Supprimer les anciens tokens non utilisés
        $pdo->prepare("DELETE FROM password_resets WHERE user_id = ? AND used = 0")->execute([$user['id']]);

        // Générer un token sécurisé
        $token     = bin2hex(random_bytes(32));
        $expiresAt = date('Y-m-d H:i:s', time() + 3600); // 1 heure

        $pdo->prepare("INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)")
            ->execute([$user['id'], $token, $expiresAt]);

        sendResetEmail($email, $user['name'], $token);

        ob_end_clean();
        echo json_encode(['success' => true]);
    }

    // ── Validation du token + nouveau mot de passe ─────────
    elseif ($action === 'reset') {
        $token    = trim($input['token']    ?? '');
        $password = trim($input['password'] ?? '');
        $confirm  = trim($input['confirm']  ?? '');

        if (!$token || !$password || !$confirm) {
            throw new Exception("Données manquantes");
        }
        if ($password !== $confirm) {
            ob_end_clean();
            echo json_encode(['success' => false, 'message' => 'Les mots de passe ne correspondent pas']);
            exit;
        }
        if (strlen($password) < 8) {
            ob_end_clean();
            echo json_encode(['success' => false, 'message' => 'Mot de passe trop court (min. 8 caractères)']);
            exit;
        }

        // Vérifier le token
        $stmt = $pdo->prepare("
            SELECT pr.id, pr.user_id
            FROM password_resets pr
            WHERE pr.token = ?
              AND pr.used = 0
              AND pr.expires_at > NOW()
            LIMIT 1
        ");
        $stmt->execute([$token]);
        $reset = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$reset) {
            ob_end_clean();
            echo json_encode(['success' => false, 'message' => 'Lien invalide ou expiré. Refaites une demande.']);
            exit;
        }

        // Mettre à jour le mot de passe
        $hash = password_hash($password, PASSWORD_BCRYPT);
        $pdo->prepare("UPDATE users SET password = ?, force_password_change = 0 WHERE id = ?")
            ->execute([$hash, $reset['user_id']]);

        // Marquer le token comme utilisé
        $pdo->prepare("UPDATE password_resets SET used = 1 WHERE id = ?")
            ->execute([$reset['id']]);

        ob_end_clean();
        echo json_encode(['success' => true]);
    }

    else {
        http_response_code(400);
        ob_end_clean();
        echo json_encode(['error' => true, 'message' => 'Action invalide']);
    }

} catch (Exception $e) {
    http_response_code(500);
    ob_end_clean();
    echo json_encode(['error' => true, 'message' => $e->getMessage()]);
}
?>
