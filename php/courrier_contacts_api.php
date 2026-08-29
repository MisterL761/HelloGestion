<?php
session_start();

ini_set('display_errors', 0);
error_reporting(E_ALL);

require_once __DIR__ . '/security.php';
setSecurityHeaders();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(0); }

ob_start();

try {
    require 'db.php';
    require_once __DIR__ . '/roles.php';

    // Base d'interlocuteurs : tous les rôles internes sauf poseur
    requireRole(['admin', 'gerant', 'administration', 'chef_equipe', 'commercial']);

    header('Content-Type: application/json; charset=utf-8');

    $method = $_SERVER['REQUEST_METHOD'];

    // strip_tags + suppression caractères de contrôle (pattern interlocuteurs_api.php)
    $clean = function ($v) {
        return trim(preg_replace('/[\x00-\x1F\x7F]/u', ' ', strip_tags((string)($v ?? ''))));
    };

    $TYPES = ['client', 'fournisseur', 'administration', 'partenaire', 'autre'];

    switch ($method) {

        // ── GET : fiche, recherche ou liste ───────────────────
        case 'GET':
            if (!empty($_GET['id'])) {
                $stmt = $pdo->prepare("SELECT * FROM courrier_contacts WHERE id = ?");
                $stmt->execute([intval($_GET['id'])]);
                $contact = $stmt->fetch();
                if (!$contact) throw new Exception('Interlocuteur introuvable');
                ob_end_clean();
                echo json_encode(['success' => true, 'data' => $contact], JSON_UNESCAPED_UNICODE);
                break;
            }
            $q = trim($_GET['q'] ?? '');
            if ($q !== '') {
                $like = '%' . $q . '%';
                $stmt = $pdo->prepare("
                    SELECT * FROM courrier_contacts
                    WHERE nom LIKE ? OR prenom LIKE ? OR societe LIKE ? OR ville LIKE ? OR telephone LIKE ?
                    ORDER BY societe ASC, nom ASC
                    LIMIT 50
                ");
                $stmt->execute([$like, $like, $like, $like, $like]);
            } else {
                $stmt = $pdo->query("SELECT * FROM courrier_contacts ORDER BY societe ASC, nom ASC LIMIT 500");
            }
            ob_end_clean();
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll()], JSON_UNESCAPED_UNICODE);
            break;

        // ── POST : créer / PUT : modifier ─────────────────────
        case 'POST':
        case 'PUT':
            $input = json_decode(file_get_contents('php://input'), true) ?? [];
            $data = [
                'civilite'    => $clean($input['civilite'] ?? ''),
                'nom'         => $clean($input['nom'] ?? ''),
                'prenom'      => $clean($input['prenom'] ?? ''),
                'societe'     => $clean($input['societe'] ?? ''),
                'adresse'     => $clean($input['adresse'] ?? ''),
                'code_postal' => $clean($input['code_postal'] ?? ''),
                'ville'       => $clean($input['ville'] ?? ''),
                'email'       => trim($input['email'] ?? ''),
                'telephone'   => $clean($input['telephone'] ?? ''),
                'type'        => $input['type'] ?? 'client',
                'notes'       => trim(strip_tags($input['notes'] ?? '')),
            ];
            if ($data['nom'] === '' && $data['societe'] === '') {
                throw new Exception('Renseignez au moins un nom ou une société');
            }
            if (!in_array($data['type'], $TYPES, true)) {
                throw new Exception("Type d'interlocuteur invalide");
            }
            if ($data['email'] !== '' && !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
                throw new Exception('Email invalide');
            }

            if ($method === 'POST') {
                $stmt = $pdo->prepare("
                    INSERT INTO courrier_contacts
                        (civilite, nom, prenom, societe, adresse, code_postal, ville, email, telephone, type, notes)
                    VALUES (?,?,?,?,?,?,?,?,?,?,?)
                ");
                $stmt->execute(array_values($data));
                $id = intval($pdo->lastInsertId());
            } else {
                $id = intval($input['id'] ?? 0);
                if (!$id) throw new Exception('ID manquant');
                $stmt = $pdo->prepare("
                    UPDATE courrier_contacts SET
                        civilite=?, nom=?, prenom=?, societe=?, adresse=?, code_postal=?,
                        ville=?, email=?, telephone=?, type=?, notes=?
                    WHERE id=?
                ");
                $stmt->execute(array_merge(array_values($data), [$id]));
            }
            $stmt = $pdo->prepare("SELECT * FROM courrier_contacts WHERE id = ?");
            $stmt->execute([$id]);
            ob_end_clean();
            echo json_encode(['success' => true, 'data' => $stmt->fetch()], JSON_UNESCAPED_UNICODE);
            break;

        // ── DELETE : admin / gérant uniquement ────────────────
        case 'DELETE':
            requireRole(['admin', 'gerant']);
            $id = intval($_GET['id'] ?? 0);
            if (!$id) throw new Exception('ID manquant');
            $pdo->prepare("DELETE FROM courriers WHERE contact_id = ?")->execute([$id]);
            $pdo->prepare("DELETE FROM courrier_contacts WHERE id = ?")->execute([$id]);
            ob_end_clean();
            echo json_encode(['success' => true]);
            break;

        default:
            throw new Exception('Méthode non supportée');
    }
} catch (Exception $e) {
    ob_end_clean();
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
