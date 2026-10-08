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

    if (!isset($fileInput) || $fileInput['error'] !== UPLOAD_ERR_OK) {
        return null;
    }

    require_once __DIR__ . '/security.php';
    validateUploadedFile($fileInput);

    $extension = strtolower(pathinfo($fileInput['name'], PATHINFO_EXTENSION));
    $fileName = uniqid('inv_') . '.' . $extension;
    $filePath = $uploadDir . '/' . $fileName;

    if (move_uploaded_file($fileInput['tmp_name'], $filePath)) {

        file_put_contents(
            "$logDir/inventory.log",
            date('Y-m-d H:i:s') . " - Fichier uploadé: $fileName\n",
            FILE_APPEND
        );

        $finfo = function_exists('finfo_open')
            ? finfo_open(FILEINFO_MIME_TYPE)
            : null;

        $realMime = $finfo
            ? finfo_file($finfo, $filePath)
            : $fileInput['type'];

        if ($finfo) {
            finfo_close($finfo);
        }

        return [
            'file_path' => '/hello-gestion/php/uploads/inventory/' . $fileName,
            'file_name' => $fileInput['name'],
            'file_type' => (strpos($realMime, 'image') !== false)
                ? 'image'
                : 'pdf'
        ];
    }

    throw new Exception("Erreur lors de l'upload du fichier");
}

function deleteFile($filePath) {
    global $logDir;

    if (!$filePath) {
        return false;
    }

    $relative = $filePath;

    if (str_starts_with($relative, '/hello-gestion/php/')) {

        $relative = substr(
            $relative,
            strlen('/hello-gestion/php/')
        );

    } elseif (str_starts_with($relative, '/hello-')) {

        $relative = preg_replace(
            '#^/hello-[^/]+/php/#',
            '',
            $relative
        );
    }

    $relative = ltrim($relative, '/');

    require_once __DIR__ . '/security.php';

    $safePath = validateUploadPath(
        $relative,
        __DIR__
    );

    if (!$safePath) {

        error_log(
            "deleteFile: chemin rejeté (path traversal?) : $filePath"
        );

        return false;
    }

    if (file_exists($safePath)) {

        if (unlink($safePath)) {

            file_put_contents(
                "$logDir/inventory.log",
                date('Y-m-d H:i:s') . " - Fichier supprimé: $filePath\n",
                FILE_APPEND
            );

            return true;
        }
    }

    return false;
}


/*
|--------------------------------------------------------------------------
| NOTIFICATIONS INTERNES DE RUPTURE DE STOCK
|--------------------------------------------------------------------------
|
| Sébastien = 1
| Henrique  = 8
| Lotfi     = 24
|
*/

