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

$logDir = __DIR__ . '/logs';
if (!file_exists($logDir)) mkdir($logDir, 0755, true);

$uploadDir = __DIR__ . '/uploads/inventory';
if (!file_exists($uploadDir)) mkdir($uploadDir, 0755, true);

require_once __DIR__ . '/security.php';
require_once __DIR__ . '/log_helper.php';
setSecurityHeaders();
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

ob_start();

function handleFileUpload($fileInput) {
    global $uploadDir, $logDir;

    if (!isset($fileInput) || $fileInput['error'] !== UPLOAD_ERR_OK) return null;

    // Validation extension + MIME réel via finfo (sécurisé)
    require_once __DIR__ . '/security.php';
    validateUploadedFile($fileInput);

    $extension = strtolower(pathinfo($fileInput['name'], PATHINFO_EXTENSION));
    $fileName  = uniqid('inv_') . '.' . $extension;
    $filePath  = $uploadDir . '/' . $fileName;

    if (move_uploaded_file($fileInput['tmp_name'], $filePath)) {
        file_put_contents("$logDir/inventory.log", date('Y-m-d H:i:s') . " - Fichier uploadé: $fileName\n", FILE_APPEND);
        // Déterminer le type via finfo plutôt que le type déclaré par le client
        $finfo    = function_exists('finfo_open') ? finfo_open(FILEINFO_MIME_TYPE) : null;
        $realMime = $finfo ? finfo_file($finfo, $filePath) : $fileInput['type'];
        if ($finfo) finfo_close($finfo);
        return [
            'file_path' => '/hello-gestion/php/uploads/inventory/' . $fileName,
            'file_name' => $fileInput['name'],
            'file_type' => (strpos($realMime, 'image') !== false) ? 'image' : 'pdf'
        ];
    }

    throw new Exception("Erreur lors de l'upload du fichier");
}

function deleteFile($filePath) {
    global $logDir;
    if (!$filePath) return false;

    // Normaliser le chemin absolu en chemin relatif "uploads/..."
    $relative = $filePath;
    if (str_starts_with($relative, '/hello-gestion/php/')) {
        $relative = substr($relative, strlen('/hello-gestion/php/'));
    } elseif (str_starts_with($relative, '/hello-')) {
        $relative = preg_replace('#^/hello-[^/]+/php/#', '', $relative);
    }
    $relative = ltrim($relative, '/');

    // Valider que le chemin est dans le dossier uploads (anti path-traversal)
    require_once __DIR__ . '/security.php';
    $safePath = validateUploadPath($relative, __DIR__);
    if (!$safePath) {
        error_log("deleteFile: chemin rejeté (path traversal?) : $filePath");
        return false;
    }

    if (file_exists($safePath)) {
        if (unlink($safePath)) {
            file_put_contents("$logDir/inventory.log", date('Y-m-d H:i:s') . " - Fichier supprimé: $filePath\n", FILE_APPEND);
            return true;
        }
    }
    return false;
}

