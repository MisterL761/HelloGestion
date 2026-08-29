<?php
// Cookies session sécurisés (HttpOnly, Secure, SameSite=Strict)
session_set_cookie_params([
    'lifetime' => 1800,
    'path'     => '/',
    'domain'   => '',
    'secure'   => true,
    'httponly' => true,
    'samesite' => 'Strict',
]);
session_start();

$sessionTimeout = 1800;

if (isset($_SESSION['LAST_ACTIVITY']) && (time() - $_SESSION['LAST_ACTIVITY'] > $sessionTimeout)) {
    session_unset();
    session_destroy();
    session_start();
}

$_SESSION['LAST_ACTIVITY'] = time();

ini_set('display_errors', 0);
error_reporting(E_ALL);

$logDir = __DIR__ . '/logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

header('Access-Control-Allow-Origin: https://hello-fermetures.com');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

ob_start();

try {
    require 'db.php';

    header('Content-Type: application/json; charset=utf-8');

    $action = isset($_GET['action']) ? $_GET['action'] : '';

    file_put_contents("$logDir/auth.log", date('Y-m-d H:i:s') . " - Méthode: " . $_SERVER['REQUEST_METHOD'] . " - Action: $action\n", FILE_APPEND);

    switch ($action) {
        case 'login':
            handleLogin($pdo, $logDir);
            break;

        case 'logout':
            handleLogout($logDir);
            break;

        case 'check':
            checkAuth($logDir);
            break;

        default:
            throw new Exception('Action non valide');
            break;
    }

} catch (Exception $e) {
    file_put_contents("$logDir/auth_error.log", date('Y-m-d H:i:s') . " - Erreur: " . $e->getMessage() . "\n", FILE_APPEND);

    http_response_code(500);

    ob_end_clean();
    error_log(date('Y-m-d H:i:s') . ' - Auth error: ' . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Erreur serveur']);
}

function handleLogin($pdo, $logDir) {
    try {
        // ── Rate limiting : max 10 tentatives par IP par 15 minutes ──────────
        $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
        $rlFile = $logDir . '/rl_' . md5($ip) . '.json';
        $rl = file_exists($rlFile) ? json_decode(file_get_contents($rlFile), true) : ['count' => 0, 'time' => time()];
        if (time() - $rl['time'] > 900) { $rl = ['count' => 0, 'time' => time()]; }
        $rl['count']++;
        file_put_contents($rlFile, json_encode($rl), LOCK_EX);
        if ($rl['count'] > 10) {
            http_response_code(429);
            ob_end_clean();
            echo json_encode(['success' => false, 'message' => 'Trop de tentatives. Réessayez dans 15 minutes.']);
            return;
        }

        $input = file_get_contents('php://input');
        $data = json_decode($input, true);

        $logData = $data;
        if (isset($logData['password'])) {
            $logData['password'] = '******';
        }
        file_put_contents("$logDir/auth_login.log", date('Y-m-d H:i:s') . " - Données: " . print_r($logData, true) . "\n", FILE_APPEND);

        if (!isset($data['email']) || !isset($data['password'])) {
            throw new Exception('Email et mot de passe requis');
        }

        $email    = trim($data['email']);
        $password = $data['password'];

        $stmt = $pdo->prepare("SELECT id, email, password, role, name, position, force_password_change FROM users WHERE email = ? AND status = 'active'");
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user || !password_verify($password, $user['password'])) {
            file_put_contents("$logDir/auth_login.log", date('Y-m-d H:i:s') . " - Connexion échouée pour: '$email'\n", FILE_APPEND);
            ob_end_clean();
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Email ou mot de passe incorrect']);
            return;
        }

        session_regenerate_id(true);

        $_SESSION['user'] = [
            'id'                    => $user['id'],
            'email'                 => $user['email'],
            'role'                  => $user['role'],
            'name'                  => $user['name'],
            'position'              => $user['position'],
            'force_password_change' => (bool)$user['force_password_change'],
        ];

        $_SESSION['LAST_ACTIVITY'] = time();

        file_put_contents("$logDir/auth_login.log", date('Y-m-d H:i:s') . " - Connexion réussie pour: '$email' (ID: {$user['id']})\n", FILE_APPEND);

        $userInfo = [
            'id'                    => $user['id'],
            'email'                 => $user['email'],
            'role'                  => $user['role'],
            'name'                  => $user['name'],
            'position'              => $user['position'],
            'force_password_change' => (bool)$user['force_password_change'],
        ];

        ob_end_clean();
        echo json_encode(['success' => true, 'data' => ['user' => $userInfo]]);

        // Maintenance opportuniste Boîte Fournisseurs (throttlée 15 min, non bloquante, jamais fatale)
        if (function_exists('fastcgi_finish_request')) {
            register_shutdown_function(function () use ($pdo) {
                fastcgi_finish_request();
                require_once __DIR__ . '/supplier_email_lib.php';
                runEmailMaintenance($pdo, 900);
            });
        } // sinon : on s'appuie sur UptimeRobot et le bouton manuel — ne jamais ralentir le login

    } catch (Exception $e) {
        file_put_contents("$logDir/auth_login.log", date('Y-m-d H:i:s') . " - Erreur lors de la connexion: " . $e->getMessage() . "\n", FILE_APPEND);

        ob_end_clean();
        error_log(date('Y-m-d H:i:s') . ' - Auth error: ' . $e->getMessage());

        $msg = $e->getMessage();
        $safe = ($msg === 'Email et mot de passe requis') ? $msg : 'Erreur serveur';
        echo json_encode(['success' => false, 'message' => $safe]);
    }
}

