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

    header('Content-Type: application/json; charset=utf-8');

    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        // Lecture : tous les rôles du module (l'aperçu en a besoin)
        requireRole(['admin', 'gerant', 'administration', 'chef_equipe', 'commercial']);
        $config = $pdo->query("SELECT * FROM courrier_entreprise_config WHERE id = 1")->fetch();
        ob_end_clean();
        echo json_encode(['success' => true, 'data' => $config ?: null], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($method === 'POST') {
        // Écriture : admin / gérant uniquement
        requireRole(['admin', 'gerant']);

        // ── Upload du logo (multipart) ────────────────────────
        if (!empty($_FILES['logo'])) {
            $file = $_FILES['logo'];
            if ($file['error'] !== UPLOAD_ERR_OK) throw new Exception("Erreur lors de l'upload du logo");
            if ($file['size'] > 2 * 1024 * 1024) throw new Exception('Logo trop lourd (2 Mo maximum)');
            $mime = mime_content_type($file['tmp_name']);
            $extByMime = ['image/png' => 'png', 'image/jpeg' => 'jpg', 'image/webp' => 'webp'];
            if (!isset($extByMime[$mime])) throw new Exception('Format accepté : PNG, JPG ou WebP');

            $uploadDir = __DIR__ . '/uploads/courrier/';
            if (!file_exists($uploadDir)) mkdir($uploadDir, 0755, true);
            foreach (glob($uploadDir . 'logo.*') as $old) @unlink($old);

            $filename = 'logo.' . $extByMime[$mime];
            if (!move_uploaded_file($file['tmp_name'], $uploadDir . $filename)) {
                throw new Exception("Impossible d'enregistrer le logo");
            }
            $path = 'uploads/courrier/' . $filename;
            $pdo->prepare("UPDATE courrier_entreprise_config SET logo_path = ? WHERE id = 1")->execute([$path]);
            ob_end_clean();
            echo json_encode(['success' => true, 'logo_path' => $path]);
            exit;
        }

        // ── Mise à jour des coordonnées (JSON) ────────────────
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $clean = function ($v) {
            return trim(preg_replace('/[\x00-\x1F\x7F]/u', ' ', strip_tags((string)($v ?? ''))));
        };
        $email = trim($input['email'] ?? '');
        if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new Exception('Email invalide');
        }
        $stmt = $pdo->prepare("
            UPDATE courrier_entreprise_config SET
                nom=?, adresse=?, code_postal=?, ville=?, telephone=?, email=?, siret=?, mentions_legales=?, signataire=?
            WHERE id = 1
        ");
        $stmt->execute([
            $clean($input['nom'] ?? '') !== '' ? $clean($input['nom']) : 'Hello Fermetures',
            $clean($input['adresse'] ?? ''),
            $clean($input['code_postal'] ?? ''),
            $clean($input['ville'] ?? ''),
            $clean($input['telephone'] ?? ''),
            $email,
            $clean($input['siret'] ?? ''),
            $clean($input['mentions_legales'] ?? ''),
            $clean($input['signataire'] ?? ''),
        ]);
        $config = $pdo->query("SELECT * FROM courrier_entreprise_config WHERE id = 1")->fetch();
        ob_end_clean();
        echo json_encode(['success' => true, 'data' => $config], JSON_UNESCAPED_UNICODE);
        exit;
    }

    throw new Exception('Méthode non supportée');
} catch (Exception $e) {
    ob_end_clean();
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
