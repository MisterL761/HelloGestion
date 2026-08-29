<?php
// Démarrer la session
session_start();

// En-têtes CORS stricts
require_once __DIR__ . '/security.php';
require_once __DIR__ . '/push_helper.php';
setSecurityHeaders();
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

ini_set('display_errors', 0);
error_reporting(E_ALL);

ob_start();

$logDir = __DIR__ . '/logs';
if (!file_exists($logDir)) mkdir($logDir, 0755, true);
require_once __DIR__ . '/log_helper.php';

function sendJson($data, $code = 200) {
    ob_end_clean();
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data);
    exit;
}

try {
    if (!isset($_SESSION['user'])) {
        sendJson(['error' => true, 'message' => 'Non authentifié'], 401);
    }

    require 'db.php';
    require_once __DIR__ . '/roles.php';

    // Migrations
    try {
        $pdo->exec("ALTER TABLE received ADD COLUMN pro_devis TINYINT(1) NOT NULL DEFAULT 0");
    } catch (\PDOException $e) { /* déjà présente */ }
    try {
        $pdo->exec("ALTER TABLE received ADD COLUMN pro_devis_by VARCHAR(100) DEFAULT NULL");
    } catch (\PDOException $e) { /* déjà présente */ }
    try {
        $pdo->exec("ALTER TABLE received ADD COLUMN important_note TEXT DEFAULT NULL");
    } catch (\PDOException $e) { /* déjà présente */ }

    switch ($_SERVER['REQUEST_METHOD']) {
        case 'GET':
            $stmt = $pdo->query("SELECT id, product, supplier, client, photo_path, additional_photos, DATE_FORMAT(date, '%d/%m/%Y') as date, 'Reçu' as status, pro_devis, pro_devis_by, important_note FROM received ORDER BY received.date DESC");
            $result = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($result as &$item) {
                $photos_paths = [];
                if (!empty($item['photo_path'])) {
                    $photos_paths[] = $item['photo_path'];
                }
                if (!empty($item['additional_photos'])) {
                    $additionalPhotos = json_decode($item['additional_photos'], true);
                    if (is_array($additionalPhotos)) {
                        $photos_paths = array_merge($photos_paths, $additionalPhotos);
                    }
                }
                $item['photos_paths'] = $photos_paths;
                unset($item['additional_photos']);
            }
            sendJson($result);
            break;

        case 'POST':
            // Données avec valeurs par défaut
            $product = !empty($_POST['product']) ? $_POST['product'] : 'Commande';
            $supplier = !empty($_POST['supplier']) ? $_POST['supplier'] : 'Dépôt';
            $client = $_POST['client'] ?? null;
            $date = $_POST['date'] ?? date('Y-m-d');
            $action = $_POST['action'] ?? 'create';

            if (!$client) {
                throw new Exception("Le nom du client est requis.");
            }

            // Gestion Uploads
            $uploadDir = __DIR__ . '/uploads/';
            if (!file_exists($uploadDir)) {
                mkdir($uploadDir, 0755, true);
            }

            $photoPath = null;
            $additionalPhotos = [];
            $allPhotoPaths = [];

            // Photo principale
            if (isset($_FILES['photo']) && $_FILES['photo']['error'] === UPLOAD_ERR_OK) {
                require_once __DIR__ . '/security.php';
                validateUploadedFile($_FILES['photo']);
                $ext  = strtolower(pathinfo($_FILES['photo']['name'], PATHINFO_EXTENSION));
                $allowedExts = ['jpg','jpeg','png','gif','webp','pdf'];
                if (!in_array($ext, $allowedExts, true)) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'message' => 'Type de fichier non autorisé.']);
                    exit();
                }
                $finfo = finfo_open(FILEINFO_MIME_TYPE);
                $mime = finfo_file($finfo, $_FILES['photo']['tmp_name']);
                finfo_close($finfo);
                $allowedMimes = ['image/jpeg','image/png','image/gif','image/webp','application/pdf'];
                if (!in_array($mime, $allowedMimes, true)) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'message' => 'Type de fichier non autorisé.']);
                    exit();
                }
                $name = uniqid() . '.' . $ext;
                if (move_uploaded_file($_FILES['photo']['tmp_name'], $uploadDir . $name)) {
                    $photoPath = 'uploads/' . $name;
                    $allPhotoPaths[] = $photoPath;
                }
            }

            // Photos supplémentaires
            if (isset($_FILES['additional_photos']) && is_array($_FILES['additional_photos']['name'])) {
                $count = count($_FILES['additional_photos']['name']);
                for ($i = 0; $i < $count; $i++) {
                    if ($_FILES['additional_photos']['error'][$i] === UPLOAD_ERR_OK) {
                        $ext = strtolower(pathinfo($_FILES['additional_photos']['name'][$i], PATHINFO_EXTENSION));
                        $allowedExtsAdd = ['jpg','jpeg','png','gif','webp','pdf'];
                        if (!in_array($ext, $allowedExtsAdd, true)) {
                            continue; // skip invalid
                        }
                        $finfoAdd = finfo_open(FILEINFO_MIME_TYPE);
                        $mimeAdd = finfo_file($finfoAdd, $_FILES['additional_photos']['tmp_name'][$i]);
                        finfo_close($finfoAdd);
                        $allowedMimesAdd = ['image/jpeg','image/png','image/gif','image/webp','application/pdf'];
                        if (!in_array($mimeAdd, $allowedMimesAdd, true)) {
                            continue; // skip invalid
                        }
                        $name = uniqid() . '.' . $ext;
                        if (move_uploaded_file($_FILES['additional_photos']['tmp_name'][$i], $uploadDir . $name)) {
                            $p = 'uploads/' . $name;
                            $additionalPhotos[] = $p;
                            $allPhotoPaths[] = $p;
                        }
                    }
                }
            }

            // UPDATE (avec photos)
            if ($action === 'update_with_photos' && isset($_POST['id'])) {
                $id = intval($_POST['id']);

                // Récup photos existantes
                $stmt = $pdo->prepare("SELECT photo_path, additional_photos FROM received WHERE id = ?");
                $stmt->execute([$id]);
                $existing = $stmt->fetch();
                $existAdd = ($existing && $existing['additional_photos']) ? json_decode($existing['additional_photos'], true) : [];

                $merged = array_merge(is_array($existAdd) ? $existAdd : [], $additionalPhotos);

                // On ne met à jour que les champs fournis, ou on garde les existants
                // Ici on suppose que le formulaire envoie tout ce qui est nécessaire
                $stmt = $pdo->prepare("UPDATE received SET product = ?, supplier = ?, client = ?, date = ?, photo_path = COALESCE(?, photo_path), additional_photos = ? WHERE id = ?");
                $res = $stmt->execute([$product, $supplier, $client, $date, $photoPath, json_encode($merged), $id]);

                if ($res) {
                    // Retourner les chemins complets
                    $stmt = $pdo->prepare("SELECT photo_path, additional_photos FROM received WHERE id = ?");
                    $stmt->execute([$id]);
                    $upd = $stmt->fetch();
                    $finalPaths = [];
                    if($upd['photo_path']) $finalPaths[] = $upd['photo_path'];
                    if($upd['additional_photos']) {
                        $dec = json_decode($upd['additional_photos'], true);
                        if(is_array($dec)) $finalPaths = array_merge($finalPaths, $dec);
                    }
                    sendJson(['success' => true, 'id' => $id, 'photos_paths' => $finalPaths]);
                } else {
                    throw new Exception("Erreur SQL lors de la mise à jour");
                }
            }

            // INSERT (Création)
            $stmt = $pdo->prepare("INSERT INTO received (product, supplier, client, photo_path, additional_photos, date) VALUES (?, ?, ?, ?, ?, ?)");
            $res = $stmt->execute([$product, $supplier, $client, $photoPath, json_encode($additionalPhotos), $date]);

            if ($res) {
                $id = $pdo->lastInsertId();
                appLog('actions', who() . " a enregistré « $product » pour le client $client (fournisseur : $supplier, id: $id)");
                notifyAll($pdo, '📦 Produit reçu', "« $product » reçu — Client : $client, Fournisseur : $supplier", ['url' => '/hello-gestion/']);
                sendJson([
                    'success' => true,
                    'id' => $id,
                    'photo_path' => $photoPath,
                    'photos_paths' => $allPhotoPaths
                ]);
            } else {
                throw new Exception("Erreur SQL lors de l'insertion");
            }
            break;

        case 'PATCH':
            $data = json_decode(file_get_contents('php://input'), true);
            if (!isset($data['id'])) throw new Exception("ID requis");
            if (isset($data['pro_devis'])) {
                $val  = (int)(bool)$data['pro_devis'];
                $by   = $val ? ($_SESSION['user']['name'] ?? 'Inconnu') : null;
                $stmt = $pdo->prepare("UPDATE received SET pro_devis = ?, pro_devis_by = ? WHERE id = ?");
                $stmt->execute([$val, $by, (int)$data['id']]);
                sendJson(['success' => true, 'pro_devis_by' => $by]);
            }
            if (array_key_exists('important_note', $data)) {
                $note = trim((string)$data['important_note']);
                if ($note === '') $note = null;
                $stmt = $pdo->prepare("UPDATE received SET important_note = ? WHERE id = ?");
                $stmt->execute([$note, (int)$data['id']]);
                appLog('actions', who() . ($note === null
                    ? " a retiré la note importante du produit #{$data['id']}"
                    : " a ajouté une note importante sur le produit #{$data['id']}"));
                sendJson(['success' => true, 'important_note' => $note]);
            }
            throw new Exception("Champ non reconnu");

        case 'PUT':
            $input = file_get_contents('php://input');
            $data = json_decode($input, true);
            if (!isset($data['id']) || !isset($data['client'])) throw new Exception("ID et Client requis");

            // Si product/supplier ne sont pas envoyés (cas du nouveau EditProductModal), on met des valeurs par défaut 'Commande'/'Dépôt'
            // Cela écrase les anciennes valeurs si elles étaient différentes, mais c'est cohérent avec votre demande de simplification.
            // Si vous vouliez conserver les valeurs, le frontend doit les renvoyer (ce que fait mon EditProductModal.jsx corrigé).
            $stmt = $pdo->prepare("UPDATE received SET product = ?, supplier = ?, client = ?, date = ? WHERE id = ?");
            $res = $stmt->execute([
                $data['product'] ?? 'Commande',
                $data['supplier'] ?? 'Dépôt',
                $data['client'],
                $data['date'] ?? date('Y-m-d'),
                $data['id']
            ]);

            if ($res) sendJson(['success' => true]);
            else throw new Exception("Erreur SQL mise à jour");
            break;

        case 'DELETE':
            $id = $_GET['id'] ?? ($_POST['id'] ?? (json_decode(file_get_contents('php://input'), true)['id'] ?? null));
            if (!$id) throw new Exception("ID manquant");

            $stmt = $pdo->prepare("SELECT photo_path, additional_photos FROM received WHERE id = ?");
            $stmt->execute([$id]);
            $prod = $stmt->fetch();

            $stmt = $pdo->prepare("DELETE FROM received WHERE id = ?");
            if ($stmt->execute([$id])) {
                if ($prod) {
                    // Validation anti path-traversal avant suppression
                    require_once __DIR__ . '/security.php';
                    if (!empty($prod['photo_path'])) {
                        $safePath = validateUploadPath($prod['photo_path'], __DIR__);
                        if ($safePath && file_exists($safePath)) @unlink($safePath);
                    }
                    if (!empty($prod['additional_photos'])) {
                        $arr = json_decode($prod['additional_photos'], true);
                        if (is_array($arr)) {
                            foreach ($arr as $p) {
                                $safePath = validateUploadPath($p, __DIR__);
                                if ($safePath && file_exists($safePath)) @unlink($safePath);
                            }
                        }
                    }
                }
                sendJson(['success' => true]);
            } else {
                throw new Exception("Erreur SQL suppression");
            }
            break;

        default:
            sendJson(['error' => true, 'message' => 'Méthode non autorisée'], 405);
    }

} catch (Exception $e) {
    file_put_contents("$logDir/received_error.log", date('Y-m-d H:i:s') . " - " . $e->getMessage() . "\n", FILE_APPEND);
    error_log(date('Y-m-d H:i:s') . ' - Received error: ' . $e->getMessage());
    sendJson(['error' => true, 'message' => 'Une erreur est survenue'], 500);
}
?>