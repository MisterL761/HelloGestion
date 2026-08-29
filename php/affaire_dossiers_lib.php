<?php
declare(strict_types=1);

/** Normalise un rôle : minuscule + suppression des accents français. */
function dossierNormRole(string $role): string {
    $r = function_exists('mb_strtolower') ? mb_strtolower(trim($role), 'UTF-8') : strtolower(trim($role));
    return strtr($r, [
        'é'=>'e','è'=>'e','ê'=>'e','ë'=>'e','à'=>'a','â'=>'a','ä'=>'a',
        'î'=>'i','ï'=>'i','ô'=>'o','ö'=>'o','ù'=>'u','û'=>'u','ü'=>'u','ç'=>'c',
    ]);
}

/** Rôle de gestion (peut créer/renommer/supprimer des dossiers) ? */
function dossierIsManagement(string $role): bool {
    return in_array(dossierNormRole($role), ['admin', 'gerant', 'administration'], true);
}

/**
 * L'utilisateur peut-il déplacer cette affaire ?
 * Gestion : oui pour toutes. Sinon : seulement si l'affaire lui est assignée.
 */
function dossierCanMove(string $role, int $userId, ?int $assignedTo): bool {
    if (dossierIsManagement($role)) return true;
    return $assignedTo !== null && $assignedTo === $userId;
}

/** Crée la table des dossiers et les colonnes affaires liées si absentes. Idempotent. */
function ensureDossierTables(PDO $pdo): void {
    $pdo->exec("CREATE TABLE IF NOT EXISTS affaire_dossiers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        position INT NOT NULL DEFAULT 0,
        is_system TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $hasCol = $pdo->query("SHOW COLUMNS FROM affaires LIKE 'dossier_id'")->fetch();
    if (!$hasCol) {
        $pdo->exec("ALTER TABLE affaires ADD COLUMN dossier_id INT NULL DEFAULT NULL");
    }

    $hasSystemCol = $pdo->query("SHOW COLUMNS FROM affaire_dossiers LIKE 'is_system'")->fetch();
    if (!$hasSystemCol) {
        $pdo->exec("ALTER TABLE affaire_dossiers ADD COLUMN is_system TINYINT(1) NOT NULL DEFAULT 0");
    }

    $hasPayeeCol = $pdo->query("SHOW COLUMNS FROM affaires LIKE 'commission_payee'")->fetch();
    if (!$hasPayeeCol) {
        $pdo->exec("ALTER TABLE affaires ADD COLUMN commission_payee TINYINT(1) NOT NULL DEFAULT 0");
    }

    $hasPrevDossierCol = $pdo->query("SHOW COLUMNS FROM affaires LIKE 'dossier_id_before_payee'")->fetch();
    if (!$hasPrevDossierCol) {
        $pdo->exec("ALTER TABLE affaires ADD COLUMN dossier_id_before_payee INT NULL DEFAULT NULL");
    }
}

/**
 * Retourne l'id du dossier système « Payé », en le créant s'il n'existe pas encore.
 * Ce dossier est protégé : non renommable/supprimable, et non accessible au déplacement manuel.
 */
function ensurePayeDossier(PDO $pdo): int {
    $stmt = $pdo->query("SELECT id FROM affaire_dossiers WHERE is_system = 1 LIMIT 1");
    $row  = $stmt->fetch();
    if ($row) return (int)$row['id'];

    $pos = (int)$pdo->query("SELECT COALESCE(MAX(position),0) FROM affaire_dossiers")->fetchColumn() + 1;
    $pdo->prepare("INSERT INTO affaire_dossiers (name, position, is_system) VALUES ('Payé', ?, 1)")
        ->execute([$pos]);
    return (int)$pdo->lastInsertId();
}
