<?php
// users.php — Gestion des utilisateurs (liste, création, suppression)
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
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(0); }

ob_start();

try {
    require_once __DIR__ . '/db.php';
    require_once __DIR__ . '/roles.php';
    require_once __DIR__ . '/push_helper.php';

    header('Content-Type: application/json; charset=utf-8');

    $method = $_SERVER['REQUEST_METHOD'];

    switch ($method) {

        // ── GET : liste des utilisateurs actifs ───────────
        case 'GET':
            requireRole(['admin', 'gerant', 'administration']);
            $stmt = $pdo->prepare("
                SELECT id, name, email, role, avatar_path, status,
                       IF(status = 'no_login', 0, 1) AS app_access
                FROM users
                WHERE status IN ('active', 'no_login')
                  AND role != 'collaborateur'
                ORDER BY FIELD(role, 'admin','gerant','administration','chef_equipe','commercial','poseur'), name ASC
            ");
            $stmt->execute();
            $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
            ob_end_clean();
            echo json_encode(['success' => true, 'data' => $users]);
            break;

        // ── POST : créer un nouvel employé ────────────────
        case 'POST':
            requireRole(['admin', 'gerant', 'administration']);

            $input = json_decode(file_get_contents('php://input'), true);
            $name       = trim($input['name']       ?? '');
            $role       = trim($input['role']       ?? '');
            $position   = trim($input['position']   ?? '');
            $appAccess  = !empty($input['app_access']);

            $validRoles = ['admin', 'gerant', 'administration', 'chef_equipe', 'commercial', 'poseur'];

            if (!$name || !$role) {
                ob_end_clean(); http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Champs obligatoires manquants']);
                break;
            }
            if (!in_array($role, $validRoles, true)) {
                ob_end_clean(); http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Rôle invalide']);
                break;
            }

            if ($appAccess) {
                // Avec accès app : email + mot de passe obligatoires
                $email    = trim($input['email']    ?? '');
                $password = trim($input['password'] ?? '');
                if (!$email || !$password) {
                    ob_end_clean(); http_response_code(400);
                    echo json_encode(['success' => false, 'message' => 'Email et mot de passe obligatoires']);
                    break;
                }
                if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                    ob_end_clean(); http_response_code(400);
                    echo json_encode(['success' => false, 'message' => 'Email invalide']);
                    break;
                }
                if (strlen($password) < 8) {
                    ob_end_clean(); http_response_code(400);
                    echo json_encode(['success' => false, 'message' => 'Mot de passe trop court (8 caractères min.)']);
                    break;
                }
                $check = $pdo->prepare("SELECT id FROM users WHERE email = ?");
                $check->execute([$email]);
                if ($check->fetch()) {
                    ob_end_clean(); http_response_code(409);
                    echo json_encode(['success' => false, 'message' => 'Cet email est déjà utilisé']);
                    break;
                }
                $hash   = password_hash($password, PASSWORD_DEFAULT);
                $status = 'active';
            } else {
                // Sans accès app : email/mot de passe auto-générés
                $slug   = strtolower(preg_replace('/[^a-zA-Z0-9]/', '.', $name));
                $email  = $slug . '.' . uniqid() . '@no-login.internal';
                $hash   = password_hash(bin2hex(random_bytes(16)), PASSWORD_DEFAULT);
                $status = 'no_login';
            }

            $stmt = $pdo->prepare("
                INSERT INTO users (name, email, password, role, position, status)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            try {
                $stmt->execute([$name, $email, $hash, $role, $position, $status]);
            } catch (PDOException $e) {
                if ($e->getCode() === '23000' || strpos($e->getMessage(), 'Duplicate') !== false) {
                    http_response_code(409);
                    echo json_encode(['success' => false, 'message' => 'Cet email est déjà utilisé.']);
                    exit();
                }
                throw $e;
            }
            $newId = $pdo->lastInsertId();

            // Log
            $logDir = __DIR__ . '/logs';
            if (!file_exists($logDir)) mkdir($logDir, 0755, true);
            $adminId = $_SESSION['user']['id'] ?? '?';
            file_put_contents("$logDir/users.log",
                date('Y-m-d H:i:s') . " - Nouvel employé '$name' ($email, $role) créé par admin_id=$adminId\n", FILE_APPEND);

            // Notifier les managers d'un nouvel employé
            $roleLabels = ['admin'=>'Admin','gerant'=>'Gérant','administration'=>'Administration','chef_equipe'=>"Chef d'équipe",'commercial'=>'Commercial','poseur'=>'Poseur'];
            $roleLabel = $roleLabels[$role] ?? $role;
            $mgrIds = $pdo->query("SELECT id FROM users WHERE role IN ('admin','gerant','administration') AND status='active'")->fetchAll(PDO::FETCH_COLUMN);
            notifyAll($pdo, '👤 Nouvel employé ajouté', "$name a rejoint l'équipe en tant que $roleLabel", ['url' => '/hello-gestion/'], $mgrIds);

            ob_end_clean();
            echo json_encode(['success' => true, 'id' => (int)$newId, 'message' => 'Employé créé avec succès']);
            break;

        // ── DELETE : désactiver un employé ────────────────
        case 'DELETE':
            requireRole(['admin']); // seul l'admin peut supprimer

            $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
            if (!$id) {
                ob_end_clean(); http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'ID manquant']);
                break;
            }

            // Empêcher de se supprimer soi-même
            $currentUserId = (int)($_SESSION['user']['id'] ?? 0);
            if ($id === $currentUserId) {
                ob_end_clean(); http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Impossible de supprimer votre propre compte']);
                break;
            }

            // Vérifier que l'user existe
            $check = $pdo->prepare("SELECT id, name, email FROM users WHERE id = ?");
            $check->execute([$id]);
            $target = $check->fetch(PDO::FETCH_ASSOC);
            if (!$target) {
                ob_end_clean(); http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Employé introuvable']);
                break;
            }

            // Désactivation (on ne supprime pas physiquement pour garder l'historique)
            $stmt = $pdo->prepare("UPDATE users SET status = 'inactive' WHERE id = ?");
            $stmt->execute([$id]);

            $logDir = __DIR__ . '/logs';
            if (!file_exists($logDir)) mkdir($logDir, 0755, true);
            file_put_contents("$logDir/users.log",
                date('Y-m-d H:i:s') . " - Employé '{$target['name']}' (ID=$id) désactivé par admin_id=$currentUserId\n", FILE_APPEND);

            ob_end_clean();
            echo json_encode(['success' => true, 'message' => 'Employé désactivé avec succès']);
            break;

        default:
            ob_end_clean(); http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Méthode non autorisée']);
    }

} catch (Exception $e) {
    error_log('users.php error: ' . $e->getMessage());
    ob_end_clean();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erreur serveur']);
}
