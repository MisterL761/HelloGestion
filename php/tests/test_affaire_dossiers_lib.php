<?php
declare(strict_types=1);
require_once __DIR__ . '/../affaire_dossiers_lib.php';

$n = 0;
function ok(bool $cond, string $msg): void {
    global $n; $n++;
    if (!$cond) { fwrite(STDERR, "ECHEC: $msg\n"); exit(1); }
}

// dossierNormRole : casse + accents
ok(dossierNormRole('Gérant')   === 'gerant', 'Gérant -> gerant');
ok(dossierNormRole('GÉRANT')   === 'gerant', 'GÉRANT -> gerant');
ok(dossierNormRole('  gerant ') === 'gerant', 'trim + minuscule');
ok(dossierNormRole('Administration') === 'administration', 'Administration -> administration');

// dossierIsManagement
ok(dossierIsManagement('Gérant')        === true,  'Gérant = gestion');
ok(dossierIsManagement('admin')         === true,  'admin = gestion');
ok(dossierIsManagement('administration')=== true,  'administration = gestion');
ok(dossierIsManagement('collaborateur') === false, 'collaborateur != gestion');
ok(dossierIsManagement('commercial')    === false, 'commercial != gestion');
ok(dossierIsManagement('')              === false, 'vide != gestion');

// dossierCanMove
ok(dossierCanMove('Gérant', 5, 99)        === true,  'gestion deplace toute affaire');
ok(dossierCanMove('collaborateur', 5, 5)  === true,  'collaborateur deplace la sienne');
ok(dossierCanMove('collaborateur', 5, 9)  === false, "collaborateur ne deplace pas celle d'un autre");
ok(dossierCanMove('collaborateur', 5, null) === false, 'collaborateur ne deplace pas une non assignée');

fwrite(STDOUT, "OK : $n assertions\n");
