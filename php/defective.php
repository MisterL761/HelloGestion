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
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

require_once __DIR__ . '/security.php';
require_once __DIR__ . '/log_helper.php';
require_once __DIR__ . '/push_helper.php';
setSecurityHeaders();
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

ob_start();

try {
    require 'db.php';
    require_once __DIR__ . '/roles.php';

    header('Content-Type: application/json; charset=utf-8');

    switch ($_SERVER['REQUEST_METHOD']) {
        case 'GET':
            $stmt = $pdo->query("SELECT id, product, supplier, client, description, photo_path, additional_photos, DATE_FORMAT(date, '%d/%m/%Y') as date, DATE_FORMAT(defective_date, '%d/%m/%Y') as defective_date FROM defective ORDER BY defective_date DESC");
            $result = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($result as &$item) {
                $photos_paths = [];

                if ($item['photo_path']) {
                    $photos_paths[] = $item['photo_path'];
                }

                if ($item['additional_photos']) {
                    $additionalPhotos = json_decode($item['additional_photos'], true);
                    if (is_array($additionalPhotos)) {
                        $photos_paths = array_merge($photos_paths, $additionalPhotos);
                    }
                }

                $item['photos_paths'] = $photos_paths;
                unset($item['additional_photos']);
            }

            ob_end_clean();
            echo json_encode($result);
            break;

        case 'POST':
            if (isset($_POST['action'])) {
                if ($_POST['action'] === 'add_defective') {

                    $product = $_POST['product'] ?? null;
                    $supplier = $_POST['supplier'] ?? null;
                    $client = $_POST['client'] ?? null;
                    $description = $_POST['description'] ?? null;
                    $date = $_POST['date'] ?? date('Y-m-d');

                    file_put_contents("$logDir/defective_post.log", date('Y-m-d H:i:s') . " - Ajout direct POST reçu\n", FILE_APPEND);
                    

                    if (!$product || !$supplier || !$client) {
                        throw new Exception("Données manquantes (produit, fournisseur, client requis)");
                    }

                    $photoPath = null;
                    $additionalPhotos = [];
                    $allPhotoPaths = [];

                    if (isset($_FILES['photo']) && $_FILES['photo']['error'] === UPLOAD_ERR_OK) {
                        $uploadDir = __DIR__ . '/uploads/';
                        if (!file_exists($uploadDir)) {
                            mkdir($uploadDir, 0755, true);
                        }

                        $fileExtension = pathinfo($_FILES['photo']['name'], PATHINFO_EXTENSION);
                        $fileName = uniqid() . '.' . $fileExtension;
                        $fullPath = $uploadDir . $fileName;

                        if (move_uploaded_file($_FILES['photo']['tmp_name'], $fullPath)) {
                            $photoPath = 'uploads/' . $fileName;
                            $allPhotoPaths[] = $photoPath;
                            file_put_contents("$logDir/defective_post.log", date('Y-m-d H:i:s') . " - Photo principale uploadée: $photoPath\n", FILE_APPEND);
                        } else {
                            file_put_contents("$logDir/defective_post.log", date('Y-m-d H:i:s') . " - Erreur upload photo principale\n", FILE_APPEND);
                        }
                    }

                    if (isset($_FILES['additional_photos']) && is_array($_FILES['additional_photos']['name'])) {
                        $uploadDir = __DIR__ . '/uploads/';
                        if (!file_exists($uploadDir)) {
                            mkdir($uploadDir, 0755, true);
                        }

                        $fileCount = count($_FILES['additional_photos']['name']);
                        for ($i = 0; $i < $fileCount; $i++) {
                            if ($_FILES['additional_photos']['error'][$i] === UPLOAD_ERR_OK) {
                                $fileExtension = pathinfo($_FILES['additional_photos']['name'][$i], PATHINFO_EXTENSION);
                                $allowedExts = ['jpg','jpeg','png','gif','webp'];
                                if (!in_array(strtolower($fileExtension), $allowedExts, true)) {
                                    continue; // skip invalid files silently
                                }
                                $finfo = finfo_open(FILEINFO_MIME_TYPE);
                                $mime = finfo_file($finfo, $_FILES['additional_photos']['tmp_name'][$i]);
                                finfo_close($finfo);
                                $allowedMimes = ['image/jpeg','image/png','image/gif','image/webp'];
                                if (!in_array($mime, $allowedMimes, true)) {
                                    continue;
                                }
                                $fileName = uniqid() . '.' . $fileExtension;
                                $fullPath = $uploadDir . $fileName;

                                if (move_uploaded_file($_FILES['additional_photos']['tmp_name'][$i], $fullPath)) {
                                    $additionalPhotoPath = 'uploads/' . $fileName;
                                    $additionalPhotos[] = $additionalPhotoPath;
                                    $allPhotoPaths[] = $additionalPhotoPath;
                                    file_put_contents("$logDir/defective_post.log", date('Y-m-d H:i:s') . " - Photo supplémentaire uploadée: $additionalPhotoPath\n", FILE_APPEND);
                                }
                            }
                        }
                    }

                    // Insérer directement dans la table defective
                    $stmt = $pdo->prepare("INSERT INTO defective (product, supplier, client, description, photo_path, additional_photos, date, defective_date) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())");
                    $result = $stmt->execute([
                            $product,
                            $supplier,
                            $client,
                            $description,
                            $photoPath,
                            json_encode($additionalPhotos),
                            $date
                    ]);

                    if ($result) {
                        $insertId = $pdo->lastInsertId();
                        appLog('actions', who() . " a signalé « $product » comme défectueux (client : $client, fournisseur : $supplier, id: $insertId)");
                        notifyAll($pdo, '⚠️ Produit défectueux signalé', "« $product » signalé défectueux — Client : $client, Fournisseur : $supplier", ['url' => '/hello-gestion/']);
                        ob_end_clean();
                        echo json_encode([
                                'success' => true,
                                'id' => $insertId,
                                'photo_path' => $photoPath,
                                'photos_paths' => $allPhotoPaths
                        ]);
                    } else {
                        throw new Exception("Échec de l'insertion: " . implode(", ", $stmt->errorInfo()));
                    }
                } elseif ($_POST['action'] === 'edit_defective') {
                    // ========== ÉDITION ==========
                    $id = isset($_POST['id']) ? intval($_POST['id']) : null;
                    $supplier = $_POST['supplier'] ?? null;
                    $client = $_POST['client'] ?? null;
                    $description = $_POST['description'] ?? '';
                    $date = $_POST['date'] ?? date('Y-m-d');

                    file_put_contents("$logDir/defective_edit.log", date('Y-m-d H:i:s') . " - Édition - ID reçu: " . var_export($id, true) . "\n", FILE_APPEND);
                    
                    

                    if (!$id) {
                        file_put_contents("$logDir/defective_edit.log", date('Y-m-d H:i:s') . " - ERREUR: ID manquant ou invalide\n", FILE_APPEND);
                        throw new Exception("ID du produit manquant ou invalide");
                    }

                    if (!$supplier || !$client) {
                        throw new Exception("Données manquantes (fournisseur et client requis)");
                    }

                    // Récupérer les photos actuelles
                    $stmt = $pdo->prepare("SELECT photo_path, additional_photos FROM defective WHERE id = ?");
                    $stmt->execute([$id]);
                    $currentProduct = $stmt->fetch();

                    if (!$currentProduct) {
                        throw new Exception("Produit défectueux non trouvé avec l'ID: " . $id);
                    }

                    $photoPath = $currentProduct['photo_path'];
                    $additionalPhotos = json_decode($currentProduct['additional_photos'], true) ?: [];

                    // Gérer les photos à supprimer
                    if (isset($_POST['photos_to_delete'])) {
                        $photosToDelete = json_decode($_POST['photos_to_delete'], true);
                        if (is_array($photosToDelete)) {
                            require_once __DIR__ . '/security.php';
                            foreach ($photosToDelete as $photoToDelete) {
                                // Valider le chemin avant suppression (anti path-traversal)
                                $safePath = validateUploadPath($photoToDelete, __DIR__);
                                if ($safePath && file_exists($safePath)) {
                                    unlink($safePath);
                                    file_put_contents("$logDir/defective_edit.log", date('Y-m-d H:i:s') . " - Photo supprimée: $photoToDelete\n", FILE_APPEND);
                                }

                                // Retirer de la liste
                                if ($photoPath === $photoToDelete) {
                                    $photoPath = null;
                                } else {
                                    $additionalPhotos = array_filter($additionalPhotos, function($p) use ($photoToDelete) {
                                        return $p !== $photoToDelete;
                                    });
                                }
                            }
                            // Réindexer le tableau
                            $additionalPhotos = array_values($additionalPhotos);
                        }
                    }

                    // Ajouter de nouvelles photos
                    if (isset($_FILES['new_photos']) && is_array($_FILES['new_photos']['name'])) {
                        $uploadDir = __DIR__ . '/uploads/';
                        if (!file_exists($uploadDir)) {
                            mkdir($uploadDir, 0755, true);
                        }

                        $fileCount = count($_FILES['new_photos']['name']);
                        for ($i = 0; $i < $fileCount; $i++) {
                            if ($_FILES['new_photos']['error'][$i] === UPLOAD_ERR_OK) {
                                $fileExtension = pathinfo($_FILES['new_photos']['name'][$i], PATHINFO_EXTENSION);
                                $fileName = uniqid() . '.' . $fileExtension;
                                $fullPath = $uploadDir . $fileName;

                                if (move_uploaded_file($_FILES['new_photos']['tmp_name'][$i], $fullPath)) {
                                    $newPhotoPath = 'uploads/' . $fileName;

                                    // Si pas de photo principale, utiliser celle-ci
                                    if (!$photoPath) {
                                        $photoPath = $newPhotoPath;
                                        file_put_contents("$logDir/defective_edit.log", date('Y-m-d H:i:s') . " - Nouvelle photo principale: $newPhotoPath\n", FILE_APPEND);
                                    } else {
                                        // Sinon ajouter aux photos supplémentaires
                                        $additionalPhotos[] = $newPhotoPath;
                                        file_put_contents("$logDir/defective_edit.log", date('Y-m-d H:i:s') . " - Photo supplémentaire ajoutée: $newPhotoPath\n", FILE_APPEND);
                                    }
                                }
                            }
                        }
                    }

                    // Mettre à jour le produit défectueux
                    $stmt = $pdo->prepare("UPDATE defective SET supplier = ?, client = ?, description = ?, photo_path = ?, additional_photos = ?, date = ? WHERE id = ?");
                    $result = $stmt->execute([
                            $supplier,
                            $client,
                            $description,
                            $photoPath,
                            json_encode($additionalPhotos),
                            $date,
                            $id
                    ]);

                    if ($result) {
                        file_put_contents("$logDir/defective_edit.log", date('Y-m-d H:i:s') . " - Produit défectueux modifié avec succès, ID: $id\n", FILE_APPEND);

                        // Construire la liste complète des photos
                        $allPhotoPaths = [];
                        if ($photoPath) {
                            $allPhotoPaths[] = $photoPath;
                        }
                        $allPhotoPaths = array_merge($allPhotoPaths, $additionalPhotos);

                        ob_end_clean();
                        echo json_encode([
                                'success' => true,
                                'id' => $id,
                                'photo_path' => $photoPath,
                                'photos_paths' => $allPhotoPaths
                        ]);
                    } else {
                        throw new Exception("Échec de la mise à jour: " . implode(", ", $stmt->errorInfo()));
                    }
                }
            } else {
                // Transfert depuis received (comportement existant)
                // Récupérer et décoder les données JSON
                $input = file_get_contents('php://input');
                $data = json_decode($input, true);
                file_put_contents("$logDir/defective_post.log", date('Y-m-d H:i:s') . " - Transfert - Données: " . print_r($data, true) . "\n", FILE_APPEND);

                if (!isset($data['id'])) {
                    throw new Exception("ID du produit manquant");
                }

                $productId = intval($data['id']);

                // Récupérer les informations du produit depuis la table received
                $stmt = $pdo->prepare("SELECT product, supplier, client, photo_path, additional_photos, date FROM received WHERE id = ?");
                $stmt->execute([$productId]);
                $product = $stmt->fetch();

                if (!$product) {
                    throw new Exception("Produit non trouvé");
                }

                // Transférer le produit vers la table defective (description null pour les transferts)
                $stmt = $pdo->prepare("INSERT INTO defective (product, supplier, client, description, photo_path, additional_photos, date, defective_date) VALUES (?, ?, ?, NULL, ?, ?, ?, NOW())");
                $result = $stmt->execute([
                        $product['product'],
                        $product['supplier'],
                        $product['client'],
                        $product['photo_path'],
                        $product['additional_photos'],
                        $product['date']
                ]);

                if ($result) {
                    // Supprimer le produit de la table received
                    $stmt = $pdo->prepare("DELETE FROM received WHERE id = ?");
                    $deleteResult = $stmt->execute([$productId]);

                    if ($deleteResult) {
                        file_put_contents("$logDir/defective_post.log", date('Y-m-d H:i:s') . " - Produit marqué comme défectueux et transféré, ID: $productId\n", FILE_APPEND);

                        ob_end_clean();
                        echo json_encode(['success' => true]);
                    } else {
                        throw new Exception("Échec de la suppression du produit de la table received: " . implode(", ", $stmt->errorInfo()));
                    }
                } else {
                    throw new Exception("Échec de l'insertion dans defective: " . implode(", ", $stmt->errorInfo()));
                }
            }
            break;

        case 'DELETE':
            // Récupérer l'ID du produit
            $id = isset($_GET['id']) ? intval($_GET['id']) : null;
            file_put_contents("$logDir/defective_delete.log", date('Y-m-d H:i:s') . " - Suppression demandée pour ID: $id\n", FILE_APPEND);

            if (!$id) {
                throw new Exception("ID manquant");
            }

            // Récupérer les chemins des photos avant suppression
            $stmt = $pdo->prepare("SELECT photo_path, additional_photos FROM defective WHERE id = ?");
            $stmt->execute([$id]);
            $product = $stmt->fetch();

            // Supprimer le produit
            $stmt = $pdo->prepare("DELETE FROM defective WHERE id = ?");
            $result = $stmt->execute([$id]);

            if ($result) {
                // Supprimer la photo principale si elle existe
                require_once __DIR__ . '/security.php';
                if ($product && $product['photo_path']) {
                    $safePath = validateUploadPath($product['photo_path'], __DIR__);
                    if ($safePath && file_exists($safePath)) {
                        unlink($safePath);
                        file_put_contents("$logDir/defective_delete.log", date('Y-m-d H:i:s') . " - Photo principale supprimée: " . $product['photo_path'] . "\n", FILE_APPEND);
                    }
                }
                // Supprimer les photos supplémentaires si elles existent
                if ($product && $product['additional_photos']) {
                    $additionalPhotos = json_decode($product['additional_photos'], true);
                    if (is_array($additionalPhotos)) {
                        foreach ($additionalPhotos as $photoPath) {
                            $safePath = validateUploadPath($photoPath, __DIR__);
                            if ($safePath && file_exists($safePath)) {
                                unlink($safePath);
                                file_put_contents("$logDir/defective_delete.log", date('Y-m-d H:i:s') . " - Photo supplémentaire supprimée: $photoPath\n", FILE_APPEND);
                            }
                        }
                    }
                }

                file_put_contents("$logDir/defective_delete.log", date('Y-m-d H:i:s') . " - Produit défectueux supprimé, ID: $id\n", FILE_APPEND);

                ob_end_clean();
                echo json_encode(['success' => true]);
            } else {
                throw new Exception("Échec de la suppression: " . implode(", ", $stmt->errorInfo()));
            }
            break;

        default:
            http_response_code(405);

            ob_end_clean();
            echo json_encode(['error' => true, 'message' => 'Méthode non autorisée']);
            break;
    }

} catch (Exception $e) {
    file_put_contents("$logDir/defective_error.log", date('Y-m-d H:i:s') . " - Erreur: " . $e->getMessage() . "\n", FILE_APPEND);

    http_response_code(500);

    ob_end_clean();
    error_log(date('Y-m-d H:i:s') . ' - Defective error: ' . $e->getMessage());
    echo json_encode(['error' => true, 'message' => 'Une erreur est survenue']);
}
?>


