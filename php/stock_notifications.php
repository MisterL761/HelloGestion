<?php
/**
 * Système de notifications email professionnel pour la gestion des stocks
 * Version optimisée anti-spam
 */

// Configuration centralisée (email + BDD)
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

class StockNotifier {
    private $pdo;
    private $logDir;

    public function __construct() {
        global $pdo;
        $this->pdo = $pdo;

        // Configuration des logs
        $this->logDir = __DIR__ . '/logs';
        if (!file_exists($this->logDir)) {
            mkdir($this->logDir, 0755, true);
        }
    }

    /**
     * Vérifie les niveaux de stock et envoie les notifications
     */
    public function checkStockLevels() {
        try {
            $this->log("Début de la vérification des stocks");

            // Récupérer les articles en faible stock ou en rupture
            $sql = "SELECT id, material, supplier, category, stock, threshold, 
                           CASE 
                               WHEN stock = 0 THEN 'Rupture'
                               WHEN stock < threshold THEN 'Faible Stock'
                               ELSE 'Disponible'
                           END as status,
                           price
                    FROM inventory 
                    WHERE stock <= threshold 
                    ORDER BY status DESC, supplier, material";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute();
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

            if (!empty($items)) {
                $this->log("Articles trouvés avec stock faible: " . count($items));

                // Vérifier si une notification a déjà été envoyée récemment
                if (!$this->wasRecentlyNotified()) {
                    $this->sendStockAlert($items);
                    $this->logNotification($items);
                } else {
                    $this->log("Notification déjà envoyée récemment, pas d'envoi");
                }
            } else {
                $this->log("Aucun article en stock faible trouvé");
            }

            return [
                'success' => true,
                'items_count' => count($items),
                'message' => count($items) > 0 ?
                    "Trouvé " . count($items) . " article(s) nécessitant attention" :
                    "Tous les stocks sont normaux"
            ];

        } catch (Exception $e) {
            $this->log("Erreur lors de la vérification des stocks: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Envoie l'alerte par email avec style professionnel
     */
    private function sendStockAlert($items) {
        try {
            $this->log("Préparation de l'email de notification");

            // Grouper les articles par statut
            $rupture = array_filter($items, function($item) {
                return $item['status'] === 'Rupture';
            });

            $faibleStock = array_filter($items, function($item) {
                return $item['status'] === 'Faible Stock';
            });

            // Sujet professionnel sans émojis
            $subject = "Rapport stock Hello Fermetures - " . date('d/m/Y H\hi');
            if (count($rupture) > 0) {
                $subject .= " - Action requise";
            }

            $htmlContent = $this->generateProfessionalHTML($rupture, $faibleStock);
            $textContent = $this->generateProfessionalText($rupture, $faibleStock);

            // Envoyer l'email
            if ($this->sendEmail(TO_EMAIL, $subject, $htmlContent, $textContent)) {
                $this->log("Email envoyé avec succès à " . TO_EMAIL);
                return true;
            } else {
                $this->log("Échec de l'envoi de l'email");
                return false;
            }

        } catch (Exception $e) {
            $this->log("Erreur lors de l'envoi de l'email: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Génère un email HTML professionnel
     */
    private function generateProfessionalHTML($rupture, $faibleStock) {
        $html = '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Rapport Stock</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f8f9fa; color: #333; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 5px; overflow: hidden; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        .header { background: #2c3e50; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; }
        .section { margin: 25px 0; }
        .priority-high { background: #ffedef; border-left: 3px solid #e74c3c; padding: 15px; margin: 15px 0; }
        .priority-medium { background: #fff8e1; border-left: 3px solid #f39c12; padding: 15px; margin: 15px 0; }
        .item-list { margin: 15px 0; }
        .item { margin: 8px 0; padding: 12px; border: 1px solid #ecf0f1; border-radius: 3px; background: #fdfdfd; }
        .footer { background: #95a5a6; color: white; padding: 15px; text-align: center; font-size: 11px; }
        .status-critical { color: #c0392b; font-weight: 600; }
        .status-low { color: #d68910; font-weight: 600; }
        h3 { margin-top: 0; color: #2c3e50; }
        .summary { background: #ecf0f1; padding: 15px; border-radius: 3px; margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Rapport de Stock</h1>
            <p>Hello Fermetures - ' . date('d/m/Y à H:i') . '</p>
        </div>
        <div class="content">
            <div class="summary">
                <strong>Résumé :</strong> ' . count($rupture + $faibleStock) . ' article(s) nécessitent votre attention.
            </div>';

        if (!empty($rupture)) {
            $html .= '<div class="section">
                <div class="priority-high">
                    <h3>Articles en rupture de stock (' . count($rupture) . ')</h3>
                    <p>Ces articles nécessitent un réapprovisionnement immédiat.</p>
                </div>
                <div class="item-list">';

            foreach ($rupture as $item) {
                $html .= '<div class="item">
                    <strong>' . htmlspecialchars($item['material']) . '</strong><br>
                    Fournisseur: ' . htmlspecialchars($item['supplier']) . '<br>
                    Catégorie: ' . htmlspecialchars($item['category']) . '<br>
                    <span class="status-critical">Stock actuel: ' . $item['stock'] . '</span> | Seuil minimum: ' . $item['threshold'] . '
                </div>';
            }
            $html .= '</div></div>';
        }

        if (!empty($faibleStock)) {
            $html .= '<div class="section">
                <div class="priority-medium">
                    <h3>Articles en stock faible (' . count($faibleStock) . ')</h3>
                    <p>Réapprovisionnement recommandé sous 15 jours.</p>
                </div>
                <div class="item-list">';

            foreach ($faibleStock as $item) {
                $html .= '<div class="item">
                    <strong>' . htmlspecialchars($item['material']) . '</strong><br>
                    Fournisseur: ' . htmlspecialchars($item['supplier']) . '<br>
                    Catégorie: ' . htmlspecialchars($item['category']) . '<br>
                    <span class="status-low">Stock actuel: ' . $item['stock'] . '</span> | Seuil minimum: ' . $item['threshold'] . '
                </div>';
            }
            $html .= '</div></div>';
        }

        $html .= '</div>
        <div class="footer">
            <p>Rapport généré automatiquement par le système de gestion Hello Fermetures</p>
            <p>Ce message est envoyé à des fins professionnelles uniquement</p>
        </div>
    </div>
</body>
</html>';

        return $html;
    }

    /**
     * Génère le contenu texte professionnel
     */
    private function generateProfessionalText($rupture, $faibleStock) {
        $text = "RAPPORT DE STOCK - Hello Fermetures\n";
        $text .= "===================================\n";
        $text .= "Date: " . date('d/m/Y à H:i') . "\n\n";

        $text .= "RESUME: " . count($rupture + $faibleStock) . " article(s) nécessitent votre attention.\n\n";

        if (!empty($rupture)) {
            $text .= "ARTICLES EN RUPTURE DE STOCK (" . count($rupture) . ")\n";
            $text .= "Réapprovisionnement immédiat requis\n";
            $text .= "-----------------------------------\n\n";

            foreach ($rupture as $item) {
                $text .= "• " . $item['material'] . "\n";
                $text .= "  Fournisseur: " . $item['supplier'] . "\n";
                $text .= "  Catégorie: " . $item['category'] . "\n";
                $text .= "  Stock actuel: " . $item['stock'] . " | Seuil: " . $item['threshold'] . "\n\n";
            }
        }

        if (!empty($faibleStock)) {
            $text .= "ARTICLES EN STOCK FAIBLE (" . count($faibleStock) . ")\n";
            $text .= "Réapprovisionnement recommandé\n";
            $text .= "-------------------------------\n\n";

            foreach ($faibleStock as $item) {
                $text .= "• " . $item['material'] . "\n";
                $text .= "  Fournisseur: " . $item['supplier'] . "\n";
                $text .= "  Catégorie: " . $item['category'] . "\n";
                $text .= "  Stock actuel: " . $item['stock'] . " | Seuil: " . $item['threshold'] . "\n\n";
            }
        }

        $text .= "---\n";
        $text .= "Rapport généré automatiquement par Hello Fermetures\n";
        $text .= "Message professionnel - Ne pas répondre\n";

        return $text;
    }

    /**
     * Envoie l'email avec en-têtes professionnels
     */
    private function sendEmail($to, $subject, $htmlContent, $textContent) {
        try {
            // En-têtes email optimisés anti-spam
            $headers = [];
            $headers[] = 'MIME-Version: 1.0';
            $headers[] = 'Content-Type: text/html; charset=UTF-8';
            $headers[] = 'From: ' . FROM_NAME . ' <' . FROM_EMAIL . '>';
            $headers[] = 'X-Mailer: Hello Fermetures Stock Management v2.0';
            $headers[] = 'X-Priority: 3'; // Priorité normale (pas urgente)
            $headers[] = 'Organization: Hello Fermetures';
            $headers[] = 'List-Unsubscribe: <mailto:' . FROM_EMAIL . '?subject=unsubscribe>';

            // Sujet sans caractères spéciaux
            $cleanSubject = str_replace(['🚨', '⚠️', '🔴'], '', $subject);

            // Envoyer l'email
            return mail($to, $cleanSubject, $htmlContent, implode("\r\n", $headers));

        } catch (Exception $e) {
            $this->log("Erreur mail(): " . $e->getMessage());
            return false;
        }
    }

    /**
     * Vérifie si une notification a déjà été envoyée récemment
     */
    private function wasRecentlyNotified() {
        try {
            // Créer la table si elle n'existe pas
            $this->createNotificationTable();

            $stmt = $this->pdo->prepare("
                SELECT COUNT(*) as count 
                FROM stock_notifications 
                WHERE notification_date > DATE_SUB(NOW(), INTERVAL 72 HOUR)
            ");
            $stmt->execute();
            $result = $stmt->fetch();

            return $result['count'] > 0;

        } catch (Exception $e) {
            $this->log("Erreur lors de la vérification des notifications récentes: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Enregistre la notification dans la base de données
     */
    private function logNotification($items) {
        try {
            $stmt = $this->pdo->prepare("
                INSERT INTO stock_notifications (notification_date, items_count, items_data) 
                VALUES (NOW(), ?, ?)
            ");

            $stmt->execute([
                count($items),
                json_encode($items)
            ]);

            $this->log("Notification enregistrée en base de données");

        } catch (Exception $e) {
            $this->log("Erreur lors de l'enregistrement de la notification: " . $e->getMessage());
        }
    }

    /**
     * Crée la table de notifications si elle n'existe pas
     */
    public function createNotificationTable() {
        try {
            $sql = "
                CREATE TABLE IF NOT EXISTS stock_notifications (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    notification_date DATETIME NOT NULL,
                    items_count INT NOT NULL,
                    items_data TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            ";

            $this->pdo->exec($sql);
            $this->log("Table stock_notifications créée/vérifiée");

        } catch (Exception $e) {
            $this->log("Erreur lors de la création de la table: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Écrit dans le fichier de log
     */
    private function log($message) {
        $logFile = $this->logDir . '/stock_notifications.log';
        $timestamp = date('Y-m-d H:i:s');
        file_put_contents($logFile, "[$timestamp] $message\n", FILE_APPEND);
    }
}

// Utilisation du script
try {
    $notifier = new StockNotifier();

    // Créer la table si nécessaire
    $notifier->createNotificationTable();

    // Vérifier les stocks et envoyer les notifications
    $result = $notifier->checkStockLevels();

    echo json_encode($result);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>