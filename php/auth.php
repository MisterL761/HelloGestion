<?php

require_once __DIR__ . '/config.php';

/*
|--------------------------------------------------------------------------
| SESSION
|--------------------------------------------------------------------------
| Configuration adaptée à l'environnement local.
| Le site local fonctionne en HTTP (http://localhost),
| donc secure doit être false.
*/

session_set_cookie_params([
    'lifetime' => 1800,
    'path'     => '/',
    'domain'   => '',
    'secure'   => false,
    'httponly' => true,
    'samesite' => 'Lax',
]);

session_start();

$sessionTimeout = 1800;

if (
    isset($_SESSION['LAST_ACTIVITY']) &&
    (time() - $_SESSION['LAST_ACTIVITY'] > $sessionTimeout)
) {
    session_unset();
    session_destroy();

    session_set_cookie_params([
        'lifetime' => 1800,
        'path'     => '/',
        'domain'   => '',
        'secure'   => false,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);

    session_start();
}

$_SESSION['LAST_ACTIVITY'] = time();


/*
|--------------------------------------------------------------------------
| ERREURS
|--------------------------------------------------------------------------
*/

ini_set('display_errors', 0);
error_reporting(E_ALL);


/*
|--------------------------------------------------------------------------
| LOGS
|--------------------------------------------------------------------------
*/

$logDir = __DIR__ . '/logs';

if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}


/*
|--------------------------------------------------------------------------
| CORS
|--------------------------------------------------------------------------
*/

header('Access-Control-Allow-Origin: ' . ALLOWED_ORIGIN);
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}


/*
|--------------------------------------------------------------------------
| BUFFER
|--------------------------------------------------------------------------
*/

ob_start();


/*
|--------------------------------------------------------------------------
| TRAITEMENT
|--------------------------------------------------------------------------
*/

try {

    require_once __DIR__ . '/db.php';

    header('Content-Type: application/json; charset=utf-8');

    $action = $_GET['action'] ?? '';

    file_put_contents(
        $logDir . '/auth.log',
        date('Y-m-d H:i:s') .
        " - Méthode: " .
        ($_SERVER['REQUEST_METHOD'] ?? '') .
        " - Action: " .
        $action .
        PHP_EOL,
        FILE_APPEND
    );


    switch ($action) {

        /*
        |--------------------------------------------------------------------------
        | LOGIN
        |--------------------------------------------------------------------------
        */

        case 'login':
            handleLogin($pdo, $logDir);
            break;


        /*
        |--------------------------------------------------------------------------
        | LOGOUT
        |--------------------------------------------------------------------------
        */

        case 'logout':
            handleLogout($logDir);
            break;


        /*
        |--------------------------------------------------------------------------
        | CHECK
        |--------------------------------------------------------------------------
        */

        case 'check':
            checkAuth($logDir);
            break;


        /*
        |--------------------------------------------------------------------------
        | ACTION INVALIDE
        |--------------------------------------------------------------------------
        */

        default:

            throw new Exception('Action non valide');
    }


} catch (Exception $e) {

    file_put_contents(
        $logDir . '/auth_error.log',
        date('Y-m-d H:i:s') .
        " - Erreur: " .
        $e->getMessage() .
        PHP_EOL,
        FILE_APPEND
    );

    http_response_code(500);

    if (ob_get_level()) {
        ob_end_clean();
    }

    error_log(
        date('Y-m-d H:i:s') .
        ' - Auth error: ' .
        $e->getMessage()
    );

    echo json_encode([
        'success' => false,
        'message' => 'Erreur serveur'
    ]);
}


/*
|--------------------------------------------------------------------------
| LOGIN
|--------------------------------------------------------------------------
*/

