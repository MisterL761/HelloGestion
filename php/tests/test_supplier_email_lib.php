<?php
declare(strict_types=1);
if (!defined('EMAILS_ENC_KEY')) define('EMAILS_ENC_KEY', 'cle-de-test-32-caracteres-mini!!');
require_once __DIR__ . '/../supplier_email_lib.php';

$n = 0;
function ok(bool $cond, string $msg): void {
    global $n; $n++;
    if (!$cond) { fwrite(STDERR, "ECHEC: $msg\n"); exit(1); }
}

// normalizeText : casse + accents
ok(normalizeText('Commandé') === 'commande', 'normalize accents');
ok(normalizeText('  ARC  ') === 'arc', 'normalize trim+casse');
ok(normalizeText('à â ä ê ë è ù û ü ô ö î ï ç') === 'a a a e e e u u u o o i i c', 'normalize tous accents francais');

$rules = [
    ['supplier_id' => 1, 'sender_pattern' => '@somfy.fr',           'subject_keywords' => 'commande, ARC'],
    ['supplier_id' => 2, 'sender_pattern' => 'arc@bubendorff.fr',   'subject_keywords' => null],
    ['supplier_id' => 3, 'sender_pattern' => null,                  'subject_keywords' => 'accusé de réception de commande'],
];

// domaine + mot-clé requis ensemble
ok(matchSupplierRule('noreply@somfy.fr', 'Votre ARC n°123', $rules) === 1, 'domaine+keyword matche');
ok(matchSupplierRule('noreply@somfy.fr', 'Newsletter été', $rules) === null, 'domaine sans keyword ignoré');
// adresse exacte, insensible casse
ok(matchSupplierRule('ARC@Bubendorff.FR', 'peu importe', $rules) === 2, 'adresse exacte casse');
ok(matchSupplierRule('autre@bubendorff.fr', 'peu importe', $rules) === null, 'adresse exacte stricte');
// mot-clé seul, insensible accents
ok(matchSupplierRule('x@inconnu.com', 'ACCUSE DE RECEPTION DE COMMANDE', $rules) === 3, 'keyword seul + accents');
// première règle gagnante
$dup = [
    ['supplier_id' => 5, 'sender_pattern' => '@x.fr', 'subject_keywords' => null],
    ['supplier_id' => 6, 'sender_pattern' => '@x.fr', 'subject_keywords' => null],
];
ok(matchSupplierRule('a@x.fr', 's', $dup) === 5, 'premiere regle gagne');
// règle vide (les deux champs null) ignorée
ok(matchSupplierRule('a@y.fr', 's', [['supplier_id' => 9, 'sender_pattern' => null, 'subject_keywords' => null]]) === null, 'regle vide ignoree');

// ── classifyReplyBody ──
ok(classifyReplyBody('Bonjour, BON POUR ACCORD, cordialement') === 'approved', 'classify accord');
ok(classifyReplyBody('Merci de modifier la largeur en 1200mm') === 'awaiting_modification', 'classify merci de modifier');
ok(classifyReplyBody("l'ARC est à modifier : coloris RAL 7016") === 'awaiting_modification', 'classify a modifier accent');
ok(classifyReplyBody('Bien reçu, merci') === 'replied_unclassified', 'classify inconnu');
ok(classifyReplyBody("<p>l'ARC est à</p><p>modifier</p>") === 'awaiting_modification', 'classify balises adjacentes');
ok(classifyReplyBody("Bon pour<br>accord") === 'approved', 'classify br');

// ── isReminderDue ── (nowTs fixe pour des tests déterministes)
$now = strtotime('2026-07-10 08:00:00');
ok(isReminderDue('pending', '2026-07-06 08:00:00', null, $now) === true,  'due: 4j sans relance');
ok(isReminderDue('pending', '2026-07-08 08:00:00', null, $now) === false, 'pas due: 2j');
ok(isReminderDue('pending', '2026-07-01 08:00:00', '2026-07-08 09:00:00', $now) === false, 'pas due: relance recente');
ok(isReminderDue('pending', '2026-07-01 08:00:00', '2026-07-06 08:00:00', $now) === true,  'due: relance il y a 4j');
ok(isReminderDue('awaiting_modification', '2026-07-01 08:00:00', null, $now) === false, 'pas due: attente fournisseur');
ok(isReminderDue('approved', '2026-07-01 08:00:00', null, $now) === false, 'pas due: approuve');

// ── chiffrement (roundtrip) ── nécessite EMAILS_ENC_KEY définie pour le test
$secret = 'refresh_token_0.ABCD1234';
$enc = sendersEncrypt($secret);
ok($enc !== $secret && sendersDecrypt($enc) === $secret, 'chiffrement roundtrip');
ok(sendersDecrypt('pas-du-base64-valide!!') === null, 'dechiffrement invalide -> null');

// ── parseGraphMessage ──
$fixture = json_decode(file_get_contents(__DIR__ . '/fixtures/graph_inbox_delta.json'), true);
$p = parseGraphMessage($fixture['value'][0]);
ok($p !== null && $p['graph_message_id'] === 'AAMkAGI2TG93AAA=', 'parse id');
ok($p['from_email'] === 'noreply@somfy.fr' && $p['from_name'] === 'Somfy Commandes', 'parse from');
ok($p['subject'] === 'ARC commande n°45812', 'parse subject');
ok($p['received_at'] === '2026-07-01 09:30:00', 'parse date UTC -> DATETIME');
ok($p['has_attachments'] === true, 'parse hasAttachments');
ok(parseGraphMessage($fixture['value'][1]) === null, 'entree @removed ignoree');
ok(parseGraphMessage($fixture['value'][2]) === null, 'entree sans from ignoree');

echo "OK ($n assertions)\n";
