/**
 * Création d'un fichier Excel (.xlsx) directement dans le navigateur, sans dépendance.
 *
 * feuilles : [{ nom, colonnes: [{ titre, type: 'texte'|'euro'|'date'|'nombre', largeur }], lignes: [[...valeurs]] }]
 * Les dates sont attendues au format « AAAA-MM-JJ ».
 */

const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        t[n] = c >>> 0;
    }
    return t;
})();

function crc32(octets) {
    let c = 0xffffffff;
    for (let i = 0; i < octets.length; i++) c = CRC_TABLE[(c ^ octets[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}

/** Archive zip sans compression (suffisant pour Excel). */
function creerZip(fichiers) {
    const enc = new TextEncoder();
    const parties = [];
    const central = [];
    let decalage = 0;
    for (const [nom, contenu] of Object.entries(fichiers)) {
        const nomOctets = enc.encode(nom);
        const donnees = enc.encode(contenu);
        const crc = crc32(donnees);
        const local = new DataView(new ArrayBuffer(30));
        local.setUint32(0, 0x04034b50, true);
        local.setUint16(4, 20, true);
        local.setUint16(6, 0x0800, true); // noms en UTF-8
        local.setUint32(14, crc, true);
        local.setUint32(18, donnees.length, true);
        local.setUint32(22, donnees.length, true);
        local.setUint16(26, nomOctets.length, true);
        parties.push(new Uint8Array(local.buffer), nomOctets, donnees);

        const c = new DataView(new ArrayBuffer(46));
        c.setUint32(0, 0x02014b50, true);
        c.setUint16(4, 20, true);
        c.setUint16(6, 20, true);
        c.setUint16(8, 0x0800, true);
        c.setUint32(16, crc, true);
        c.setUint32(20, donnees.length, true);
        c.setUint32(24, donnees.length, true);
        c.setUint16(28, nomOctets.length, true);
        c.setUint32(42, decalage, true);
        central.push(new Uint8Array(c.buffer), nomOctets);
        decalage += 30 + nomOctets.length + donnees.length;
    }
    const tailleCentral = central.reduce((s, p) => s + p.length, 0);
    const fin = new DataView(new ArrayBuffer(22));
    fin.setUint32(0, 0x06054b50, true);
    fin.setUint16(8, Object.keys(fichiers).length, true);
    fin.setUint16(10, Object.keys(fichiers).length, true);
    fin.setUint32(12, tailleCentral, true);
    fin.setUint32(16, decalage, true);
    return new Blob([...parties, ...central, new Uint8Array(fin.buffer)],
        { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

const xml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');

function colonne(i) {
    let s = '';
    for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s;
    return s;
}

// Styles : 0 normal, 1 en-tête, 2 euro, 3 date, 4 nombre
const STYLE = { texte: 0, euro: 2, date: 3, nombre: 4 };

function dateVersSerie(iso) {
    const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return null;
    return (Date.UTC(+m[1], +m[2] - 1, +m[3]) - Date.UTC(1899, 11, 30)) / 86400000;
}

function cellule(ref, valeur, type) {
    if (valeur === null || valeur === undefined || valeur === '') return '';
    if (type === 'date') {
        const n = dateVersSerie(valeur);
        if (n !== null) return `<c r="${ref}" s="3"><v>${n}</v></c>`;
    } else if (type === 'euro' || type === 'nombre') {
        const n = Number(valeur);
        if (Number.isFinite(n)) return `<c r="${ref}" s="${STYLE[type]}"><v>${n}</v></c>`;
    }
    return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xml(valeur)}</t></is></c>`;
}

function feuilleXml({ colonnes, lignes }) {
    const derniere = colonne(colonnes.length - 1);
    const cols = colonnes.map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c.largeur || 14}" customWidth="1"/>`).join('');
    const entete = `<row r="1">${colonnes.map((c, i) => `<c r="${colonne(i)}1" t="inlineStr" s="1"><is><t>${xml(c.titre)}</t></is></c>`).join('')}</row>`;
    const corps = lignes.map((l, r) =>
        `<row r="${r + 2}">${colonnes.map((c, i) => cellule(`${colonne(i)}${r + 2}`, l[i], c.type || 'texte')).join('')}</row>`).join('');
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<cols>${cols}</cols><sheetData>${entete}${corps}</sheetData>
<autoFilter ref="A1:${derniere}${lignes.length + 1}"/></worksheet>`;
}

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="2"><numFmt numFmtId="164" formatCode="#,##0.00\\ &quot;€&quot;"/><numFmt numFmtId="165" formatCode="dd/mm/yyyy"/></numFmts>
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FF1A1A1A"/><name val="Calibri"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFB103"/></patternFill></fill></fills>
<borders count="1"><border/></borders>
<cellStyleXfs count="1"><xf/></cellStyleXfs>
<cellXfs count="5"><xf/><xf fontId="1" fillId="2" applyFont="1" applyFill="1"/><xf numFmtId="164" applyNumberFormat="1"/><xf numFmtId="165" applyNumberFormat="1"/><xf numFmtId="1" applyNumberFormat="1"/></cellXfs>
</styleSheet>`;

export function creerClasseur(feuilles) {
    const fichiers = {
        '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
${feuilles.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}
</Types>`,
        '_rels/.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
        'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>${feuilles.map((f, i) => `<sheet name="${xml(f.nom.slice(0, 31))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>
<definedNames>${feuilles.map((f, i) => `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${xml(f.nom.slice(0, 31))}'!$A$1:$${colonne(f.colonnes.length - 1)}$${f.lignes.length + 1}</definedName>`).join('')}</definedNames>
</workbook>`,
        'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${feuilles.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}
<Relationship Id="rId${feuilles.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
        'xl/styles.xml': STYLES_XML,
    };
    feuilles.forEach((f, i) => { fichiers[`xl/worksheets/sheet${i + 1}.xml`] = feuilleXml(f); });
    return creerZip(fichiers);
}

export function telechargerClasseur(nomFichier, feuilles) {
    const url = URL.createObjectURL(creerClasseur(feuilles));
    const a = document.createElement('a');
    a.href = url;
    a.download = nomFichier;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
