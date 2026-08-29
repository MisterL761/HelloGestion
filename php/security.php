<?php
/**
 * security.php — Headers de sécurité et CORS centralisés
 * À inclure en haut de chaque fichier PHP avant tout autre output.
 */

if (!defined('ALLOWED_ORIGIN')) {
    require_once __DIR__ . '/config.php';
}

/**
 * Applique les headers CORS corrects + headers de sécurité HTTP.
 * Gère aussi la pré-vérification OPTIONS (pre-flight).
 */
function setSecurityHeaders(): void {
    $origin = ALLOWED_ORIGIN;

    // CORS — origine unique autorisée (jamais *)
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Access-Control-Allow-Credentials: true');

    // Anti-clickjacking
    header('X-Frame-Options: DENY');

    // Empêche le MIME sniffing
    header('X-Content-Type-Options: nosniff');

    // XSS Protection (pour vieux navigateurs)
    header('X-XSS-Protection: 1; mode=block');

    // Referrer policy
    header('Referrer-Policy: strict-origin-when-cross-origin');

    // Force HTTPS pour 1 an
    header('Strict-Transport-Security: max-age=31536000; includeSubDomains');

    // Content Security Policy
    header("Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; object-src 'none'; frame-ancestors 'none'");

    // Pré-vérification CORS (pre-flight) — répondre et sortir immédiatement
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit(0);
    }
}

/**
 * Valide qu'un chemin de fichier est bien dans le répertoire uploads autorisé.
 * Protège contre les attaques de type path traversal.
 *
 * @param  string $relativePath  Chemin relatif stocké en BDD (ex: "uploads/photo.jpg")
 * @param  string $baseDir       Répertoire PHP courant (__DIR__)
 * @return string|null           Chemin absolu validé, ou null si invalide
 */
function validateUploadPath(string $relativePath, string $baseDir): ?string {
    if (empty($relativePath)) return null;

    // On ne permet que les chemins commençant par "uploads/"
    $relativePath = ltrim($relativePath, '/');
    if (!preg_match('#^uploads/[a-zA-Z0-9_./-]+$#', $relativePath)) {
        error_log("Security: chemin de fichier invalide rejeté: $relativePath");
        return null;
    }

    $fullPath  = realpath($baseDir . '/' . $relativePath);
    $allowedDir = realpath($baseDir . '/uploads');

    if (!$fullPath || !$allowedDir) return null;

    // S'assurer que le fichier est bien dans le dossier uploads
    if (strpos($fullPath, $allowedDir . DIRECTORY_SEPARATOR) !== 0 && $fullPath !== $allowedDir) {
        error_log("Security: tentative d'accès hors uploads: $relativePath");
        return null;
    }

    return $fullPath;
}

/**
 * Vérifie un upload de fichier : extension + MIME réel via finfo.
 * Retourne true si valide, lève une Exception sinon.
 */
function validateUploadedFile(array $file): void {
    $allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'];
    $allowedMimes      = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];

    $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!in_array($extension, $allowedExtensions, true)) {
        throw new Exception("Extension de fichier non autorisée : .$extension");
    }

    if ($file['size'] > 5 * 1024 * 1024) {
        throw new Exception("Fichier trop volumineux (max 5 Mo)");
    }

    // Vérification MIME réelle via finfo (ignore le type déclaré par le client)
    if (function_exists('finfo_open')) {
        $finfo    = finfo_open(FILEINFO_MIME_TYPE);
        $realMime = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);
        if (!in_array($realMime, $allowedMimes, true)) {
            throw new Exception("Type de fichier non autorisé (détecté : $realMime)");
        }
    } else {
        // Fallback si finfo non disponible
        if (!in_array($file['type'], $allowedMimes, true)) {
            throw new Exception("Type de fichier non autorisé");
        }
    }
}

/**
 * Retourne un message d'erreur générique côté client
 * tout en loggant le vrai message côté serveur.
 */
function safeError(string $realMessage, string $logFile = ''): string {
    if ($logFile) {
        error_log(date('Y-m-d H:i:s') . " - $realMessage\n");
    } else {
        error_log($realMessage);
    }
    return "Une erreur est survenue. Veuillez réessayer.";
}
