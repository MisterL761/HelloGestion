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

require_once __DIR__ . '/security.php';
require_once __DIR__ . '/log_helper.php';
setSecurityHeaders();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(0); }

ob_start();

function sendWelcomeEmail(string $to, string $name, string $password): bool {
    require_once __DIR__ . '/mailer.php';
    $loginUrl = 'https://hello-fermetures.com/hello-gestion/';
    $subject  = 'Vos acces Hello Gestion - ' . $name;

    $html = '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<style>
  body{font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:24px;}
  .card{background:#fff;border-radius:16px;max-width:520px;margin:0 auto;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);}
  .header{background:#1a1a1a;padding:28px 32px;text-align:center;}
  .logo{font-size:22px;font-weight:900;color:#FFB103;letter-spacing:-0.5px;}
  .logo span{display:block;font-size:12px;font-weight:400;color:#ffffff80;margin-top:4px;}
  .body{padding:32px;}
  h2{color:#111;font-size:18px;margin:0 0 8px;}
  p{color:#555;font-size:14px;line-height:1.6;margin:0 0 16px;}
  .box{background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin:20px 0;}
  .row{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f0f0f0;}
  .row:last-child{border:none;}
  .label{font-size:12px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:.05em;}
  .value{font-size:14px;color:#111;font-weight:700;font-family:monospace;}
  .btn{display:block;background:#FFB103;color:#1a1a1a;text-decoration:none;text-align:center;font-weight:800;font-size:15px;padding:14px 24px;border-radius:12px;margin:24px 0 8px;}
  .footer{padding:20px 32px;background:#f9fafb;border-top:1px solid #f0f0f0;text-align:center;font-size:11px;color:#9ca3af;}
</style></head><body>
<div class="card">
  <div class="header">
    <div class="logo">Hello Gestion<span>Hello Fermetures</span></div>
  </div>
  <div class="body">
    <h2>Bienvenue, ' . htmlspecialchars($name) . ' !</h2>
    <p>Un compte collaborateur vous a été créé sur <strong>Hello Gestion</strong>. Voici vos identifiants de connexion :</p>
    <div class="box">
      <div class="row"><span class="label">Email</span><span class="value">' . htmlspecialchars($to) . '</span></div>
      <div class="row"><span class="label">Mot de passe</span><span class="value">' . htmlspecialchars($password) . '</span></div>
    </div>
    <a href="' . $loginUrl . '" class="btn">Se connecter à Hello Gestion</a>
    <p style="font-size:12px;color:#9ca3af;">Vous aurez accès uniquement aux affaires qui vous sont assignées. Nous vous recommandons de changer votre mot de passe après la première connexion.</p>
  </div>
  <div class="footer">Hello Fermetures · Ce message est confidentiel</div>
</div>
</body></html>';

    return sendMail($to, $name, $subject, $html);
}

try {
    require 'db.php';
    require_once __DIR__ . '/roles.php';

    requireRole(['admin', 'gerant', 'administration']);

    header('Content-Type: application/json; charset=utf-8');

    $method = $_SERVER['REQUEST_METHOD'];
    $logDir = __DIR__ . '/logs';
    if (!file_exists($logDir)) mkdir($logDir, 0755, true);

    switch ($method) {

        // ── GET : liste des collaborateurs ────────────────
        case 'GET':
            $stmt = $pdo->query("
                SELECT id, name, email, status, created_at
                FROM users
                WHERE role = 'collaborateur' AND status IN ('active','no_login')
                ORDER BY name ASC
            ");
            ob_end_clean();
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            break;

        // ── POST : créer un collaborateur + envoyer email ─
        case 'POST':
            $input    = json_decode(file_get_contents('php://input'), true);
            $company  = trim($input['company']  ?? '');
            $email    = trim($input['email']    ?? '');
            $password = trim($input['password'] ?? '');

            if (!$company || !$email || !$password) {
                throw new Exception("Nom d'entreprise, email et mot de passe sont requis");
            }
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                throw new Exception("Email invalide");
            }
            if (strlen($password) < 6) {
                throw new Exception("Mot de passe trop court (min. 6 caractères)"); // génération auto = 15
            }

            // Vérifier doublon email
            $check = $pdo->prepare("SELECT id FROM users WHERE email = ?");
            $check->execute([$email]);
            if ($check->rowCount() > 0) {
                ob_end_clean();
                echo json_encode(['success' => false, 'message' => 'Cet email est déjà utilisé']);
                exit;
            }

            $hash = password_hash($password, PASSWORD_DEFAULT);
            $stmt = $pdo->prepare("
                INSERT INTO users (name, email, password, role, position, status, force_password_change)
                VALUES (?, ?, ?, 'collaborateur', '', 'active', 1)
            ");
            $stmt->execute([$company, $email, $hash]);
            $newId = $pdo->lastInsertId();

            // Envoi email
            $sent = sendWelcomeEmail($email, $company, $password);

            file_put_contents("$logDir/collaborateurs.log",
                date('Y-m-d H:i:s') . " - Collaborateur '$company' ($email) créé, email " . ($sent ? 'envoyé' : 'ECHEC') . "\n",
                FILE_APPEND
            );

            appLog('collaborateurs', who() . " a créé le collaborateur « {$company} » ($email)");

            ob_end_clean();
            echo json_encode([
                'success'    => true,
                'id'         => $newId,
                'email_sent' => $sent,
            ]);
            break;

        // ── DELETE : désactiver un collaborateur ──────────
        case 'DELETE':
            $id = intval($_GET['id'] ?? 0);
            if (!$id) throw new Exception("ID manquant");

            $stmt = $pdo->prepare("UPDATE users SET status = 'disabled' WHERE id = ? AND role = 'collaborateur'");
            $stmt->execute([$id]);
            appLog('collaborateurs', who() . " a désactivé le collaborateur #$id");
            ob_end_clean();
            echo json_encode(['success' => true]);
            break;

        default:
            http_response_code(405);
            ob_end_clean();
            echo json_encode(['error' => true, 'message' => 'Méthode non autorisée']);
    }

} catch (Exception $e) {
    http_response_code(500);
    ob_end_clean();
    echo json_encode(['error' => true, 'message' => $e->getMessage()]);
}
?>