function handleLogout($logDir) {
    try {
        // Journaliser la déconnexion
        if (isset($_SESSION['user'])) {
            $email  = $_SESSION['user']['email'] ?? 'unknown';
            $userId = $_SESSION['user']['id'];
            file_put_contents("$logDir/auth_logout.log", date('Y-m-d H:i:s') . " - Déconnexion pour '$email' (ID: $userId)\n", FILE_APPEND);
        } else {
            file_put_contents("$logDir/auth_logout.log", date('Y-m-d H:i:s') . " - Déconnexion pour une session non authentifiée\n", FILE_APPEND);
        }

        session_unset();
        session_destroy();

        // Répondre avec succès
        ob_end_clean();
        echo json_encode(['success' => true, 'message' => 'Déconnexion réussie']);

    } catch (Exception $e) {
        file_put_contents("$logDir/auth_logout.log", date('Y-m-d H:i:s') . " - Erreur lors de la déconnexion: " . $e->getMessage() . "\n", FILE_APPEND);

        ob_end_clean();
        error_log(date('Y-m-d H:i:s') . ' - Auth error: ' . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Erreur serveur']);
    }
}

// Vérifier si l'utilisateur est connecté
function checkAuth($logDir) {
    try {
        if (isset($_SESSION['user'])) {
            $email  = $_SESSION['user']['email'] ?? 'unknown';
            $userId = $_SESSION['user']['id'];
            file_put_contents("$logDir/auth_check.log", date('Y-m-d H:i:s') . " - Vérification session valide pour '$email' (ID: $userId)\n", FILE_APPEND);

            ob_end_clean();
            echo json_encode(['success' => true, 'data' => ['user' => $_SESSION['user']]]);
        } else {
            file_put_contents("$logDir/auth_check.log", date('Y-m-d H:i:s') . " - Vérification session: Non authentifié\n", FILE_APPEND);

            ob_end_clean();
            echo json_encode(['success' => false, 'message' => 'Non authentifié']);
        }

    } catch (Exception $e) {
        file_put_contents("$logDir/auth_check.log", date('Y-m-d H:i:s') . " - Erreur lors de la vérification: " . $e->getMessage() . "\n", FILE_APPEND);

        ob_end_clean();
        error_log(date('Y-m-d H:i:s') . ' - Auth error: ' . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Erreur serveur']);
    }
}
?>