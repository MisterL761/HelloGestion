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
require_once __DIR__ . '/log_helper.php';

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
    // Inclure le fichier de connexion à la base de données
    require_once 'db.php';
    require_once __DIR__ . '/roles.php';
    require_once __DIR__ . '/push_helper.php';

    // Vérifier que $pdo existe
    if (!isset($pdo) || !($pdo instanceof PDO)) {
        throw new Exception("Connexion à la base de données non disponible");
    }

    // Configuration de PDO pour une gestion appropriée des erreurs
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Traiter selon la méthode HTTP
    switch ($_SERVER['REQUEST_METHOD']) {
        case 'GET':
            // Récupérer toutes les commandes avec les détails de l'inventaire
            $stmt = $pdo->query("SELECT 
                                    o.id, 
                                    o.inventory_id, 
                                    o.ordered_quantity, 
                                    o.ordered_date, 
                                    o.is_ordered,
                                    i.material,
                                    i.supplier,
                                    i.category,
                                    i.stock,
                                    i.threshold,
                                    CASE 
                                        WHEN i.stock = 0 THEN 'Rupture'
                                        WHEN i.stock < i.threshold THEN 'Faible Stock'
                                        ELSE 'Disponible'
                                    END AS status
                                FROM orders o 
                                JOIN inventory i ON o.inventory_id = i.id 
                                WHERE o.is_ordered = 1
                                ORDER BY o.ordered_date DESC");

            // Récupérer les données en mode tableau associatif
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Nettoyer tout output accidentel
            ob_end_clean();

            // Définir les en-têtes appropriés
            header('Content-Type: application/json; charset=utf-8');

            // Encoder correctement les données avec gestion des caractères spéciaux
            echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP);
            break;

        case 'POST':
            // Récupérer et décoder les données JSON
            $input = file_get_contents('php://input');
            $data = json_decode($input, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new Exception("Erreur de décodage JSON: " . json_last_error_msg());
            }

            file_put_contents("$logDir/orders_post.log", date('Y-m-d H:i:s') . " - Données: " . print_r($data, true) . "\n", FILE_APPEND);

            if (!isset($data['inventory_id']) || !isset($data['ordered_quantity'])) {
                throw new Exception("Données manquantes: inventory_id et ordered_quantity requis");
            }

            // Vérifier si une commande existe déjà pour cet article
            $checkStmt = $pdo->prepare("SELECT id FROM orders WHERE inventory_id = ?");
            $checkStmt->execute([$data['inventory_id']]);
            $existingOrder = $checkStmt->fetch();

            if ($existingOrder) {
                // Mettre à jour la commande existante
                $stmt = $pdo->prepare("UPDATE orders SET 
                                      ordered_quantity = ?, 
                                      ordered_date = NOW(), 
                                      is_ordered = 1 
                                      WHERE inventory_id = ?");
                $result = $stmt->execute([
                    $data['ordered_quantity'],
                    $data['inventory_id']
                ]);

                if ($result) {
                    $responseData = ['success' => true, 'id' => $existingOrder['id'], 'action' => 'updated'];
                } else {
                    throw new Exception("Échec de la mise à jour de la commande");
                }
            } else {
                // Insérer une nouvelle commande
                $stmt = $pdo->prepare("INSERT INTO orders (inventory_id, ordered_quantity, ordered_date, is_ordered) VALUES (?, ?, NOW(), 1)");
                $result = $stmt->execute([
                    $data['inventory_id'],
                    $data['ordered_quantity']
                ]);

                if ($result) {
                    $insertId = $pdo->lastInsertId();
                    // Récupérer le nom de l'article pour le log
                    $matStmt = $pdo->prepare("SELECT material FROM inventory WHERE id = ?");
                    $matStmt->execute([$data['inventory_id']]);
                    $matRow = $matStmt->fetch(PDO::FETCH_ASSOC);
                    $matName = $matRow['material'] ?? "article #{$data['inventory_id']}";
                    appLog('commandes', who() . " a commandé {$data['ordered_quantity']}x « $matName »");
                    $responseData = ['success' => true, 'id' => $insertId, 'action' => 'created'];
                } else {
                    throw new Exception("Échec de l'insertion de la commande");
                }
            }

            // Nettoyer tout output accidentel
            ob_end_clean();

            // Définir les en-têtes appropriés
            header('Content-Type: application/json; charset=utf-8');

            // Encoder correctement les données de réponse
            echo json_encode($responseData, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP);
            break;

        case 'PUT':
            // Récupérer et décoder les données JSON
            $input = file_get_contents('php://input');
            $data = json_decode($input, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new Exception("Erreur de décodage JSON: " . json_last_error_msg());
            }

            file_put_contents("$logDir/orders_put.log", date('Y-m-d H:i:s') . " - Données: " . print_r($data, true) . "\n", FILE_APPEND);

            if (!isset($data['inventory_id'])) {
                throw new Exception("ID de l'article manquant (inventory_id requis)");
            }

            // Mettre à jour le statut de commande
            $isOrdered = isset($data['is_ordered']) ? $data['is_ordered'] : 1;
            $orderedQuantity = isset($data['ordered_quantity']) ? $data['ordered_quantity'] : null;

            if ($isOrdered) {
                // Vérifier si une commande existe déjà
                $checkStmt = $pdo->prepare("SELECT id FROM orders WHERE inventory_id = ?");
                $checkStmt->execute([$data['inventory_id']]);
                $existingOrder = $checkStmt->fetch();

                if ($existingOrder) {
                    // Mettre à jour la commande existante
                    $fields = ["is_ordered = ?", "ordered_date = NOW()"];
                    $params = [1];

                    if ($orderedQuantity !== null) {
                        $fields[] = "ordered_quantity = ?";
                        $params[] = $orderedQuantity;
                    }

                    $params[] = $data['inventory_id'];

                    $sql = "UPDATE orders SET " . implode(", ", $fields) . " WHERE inventory_id = ?";
                    $stmt = $pdo->prepare($sql);
                    $result = $stmt->execute($params);

                    if ($result) {
                        $responseData = ['success' => true, 'action' => 'updated'];
                    } else {
                        throw new Exception("Échec de la mise à jour de la commande");
                    }
                } else {
                    // Créer une nouvelle commande
                    $quantity = $orderedQuantity ?: 0;
                    $stmt = $pdo->prepare("INSERT INTO orders (inventory_id, ordered_quantity, ordered_date, is_ordered) VALUES (?, ?, NOW(), 1)");
                    $result = $stmt->execute([$data['inventory_id'], $quantity]);

                    if ($result) {
                        // Notifier les managers qu'un article a été commandé
                        $matStmt2 = $pdo->prepare("SELECT material FROM inventory WHERE id = ?");
                        $matStmt2->execute([$data['inventory_id']]);
                        $matName2 = $matStmt2->fetchColumn() ?: "article #{$data['inventory_id']}";
                        $orderer = $_SESSION['user']['name'] ?? 'Un employé';
                        $mgrIds2 = $pdo->query("SELECT id FROM users WHERE role IN ('admin','gerant','administration') AND status='active'")->fetchAll(PDO::FETCH_COLUMN);
                        notifyAll($pdo, '🛒 Article commandé', "$orderer a passé commande de {$quantity}x « $matName2 »", ['url' => '/hello-gestion/'], $mgrIds2);
                        $responseData = ['success' => true, 'action' => 'created'];
                    } else {
                        throw new Exception("Échec de l'insertion de la commande");
                    }
                }
            } else {
                // Supprimer ou marquer comme non commandé
                $stmt = $pdo->prepare("UPDATE orders SET is_ordered = 0 WHERE inventory_id = ?");
                $result = $stmt->execute([$data['inventory_id']]);

                if ($result) {
                    $responseData = ['success' => true, 'action' => 'unchecked'];
                } else {
                    throw new Exception("Échec de la mise à jour du statut");
                }
            }

            // Nettoyer tout output accidentel
            ob_end_clean();

            // Définir les en-têtes appropriés
            header('Content-Type: application/json; charset=utf-8');

            // Encoder correctement les données de réponse
            echo json_encode($responseData, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP);
            break;

        case 'DELETE':
            // Récupérer l'ID de la commande
            $inventoryId = isset($_GET['inventory_id']) ? intval($_GET['inventory_id']) : null;
            file_put_contents("$logDir/orders_delete.log", date('Y-m-d H:i:s') . " - Suppression demandée pour inventory_id: $inventoryId\n", FILE_APPEND);

            if (!$inventoryId) {
                throw new Exception("ID manquant (inventory_id requis)");
            }

            // Supprimer la commande
            $stmt = $pdo->prepare("DELETE FROM orders WHERE inventory_id = ?");
            $result = $stmt->execute([$inventoryId]);

            if ($result) {
                file_put_contents("$logDir/orders_delete.log", date('Y-m-d H:i:s') . " - Commande supprimée, inventory_id: $inventoryId\n", FILE_APPEND);
                $responseData = ['success' => true];
            } else {
                throw new Exception("Échec de la suppression de la commande");
            }

            // Nettoyer tout output accidentel
            ob_end_clean();

            // Définir les en-têtes appropriés
            header('Content-Type: application/json; charset=utf-8');

            // Encoder correctement les données de réponse
            echo json_encode($responseData, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP);
            break;

        default:
            throw new Exception("Méthode HTTP non autorisée: " . $_SERVER['REQUEST_METHOD']);
            break;
    }

} catch (Exception $e) {
    // Journaliser l'erreur
    file_put_contents("$logDir/orders_error.log", date('Y-m-d H:i:s') . " - Erreur: " . $e->getMessage() . "\n", FILE_APPEND);

    // Nettoyer tout output accidentel en cas d'erreur
    ob_end_clean();

    // Définir le code d'état HTTP approprié
    http_response_code(500);

    // Définir les en-têtes appropriés
    header('Content-Type: application/json; charset=utf-8');

    // Retourner une réponse d'erreur formatée
    error_log(date('Y-m-d H:i:s') . ' - orders.php error: ' . $e->getMessage());
    echo json_encode([
        'error' => true,
        'message' => 'Une erreur est survenue'
    ], JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP);
}

exit;
?>