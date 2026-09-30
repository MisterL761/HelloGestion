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

if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

require_once __DIR__ . '/log_helper.php';

function sendJson($data, $code = 200)
{
    ob_end_clean();

    http_response_code($code);

    header('Content-Type: application/json; charset=utf-8');

    echo json_encode($data);

    exit;
}

try {

    // ==========================================================
    // AUTHENTIFICATION
    // ==========================================================

    if (!isset($_SESSION['user'])) {
        sendJson(
            [
                'error' => true,
                'message' => 'Non authentifié'
            ],
            401
        );
    }

    require 'db.php';
    require_once __DIR__ . '/roles.php';


    // ==========================================================
    // MIGRATIONS EXISTANTES
    // ==========================================================

    // P9
    try {
        $check = $pdo->query(
            "SHOW COLUMNS FROM received LIKE 'pro_devis'"
        );

        if ($check->rowCount() === 0) {
            $pdo->exec(
                "ALTER TABLE received
                 ADD COLUMN pro_devis
                 TINYINT(1)
                 NOT NULL DEFAULT 0"
            );
        }
    } catch (\PDOException $e) {
        error_log(
            'Migration pro_devis : ' .
            $e->getMessage()
        );
    }


    // Nom de la personne ayant coché P9
    try {
        $check = $pdo->query(
            "SHOW COLUMNS FROM received LIKE 'pro_devis_by'"
        );

        if ($check->rowCount() === 0) {
            $pdo->exec(
                "ALTER TABLE received
                 ADD COLUMN pro_devis_by
                 VARCHAR(100)
                 DEFAULT NULL"
            );
        }
    } catch (\PDOException $e) {
        error_log(
            'Migration pro_devis_by : ' .
            $e->getMessage()
        );
    }


    // Note importante
    try {
        $check = $pdo->query(
            "SHOW COLUMNS FROM received LIKE 'important_note'"
        );

        if ($check->rowCount() === 0) {
            $pdo->exec(
                "ALTER TABLE received
                 ADD COLUMN important_note
                 TEXT
                 DEFAULT NULL"
            );
        }
    } catch (\PDOException $e) {
        error_log(
            'Migration important_note : ' .
            $e->getMessage()
        );
    }


    // ==========================================================
    // NOUVELLE COLONNE LOCATION
    // ==========================================================
    //
    // On essaie de la créer automatiquement.
    //
    // IMPORTANT :
    // si MySQL refuse la modification de structure,
    // le site continue quand même à afficher les produits.
    //
    // Dans ce cas les anciens produits sont considérés
    // comme étant au Dépôt.
    //
    // ==========================================================

    $hasLocationColumn = false;

    try {

        $checkLocation = $pdo->query(
            "SHOW COLUMNS FROM received LIKE 'location'"
        );

        if ($checkLocation->rowCount() > 0) {

            $hasLocationColumn = true;

        } else {

            try {

                $pdo->exec(
                    "ALTER TABLE received
                     ADD COLUMN location
                     VARCHAR(20)
                     NOT NULL
                     DEFAULT 'Dépôt'"
                );

            } catch (\PDOException $e) {

                error_log(
                    'Création colonne location : ' .
                    $e->getMessage()
                );
            }


            // On vérifie réellement si la colonne existe maintenant

            $checkLocationAgain = $pdo->query(
                "SHOW COLUMNS FROM received LIKE 'location'"
            );

            $hasLocationColumn =
                $checkLocationAgain->rowCount() > 0;
        }

    } catch (\PDOException $e) {

        error_log(
            'Vérification colonne location : ' .
            $e->getMessage()
        );

        $hasLocationColumn = false;
    }


    // ==========================================================
    // ROUTES
    // ==========================================================

    switch ($_SERVER['REQUEST_METHOD']) {


        // ======================================================
        // GET
        // ======================================================

        case 'GET':

            // Si location existe :
            //     on récupère la vraie valeur.
            //
            // Sinon :
            //     on renvoie "Dépôt" pour tous les anciens produits.
            //

            if ($hasLocationColumn) {

                $locationSelect = "location";

            } else {

                $locationSelect = "'Dépôt' AS location";
            }


            $stmt = $pdo->query(
                "SELECT
                    id,
                    product,
                    supplier,
                    client,
                    {$locationSelect},
                    photo_path,
                    additional_photos,
                    DATE_FORMAT(
                        date,
                        '%d/%m/%Y'
                    ) AS date,
                    'Reçu' AS status,
                    pro_devis,
                    pro_devis_by,
                    important_note
                 FROM received
                 ORDER BY received.date DESC"
            );


            $result =
                $stmt->fetchAll(
                    PDO::FETCH_ASSOC
                );


            foreach ($result as &$item) {

                $photos_paths = [];


                // Photo principale

                if (
                    !empty(
                        $item['photo_path']
                    )
                ) {

                    $photos_paths[] =
                        $item['photo_path'];
                }


                // Photos supplémentaires

                if (
                    !empty(
                        $item['additional_photos']
                    )
                ) {

                    $additionalPhotos =
                        json_decode(
                            $item['additional_photos'],
                            true
                        );


                    if (
                        is_array(
                            $additionalPhotos
                        )
                    ) {

                        $photos_paths =
                            array_merge(
                                $photos_paths,
                                $additionalPhotos
                            );
                    }
                }


                $item['photos_paths'] =
                    $photos_paths;


                unset(
                    $item['additional_photos']
                );


                // Sécurité pour les anciennes données

                if (
                    !isset(
                        $item['location']
                    ) ||
                    !in_array(
                        $item['location'],
                        ['MAG', 'Dépôt'],
                        true
                    )
                ) {

                    $item['location'] =
                        'Dépôt';
                }
            }


            sendJson($result);

            break;


        // ======================================================
        // POST
        // ======================================================

        case 'POST':

            // --------------------------------------------------
            // Données générales
            // --------------------------------------------------

            $product =
                !empty(
                    $_POST['product']
                )
                    ? $_POST['product']
                    : 'Commande';


            $supplier =
                !empty(
                    $_POST['supplier']
                )
                    ? $_POST['supplier']
                    : 'Dépôt';


            $client =
                $_POST['client']
                ?? null;


            $date =
                $_POST['date']
                ?? date('Y-m-d');


            $action =
                $_POST['action']
                ?? 'create';


            // --------------------------------------------------
            // Emplacement
            // --------------------------------------------------

            $location =
                $_POST['location']
                ?? 'Dépôt';


            if (
                !in_array(
                    $location,
                    ['MAG', 'Dépôt'],
                    true
                )
            ) {

                $location =
                    'Dépôt';
            }


            // ==================================================
            // CHANGER L'EMPLACEMENT
            // ==================================================

            if (
                $action ===
                'update_location'
            ) {

                $id =
                    intval(
                        $_POST['id']
                        ?? 0
                    );


                if (!$id) {

                    throw new Exception(
                        "ID manquant"
                    );
                }


                if (!$hasLocationColumn) {

                    throw new Exception(
                        "La colonne d'emplacement n'est pas disponible dans la base de données."
                    );
                }


                $newLocation =
                    $_POST['location']
                    ?? 'Dépôt';


                if (
                    !in_array(
                        $newLocation,
                        ['MAG', 'Dépôt'],
                        true
                    )
                ) {

                    $newLocation =
                        'Dépôt';
                }


                $stmt =
                    $pdo->prepare(
                        "UPDATE received
                         SET location = ?
                         WHERE id = ?"
                    );


                $success =
                    $stmt->execute(
                        [
                            $newLocation,
                            $id
                        ]
                    );


                if (!$success) {

                    throw new Exception(
                        "Erreur SQL lors de la modification de l'emplacement."
                    );
                }


                sendJson(
                    [
                        'success' =>
                            true,

                        'location' =>
                            $newLocation
                    ]
                );
            }


            // ==================================================
            // CLIENT OBLIGATOIRE
            // ==================================================

            if (!$client) {

                throw new Exception(
                    "Le nom du client est requis."
                );
            }


            // ==================================================
            // GESTION DES UPLOADS
            // ==================================================

            $uploadDir =
                __DIR__ .
                '/uploads/';


            if (
                !file_exists(
                    $uploadDir
                )
            ) {

                mkdir(
                    $uploadDir,
                    0755,
                    true
                );
            }


            $photoPath =
                null;


            $additionalPhotos =
                [];


            $allPhotoPaths =
                [];


            // ==================================================
            // PHOTO PRINCIPALE
            // ==================================================

            if (
                isset(
                    $_FILES['photo']
                ) &&
                $_FILES['photo']['error']
                === UPLOAD_ERR_OK
            ) {

                require_once
                    __DIR__ .
                    '/security.php';


                validateUploadedFile(
                    $_FILES['photo']
                );


                $ext =
                    strtolower(
                        pathinfo(
                            $_FILES['photo']['name'],
                            PATHINFO_EXTENSION
                        )
                    );


                $allowedExts = [
                    'jpg',
                    'jpeg',
                    'png',
                    'gif',
                    'webp',
                    'pdf'
                ];


                if (
                    !in_array(
                        $ext,
                        $allowedExts,
                        true
                    )
                ) {

                    sendJson(
                        [
                            'success' =>
                                false,

                            'message' =>
                                'Type de fichier non autorisé.'
                        ],
                        400
                    );
                }


                $finfo =
                    finfo_open(
                        FILEINFO_MIME_TYPE
                    );


                $mime =
                    finfo_file(
                        $finfo,
                        $_FILES['photo']['tmp_name']
                    );


                finfo_close(
                    $finfo
                );


                $allowedMimes = [
                    'image/jpeg',
                    'image/png',
                    'image/gif',
                    'image/webp',
                    'application/pdf'
                ];


                if (
                    !in_array(
                        $mime,
                        $allowedMimes,
                        true
                    )
                ) {

                    sendJson(
                        [
                            'success' =>
                                false,

                            'message' =>
                                'Type de fichier non autorisé.'
                        ],
                        400
                    );
                }


                $name =
                    uniqid() .
                    '.' .
                    $ext;


                if (
                    move_uploaded_file(
                        $_FILES['photo']['tmp_name'],
                        $uploadDir .
                        $name
                    )
                ) {

                    $photoPath =
                        'uploads/' .
                        $name;


                    $allPhotoPaths[] =
                        $photoPath;
                }
            }


            // ==================================================
            // PHOTOS SUPPLÉMENTAIRES
            // ==================================================

            if (
                isset(
                    $_FILES['additional_photos']
                ) &&
                is_array(
                    $_FILES['additional_photos']['name']
                )
            ) {

                $count =
                    count(
                        $_FILES['additional_photos']['name']
                    );


                for (
                    $i = 0;
                    $i < $count;
                    $i++
                ) {

                    if (
                        $_FILES['additional_photos']['error'][$i]
                        !== UPLOAD_ERR_OK
                    ) {

                        continue;
                    }


                    $ext =
                        strtolower(
                            pathinfo(
                                $_FILES['additional_photos']['name'][$i],
                                PATHINFO_EXTENSION
                            )
                        );


                    $allowedExtsAdd = [
                        'jpg',
                        'jpeg',
                        'png',
                        'gif',
                        'webp',
                        'pdf'
                    ];


                    if (
                        !in_array(
                            $ext,
                            $allowedExtsAdd,
                            true
                        )
                    ) {

                        continue;
                    }


                    $finfoAdd =
                        finfo_open(
                            FILEINFO_MIME_TYPE
                        );


                    $mimeAdd =
                        finfo_file(
                            $finfoAdd,
                            $_FILES['additional_photos']['tmp_name'][$i]
                        );


                    finfo_close(
                        $finfoAdd
                    );


                    $allowedMimesAdd = [
                        'image/jpeg',
                        'image/png',
                        'image/gif',
                        'image/webp',
                        'application/pdf'
                    ];


                    if (
                        !in_array(
                            $mimeAdd,
                            $allowedMimesAdd,
                            true
                        )
                    ) {

                        continue;
                    }


                    $name =
                        uniqid() .
                        '.' .
                        $ext;


                    if (
                        move_uploaded_file(
                            $_FILES['additional_photos']['tmp_name'][$i],
                            $uploadDir .
                            $name
                        )
                    ) {

                        $p =
                            'uploads/' .
                            $name;


                        $additionalPhotos[] =
                            $p;


                        $allPhotoPaths[] =
                            $p;
                    }
                }
            }


            // ==================================================
            // UPDATE AVEC PHOTOS
            // ==================================================

            if (
                $action ===
                'update_with_photos' &&
                isset(
                    $_POST['id']
                )
            ) {

                $id =
                    intval(
                        $_POST['id']
                    );


                // Récupérer les photos existantes

                $stmt =
                    $pdo->prepare(
                        "SELECT
                            photo_path,
                            additional_photos
                         FROM received
                         WHERE id = ?"
                    );


                $stmt->execute(
                    [$id]
                );


                $existing =
                    $stmt->fetch(
                        PDO::FETCH_ASSOC
                    );


                $existAdd =
                    (
                        $existing &&
                        !empty(
                            $existing[
                                'additional_photos'
                            ]
                        )
                    )
                        ? json_decode(
                            $existing[
                                'additional_photos'
                            ],
                            true
                        )
                        : [];


                $merged =
                    array_merge(
                        is_array($existAdd)
                            ? $existAdd
                            : [],
                        $additionalPhotos
                    );


                // ----------------------------------------------
                // Si location existe, on la conserve.
                // Sinon on utilise l'ancienne structure.
                // ----------------------------------------------

                if ($hasLocationColumn) {

                    $locationValue =
                        isset(
                            $_POST['location']
                        )
                            ? (
                                $_POST['location'] ===
                                'MAG'
                                    ? 'MAG'
                                    : 'Dépôt'
                            )
                            : null;


                    $stmt =
                        $pdo->prepare(
                            "UPDATE received
                             SET
                                product = ?,
                                supplier = ?,
                                client = ?,
                                location =
                                    COALESCE(
                                        ?,
                                        location
                                    ),
                                date = ?,
                                photo_path =
                                    COALESCE(
                                        ?,
                                        photo_path
                                    ),
                                additional_photos = ?
                             WHERE id = ?"
                        );


                    $res =
                        $stmt->execute(
                            [
                                $product,
                                $supplier,
                                $client,
                                $locationValue,
                                $date,
                                $photoPath,
                                json_encode(
                                    $merged
                                ),
                                $id
                            ]
                        );

                } else {

                    $stmt =
                        $pdo->prepare(
                            "UPDATE received
                             SET
                                product = ?,
                                supplier = ?,
                                client = ?,
                                date = ?,
                                photo_path =
                                    COALESCE(
                                        ?,
                                        photo_path
                                    ),
                                additional_photos = ?
                             WHERE id = ?"
                        );


                    $res =
                        $stmt->execute(
                            [
                                $product,
                                $supplier,
                                $client,
                                $date,
                                $photoPath,
                                json_encode(
                                    $merged
                                ),
                                $id
                            ]
                        );
                }


                if ($res) {

                    $stmt =
                        $pdo->prepare(
                            "SELECT
                                photo_path,
                                additional_photos
                             FROM received
                             WHERE id = ?"
                        );


                    $stmt->execute(
                        [$id]
                    );


                    $upd =
                        $stmt->fetch(
                            PDO::FETCH_ASSOC
                        );


                    $finalPaths =
                        [];


                    if (
                        !empty(
                            $upd['photo_path']
                        )
                    ) {

                        $finalPaths[] =
                            $upd['photo_path'];
                    }


                    if (
                        !empty(
                            $upd['additional_photos']
                        )
                    ) {

                        $dec =
                            json_decode(
                                $upd[
                                    'additional_photos'
                                ],
                                true
                            );


                        if (
                            is_array($dec)
                        ) {

                            $finalPaths =
                                array_merge(
                                    $finalPaths,
                                    $dec
                                );
                        }
                    }


                    sendJson(
                        [
                            'success' =>
                                true,

                            'id' =>
                                $id,

                            'photos_paths' =>
                                $finalPaths
                        ]
                    );

                } else {

                    throw new Exception(
                        "Erreur SQL lors de la mise à jour"
                    );
                }
            }


            // ==================================================
            // INSERTION
            // ==================================================

            if ($hasLocationColumn) {

                $stmt =
                    $pdo->prepare(
                        "INSERT INTO received
                        (
                            product,
                            supplier,
                            client,
                            location,
                            photo_path,
                            additional_photos,
                            date
                        )
                        VALUES (?, ?, ?, ?, ?, ?, ?)"
                    );


                $res =
                    $stmt->execute(
                        [
                            $product,
                            $supplier,
                            $client,
                            $location,
                            $photoPath,
                            json_encode(
                                $additionalPhotos
                            ),
                            $date
                        ]
                    );

            } else {

                // Si la colonne n'a pas pu être créée,
                // on garde exactement l'ancien fonctionnement.

                $stmt =
                    $pdo->prepare(
                        "INSERT INTO received
                        (
                            product,
                            supplier,
                            client,
                            photo_path,
                            additional_photos,
                            date
                        )
                        VALUES (?, ?, ?, ?, ?, ?)"
                    );


                $res =
                    $stmt->execute(
                        [
                            $product,
                            $supplier,
                            $client,
                            $photoPath,
                            json_encode(
                                $additionalPhotos
                            ),
                            $date
                        ]
                    );
            }


            if ($res) {

                $id =
                    $pdo->lastInsertId();


                appLog(
                    'actions',
                    who() .
                    " a enregistré « $product » pour le client $client (fournisseur : $supplier, id: $id)"
                );


                notifyAll(
                    $pdo,
                    '📦 Produit reçu',
                    "« $product » reçu — Client : $client, Fournisseur : $supplier",
                    [
                        'url' =>
                            '/hello-gestion/'
                    ]
                );


                sendJson(
                    [
                        'success' =>
                            true,

                        'id' =>
                            $id,

                        'photo_path' =>
                            $photoPath,

                        'photos_paths' =>
                            $allPhotoPaths,

                        'location' =>
                            $location
                    ]
                );

            } else {

                throw new Exception(
                    "Erreur SQL lors de l'insertion"
                );
            }


            break;


        // ======================================================
        // PATCH
        // ======================================================

        case 'PATCH':

            $data =
                json_decode(
                    file_get_contents(
                        'php://input'
                    ),
                    true
                );


            if (
                !isset(
                    $data['id']
                )
            ) {

                throw new Exception(
                    "ID requis"
                );
            }


            // --------------------------------------------------
            // P9
            // --------------------------------------------------

            if (
                isset(
                    $data['pro_devis']
                )
            ) {

                $val =
                    (int)(
                        (bool)
                        $data['pro_devis']
                    );


                $by =
                    $val
                        ? (
                            $_SESSION[
                                'user'
                            ]['name']
                            ??
                            'Inconnu'
                        )
                        : null;


                $stmt =
                    $pdo->prepare(
                        "UPDATE received
                         SET
                            pro_devis = ?,
                            pro_devis_by = ?
                         WHERE id = ?"
                    );


                $stmt->execute(
                    [
                        $val,
                        $by,
                        (int)$data['id']
                    ]
                );


                sendJson(
                    [
                        'success' =>
                            true,

                        'pro_devis_by' =>
                            $by
                    ]
                );
            }


            // --------------------------------------------------
            // NOTE IMPORTANTE
            // --------------------------------------------------

            if (
                array_key_exists(
                    'important_note',
                    $data
                )
            ) {

                $note =
                    trim(
                        (string)
                        $data[
                            'important_note'
                        ]
                    );


                if (
                    $note ===
                    ''
                ) {

                    $note =
                        null;
                }


                $stmt =
                    $pdo->prepare(
                        "UPDATE received
                         SET
                            important_note = ?
                         WHERE id = ?"
                    );


                $stmt->execute(
                    [
                        $note,
                        (int)$data['id']
                    ]
                );


                appLog(
                    'actions',
                    who() .
                    (
                        $note === null
                            ? " a retiré la note importante du produit #{$data['id']}"
                            : " a ajouté une note importante sur le produit #{$data['id']}"
                    )
                );


                sendJson(
                    [
                        'success' =>
                            true,

                        'important_note' =>
                            $note
                    ]
                );
            }


            throw new Exception(
                "Champ non reconnu"
            );


        // ======================================================
        // PUT
        // ======================================================

        case 'PUT':

            $input =
                file_get_contents(
                    'php://input'
                );


            $data =
                json_decode(
                    $input,
                    true
                );


            if (
                !isset($data['id']) ||
                !isset($data['client'])
            ) {

                throw new Exception(
                    "ID et Client requis"
                );
            }


            // Si la colonne existe, on la conserve.
            // Si aucune location n'est envoyée,
            // COALESCE conserve l'ancienne valeur.

            if ($hasLocationColumn) {

                $locationValue =
                    null;


                if (
                    isset(
                        $data['location']
                    )
                ) {

                    $locationValue =
                        $data['location'] ===
                        'MAG'
                            ? 'MAG'
                            : 'Dépôt';
                }


                $stmt =
                    $pdo->prepare(
                        "UPDATE received
                         SET
                            product = ?,
                            supplier = ?,
                            client = ?,
                            location =
                                COALESCE(
                                    ?,
                                    location
                                ),
                            date = ?
                         WHERE id = ?"
                    );


                $res =
                    $stmt->execute(
                        [
                            $data['product']
                                ?? 'Commande',

                            $data['supplier']
                                ?? 'Dépôt',

                            $data['client'],

                            $locationValue,

                            $data['date']
                                ?? date('Y-m-d'),

                            $data['id']
                        ]
                    );

            } else {

                $stmt =
                    $pdo->prepare(
                        "UPDATE received
                         SET
                            product = ?,
                            supplier = ?,
                            client = ?,
                            date = ?
                         WHERE id = ?"
                    );


                $res =
                    $stmt->execute(
                        [
                            $data['product']
                                ?? 'Commande',

                            $data['supplier']
                                ?? 'Dépôt',

                            $data['client'],

                            $data['date']
                                ?? date('Y-m-d'),

                            $data['id']
                        ]
                    );
            }


            if ($res) {

                sendJson(
                    [
                        'success' =>
                            true
                    ]
                );

            } else {

                throw new Exception(
                    "Erreur SQL mise à jour"
                );
            }


            break;


        // ======================================================
        // DELETE
        // ======================================================

        case 'DELETE':

            $jsonData =
                json_decode(
                    file_get_contents(
                        'php://input'
                    ),
                    true
                );


            $id =
                $_GET['id']
                ??
                (
                    $_POST['id']
                    ??
                    (
                        $jsonData['id']
                        ??
                        null
                    )
                );


            if (!$id) {

                throw new Exception(
                    "ID manquant"
                );
            }


            // Récupérer les photos avant suppression

            $stmt =
                $pdo->prepare(
                    "SELECT
                        photo_path,
                        additional_photos
                     FROM received
                     WHERE id = ?"
                );


            $stmt->execute(
                [$id]
            );


            $prod =
                $stmt->fetch(
                    PDO::FETCH_ASSOC
                );


            // Supprimer le produit

            $stmt =
                $pdo->prepare(
                    "DELETE FROM received
                     WHERE id = ?"
                );


            if (
                $stmt->execute(
                    [$id]
                )
            ) {

                if ($prod) {

                    require_once
                        __DIR__ .
                        '/security.php';


                    // Photo principale

                    if (
                        !empty(
                            $prod[
                                'photo_path'
                            ]
                        )
                    ) {

                        $safePath =
                            validateUploadPath(
                                $prod[
                                    'photo_path'
                                ],
                                __DIR__
                            );


                        if (
                            $safePath &&
                            file_exists(
                                $safePath
                            )
                        ) {

                            @unlink(
                                $safePath
                            );
                        }
                    }


                    // Photos supplémentaires

                    if (
                        !empty(
                            $prod[
                                'additional_photos'
                            ]
                        )
                    ) {

                        $arr =
                            json_decode(
                                $prod[
                                    'additional_photos'
                                ],
                                true
                            );


                        if (
                            is_array($arr)
                        ) {

                            foreach (
                                $arr
                                as $p
                            ) {

                                $safePath =
                                    validateUploadPath(
                                        $p,
                                        __DIR__
                                    );


                                if (
                                    $safePath &&
                                    file_exists(
                                        $safePath
                                    )
                                ) {

                                    @unlink(
                                        $safePath
                                    );
                                }
                            }
                        }
                    }
                }


                sendJson(
                    [
                        'success' =>
                            true
                    ]
                );

            } else {

                throw new Exception(
                    "Erreur SQL suppression"
                );
            }


            break;


        // ======================================================
        // MÉTHODE INCONNUE
        // ======================================================

        default:

            sendJson(
                [
                    'error' =>
                        true,

                    'message' =>
                        'Méthode non autorisée'
                ],
                405
            );
    }


} catch (Exception $e) {

    file_put_contents(
        "$logDir/received_error.log",
        date('Y-m-d H:i:s') .
        " - " .
        $e->getMessage() .
        "\n",
        FILE_APPEND
    );


    error_log(
        date('Y-m-d H:i:s') .
        ' - Received error: ' .
        $e->getMessage()
    );


    sendJson(
        [
            'error' =>
                true,

            'message' =>
                'Une erreur est survenue'
        ],
        500
    );
}

?>