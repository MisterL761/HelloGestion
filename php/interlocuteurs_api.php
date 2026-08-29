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

try {
    require 'db.php';
    require_once __DIR__ . '/roles.php';

    // Seuls admin, gerant, administration peuvent gérer les interlocuteurs
    requireRole(['admin', 'gerant', 'administration']);

    header('Content-Type: application/json; charset=utf-8');

    $method = $_SERVER['REQUEST_METHOD'];
    $logDir = __DIR__ . '/logs';
    if (!file_exists($logDir)) mkdir($logDir, 0755, true);

    switch ($method) {

        // ── GET : liste des interlocuteurs d'un collaborateur ──
        case 'GET':
            $collaborateurId = intval($_GET['collaborateur_id'] ?? 0);
            if (!$collaborateurId) {
                throw new Exception("ID du collaborateur manquant");
            }
            $stmt = $pdo->prepare("
                SELECT id, name, email, role, created_at
                FROM collaborateur_interlocuteurs
                WHERE collaborateur_id = ?
                ORDER BY role DESC, name ASC
            ");
            $stmt->execute([$collaborateurId]);
            ob_end_clean();
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            break;

        // ── POST : ajouter un interlocuteur ────────────────────
        case 'POST':
            $input           = json_decode(file_get_contents('php://input'), true);
            $collaborateurId = intval($input['collaborateur_id'] ?? 0);
            // strip_tags : pas de HTML dans un nom (anti-XSS stocké) ; suppression des
            // caractères de contrôle (anti-injection dans les logs)
            $name            = trim(preg_replace('/[\x00-\x1F\x7F]/u', ' ', strip_tags($input['name'] ?? '')));
            $email           = trim($input['email'] ?? '');
            $role            = trim($input['role'] ?? 'interlocuteur');

            if (!$collaborateurId || !$name || !$email) {
                throw new Exception("Données manquantes (nom, email et collaborateur_id requis)");
            }
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                throw new Exception("Email invalide");
            }
            if (!in_array($role, ['interlocuteur', 'patron'], true)) {
                throw new Exception("Rôle invalide");
            }

            // S'il y a déjà un patron défini pour cette entreprise, on lève une exception
            if ($role === 'patron') {
                $checkPatron = $pdo->prepare("SELECT id FROM collaborateur_interlocuteurs WHERE collaborateur_id = ? AND role = 'patron'");
                $checkPatron->execute([$collaborateurId]);
                if ($checkPatron->rowCount() > 0) {
                    throw new Exception("Il y a déjà un patron défini pour cette entreprise.");
                }
            }

            $stmt = $pdo->prepare("
                INSERT INTO collaborateur_interlocuteurs (collaborateur_id, name, email, role)
                VALUES (?, ?, ?, ?)
            ");
            $stmt->execute([$collaborateurId, $name, $email, $role]);
            $newId = $pdo->lastInsertId();

            appLog('collaborateurs', who() . " a ajouté l'interlocuteur « {$name} » ($email, rôle: $role) au collaborateur #{$collaborateurId}");

            ob_end_clean();
            echo json_encode([
                'success' => true,
                'id'      => $newId
            ]);
            break;

        // ── DELETE : supprimer un interlocuteur ────────────────
        case 'DELETE':
            $id = intval($_GET['id'] ?? 0);
            if (!$id) throw new Exception("ID manquant");

            // Récupérer infos pour log
            $infoStmt = $pdo->prepare("SELECT name, collaborateur_id FROM collaborateur_interlocuteurs WHERE id = ?");
            $infoStmt->execute([$id]);
            $info = $infoStmt->fetch();

            if ($info) {
                $stmt = $pdo->prepare("DELETE FROM collaborateur_interlocuteurs WHERE id = ?");
                $stmt->execute([$id]);
                $logName = preg_replace('/[\x00-\x1F\x7F]/u', ' ', $info['name']);
                appLog('collaborateurs', who() . " a supprimé l'interlocuteur #{$id} ({$logName}) du collaborateur #{$info['collaborateur_id']}");
            }

            ob_end_clean();
            echo json_encode(['success' => true]);
            break;

        default:
            http_response_code(405);
            ob_end_clean();
            echo json_encode(['error' => true, 'message' => 'Méthode non autorisée']);
    }

} catch (PDOException $e) {
    // Erreur BDD : message générique au client, détail loggé côté serveur
    http_response_code(500);
    ob_end_clean();
    appLog('collaborateurs', 'Erreur BDD interlocuteurs_api : ' . $e->getMessage());
    echo json_encode(['error' => true, 'message' => safeError($e->getMessage())]);
} catch (Exception $e) {
    // Erreur de validation : message destiné à l'utilisateur
    http_response_code(400);
    ob_end_clean();
    echo json_encode(['error' => true, 'message' => $e->getMessage()]);
}
?>
