// Règles de calcul reprises des classeurs Excel « Suivi commandes » et « ARC + Factures ».

const JOUR = 86400000;

// Accès par personne (e-mail de connexion). Le serveur applique la même liste (php/suivi_commandes_api.php).
const ACCES_SUIVI = [
    'henrique@hello-fermetures.com',
    'sebastien@hello-fermetures.com',
    'vanessa@hello-fermetures.com',
    'alexandra@hello-fermetures.com',
    'lotfi.ksantinipro@gmail.com',
];
const ACCES_COMPTA = [
    'vanessa@hello-fermetures.com',
    'alexandra@hello-fermetures.com',
    'sebastien@hello-fermetures.com',
    'lotfi.ksantinipro@gmail.com',
];

export function accesSuiviCommandes(user) {
    const email = String(user?.email || '').trim().toLowerCase();
    return { suivi: ACCES_SUIVI.includes(email), compta: ACCES_COMPTA.includes(email) };
}

export const isoDate = (d) => d ? `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}` : '';
const versDate = (iso) => iso ? new Date(`${iso}T00:00:00Z`) : null;

export const aujourdhui = () => {
    const n = new Date();
    return isoDate(new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())));
};

export const fmtDate = (iso) => iso ? iso.split('-').reverse().join('/') : '';
export const fmtEuro = (n) => n === null || n === undefined || n === ''
    ? ''
    : new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);
export const arrondi = (n) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * « S45 » ou « S1/2027 » → vendredi de cette semaine ISO (même formule que la colonne
 * « Date livraison calculée »). Sans année, on prend celle de la commande, sinon l'année en cours.
 */
export function vendrediSemaine(semaine, anneeDefaut) {
    const m = String(semaine || '').trim().match(/^S?\s*(\d{1,2})\s*(?:\/\s*(\d{4}))?$/i);
    if (!m) return '';
    const annee = m[2] ? +m[2] : (anneeDefaut || new Date().getFullYear());
    const jan4 = new Date(Date.UTC(annee, 0, 4));
    const lundiS1 = jan4.getTime() - ((jan4.getUTCDay() + 6) % 7) * JOUR;
    return isoDate(new Date(lundiS1 + ((+m[1] - 1) * 7 + 4) * JOUR));
}

export function dateLivraison(l) {
    if (l.date_livraison_prevue) return l.date_livraison_prevue;
    const ref = l.date_arc || l.date_commande;
    return vendrediSemaine(l.semaine_livraison, ref ? +ref.slice(0, 4) : undefined);
}

