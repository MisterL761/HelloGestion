<?php

// Démarrer la session
session_start();

// Vérifier si l'utilisateur est authentifié
if (!isset($_SESSION['user'])) {
    header('Content-Type: application/json');
    http_response_code(401);
    echo json_encode(['error' => true, 'message' => 'Non authentifié']);
    exit;
}

// Désactiver l'affichage des erreurs dans la sortie
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Configuration pour les journaux
$logDir = __DIR__ . '/logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

// Journaliser les requêtes
file_put_contents("$logDir/stats.log", date('Y-m-d H:i:s') . " - Méthode: " . $_SERVER['REQUEST_METHOD'] . "\n", FILE_APPEND);

// En-têtes CORS
require_once __DIR__ . '/security.php';
setSecurityHeaders();
// Gérer la requête OPTIONS (pre-flight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

// Capturer toute sortie accidentelle
ob_start();

try {
    // Vérifier que la méthode HTTP est GET
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        throw new Exception('Méthode non autorisée');
    }

    // Inclure le fichier de connexion à la base de données
    require 'db.php';

    // Définir l'en-tête de type de contenu
    header('Content-Type: application/json; charset=utf-8');

    // Récupérer les statistiques
    $stmt = $pdo->query("SELECT 
                        COUNT(*) as total_items,
                        SUM(CASE WHEN stock > threshold THEN 1 ELSE 0 END) as available_items,
                        SUM(CASE WHEN stock > 0 AND stock <= threshold THEN 1 ELSE 0 END) as low_stock_items,
                        SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END) as out_of_stock_items
                        FROM inventory");
    $stats = $stmt->fetch();

    // Nettoyer la sortie avant d'envoyer le JSON
    ob_end_clean();
    echo json_encode($stats);

} catch (Exception $e) {
    // Journaliser l'erreur
    file_put_contents("$logDir/stats_error.log", date('Y-m-d H:i:s') . " - Erreur: " . $e->getMessage() . "\n", FILE_APPEND);

    // Définir le code d'état HTTP
    http_response_code(500);

    // Nettoyer la sortie avant d'envoyer le JSON
    ob_end_clean();
    echo json_encode(['error' => true, 'message' => $e->getMessage()]);
}
?>