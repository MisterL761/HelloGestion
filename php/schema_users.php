<?php
/**
 * Colonnes de la table users ajoutées après la création initiale.
 * Elles sont créées si elles manquent (nouvelle base, base du site dev…).
 * Aucune donnée existante n'est modifiée.
 */
function ensureUsersSchema(PDO $pdo): void
{
    $stmt = $pdo->query("
        SELECT COUNT(*)
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'users'
          AND COLUMN_NAME = 'commission_access'
    ");

    if ((int) $stmt->fetchColumn() === 0) {
        // Droit d'accès à la Commission : désactivé par défaut
        $pdo->exec("ALTER TABLE users ADD COLUMN commission_access TINYINT(1) NOT NULL DEFAULT 0");
    }
}