function handleLogin($pdo, $logDir)
{
    try {

        /*
        |--------------------------------------------------------------------------
        | RATE LIMITING
        |--------------------------------------------------------------------------
        */

        $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';

        $rlFile = $logDir . '/rl_' . md5($ip) . '.json';

        if (file_exists($rlFile)) {

            $rl = json_decode(
                file_get_contents($rlFile),
                true
            );

            if (!is_array($rl)) {
                $rl = [
                    'count' => 0,
                    'time' => time()
                ];
            }

        } else {

            $rl = [
                'count' => 0,
                'time' => time()
            ];
        }


        if (time() - $rl['time'] > 900) {

            $rl = [
                'count' => 0,
                'time' => time()
            ];
        }


        $rl['count']++;

        file_put_contents(
            $rlFile,
            json_encode($rl),
            LOCK_EX
        );


        if ($rl['count'] > 10) {

            http_response_code(429);

            if (ob_get_level()) {
                ob_end_clean();
            }

            echo json_encode([
                'success' => false,
                'message' => 'Trop de tentatives. Réessayez dans 15 minutes.'
            ]);

            return;
        }


        /*
        |--------------------------------------------------------------------------
        | LECTURE DE LA REQUÊTE
        |--------------------------------------------------------------------------
        */

        $input = file_get_contents('php://input');

        $data = json_decode($input, true);


        if (!is_array($data)) {

            throw new Exception(
                'Données de connexion invalides'
            );
        }


        /*
        |--------------------------------------------------------------------------
        | VÉRIFICATION DES CHAMPS
        |--------------------------------------------------------------------------
        */

        if (
            !isset($data['email']) ||
            !isset($data['password'])
        ) {

            throw new Exception(
                'Email et mot de passe requis'
            );
        }


        $email = trim($data['email']);

        $password = $data['password'];


        /*
        |--------------------------------------------------------------------------
        | LOG SANS MOT DE PASSE
        |--------------------------------------------------------------------------
        */

        $logData = [
            'email' => $email
        ];

        file_put_contents(
            $logDir . '/auth_login.log',
            date('Y-m-d H:i:s') .
            " - Tentative de connexion: " .
            print_r($logData, true) .
            PHP_EOL,
            FILE_APPEND
        );


        /*
        |--------------------------------------------------------------------------
        | RECHERCHE UTILISATEUR
        |--------------------------------------------------------------------------
        |
        | IMPORTANT :
        | La base utilisée ici est celle définie dans db.php/config.php,
        | donc notre base locale helloferep295.
        |
        */

        $stmt = $pdo->prepare(
            "SELECT
                id,
                email,
                password,
                role,
                name,
                position
             FROM users
             WHERE email = ?
             AND status = 'active'
             LIMIT 1"
        );

        $stmt->execute([$email]);

        $user = $stmt->fetch(PDO::FETCH_ASSOC);


        /*
        |--------------------------------------------------------------------------
        | VÉRIFICATION MOT DE PASSE
        |--------------------------------------------------------------------------
        */

        if (
            !$user ||
            !password_verify(
                $password,
                $user['password']
            )
        ) {

            file_put_contents(
                $logDir . '/auth_login.log',
                date('Y-m-d H:i:s') .
                " - Connexion échouée pour: '" .
                $email .
                "'" .
                PHP_EOL,
                FILE_APPEND
            );


            if (ob_get_level()) {
                ob_end_clean();
            }

            http_response_code(401);

            echo json_encode([
                'success' => false,
                'message' => 'Email ou mot de passe incorrect'
            ]);

            return;
        }


        /*
        |--------------------------------------------------------------------------
        | NOUVEL ID DE SESSION
        |--------------------------------------------------------------------------
        */

        session_regenerate_id(true);


        /*
        |--------------------------------------------------------------------------
        | SESSION UTILISATEUR
        |--------------------------------------------------------------------------
        |
        | force_password_change n'est pas utilisé ici car cette colonne
        | n'existe pas forcément dans la copie locale de la base.
        |
        */

        $_SESSION['user'] = [

            'id' => $user['id'],

            'email' => $user['email'],

            'role' => $user['role'],

            'name' => $user['name'],

            'position' => $user['position'],

            'force_password_change' => false
        ];


        $_SESSION['LAST_ACTIVITY'] = time();


        /*
        |--------------------------------------------------------------------------
        | LOG SUCCÈS
        |--------------------------------------------------------------------------
        */

        file_put_contents(
            $logDir . '/auth_login.log',
            date('Y-m-d H:i:s') .
            " - Connexion réussie pour: '" .
            $email .
            "' (ID: " .
            $user['id'] .
            ")" .
            PHP_EOL,
            FILE_APPEND
        );


        /*
        |--------------------------------------------------------------------------
        | INFORMATIONS UTILISATEUR
        |--------------------------------------------------------------------------
        */

        $userInfo = [

            'id' => $user['id'],

            'email' => $user['email'],

            'role' => $user['role'],

            'name' => $user['name'],

            'position' => $user['position'],

            'force_password_change' => false
        ];


        /*
        |--------------------------------------------------------------------------
        | RÉPONSE
        |--------------------------------------------------------------------------
        */

        if (ob_get_level()) {
            ob_end_clean();
        }

        echo json_encode([
            'success' => true,
            'data' => [
                'user' => $userInfo
            ]
        ]);


        /*
        |--------------------------------------------------------------------------
        | IMPORTANT : PAS DE MAINTENANCE E-MAIL EN LOCAL
        |--------------------------------------------------------------------------
        |
        | On ne lance volontairement aucune fonction Microsoft Graph,
        | SMTP ou maintenance fournisseur depuis le local.
        |
        | Cela garantit que nos tests locaux ne déclenchent pas
        | d'actions sur les services de production.
        |
        */

    } catch (Exception $e) {

        file_put_contents(
            $logDir . '/auth_login.log',
            date('Y-m-d H:i:s') .
            " - Erreur lors de la connexion: " .
            $e->getMessage() .
            PHP_EOL,
            FILE_APPEND
        );


        if (ob_get_level()) {
            ob_end_clean();
        }


        error_log(
            date('Y-m-d H:i:s') .
            ' - Auth error: ' .
            $e->getMessage()
        );


        $msg = $e->getMessage();


        $safe = (
            $msg === 'Email et mot de passe requis' ||
            $msg === 'Données de connexion invalides'
        )
            ? $msg
            : 'Erreur serveur';


        echo json_encode([
            'success' => false,
            'message' => $safe
        ]);
    }
}


