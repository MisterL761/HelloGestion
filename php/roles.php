<?php
// ============================================================
// RBAC — Rôles et permissions Hello Gestion
// ============================================================

// Rôles disponibles
const ROLES_ALL = ['admin', 'gerant', 'administration', 'chef_equipe', 'commercial', 'poseur', 'collaborateur'];

// Rôles ayant accès au Dashboard
const ROLES_DASHBOARD = ['admin', 'gerant', 'administration'];

// Rôles ayant accès aux Logs techniques
const ROLES_LOGS = ['admin'];

// Rôles pouvant voir et gérer les casiers de tous les utilisateurs
const ROLES_ALL_CASIERS = ['admin', 'gerant', 'administration'];

// Rôles pouvant valider/rejeter les notes de frais
const ROLES_FRAIS_VALIDATION = ['admin', 'gerant'];

// Rôles pouvant superviser les commissions
const ROLES_COMMISSIONS = ['admin', 'gerant'];

// Affichage lisible des rôles
const ROLES_LABELS = [
    'admin'          => 'Administrateur',
    'gerant'         => 'Gérant',
    'administration' => 'Administration',
    'chef_equipe'    => "Chef d'équipe",
    'commercial'     => 'Commercial',
    'poseur'         => 'Poseur',
    'collaborateur'  => 'Collaborateur',
];

// ── Helpers ─────────────────────────────────────────────────

/**
 * Bloque la requête si l'utilisateur n'est pas authentifié.
 * Retourne les données de session de l'utilisateur.
 */
function requireAuth(): array {
    if (!isset($_SESSION['user'])) {
        http_response_code(401);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['success' => false, 'message' => 'Non authentifié']);
        exit;
    }
    return $_SESSION['user'];
}

/**
 * Bloque la requête si l'utilisateur n'a pas l'un des rôles autorisés.
 * Retourne les données de session de l'utilisateur.
 */
function requireRole(array $allowedRoles): array {
    $user = requireAuth();
    if (!in_array($user['role'], $allowedRoles, true)) {
        http_response_code(403);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['success' => false, 'message' => 'Accès refusé']);
        exit;
    }
    return $user;
}

function hasRole(string $role): bool {
    return isset($_SESSION['user']) && $_SESSION['user']['role'] === $role;
}

function hasAnyRole(array $roles): bool {
    return isset($_SESSION['user']) && in_array($_SESSION['user']['role'], $roles, true);
}

function canAccessDashboard(): bool  { return hasAnyRole(ROLES_DASHBOARD); }
function canAccessLogs(): bool       { return hasAnyRole(ROLES_LOGS); }
function canViewAllCasiers(): bool   { return hasAnyRole(ROLES_ALL_CASIERS); }
function canValidateExpenses(): bool { return hasAnyRole(ROLES_FRAIS_VALIDATION); }
function canViewCommissions(): bool  { return hasAnyRole(ROLES_COMMISSIONS); }




function getCurrentUser(): ?array {
    return $_SESSION['user'] ?? null;
}

function getCurrentUserId(): ?int {
    return isset($_SESSION['user']['id']) ? (int)$_SESSION['user']['id'] : null;
}

