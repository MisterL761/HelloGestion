<?php
/**
 * Endpoint UptimeRobot - Version simplifiée
 */

// Headers pour éviter redirections
header('Content-Type: text/plain; charset=utf-8');
header('Cache-Control: no-cache');

// Debug et gestion d'erreurs
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

echo "UptimeRobot Check - " . date('Y-m-d H:i:s') . "\n";

try {
    // Vérifier le répertoire de travail
    // Répertoire actuel: masqué en production

    // Vérifier que les fichiers existent avec chemin complet
    $dbFile = __DIR__ . '/db.php';
    $stockFile = __DIR__ . '/stock_notifications.php';

    
    if (file_exists($dbFile)) {
        echo "db.php: TROUVÉ\n";
    } else {
        echo "db.php: MANQUANT\n";
    }

    
    if (file_exists($stockFile)) {
        echo "stock_notifications.php: TROUVÉ\n";
    } else {
        echo "stock_notifications.php: MANQUANT\n";
        // Lister les fichiers présents
        throw new Exception('stock_notifications.php introuvable');
    }

    echo "Tous les fichiers OK\n";

    // Capturer la sortie du script
    ob_start();
    include __DIR__ . '/stock_notifications.php';
    $output = ob_get_clean();

    echo "Script exécuté\n";
    echo "Résultat: " . $output . "\n";

    // Indiquer succès pour UptimeRobot
    echo "STATUS: success\n";

} catch (Exception $e) {
    echo "ERREUR: " . $e->getMessage() . "\n";
    echo "STATUS: error\n";
    http_response_code(500);
}

echo "Fin du check - " . date('Y-m-d H:i:s') . "\n";
?>