/*
|--------------------------------------------------------------------------
| LOGOUT
|--------------------------------------------------------------------------
*/

function handleLogout($logDir)
{
    try {

        if (isset($_SESSION['user'])) {

            $email = $_SESSION['user']['email'] ?? 'unknown';

            $userId = $_SESSION['user']['id'] ?? 'unknown';


            file_put_contents(
                $logDir . '/auth_logout.log',
                date('Y-m-d H:i:s') .
                " - Déconnexion pour '" .
                $email .
                "' (ID: " .
                $userId .
                ")" .
                PHP_EOL,
                FILE_APPEND
            );

        } else {

            file_put_contents(
                $logDir . '/auth_logout.log',
                date('Y-m-d H:i:s') .
                " - Déconnexion pour une session non authentifiée" .
                PHP_EOL,
                FILE_APPEND
            );
        }


        /*
        |--------------------------------------------------------------------------
        | DESTRUCTION SESSION
        |--------------------------------------------------------------------------
        */

        $_SESSION = [];


        if (ini_get('session.use_cookies')) {

            $params = session_get_cookie_params();

            setcookie(
                session_name(),
                '',
                time() - 42000,
                $params['path'],
                $params['domain'],
                $params['secure'],
                $params['httponly']
            );
        }


        session_destroy();


        if (ob_get_level()) {
            ob_end_clean();
        }


        echo json_encode([
            'success' => true,
            'message' => 'Déconnexion réussie'
        ]);


    } catch (Exception $e) {

        file_put_contents(
            $logDir . '/auth_logout.log',
            date('Y-m-d H:i:s') .
            " - Erreur lors de la déconnexion: " .
            $e->getMessage() .
            PHP_EOL,
            FILE_APPEND
        );


        if (ob_get_level()) {
            ob_end_clean();
        }


        error_log(
            date('Y-m-d H:i:s') .
            ' - Auth error: ' .
            $e->getMessage()
        );


        echo json_encode([
            'success' => false,
            'message' => 'Erreur serveur'
        ]);
    }
}


/*
|--------------------------------------------------------------------------
| CHECK AUTH
|--------------------------------------------------------------------------
*/

function checkAuth($logDir)
{
    try {

        if (isset($_SESSION['user'])) {

            $email = $_SESSION['user']['email'] ?? 'unknown';

            $userId = $_SESSION['user']['id'] ?? 'unknown';


            file_put_contents(
                $logDir . '/auth_check.log',
                date('Y-m-d H:i:s') .
                " - Vérification session valide pour '" .
                $email .
                "' (ID: " .
                $userId .
                ")" .
                PHP_EOL,
                FILE_APPEND
            );


            if (ob_get_level()) {
                ob_end_clean();
            }


            echo json_encode([
                'success' => true,
                'data' => [
                    'user' => $_SESSION['user']
                ]
            ]);


        } else {

            file_put_contents(
                $logDir . '/auth_check.log',
                date('Y-m-d H:i:s') .
                " - Vérification session: Non authentifié" .
                PHP_EOL,
                FILE_APPEND
            );


            if (ob_get_level()) {
                ob_end_clean();
            }


            echo json_encode([
                'success' => false,
                'message' => 'Non authentifié'
            ]);
        }


    } catch (Exception $e) {

        file_put_contents(
            $logDir . '/auth_check.log',
            date('Y-m-d H:i:s') .
            " - Erreur lors de la vérification: " .
            $e->getMessage() .
            PHP_EOL,
            FILE_APPEND
        );


        if (ob_get_level()) {
            ob_end_clean();
        }


        error_log(
            date('Y-m-d H:i:s') .
            ' - Auth error: ' .
            $e->getMessage()
        );


        echo json_encode([
            'success' => false,
            'message' => 'Erreur serveur'
        ]);
    }
}

?>