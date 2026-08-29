<?php
/**
 * Helper de log — messages lisibles par un humain.
 * Usage : appLog('inventaire', who() . " a retiré 5x « Compribande » du stock (20 → 15)");
 */

function appLog(string $category, string $message): void {
    $logDir = __DIR__ . '/logs';
    if (!file_exists($logDir)) mkdir($logDir, 0755, true);
    file_put_contents("$logDir/{$category}.log", date('Y-m-d H:i:s') . " - $message\n", FILE_APPEND);
}

/**
 * Retourne "Prénom (id X)" pour l'utilisateur en session.
 */
function who(): string {
    $name = $_SESSION['user']['name'] ?? 'Inconnu';
    $id   = $_SESSION['user']['id']   ?? '?';
    return "$name (id $id)";
}