export const STATUTS = {
    'À PLANIFIER':          { label: 'À planifier', cls: 'bg-amber-100 text-amber-800 border-amber-200' },
    'PLANIFIÉ':             { label: 'Planifié', cls: 'bg-green-100 text-green-800 border-green-200' },
    'PRÉPLANIFIÉ':          { label: 'Préplanifié', cls: 'bg-teal-100 text-teal-800 border-teal-200' },
    'EN ATTENTE LIVRAISON': { label: 'En attente livraison', cls: 'bg-orange-100 text-orange-800 border-orange-200' },
    'EN ATTENTE':           { label: 'En attente', cls: 'bg-gray-200 text-gray-700 border-gray-300' },
    'FOURNITURE SEULE':     { label: 'Fourniture seule', cls: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
    'EN COMMANDE':          { label: 'En commande', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
};

/** Jours écoulés depuis la commande sans ARC reçu (null si ARC reçu). */
export function joursSansArc(l, today = aujourdhui()) {
    if (l.date_arc || !l.date_commande) return null;
    return Math.round((versDate(today) - versDate(l.date_commande)) / JOUR);
}

/**
 * Regroupe les lignes par n° de commande client et calcule ce que faisaient les formules :
 * dernière livraison (hors lignes annulées) et statut planning.
 */
export function grouperCommandes(lignes, today = aujourdhui()) {
    const groupes = new Map();
    for (const l of lignes) {
        const cle = String(l.num_commande || '').trim() || `sans-numero-${l.id}`;
        if (!groupes.has(cle)) groupes.set(cle, { num: String(l.num_commande || '').trim(), lignes: [] });
        groupes.get(cle).lignes.push({ ...l, livraison: dateLivraison(l) });
    }

    return [...groupes.values()].map(g => {
        const ls = g.lignes;
        const actives = ls.filter(l => l.etat !== 'Annulée');
        const livraisons = actives.map(l => l.livraison).filter(Boolean);
        const derniere = livraisons.length ? livraisons.sort().at(-1) : '';
        const poses = ls.map(l => l.date_pose).filter(Boolean).sort();
        const datePose = poses.at(-1) || '';
        const statutPose = ls.find(l => l.date_pose === datePose)?.statut_pose || 'PLANIFIÉ';

        let statut;
        if (ls.some(l => /fourniture seule/i.test(l.commentaire || ''))) statut = 'FOURNITURE SEULE';
        else if (datePose) statut = statutPose === 'PRÉPLANIFIÉ' ? 'PRÉPLANIFIÉ' : 'PLANIFIÉ';
        else if (ls.some(l => l.fournisseur && !l.semaine_livraison && !l.date_livraison_prevue)) statut = 'EN ATTENTE LIVRAISON';
        else if (ls.some(l => l.etat === 'En attente')) statut = 'EN ATTENTE';
        else if (!derniere) statut = '';
        // À planifier dès qu'on est à 30 jours ou moins de la dernière livraison (formule des lignes du classeur)
        else statut = versDate(today) >= new Date(versDate(derniere) - 30 * JOUR) ? 'À PLANIFIER' : 'EN COMMANDE';

        const sansArc = ls.map(l => joursSansArc(l, today)).filter(j => j !== null);
        return {
            num: g.num,
            client: ls.find(l => l.client)?.client?.trim() || '',
            lignes: ls,
            fournisseurs: [...new Set(ls.map(l => l.fournisseur).filter(Boolean))],
            derniereLivraison: derniere,
            datePose,
            statut,
            aRelancer: ls.some(l => /relancer/i.test(l.relance || '')) || sansArc.some(j => j >= 7),
            joursSansArc: sansArc.length ? Math.max(...sansArc) : null,
            totalHT: arrondi(ls.reduce((s, l) => s + (Number(l.montant_ht) || 0), 0)),
            ordre: Math.min(...ls.map(l => l.ordre || 0)),
        };
    });
}

/* ---------- Compta : BC et factures ---------- */

const memeBC = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

export const STATUTS_BC = {
    'Non facturé':           'bg-gray-100 text-gray-700 border-gray-200',
    'Partiellement facturé': 'bg-amber-100 text-amber-800 border-amber-200',
    'Conforme':              'bg-green-100 text-green-800 border-green-200',
    'Dépassement':           'bg-red-100 text-red-700 border-red-200',
};

export const STATUTS_PAIEMENT = {
    'Payée':     'bg-green-100 text-green-800 border-green-200',
    'À payer':   'bg-amber-100 text-amber-800 border-amber-200',
    'En litige': 'bg-red-100 text-red-700 border-red-200',
};

/** Colonnes calculées du tableau « Suivi BC » + écart avec le montant du suivi des commandes. */
export function calculerBC(bcs, factures, commandes) {
    return bcs.map(bc => {
        const fs = factures.filter(f => memeBC(f.num_bc, bc.num_bc));
        const factureHT = arrondi(fs.reduce((s, f) => s + (Number(f.montant_ht) || 0), 0));
        const factureTTC = arrondi(fs.reduce((s, f) => s + (Number(f.montant_ttc) || 0), 0));
        const ht = arrondi(bc.montant_ht);
        const ecartHT = arrondi(ht - factureHT);
        const statut = factureHT === 0 ? 'Non facturé' : ecartHT === 0 ? 'Conforme' : ecartHT > 0 ? 'Partiellement facturé' : 'Dépassement';
        const source = commandes.find(c => memeBC(c.num_bc, bc.num_bc) && memeBC(c.fournisseur, bc.fournisseur));
        const ecartSuivi = source && source.montant_ht !== null && source.montant_ht !== '' && arrondi(source.montant_ht) !== ht
            ? arrondi(source.montant_ht) : null;
        return { ...bc, factureHT, factureTTC, ecartHT, ecartTTC: arrondi(arrondi(bc.montant_ttc) - factureTTC), statut, nbFactures: fs.length, montantSuivi: ecartSuivi };
    });
}

export function calculerFactures(factures, bcsCalcules) {
    return factures.map(f => {
        const bc = bcsCalcules.find(b => memeBC(b.num_bc, f.num_bc));
        const statut = f.date_paiement ? 'Payée' : bc?.statut === 'Dépassement' ? 'En litige' : 'À payer';
        return { ...f, client: bc?.client || '', fournisseur: bc?.fournisseur || '', statut };
    });
}

/* ---------- Lecture des fichiers Excel (sans les modifier) ---------- */

async function lireZip(buffer) {
    const v = new DataView(buffer);
    let eocd = buffer.byteLength - 22;
    while (eocd >= 0 && v.getUint32(eocd, true) !== 0x06054b50) eocd--;
    if (eocd < 0) throw new Error("Ce fichier n'est pas un classeur Excel (.xlsx / .xlsm).");
    const nb = v.getUint16(eocd + 10, true);
    let p = v.getUint32(eocd + 16, true);
    const fichiers = {};
    const dec = new TextDecoder();
    for (let i = 0; i < nb; i++) {
        const methode = v.getUint16(p + 10, true);
        const taille = v.getUint32(p + 20, true);
        const lNom = v.getUint16(p + 28, true), lExtra = v.getUint16(p + 30, true), lCom = v.getUint16(p + 32, true);
        const local = v.getUint32(p + 42, true);
        const nom = dec.decode(new Uint8Array(buffer, p + 46, lNom));
        p += 46 + lNom + lExtra + lCom;
        if (!nom.endsWith('.xml') && !nom.endsWith('.rels')) continue;
        const debut = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true);
        const brut = new Uint8Array(buffer, debut, taille);
        fichiers[nom] = methode === 8
            ? await new Response(new Blob([brut]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text()
            : dec.decode(brut);
    }
    return fichiers;
}

const colIndex = (lettres) => [...lettres].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0);

/** Renvoie { tableaux: { NomTableau: [ {colonne: valeur} ] }, feuilles: { NomFeuille: { A1: valeur } } }. */
export async function lireClasseur(file) {
    const fichiers = await lireZip(await file.arrayBuffer());
    const xml = (nom) => new DOMParser().parseFromString(fichiers[nom] || '<x/>', 'application/xml');
    const enfants = (el, tag) => [...el.getElementsByTagName(tag)];

    const partages = enfants(xml('xl/sharedStrings.xml'), 'si').map(si => enfants(si, 't').map(t => t.textContent).join(''));
    const rels = (chemin) => {
        const r = {};
        const dossier = chemin.slice(0, chemin.lastIndexOf('/'));
        const nomRels = `${dossier}/_rels/${chemin.slice(chemin.lastIndexOf('/') + 1)}.rels`;
        for (const rel of enfants(xml(nomRels), 'Relationship')) {
            const cible = rel.getAttribute('Target');
            r[rel.getAttribute('Id')] = cible.startsWith('/') ? cible.slice(1) : new URL(cible, `http://x/${dossier}/`).pathname.slice(1);
        }
        return r;
    };

    const relsClasseur = rels('xl/workbook.xml');
    const tableaux = {};
    const feuilles = {};
    for (const s of enfants(xml('xl/workbook.xml'), 'sheet')) {
        const chemin = relsClasseur[s.getAttribute('r:id')];
        const doc = xml(chemin);
        const cellules = {};
        for (const c of enfants(doc, 'c')) {
            const t = c.getAttribute('t');
            const v = c.getElementsByTagName('v')[0]?.textContent;
            let val;
            if (t === 's') val = partages[+v] ?? '';
            else if (t === 'inlineStr') val = enfants(c, 't').map(x => x.textContent).join('');
            else if (t === 'str' || t === 'e') val = v ?? '';
            else if (t === 'b') val = v === '1';
            else val = v === undefined ? '' : Number(v);
            if (val !== '') cellules[c.getAttribute('r')] = val;
        }
        feuilles[s.getAttribute('name')] = cellules;

        const relsFeuille = rels(chemin);
        for (const tp of enfants(doc, 'tablePart')) {
            const tdoc = xml(relsFeuille[tp.getAttribute('r:id')]).documentElement;
            const [, c1, l1, , l2] = tdoc.getAttribute('ref').match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/);
            const colonnes = enfants(tdoc, 'tableColumn').map(tc => tc.getAttribute('name'));
            const lignes = [];
            for (let r = +l1 + 1; r <= +l2; r++) {
                const ligne = {};
                colonnes.forEach((nom, i) => {
                    const n = colIndex(c1) + i;
                    const lettres = n <= 26 ? String.fromCharCode(64 + n) : String.fromCharCode(64 + Math.floor((n - 1) / 26)) + String.fromCharCode(65 + (n - 1) % 26);
                    ligne[nom] = cellules[`${lettres}${r}`] ?? '';
                });
                if (Object.values(ligne).some(x => x !== '')) lignes.push(ligne);
            }
            tableaux[tdoc.getAttribute('displayName') || tdoc.getAttribute('name')] = lignes;
        }
    }
    return { tableaux, feuilles };
}

/** Date Excel (numéro de série) ou texte jj/mm/aaaa → aaaa-mm-jj ; '' si vide ou illisible. */
export function dateExcel(v) {
    if (typeof v === 'number' && v > 0) return isoDate(new Date(Date.UTC(1899, 11, 30) + Math.round(v) * JOUR));
    const m = String(v || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : '';
}

const texte = (v) => typeof v === 'number' ? String(v) : String(v ?? '').trim();
const nombre = (v) => v === '' || v === null || v === undefined ? null : typeof v === 'number' ? arrondi(v) : arrondi(String(v).replace(/[\s€]/g, '').replace(',', '.'));

/** Une date qu'on ne sait pas lire n'est pas perdue : elle est recopiée dans le commentaire. */
function champDate(v, nom, notes) {
    const d = dateExcel(v);
    if (!d && v !== '' && v !== null && v !== undefined) notes.push(`${nom} d'origine : ${texte(v)}`);
    return d;
}

function ligneSuivi(r, termine) {
    const notes = [];
    const statutPlanning = texte(r['Statut planning']);
    const l = {
        num_commande: texte(r['N° commande client']),
        client: texte(r['Client']),
        fournisseur: texte(r['Fournisseur']),
        date_commande: champDate(r['Date commande passée'], 'Date commande', notes),
        date_arc: champDate(r['Date réception BC / ARC'], 'Date ARC', notes),
        relance: texte(r['Relance fournisseur']),
        etat: texte(r['État commande fournisseur']),
        num_bc: texte(r['N° BC fournisseur']),
        montant_ht: nombre(r['Montant BC HT']),
        montant_ttc: nombre(r['Montant BC TTC']),
        type_marchandise: texte(r['Type de marchandise']),
        motorisation: texte(r['Motorisation']),
        duree_pose: nombre(r['Durée de pose']),
        unite: texte(r['Unité']),
        semaine_livraison: texte(r['Semaine livraison prévue']),
        date_livraison_prevue: champDate(r['Date livraison prévue'], 'Date livraison prévue', notes),
        date_pose: champDate(r['Date de pose prévue'], 'Date de pose', notes),
        statut_pose: statutPlanning === 'PRÉPLANIFIÉ' ? 'PRÉPLANIFIÉ' : '',
        termine: termine || texte(r['Chantier terminé']).toLowerCase() === 'oui' ? 1 : 0,
        statut_archive: termine ? statutPlanning : '',
    };
    l.commentaire = [texte(r['Commentaire']), ...notes].filter(Boolean).join(' — ');
    if (l.date_pose && !l.statut_pose) l.statut_pose = 'PLANIFIÉ';
    return l;
}

/** Colonne d'un onglet « Paramètres » identifiée par son titre en ligne 1. */
function listeParametres(cellules, titre) {
    const entete = Object.entries(cellules).find(([ref, v]) => /^[A-Z]+1$/.test(ref) && v === titre);
    if (!entete) return [];
    const col = entete[0].replace(/\d+$/, '');
    return Object.entries(cellules)
        .filter(([ref]) => ref.replace(/\d+$/, '') === col && +ref.replace(/^[A-Z]+/, '') > 1)
        .sort((a, b) => +a[0].replace(/^[A-Z]+/, '') - +b[0].replace(/^[A-Z]+/, ''))
        .map(([, v]) => texte(v)).filter(Boolean);
}

/** Transforme un classeur lu en données à envoyer au serveur. Reconnaît les deux fichiers d'Alexandra. */
export function convertirClasseur({ tableaux, feuilles }) {
    if (tableaux.SuiviCommandes) {
        const params = feuilles['Paramètres'] || {};
        return {
            type: 'suivi',
            data: {
                commandes: [
                    ...tableaux.SuiviCommandes.map(r => ligneSuivi(r, false)),
                    ...(tableaux.T_ChantiersTermines || []).map(r => ligneSuivi(r, true)),
                ],
                parametres: {
                    produits: (tableaux.ListeProduits || []).map(r => texte(r['Types de produits'])).filter(Boolean),
                    motorisation: listeParametres(params, 'Motorisation'),
                    unites: listeParametres(params, 'Unité de pose'),
                    etats: listeParametres(params, 'État commande fournisseur'),
                    fournisseurs: listeParametres(params, 'Fournisseurs'),
                },
            },
        };
    }
    if (tableaux.T_BC) {
        return {
            type: 'compta',
            data: {
                bc: tableaux.T_BC.map(r => ({
                    client: texte(r['Client']),
                    num_bc: texte(r['N° BC']),
                    date_bc: dateExcel(r['Date BC']),
                    fournisseur: texte(r['Fournisseur']),
                    montant_ht: nombre(r['Montant BC HT']),
                    montant_ttc: nombre(r['Montant BC TTC']),
                    commentaire: texte(r['Commentaire']),
                })),
                factures: (tableaux.T_Factures || []).map(r => ({
                    num_facture: texte(r['N° Facture']),
                    num_bc: texte(r['N° BC']),
                    date_facture: dateExcel(r['Date facture']),
                    montant_ht: nombre(r['Montant HT']),
                    montant_ttc: nombre(r['Montant TTC']),
                    date_paiement: dateExcel(r['Date de paiement']),
                    commentaire: texte(r['Commentaire']),
                })),
                fournisseurs: (tableaux.T_Fournisseurs || []).map(r => texte(r['Fournisseurs'])).filter(Boolean),
            },
        };
    }
    throw new Error("Ce classeur n'est ni « Suivi commandes » ni « ARC + Factures ».");
}