function createStockRuptureNotifications(
    PDO $pdo,
    int $inventoryId,
    string $material
): void {

    $recipients = [
        1,  // Sébastien
        8,  // Henrique
        24  // Lotfi
    ];

    $title = '⚠️ Rupture de stock';

    $message = $material . ' est en rupture de stock';

    foreach ($recipients as $userId) {

        /*
         * On vérifie si une notification identique
         * existe déjà et n'a pas encore été prise en charge.
         */

        $check = $pdo->prepare("
            SELECT id
            FROM stock_user_notifications
            WHERE user_id = ?
              AND inventory_id = ?
              AND claimed_by IS NULL
            LIMIT 1
        ");

        $check->execute([
            $userId,
            $inventoryId
        ]);

        if ($check->fetch()) {
            continue;
        }

        /*
         * Création de la notification
         */

        $stmt = $pdo->prepare("
            INSERT INTO stock_user_notifications
            (
                user_id,
                claimed_by,
                claimed_at,
                inventory_id,
                title,
                message,
                is_read,
                created_at
            )
            VALUES
            (
                ?,
                NULL,
                NULL,
                ?,
                ?,
                ?,
                0,
                NOW()
            )
        ");

        $stmt->execute([
            $userId,
            $inventoryId,
            $title,
            $message
        ]);
    }
}


try {

    require 'db.php';
    require_once __DIR__ . '/push_helper.php';
    require_once __DIR__ . '/roles.php';

    header('Content-Type: application/json; charset=utf-8');


    /*
    |--------------------------------------------------------------------------
    | Création automatique de rupture_date si nécessaire
    |--------------------------------------------------------------------------
    */

    try {

        $pdo->exec("
            ALTER TABLE inventory
            ADD COLUMN rupture_date DATETIME NULL DEFAULT NULL
        ");

    } catch (\Exception $e) {

        // La colonne existe déjà.
    }


    switch ($_SERVER['REQUEST_METHOD']) {


        /*
        |--------------------------------------------------------------------------
        | GET
        |--------------------------------------------------------------------------
        */

        case 'GET':

            $stmt = $pdo->query("
                SELECT
                    i.id,
                    i.material,
                    i.supplier,
                    i.category,
                    i.stock,
                    i.threshold,
                    i.price,
                    i.conditionnement,
                    i.file_path,
                    i.file_name,
                    i.file_type,
                    i.rupture_date,

                    CASE
                        WHEN i.stock = 0 THEN 'Rupture'
                        WHEN i.stock < i.threshold THEN 'Faible Stock'
                        ELSE 'Disponible'
                    END AS status,

                    COALESCE(o.is_ordered, 0) AS is_ordered,
                    o.ordered_quantity,
                    o.ordered_date

                FROM inventory i

                LEFT JOIN orders o
                    ON i.id = o.inventory_id
                    AND o.is_ordered = 1

                ORDER BY i.material ASC
            ");

            $result = $stmt->fetchAll(PDO::FETCH_ASSOC);


            /*
             * Ajouter automatiquement rupture_date
             * pour les articles déjà en rupture.
             */

            foreach ($result as &$item) {

                if (
                    (int)$item['stock'] === 0 &&
                    empty($item['rupture_date'])
                ) {

                    $now = date('Y-m-d H:i:s');

                    $pdo->prepare("
                        UPDATE inventory
                        SET rupture_date = ?
                        WHERE id = ?
                          AND stock = 0
                          AND rupture_date IS NULL
                    ")->execute([
                        $now,
                        $item['id']
                    ]);

                    $item['rupture_date'] = $now;
                }
            }

            unset($item);


            /*
             * Normalisation des chemins des images.
             * NE PAS MODIFIER.
             */

            foreach ($result as &$item) {

                if (empty($item['file_path'])) {
                    continue;
                }

                $fp = $item['file_path'];

                if (
                    !str_starts_with($fp, '/') &&
                    !str_starts_with($fp, 'http')
                ) {

                    $fp = '/hello-gestion/' .
                        ltrim(
                            preg_replace(
                                '#^(?:hello-stock/php/|stock/)#',
                                '',
                                $fp
                            ),
                            '/'
                        );
                }

                if (str_starts_with($fp, '/hello-stock/')) {

                    $fp = str_replace(
                        '/hello-stock/',
                        '/hello-gestion/',
                        $fp
                    );
                }

                $fp = preg_replace(
                    '#(/hello-gestion/php/)hello-stock/php/#',
                    '$1',
                    $fp
                );

                $item['file_path'] = $fp;
            }

            unset($item);

            ob_end_clean();

            echo json_encode($result);

            break;


        /*
        |--------------------------------------------------------------------------
        | POST
        |--------------------------------------------------------------------------
        */

        case 'POST':

            $action = $_POST['action'] ?? 'insert';


            /*
            |--------------------------------------------------------------------------
            | POST UPDATE
            |--------------------------------------------------------------------------
            */

            if ($action === 'update') {

                $id = $_POST['id'] ?? null;

                if (!$id) {
                    throw new Exception(
                        "ID de l'article manquant"
                    );
                }

                $stmt = $pdo->prepare("
                    SELECT file_path
                    FROM inventory
                    WHERE id = ?
                ");

                $stmt->execute([$id]);

                $currentArticle =
                    $stmt->fetch(PDO::FETCH_ASSOC);


                /*
                 * Stock actuel
                 */

                $prevStmt2 = $pdo->prepare("
                    SELECT stock, rupture_date
                    FROM inventory
                    WHERE id = ?
                ");

                $prevStmt2->execute([$id]);

                $prevRow2 =
                    $prevStmt2->fetch(PDO::FETCH_ASSOC);

                $prevStock2 =
                    $prevRow2
                        ? (int)$prevRow2['stock']
                        : null;


                $fields = [];
                $params = [];


                if (isset($_POST['material'])) {

                    $fields[] = "material = ?";
                    $params[] = $_POST['material'];
                }

                if (isset($_POST['supplier'])) {

                    $fields[] = "supplier = ?";
                    $params[] = $_POST['supplier'];
                }

                if (isset($_POST['category'])) {

                    $fields[] = "category = ?";
                    $params[] = $_POST['category'];
                }

                if (isset($_POST['stock'])) {

                    $fields[] = "stock = ?";
                    $params[] = $_POST['stock'];
                }

                if (isset($_POST['threshold'])) {

                    $fields[] = "threshold = ?";
                    $params[] = $_POST['threshold'];
                }

                if (isset($_POST['price'])) {

                    $fields[] = "price = ?";
                    $params[] = $_POST['price'];
                }

                if (isset($_POST['conditionnement'])) {

                    $fields[] = "conditionnement = ?";
                    $params[] = $_POST['conditionnement'];
                }


                /*
                 * Gestion rupture_date
                 */

                if (
                    isset($_POST['stock']) &&
                    $prevStock2 !== null
                ) {

                    $newStock2 =
                        (int)$_POST['stock'];


                    if (
                        $newStock2 === 0 &&
                        $prevStock2 > 0
                    ) {

                        $fields[] =
                            "rupture_date = ?";

                        $params[] =
                            date('Y-m-d H:i:s');

                    } elseif (
                        $newStock2 > 0 &&
                        $prevStock2 === 0
                    ) {

                        $fields[] =
                            "rupture_date = NULL";
                    }
                }


                /*
                 * ==========================================================
                 * PHOTO / FICHIER
                 * ==========================================================
                 *
                 * Cette partie reste inchangée.
                 */

                if (
                    isset($_FILES['file']) &&
                    $_FILES['file']['error'] === UPLOAD_ERR_OK
                ) {

                    if (
                        $currentArticle &&
                        $currentArticle['file_path']
                    ) {

                        deleteFile(
                            $currentArticle['file_path']
                        );
                    }

                    $fileData =
                        handleFileUpload(
                            $_FILES['file']
                        );

                    $fields[] =
                        "file_path = ?";

                    $params[] =
                        $fileData['file_path'];

                    $fields[] =
                        "file_name = ?";

                    $params[] =
                        $fileData['file_name'];

                    $fields[] =
                        "file_type = ?";

                    $params[] =
                        $fileData['file_type'];

                } elseif (
                    isset($_POST['remove_file']) &&
                    $_POST['remove_file'] == '1'
                ) {

                    if (
                        $currentArticle &&
                        $currentArticle['file_path']
                    ) {

                        deleteFile(
                            $currentArticle['file_path']
                        );
                    }

                    $fields[] =
                        "file_path = NULL";

                    $fields[] =
                        "file_name = NULL";

                    $fields[] =
                        "file_type = NULL";
                }


                if (empty($fields)) {

                    throw new Exception(
                        "Aucune donnée à mettre à jour"
                    );
                }


                $params[] = $id;


                $sql = "
                    UPDATE inventory
                    SET " . implode(", ", $fields) . "
                    WHERE id = ?
                ";


                $stmt =
                    $pdo->prepare($sql);

                $result =
                    $stmt->execute($params);


                if ($result) {


                    /*
                     * Supprimer la commande si stock suffisant.
                     */

                    if (
                        isset($_POST['stock']) &&
                        isset($_POST['threshold'])
                    ) {

                        if (
                            $_POST['stock'] >=
                            $_POST['threshold']
                        ) {

                            $pdo->prepare("
                                DELETE FROM orders
                                WHERE inventory_id = ?
                            ")->execute([$id]);
                        }
                    }


                    /*
                     * ======================================================
                     * NOTIFICATION RUPTURE
                     * ======================================================
                     */

                    if (
                        isset($_POST['stock']) &&
                        $prevStock2 !== null &&
                        $prevStock2 > 0 &&
                        (int)$_POST['stock'] === 0
                    ) {

                        $matStmt =
                            $pdo->prepare("
                                SELECT material
                                FROM inventory
                                WHERE id = ?
                            ");

                        $matStmt->execute([$id]);

                        $matRow =
                            $matStmt->fetch(
                                PDO::FETCH_ASSOC
                            );

                        $matName =
                            $matRow['material']
                            ?? "article #{$id}";


                        createStockRuptureNotifications(
                            $pdo,
                            (int)$id,
                            $matName
                        );
                    }


                    ob_end_clean();

                    echo json_encode([
                        'success' => true
                    ]);

                } else {

                    throw new Exception(
                        "Échec de la mise à jour"
                    );
                }

                break;
            }


            /*
            |--------------------------------------------------------------------------
            | POST INSERT
            |--------------------------------------------------------------------------
            */

            $material =
                $_POST['material'] ?? null;

            $supplier =
                $_POST['supplier'] ?? null;

            $category =
                $_POST['category'] ?? null;

            $stock =
                $_POST['stock'] ?? null;

            $threshold =
                $_POST['threshold'] ?? null;

            $price =
                $_POST['price'] ?? null;

            $conditionnement =
                $_POST['conditionnement']
                ?? 'unite';


            if (
                !$material ||
                !$supplier ||
                !$category ||
                $stock === null ||
                $threshold === null
            ) {

                throw new Exception(
                    "Données manquantes"
                );
            }


            $stock =
                (int)$stock;

            $threshold =
                (int)$threshold;


            $price =
                ($price !== null && $price !== '')
                    ? (float)$price
                    : null;


            if ($stock < 0) {
                $stock = 0;
            }

            if ($threshold < 0) {
                $threshold = 0;
            }


            /*
             * PHOTO : NE PAS MODIFIER
             */

            $fileData = null;

            if (
                isset($_FILES['file']) &&
                $_FILES['file']['error'] === UPLOAD_ERR_OK
            ) {

                $fileData =
                    handleFileUpload(
                        $_FILES['file']
                    );
            }


            $sql = "
                INSERT INTO inventory
                (
                    material,
                    supplier,
                    category,
                    stock,
                    threshold,
                    price,
                    conditionnement,
                    file_path,
                    file_name,
                    file_type
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ";


            $stmt =
                $pdo->prepare($sql);


            $result =
                $stmt->execute([
                    $material,
                    $supplier,
                    $category,
                    $stock,
                    $threshold,
                    $price,
                    $conditionnement,

                    $fileData
                        ? $fileData['file_path']
                        : null,

                    $fileData
                        ? $fileData['file_name']
                        : null,

                    $fileData
                        ? $fileData['file_type']
                        : null
                ]);


            if ($result) {

                $insertId =
                    $pdo->lastInsertId();

                appLog(
                    'inventaire',
                    who() .
                    " a créé l'article « $material » " .
                    "(stock: $stock, fournisseur: $supplier, id: $insertId)"
                );


                ob_end_clean();

                echo json_encode([
                    'success' => true,
                    'id' => $insertId
                ]);

            } else {

                throw new Exception(
                    "Échec de l'insertion"
                );
            }

            break;


        /*
        |--------------------------------------------------------------------------
        | PUT
        |--------------------------------------------------------------------------
        */

        case 'PUT':

            $contentType =
                $_SERVER['CONTENT_TYPE'] ?? '';


            /*
             * PUT MULTIPART
             */

            if (
                strpos(
                    $contentType,
                    'multipart/form-data'
                ) !== false
            ) {

                $id =
                    $_POST['id'] ?? null;

                if (!$id) {

                    throw new Exception(
                        "ID de l'article manquant"
                    );
                }


                $stmt =
                    $pdo->prepare("
                        SELECT file_path, price, stock
                        FROM inventory
                        WHERE id = ?
                    ");

                $stmt->execute([$id]);

                $currentArticle =
                    $stmt->fetch(PDO::FETCH_ASSOC);


                $prevPriceMultipart =
                    $currentArticle['price']
                    ?? null;

                $prevStockMultipart =
                    $currentArticle
                        ? (int)$currentArticle['stock']
                        : null;


                $fields = [];
                $params = [];


                if (isset($_POST['material'])) {

                    $fields[] =
                        "material = ?";

                    $params[] =
                        $_POST['material'];
                }

                if (isset($_POST['supplier'])) {

                    $fields[] =
                        "supplier = ?";

                    $params[] =
                        $_POST['supplier'];
                }

                if (isset($_POST['category'])) {

                    $fields[] =
                        "category = ?";

                    $params[] =
                        $_POST['category'];
                }

                if (isset($_POST['stock'])) {

                    $fields[] =
                        "stock = ?";

                    $params[] =
                        $_POST['stock'];
                }

                if (isset($_POST['threshold'])) {

                    $fields[] =
                        "threshold = ?";

                    $params[] =
                        $_POST['threshold'];
                }

                if (isset($_POST['price'])) {

                    $fields[] =
                        "price = ?";

                    $params[] =
                        $_POST['price'];
                }

                if (isset($_POST['conditionnement'])) {

                    $fields[] =
                        "conditionnement = ?";

                    $params[] =
                        $_POST['conditionnement'];
                }


                /*
                 * Gestion rupture_date
                 */

                if (
                    isset($_POST['stock']) &&
                    $prevStockMultipart !== null
                ) {

                    $newStockMultipart =
                        (int)$_POST['stock'];


                    if (
                        $newStockMultipart === 0 &&
                        $prevStockMultipart > 0
                    ) {

                        $fields[] =
                            "rupture_date = ?";

                        $params[] =
                            date('Y-m-d H:i:s');

                    } elseif (
                        $newStockMultipart > 0 &&
                        $prevStockMultipart === 0
                    ) {

                        $fields[] =
                            "rupture_date = NULL";
                    }
                }


                /*
                 * PHOTO : NE PAS MODIFIER
                 */

                if (
                    isset($_FILES['file']) &&
                    $_FILES['file']['error'] === UPLOAD_ERR_OK
                ) {

                    if (
                        $currentArticle &&
                        $currentArticle['file_path']
                    ) {

                        deleteFile(
                            $currentArticle['file_path']
                        );
                    }


                    $fileData =
                        handleFileUpload(
                            $_FILES['file']
                        );


                    $fields[] =
                        "file_path = ?";

                    $params[] =
                        $fileData['file_path'];


                    $fields[] =
                        "file_name = ?";

                    $params[] =
                        $fileData['file_name'];


                    $fields[] =
                        "file_type = ?";

                    $params[] =
                        $fileData['file_type'];

                } elseif (
                    isset($_POST['remove_file']) &&
                    $_POST['remove_file'] == '1'
                ) {

                    if (
                        $currentArticle &&
                        $currentArticle['file_path']
                    ) {

                        deleteFile(
                            $currentArticle['file_path']
                        );
                    }

                    $fields[] =
                        "file_path = NULL";

                    $fields[] =
                        "file_name = NULL";

                    $fields[] =
                        "file_type = NULL";
                }


                if (empty($fields)) {

                    throw new Exception(
                        "Aucune donnée à mettre à jour"
                    );
                }


                $params[] =
                    $id;


                $sql = "
                    UPDATE inventory
                    SET " . implode(", ", $fields) . "
                    WHERE id = ?
                ";


                $stmt =
                    $pdo->prepare($sql);


                $result =
                    $stmt->execute($params);


                /*
                 * NOTIFICATION MULTIPART
                 */

                if (
                    $result &&
                    isset($_POST['stock']) &&
                    $prevStockMultipart !== null &&
                    $prevStockMultipart > 0 &&
                    (int)$_POST['stock'] === 0
                ) {

                    $matStmt =
                        $pdo->prepare("
                            SELECT material
                            FROM inventory
                            WHERE id = ?
                        ");

                    $matStmt->execute([$id]);

                    $matRow =
                        $matStmt->fetch(
                            PDO::FETCH_ASSOC
                        );

                    $matName =
                        $matRow['material']
                        ?? "article #{$id}";


                    createStockRuptureNotifications(
                        $pdo,
                        (int)$id,
                        $matName
                    );
                }

            } else {


                /*
                 * ==========================================================
                 * PUT JSON
                 * ==========================================================
                 */

                $input =
                    file_get_contents(
                        'php://input'
                    );


                $data =
                    json_decode(
                        $input,
                        true
                    );


                if (!isset($data['id'])) {

                    throw new Exception(
                        "ID de l'article manquant"
                    );
                }


                /*
                 * Récupérer l'ancien stock.
                 */

                $prevStmt =
                    $pdo->prepare("
                        SELECT stock, price
                        FROM inventory
                        WHERE id = ?
                    ");

                $prevStmt->execute([
                    $data['id']
                ]);


                $prevRow =
                    $prevStmt->fetch(
                        PDO::FETCH_ASSOC
                    );


                $prevStock =
                    $prevRow
                        ? (int)$prevRow['stock']
                        : null;


                $prevPrice =
                    $prevRow['price']
                    ?? null;


                $fields = [];
                $params = [];


                $newStock =
                    isset($data['stock'])
                        ? (int)$data['stock']
                        : null;


                $newThreshold =
                    isset($data['threshold'])
                        ? (int)$data['threshold']
                        : null;


                $newPrice =
                    isset($data['price'])
                        ? (
                            $data['price'] !== null &&
                            $data['price'] !== ''
                                ? (float)$data['price']
                                : null
                          )
                        : null;


                if (
                    $newStock !== null &&
                    $newStock < 0
                ) {

                    $newStock = 0;
                }


                if (
                    $newThreshold !== null &&
                    $newThreshold < 0
                ) {

                    $newThreshold = 0;
                }


                /*
                 * Gestion rupture_date
                 */

                if (
                    $newStock !== null &&
                    $prevStock !== null
                ) {

                    if (
                        $newStock === 0 &&
                        $prevStock > 0
                    ) {

                        $fields[] =
                            "rupture_date = ?";

                        $params[] =
                            date('Y-m-d H:i:s');

                    } elseif (
                        $newStock > 0 &&
                        $prevStock === 0
                    ) {

                        $fields[] =
                            "rupture_date = NULL";
                    }
                }


                if (isset($data['material'])) {

                    $fields[] =
                        "material = ?";

                    $params[] =
                        $data['material'];
                }


                if (isset($data['supplier'])) {

                    $fields[] =
                        "supplier = ?";

                    $params[] =
                        $data['supplier'];
                }


                if (isset($data['category'])) {

                    $fields[] =
                        "category = ?";

                    $params[] =
                        $data['category'];
                }


                if ($newStock !== null) {

                    $fields[] =
                        "stock = ?";

                    $params[] =
                        $newStock;
                }


                if ($newThreshold !== null) {

                    $fields[] =
                        "threshold = ?";

                    $params[] =
                        $newThreshold;
                }


                if (array_key_exists(
                    'price',
                    $data
                )) {

                    $fields[] =
                        "price = ?";

                    $params[] =
                        $newPrice;
                }


                if (
                    isset(
                        $data['conditionnement']
                    )
                ) {

                    $fields[] =
                        "conditionnement = ?";

                    $params[] =
                        $data['conditionnement'];
                }


                if (empty($fields)) {

                    throw new Exception(
                        "Aucune donnée à mettre à jour"
                    );
                }


                $params[] =
                    $data['id'];


                $sql = "
                    UPDATE inventory
                    SET " . implode(", ", $fields) . "
                    WHERE id = ?
                ";


                $stmt =
                    $pdo->prepare($sql);


                $result =
                    $stmt->execute($params);


                /*
                 * ======================================================
                 * NOTIFICATION INTERNE
                 * ======================================================
                 *
                 * C'est ici que l'on détecte :
                 *
                 * 5 -> 0
                 * 2 -> 0
                 * 1 -> 0
                 *
                 * Mais pas :
                 *
                 * 0 -> 0
                 * 0 -> 5
                 */

                if (
                    $result &&
                    $prevStock !== null &&
                    $newStock !== null &&
                    $prevStock > 0 &&
                    $newStock === 0
                ) {

                    $matStmt =
                        $pdo->prepare("
                            SELECT material
                            FROM inventory
                            WHERE id = ?
                        ");

                    $matStmt->execute([
                        $data['id']
                    ]);


                    $matRow =
                        $matStmt->fetch(
                            PDO::FETCH_ASSOC
                        );


                    $matName =
                        $matRow['material']
                        ?? "article #{$data['id']}";


                    /*
                     * Création des 3 notifications :
                     *
                     * Sébastien
                     * Henrique
                     * Lotfi
                     */

                    createStockRuptureNotifications(
                        $pdo,
                        (int)$data['id'],
                        $matName
                    );
                }


                /*
                 * Mouvement de stock
                 */

                if (
                    $result &&
                    $newStock !== null &&
                    $prevStock !== null
                ) {

                    $delta =
                        $newStock -
                        $prevStock;


                    if ($delta !== 0) {

                        $userId =
                            $_SESSION['user']['id']
                            ?? null;


                        $pdo->exec("
                            CREATE TABLE IF NOT EXISTS stock_movements (
                                id INT AUTO_INCREMENT PRIMARY KEY,
                                inventory_id INT NOT NULL,
                                user_id INT,
                                delta INT NOT NULL,
                                moved_at DATETIME NOT NULL
                                    DEFAULT CURRENT_TIMESTAMP
                            )
                        ");


                        $mv =
                            $pdo->prepare("
                                INSERT INTO stock_movements
                                (
                                    inventory_id,
                                    user_id,
                                    delta,
                                    moved_at
                                )
                                VALUES (?, ?, ?, NOW())
                            ");


                        $mv->execute([
                            $data['id'],
                            $userId,
                            $delta
                        ]);
                    }
                }


                /*
                 * Historique prix
                 */

                if (
                    $result &&
                    isset($data['price']) &&
                    $prevPrice !== null
                ) {

                    $newPriceValue =
                        (float)$data['price'];

                    $oldPriceValue =
                        (float)$prevPrice;


                    if (
                        abs(
                            $newPriceValue -
                            $oldPriceValue
                        ) > 0.001
                    ) {

                        $userId =
                            $_SESSION['user']['id']
                            ?? null;


                        $pdo->exec("
                            CREATE TABLE IF NOT EXISTS price_history (
                                id INT AUTO_INCREMENT PRIMARY KEY,
                                inventory_id INT NOT NULL,
                                user_id INT,
                                old_price DECIMAL(10,2),
                                new_price DECIMAL(10,2),
                                changed_at DATETIME NOT NULL
                                    DEFAULT CURRENT_TIMESTAMP
                            )
                        ");


                        $ph =
                            $pdo->prepare("
                                INSERT INTO price_history
                                (
                                    inventory_id,
                                    user_id,
                                    old_price,
                                    new_price,
                                    changed_at
                                )
                                VALUES (?, ?, ?, ?, NOW())
                            ");


                        $ph->execute([
                            $data['id'],
                            $userId,
                            $oldPriceValue,
                            $newPriceValue
                        ]);
                    }
                }
            }


            /*
             * ==========================================================
             * FIN DU PUT
             * ==========================================================
             */

            if ($result) {

                /*
                 * Supprimer commande si stock suffisant.
                 */

                if (
                    isset($data['stock']) &&
                    isset($data['threshold'])
                ) {

                    if (
                        (int)$data['stock'] >=
                        (int)$data['threshold']
                    ) {

                        $pdo->prepare("
                            DELETE FROM orders
                            WHERE inventory_id = ?
                        ")->execute([
                            $data['id']
                        ]);
                    }
                }


                ob_end_clean();

                echo json_encode([
                    'success' => true
                ]);

            } else {

                throw new Exception(
                    "Échec de la mise à jour"
                );
            }

            break;


        /*
        |--------------------------------------------------------------------------
        | DELETE
        |--------------------------------------------------------------------------
        */

        case 'DELETE':

            $id =
                isset($_GET['id'])
                    ? intval($_GET['id'])
                    : null;


            if (!$id) {

                throw new Exception(
                    "ID manquant"
                );
            }


            $stmt =
                $pdo->prepare("
                    SELECT file_path, material
                    FROM inventory
                    WHERE id = ?
                ");

            $stmt->execute([$id]);


            $article =
                $stmt->fetch(
                    PDO::FETCH_ASSOC
                );


            $pdo->prepare("
                DELETE FROM orders
                WHERE inventory_id = ?
            ")->execute([$id]);


            $stmt =
                $pdo->prepare("
                    DELETE FROM inventory
                    WHERE id = ?
                ");


            $result =
                $stmt->execute([$id]);


            if ($result) {

                /*
                 * PHOTO : NE PAS MODIFIER
                 */

                if (
                    $article &&
                    $article['file_path']
                ) {

                    deleteFile(
                        $article['file_path']
                    );
                }


                appLog(
                    'inventaire',
                    who() .
                    " a supprimé l'article « " .
                    (
                        $article['material']
                        ?? "id $id"
                    ) .
                    " »"
                );


                ob_end_clean();

                echo json_encode([
                    'success' => true
                ]);

            } else {

                throw new Exception(
                    "Échec de la suppression"
                );
            }

            break;


        default:

            http_response_code(405);

            ob_end_clean();

            echo json_encode([
                'error' => true,
                'message' =>
                    'Méthode non autorisée'
            ]);

            break;
    }


} catch (Exception $e) {

    file_put_contents(
        "$logDir/inventory_error.log",
        date('Y-m-d H:i:s') .
        " - Erreur: " .
        $e->getMessage() .
        "\n",
        FILE_APPEND
    );


    http_response_code(500);

    ob_end_clean();

    error_log(
        date('Y-m-d H:i:s') .
        ' - Inventory error: ' .
        $e->getMessage()
    );


    echo json_encode([
        'error' => true,
        'message' =>
            'Une erreur est survenue'
    ]);
}

?>