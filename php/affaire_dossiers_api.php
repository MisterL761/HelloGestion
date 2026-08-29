<?php
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
    require_once __DIR__ . '/affaire_dossiers_lib.php';
    header('Content-Type: application/json; charset=utf-8');

    ensureDossierTables($pdo);
    $payeDossierId = ensurePayeDossier($pdo);

    $user   = $_SESSION['user'];
    $role   = (string)($user['role'] ?? '');
    $userId = (int)($user['id'] ?? 0);
    $action = $_GET['action'] ?? '';
    $input  = json_decode(file_get_contents('php://input'), true) ?: [];

    function respondD(array $p): void { ob_end_clean(); echo json_encode($p); exit; }
    function requirePostD(): void {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            ob_end_clean(); http_response_code(405);
            echo json_encode(['success'=>false,'message'=>'Méthode non autorisée']); exit;
        }
    }
    function denyUnlessManagementD(string $role): void {
        if (!dossierIsManagement($role)) {
            ob_end_clean(); http_response_code(403);
            echo json_encode(['success'=>false,'message'=>'Accès refusé']); exit;
        }
    }

    switch ($action) {
        case 'list': {
            $rows = $pdo->query("
                SELECT d.id, d.name, d.position, d.is_system,
                       (SELECT COUNT(*) FROM affaires a WHERE a.dossier_id = d.id) AS affaires_count
                FROM affaire_dossiers d
                ORDER BY d.is_system ASC, d.position ASC, d.name ASC
            ")->fetchAll(PDO::FETCH_ASSOC);
            respondD(['success' => true, 'data' => $rows]);
        }

        case 'create': {
            requirePostD(); denyUnlessManagementD($role);
            $name = trim((string)($input['name'] ?? ''));
            if ($name === '') respondD(['success'=>false,'message'=>'Le nom du dossier est requis']);
            $pos = (int)$pdo->query("SELECT COALESCE(MAX(position),0) FROM affaire_dossiers")->fetchColumn() + 1;
            $stmt = $pdo->prepare("INSERT INTO affaire_dossiers (name, position) VALUES (?, ?)");
            $stmt->execute([$name, $pos]);
            $id = (int)$pdo->lastInsertId();
            respondD(['success'=>true,'data'=>['id'=>$id,'name'=>$name,'position'=>$pos,'is_system'=>0,'affaires_count'=>0]]);
        }

        case 'rename': {
            requirePostD(); denyUnlessManagementD($role);
            $id   = (int)($input['id'] ?? 0);
            $name = trim((string)($input['name'] ?? ''));
            if ($id <= 0 || $name === '') respondD(['success'=>false,'message'=>'Nom ou dossier invalide']);
            if ($id === $payeDossierId) respondD(['success'=>false,'message'=>'Ce dossier est géré automatiquement et ne peut pas être renommé']);
            $pdo->prepare("UPDATE affaire_dossiers SET name = ? WHERE id = ?")->execute([$name, $id]);
            respondD(['success'=>true]);
        }

        case 'delete': {
            requirePostD(); denyUnlessManagementD($role);
            $id = (int)($input['id'] ?? 0);
            if ($id <= 0) respondD(['success'=>false,'message'=>'Dossier invalide']);
            if ($id === $payeDossierId) respondD(['success'=>false,'message'=>'Ce dossier est géré automatiquement et ne peut pas être supprimé']);
            $pdo->prepare("UPDATE affaires SET dossier_id = NULL WHERE dossier_id = ?")->execute([$id]);
            $pdo->prepare("DELETE FROM affaire_dossiers WHERE id = ?")->execute([$id]);
            respondD(['success'=>true]);
        }

        case 'move': {
            requirePostD();
            $affaireId = (int)($input['affaire_id'] ?? 0);
            $dossierId = (array_key_exists('dossier_id', $input) && $input['dossier_id'] !== null)
                ? (int)$input['dossier_id'] : null;
            if ($affaireId <= 0) respondD(['success'=>false,'message'=>'Affaire invalide']);

            $stmt = $pdo->prepare("SELECT assigned_to, commission_payee FROM affaires WHERE id = ?");
            $stmt->execute([$affaireId]);
            $aff = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$aff) respondD(['success'=>false,'message'=>'Affaire introuvable']);
            $assignedTo = $aff['assigned_to'] !== null ? (int)$aff['assigned_to'] : null;

            if (!dossierCanMove($role, $userId, $assignedTo)) {
                ob_end_clean(); http_response_code(403);
                echo json_encode(['success'=>false,'message'=>'Vous ne pouvez déplacer que vos affaires']); exit;
            }
            if (!empty($aff['commission_payee'])) {
                respondD(['success'=>false,'message'=>'Décochez d\'abord « Commission payée » sur la fiche pour sortir cette affaire du dossier Payé']);
            }
            if ($dossierId === $payeDossierId) {
                respondD(['success'=>false,'message'=>'Ce dossier est géré automatiquement via la case « Commission payée » sur la fiche']);
            }
            if ($dossierId !== null) {
                $chk = $pdo->prepare("SELECT id FROM affaire_dossiers WHERE id = ?");
                $chk->execute([$dossierId]);
                if (!$chk->fetch()) respondD(['success'=>false,'message'=>'Dossier cible introuvable']);
            }
            $pdo->prepare("UPDATE affaires SET dossier_id = ? WHERE id = ?")->execute([$dossierId, $affaireId]);
            respondD(['success'=>true]);
        }

        default:
            respondD(['success'=>false,'message'=>'Action inconnue']);
    }
} catch (Throwable $e) {
    ob_end_clean();
    header('Content-Type: application/json');
    echo json_encode(['success'=>false,'message'=>'Une erreur est survenue']);
}