try {
    require 'db.php';
    require_once __DIR__ . '/push_helper.php';
    require_once __DIR__ . '/roles.php';
    header('Content-Type: application/json; charset=utf-8');

    // Auto-créer la colonne rupture_date si elle n'existe pas encore
    try {
        $pdo->exec("ALTER TABLE inventory ADD COLUMN rupture_date DATETIME NULL DEFAULT NULL");
    } catch (\Exception $e) { /* colonne déjà existante, on ignore */ }

    switch ($_SERVER['REQUEST_METHOD']) {

        case 'GET':
            $stmt = $pdo->query("SELECT i.id, i.material, i.supplier, i.category, i.stock, i.threshold, i.price,
                                i.conditionnement, i.file_path, i.file_name, i.file_type, i.rupture_date,
                                CASE
                                    WHEN i.stock = 0 THEN 'Rupture'
                                    WHEN i.stock < i.threshold THEN 'Faible Stock'
                                    ELSE 'Disponible'
                                END AS status,
                                COALESCE(o.is_ordered, 0) as is_ordered,
                                o.ordered_quantity,
                                o.ordered_date
                                FROM inventory i
                                LEFT JOIN orders o ON i.id = o.inventory_id AND o.is_ordered = 1
                                ORDER BY i.material ASC");
            $result = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Remplir rupture_date pour les articles déjà en rupture sans date enregistrée
            foreach ($result as &$item) {
                if ((int)$item['stock'] === 0 && empty($item['rupture_date'])) {
                    $now = date('Y-m-d H:i:s');
                    $pdo->prepare("UPDATE inventory SET rupture_date = ? WHERE id = ? AND stock = 0 AND rupture_date IS NULL")
                        ->execute([$now, $item['id']]);
                    $item['rupture_date'] = $now;
                }
            }
            unset($item);

            // Normaliser les chemins file_path mal formatés vers /hello-gestion/php/uploads/...
            foreach ($result as &$item) {
                if (empty($item['file_path'])) continue;
                $fp = $item['file_path'];
                // Ancien format sans slash : 'stock/php/uploads/...' → '/hello-gestion/php/uploads/...'
                if (!str_starts_with($fp, '/') && !str_starts_with($fp, 'http')) {
                    $fp = '/hello-gestion/' . ltrim(preg_replace('#^(?:hello-stock/php/|stock/)#', '', $fp), '/');
                }
                // Mauvais préfixe /hello-stock/ → /hello-gestion/
                if (str_starts_with($fp, '/hello-stock/')) {
                    $fp = str_replace('/hello-stock/', '/hello-gestion/', $fp);
                }
                // Double chemin corrompu : /hello-gestion/php/hello-stock/php/ → /hello-gestion/php/
                $fp = preg_replace('#(/hello-gestion/php/)hello-stock/php/#', '$1', $fp);
                $item['file_path'] = $fp;
            }
            unset($item);

            ob_end_clean();
            echo json_encode($result);
            break;

        case 'POST':
            $action = $_POST['action'] ?? 'insert';

            // ✅ FIX DOUBLON : si action=update, on met à jour au lieu d'insérer
            if ($action === 'update') {
                $id = $_POST['id'] ?? null;
                if (!$id) throw new Exception("ID de l'article manquant");

                file_put_contents("$logDir/inventory_post.log", date('Y-m-d H:i:s') . " - POST UPDATE ID: $id\n", FILE_APPEND);

                // Récupérer le fichier actuel
                $stmt = $pdo->prepare("SELECT file_path FROM inventory WHERE id = ?");
                $stmt->execute([$id]);
                $currentArticle = $stmt->fetch(PDO::FETCH_ASSOC);

                $fields = [];
                $params = [];

                // Récupérer le stock actuel pour gérer rupture_date
                $prevStmt2 = $pdo->prepare("SELECT stock, rupture_date FROM inventory WHERE id = ?");
                $prevStmt2->execute([$id]);
                $prevRow2 = $prevStmt2->fetch(PDO::FETCH_ASSOC);
                $prevStock2 = $prevRow2 ? (int)$prevRow2['stock'] : null;

                if (isset($_POST['material']))          { $fields[] = "material = ?";          $params[] = $_POST['material']; }
                if (isset($_POST['supplier']))          { $fields[] = "supplier = ?";          $params[] = $_POST['supplier']; }
                if (isset($_POST['category']))          { $fields[] = "category = ?";          $params[] = $_POST['category']; }
                if (isset($_POST['stock']))             { $fields[] = "stock = ?";             $params[] = $_POST['stock']; }
                if (isset($_POST['threshold']))         { $fields[] = "threshold = ?";         $params[] = $_POST['threshold']; }
                if (isset($_POST['price']))             { $fields[] = "price = ?";             $params[] = $_POST['price']; }
                if (isset($_POST['conditionnement']))   { $fields[] = "conditionnement = ?";   $params[] = $_POST['conditionnement']; }

                // Gérer rupture_date automatiquement (POST update)
                if (isset($_POST['stock']) && $prevStock2 !== null) {
                    $newStock2 = (int)$_POST['stock'];
                    if ($newStock2 === 0 && $prevStock2 > 0) {
                        $fields[] = "rupture_date = ?"; $params[] = date('Y-m-d H:i:s');
                    } elseif ($newStock2 > 0 && $prevStock2 === 0) {
                        $fields[] = "rupture_date = NULL";
                    }
                }

                if (isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK) {
                    if ($currentArticle && $currentArticle['file_path']) {
                        deleteFile($currentArticle['file_path']);
                    }
                    $fileData = handleFileUpload($_FILES['file']);
                    $fields[] = "file_path = ?"; $params[] = $fileData['file_path'];
                    $fields[] = "file_name = ?"; $params[] = $fileData['file_name'];
                    $fields[] = "file_type = ?"; $params[] = $fileData['file_type'];
                } elseif (isset($_POST['remove_file']) && $_POST['remove_file'] == '1') {
                    if ($currentArticle && $currentArticle['file_path']) {
                        deleteFile($currentArticle['file_path']);
                    }
                    $fields[] = "file_path = NULL";
                    $fields[] = "file_name = NULL";
                    $fields[] = "file_type = NULL";
                }

                if (empty($fields)) throw new Exception("Aucune donnée à mettre à jour");

                $params[] = $id;
                $sql = "UPDATE inventory SET " . implode(", ", $fields) . " WHERE id = ?";
                $stmt = $pdo->prepare($sql);
                $result = $stmt->execute($params);

                if ($result) {
                    // Supprimer la commande si stock suffisant
                    if (isset($_POST['stock']) && isset($_POST['threshold'])) {
                        if ($_POST['stock'] >= $_POST['threshold']) {
                            $pdo->prepare("DELETE FROM orders WHERE inventory_id = ?")->execute([$id]);
                        }
                    }
                    ob_end_clean();
                    echo json_encode(['success' => true]);
                } else {
                    throw new Exception("Échec de la mise à jour");
                }
                break;
            }

            // Action par défaut : INSERT
            $material        = $_POST['material']        ?? null;
            $supplier        = $_POST['supplier']        ?? null;
            $category        = $_POST['category']        ?? null;
            $stock           = $_POST['stock']           ?? null;
            $threshold       = $_POST['threshold']       ?? null;
            $price           = $_POST['price']           ?? null;
            $conditionnement = $_POST['conditionnement'] ?? 'unite';

            file_put_contents("$logDir/inventory_post.log", date('Y-m-d H:i:s') . " - POST INSERT reçu\n", FILE_APPEND);

            if (!$material || !$supplier || !$category || $stock === null || $threshold === null) {
                throw new Exception("Données manquantes");
            }

            $stock     = (int)$stock;
            $threshold = (int)$threshold;
            $price     = ($price !== null && $price !== '') ? (float)$price : null;
            if ($stock < 0) $stock = 0;
            if ($threshold < 0) $threshold = 0;
            if ($price !== null && ($price < 0 || $price > 999999)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Prix invalide.']);
                exit();
            }

            $fileData = null;
            if (isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK) {
                $fileData = handleFileUpload($_FILES['file']);
            }

            $sql = "INSERT INTO inventory (material, supplier, category, stock, threshold, price, conditionnement, file_path, file_name, file_type)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            $stmt = $pdo->prepare($sql);
            $result = $stmt->execute([
                $material, $supplier, $category, $stock, $threshold,
                $price ?: null,
                $conditionnement,
                $fileData ? $fileData['file_path'] : null,
                $fileData ? $fileData['file_name'] : null,
                $fileData ? $fileData['file_type'] : null
            ]);

            if ($result) {
                $insertId = $pdo->lastInsertId();
                appLog('inventaire', who() . " a créé l'article « $material » (stock: $stock, fournisseur: $supplier, id: $insertId)");
                ob_end_clean();
                echo json_encode(['success' => true, 'id' => $insertId]);
            } else {
                error_log("Échec insertion: " . implode(", ", $stmt->errorInfo()));
                throw new Exception("Échec de l'insertion");
            }
            break;

        case 'PUT':
            $contentType = $_SERVER['CONTENT_TYPE'] ?? '';

            if (strpos($contentType, 'multipart/form-data') !== false) {
                $id = $_POST['id'] ?? null;
                if (!$id) throw new Exception("ID de l'article manquant");

                $stmt = $pdo->prepare("SELECT file_path, price, stock FROM inventory WHERE id = ?");
                $stmt->execute([$id]);
                $currentArticle = $stmt->fetch(PDO::FETCH_ASSOC);
                $prevPriceMultipart = $currentArticle['price'] ?? null;
                $prevStockMultipart = $currentArticle ? (int)$currentArticle['stock'] : null;

                $fields = [];
                $params = [];

                if (isset($_POST['material']))          { $fields[] = "material = ?";          $params[] = $_POST['material']; }
                if (isset($_POST['supplier']))          { $fields[] = "supplier = ?";          $params[] = $_POST['supplier']; }
                if (isset($_POST['category']))          { $fields[] = "category = ?";          $params[] = $_POST['category']; }
                if (isset($_POST['stock']))             { $fields[] = "stock = ?";             $params[] = $_POST['stock']; }
                if (isset($_POST['threshold']))         { $fields[] = "threshold = ?";         $params[] = $_POST['threshold']; }
                if (isset($_POST['price']))             { $fields[] = "price = ?";             $params[] = $_POST['price']; }
                if (isset($_POST['conditionnement']))   { $fields[] = "conditionnement = ?";   $params[] = $_POST['conditionnement']; }

                // Gérer rupture_date automatiquement (PUT multipart)
                if (isset($_POST['stock']) && $prevStockMultipart !== null) {
                    $newStockMultipart = (int)$_POST['stock'];
                    if ($newStockMultipart === 0 && $prevStockMultipart > 0) {
                        $fields[] = "rupture_date = ?"; $params[] = date('Y-m-d H:i:s');
                    } elseif ($newStockMultipart > 0 && $prevStockMultipart === 0) {
                        $fields[] = "rupture_date = NULL";
                    }
                }

                if (isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK) {
                    if ($currentArticle && $currentArticle['file_path']) deleteFile($currentArticle['file_path']);
                    $fileData = handleFileUpload($_FILES['file']);
                    $fields[] = "file_path = ?"; $params[] = $fileData['file_path'];
                    $fields[] = "file_name = ?"; $params[] = $fileData['file_name'];
                    $fields[] = "file_type = ?"; $params[] = $fileData['file_type'];
                } elseif (isset($_POST['remove_file']) && $_POST['remove_file'] == '1') {
                    if ($currentArticle && $currentArticle['file_path']) deleteFile($currentArticle['file_path']);
                    $fields[] = "file_path = NULL";
                    $fields[] = "file_name = NULL";
                    $fields[] = "file_type = NULL";
                }

                if (empty($fields)) throw new Exception("Aucune donnée à mettre à jour");

                $params[] = $id;
                $sql = "UPDATE inventory SET " . implode(", ", $fields) . " WHERE id = ?";
                $stmt = $pdo->prepare($sql);
                $result = $stmt->execute($params);

                // Enregistrer l'historique des prix si le prix a changé (branche multipart)
                if ($result && isset($_POST['price']) && $prevPriceMultipart !== null) {
                    $newPriceMultipart = (float)$_POST['price'];
                    $oldPriceMultipart = (float)$prevPriceMultipart;
                    if (abs($newPriceMultipart - $oldPriceMultipart) > 0.001) {
                        $userIdMultipart = $_SESSION['user']['id'] ?? null;
                        $pdo->exec("CREATE TABLE IF NOT EXISTS price_history (
                            id INT AUTO_INCREMENT PRIMARY KEY,
                            inventory_id INT NOT NULL,
                            user_id INT,
                            old_price DECIMAL(10,2),
                            new_price DECIMAL(10,2),
                            changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                        )");
                        $phm = $pdo->prepare("INSERT INTO price_history (inventory_id, user_id, old_price, new_price, changed_at) VALUES (?, ?, ?, ?, NOW())");
                        $phm->execute([$id, $userIdMultipart, $oldPriceMultipart, $newPriceMultipart]);
                    }
                }

            } else {
                $input = file_get_contents('php://input');
                $data = json_decode($input, true);

                if (!isset($data['id'])) throw new Exception("ID de l'article manquant");

                // Lire le stock actuel avant modification (pour tracking consommation)
                $prevStmt = $pdo->prepare("SELECT stock, price FROM inventory WHERE id = ?");
                $prevStmt->execute([$data['id']]);
                $prevRow = $prevStmt->fetch(PDO::FETCH_ASSOC);
                $prevStock = $prevRow ? (int)$prevRow['stock'] : null;
                $prevPrice = $prevRow['price'] ?? null;

                $fields = [];
                $params = [];

                $putStock     = isset($data['stock'])     ? (int)$data['stock']           : null;
                $putThreshold = isset($data['threshold']) ? (int)$data['threshold']       : null;
                $putPrice     = isset($data['price'])     ? (($data['price'] !== null && $data['price'] !== '') ? (float)$data['price'] : null) : null;
                if ($putStock !== null && $putStock < 0) $putStock = 0;
                if ($putThreshold !== null && $putThreshold < 0) $putThreshold = 0;

                // Gérer rupture_date automatiquement
                if ($putStock !== null && $prevStock !== null) {
                    if ($putStock === 0 && $prevStock > 0) {
                        // Passage en rupture : enregistrer la date
                        $fields[] = "rupture_date = ?";
                        $params[] = date('Y-m-d H:i:s');
                    } elseif ($putStock > 0 && $prevStock === 0) {
                        // Retour en stock : effacer la date de rupture
                        $fields[] = "rupture_date = NULL";
                    }
                }
                if ($putPrice !== null && ($putPrice < 0 || $putPrice > 999999)) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'message' => 'Prix invalide.']);
                    exit();
                }

                if (isset($data['material']))          { $fields[] = "material = ?";          $params[] = $data['material']; }
                if (isset($data['supplier']))          { $fields[] = "supplier = ?";          $params[] = $data['supplier']; }
                if (isset($data['category']))          { $fields[] = "category = ?";          $params[] = $data['category']; }
                if ($putStock !== null)                { $fields[] = "stock = ?";             $params[] = $putStock; }
                if ($putThreshold !== null)            { $fields[] = "threshold = ?";         $params[] = $putThreshold; }
                if (array_key_exists('price', $data)) { $fields[] = "price = ?";             $params[] = $putPrice; }
                if (isset($data['conditionnement']))   { $fields[] = "conditionnement = ?";   $params[] = $data['conditionnement']; }

                if (empty($fields)) throw new Exception("Aucune donnée à mettre à jour");

                $params[] = $data['id'];
                $sql = "UPDATE inventory SET " . implode(", ", $fields) . " WHERE id = ?";
                $stmt = $pdo->prepare($sql);
                $result = $stmt->execute($params);

                // Enregistrer le mouvement de stock si décrémentation
                if ($result && isset($data['stock']) && $prevStock !== null) {
                    $newStock = (int)$data['stock'];
                    $delta = $newStock - $prevStock;
                    if ($delta !== 0) {
                        $userId = $_SESSION['user']['id'] ?? null;
                        $pdo->exec("CREATE TABLE IF NOT EXISTS stock_movements (
                            id INT AUTO_INCREMENT PRIMARY KEY,
                            inventory_id INT NOT NULL,
                            user_id INT,
                            delta INT NOT NULL,
                            moved_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                        )");
                        $mv = $pdo->prepare("INSERT INTO stock_movements (inventory_id, user_id, delta, moved_at) VALUES (?, ?, ?, NOW())");
                        $mv->execute([$data['id'], $userId, $delta]);
                    }
                }

                // Enregistrer l'historique des prix si le prix a changé
                if ($result && isset($data['price']) && $prevPrice !== null) {
                    $newPrice = (float)$data['price'];
                    $oldPrice = (float)$prevPrice;
                    if (abs($newPrice - $oldPrice) > 0.001) {
                        $userId = $_SESSION['user']['id'] ?? null;
                        $pdo->exec("CREATE TABLE IF NOT EXISTS price_history (
                            id INT AUTO_INCREMENT PRIMARY KEY,
                            inventory_id INT NOT NULL,
                            user_id INT,
                            old_price DECIMAL(10,2),
                            new_price DECIMAL(10,2),
                            changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                        )");
                        $ph = $pdo->prepare("INSERT INTO price_history (inventory_id, user_id, old_price, new_price, changed_at) VALUES (?, ?, ?, ?, NOW())");
                        $ph->execute([$data['id'], $userId, $oldPrice, $newPrice]);
                    }
                }
            }

            if ($result) {
                if (isset($_POST['stock']) && isset($_POST['threshold'])) {
                    if ($_POST['stock'] >= $_POST['threshold']) {
                        $pdo->prepare("DELETE FROM orders WHERE inventory_id = ?")->execute([$id]);
                    }
                } elseif (isset($data['stock']) && isset($data['threshold'])) {
                    if ($data['stock'] >= $data['threshold']) {
                        $pdo->prepare("DELETE FROM orders WHERE inventory_id = ?")->execute([$data['id']]);
                    }
                }
                if (isset($data) && isset($data['id']) && isset($data['stock']) && $prevStock !== null) {
                    $matStmt = $pdo->prepare("SELECT material FROM inventory WHERE id = ?");
                    $matStmt->execute([$data['id']]);
                    $matRow = $matStmt->fetch(PDO::FETCH_ASSOC);
                    $matName = $matRow['material'] ?? "article #{$data['id']}";
                    $newStock = (int)$data['stock'];
                    $delta = $newStock - (int)$prevStock;
                    if ($delta < 0) {
                        appLog('inventaire', who() . " a retiré " . abs($delta) . "x « $matName » du stock ($prevStock → $newStock)");
                    } elseif ($delta > 0) {
                        appLog('inventaire', who() . " a ajouté " . $delta . "x « $matName » au stock ($prevStock → $newStock)");
                    }
                    // Trigger push notification if rupture
                    if ($newStock === 0) {
                        notifyAll($pdo, '⚠️ Rupture de stock', $matName . ' est en rupture de stock', [
                            'tag' => 'stock-rupture-' . $data['id'],
                            'url' => '/hello-gestion/?tab=inventory'
                        ]);
                    }
                }
                ob_end_clean();
                echo json_encode(['success' => true]);
            } else {
                throw new Exception("Échec de la mise à jour");
            }
            break;

        case 'DELETE':
            $id = isset($_GET['id']) ? intval($_GET['id']) : null;
            if (!$id) throw new Exception("ID manquant");

            $stmt = $pdo->prepare("SELECT file_path, material FROM inventory WHERE id = ?");
            $stmt->execute([$id]);
            $article = $stmt->fetch(PDO::FETCH_ASSOC);

            $pdo->prepare("DELETE FROM orders WHERE inventory_id = ?")->execute([$id]);

            $stmt = $pdo->prepare("DELETE FROM inventory WHERE id = ?");
            $result = $stmt->execute([$id]);

            if ($result) {
                if ($article && $article['file_path']) deleteFile($article['file_path']);
                appLog('inventaire', who() . " a supprimé l'article « " . ($article['material'] ?? "id $id") . " »");
                ob_end_clean();
                echo json_encode(['success' => true]);
            } else {
                error_log("Échec suppression: " . implode(", ", $stmt->errorInfo()));
            throw new Exception("Échec de la suppression");
            }
            break;

        default:
            http_response_code(405);
            ob_end_clean();
            echo json_encode(['error' => true, 'message' => 'Méthode non autorisée']);
            break;
    }

} catch (Exception $e) {
    file_put_contents("$logDir/inventory_error.log", date('Y-m-d H:i:s') . " - Erreur: " . $e->getMessage() . "\n", FILE_APPEND);
    http_response_code(500);
    ob_end_clean();
    error_log(date('Y-m-d H:i:s') . ' - Inventory error: ' . $e->getMessage());
    echo json_encode(['error' => true, 'message' => 'Une erreur est survenue']);
}
?>