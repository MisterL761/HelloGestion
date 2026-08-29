import React, { useState, useMemo, useCallback } from 'react';
import { Copy, Check, RotateCcw, FileText } from 'lucide-react';

/*
 * Générateur de descriptifs de pose.
 * On coche les prestations d'un produit → un descriptif propre se génère,
 * reste éditable, et se copie en un clic (ProDevis, mail…).
 *
 * Tout est piloté par la config ci-dessous (client uniquement, aucune API).
 * Pour affiner une formulation : modifier la `phrase` correspondante.
 * Pour ajouter un produit : ajouter une entrée dans PRODUITS.
 */

/* ── Groupes de prestations communs (réutilisés selon le produit) ── */
const GROUPES = {
    depose: {
        titre: 'Dépose', type: 'check', options: [
            { id: 'depose',     label: "Dépose de l'existant",            phrase: (p) => `Dépose de votre ${p.nom} existant${p.genre === 'f' ? 'e' : ''}.` },
            { id: 'evacuation', label: "Évacuation de l'ancien matériel", phrase: () => "Évacuation de l'ancien matériel." },
        ],
    },
    raccord: {
        titre: 'Alimentation & raccordement', type: 'radio', options: [
            { id: 'elec_soins',    label: 'Électrique — par nos soins',            phrase: () => 'Raccordement électrique par nos soins.' },
            { id: 'elec_goulotte', label: 'Électrique — sous goulotte blanche',    phrase: () => 'Raccordement électrique par nos soins sous goulotte blanche.' },
            { id: 'solaire',       label: 'Solaire — sans raccordement électrique', phrase: () => 'Fonctionnement solaire, sans raccordement électrique.' },
        ],
    },
    moto: {
        titre: 'Motorisation', type: 'check', options: [
            { id: 'reglage',     label: 'Réglage et programmation',              phrase: () => 'Réglage et programmation de la motorisation.' },
            { id: 'miseservice', label: 'Mise en service',                       phrase: () => "Mise en service de l'installation." },
            { id: 'essai',       label: 'Essai de fonctionnement avec le client', phrase: () => 'Essai de fonctionnement réalisé avec le client.' },
        ],
    },
    finitions: {
        titre: 'Étanchéité & finitions', type: 'check', options: [
            { id: 'silicone',      label: 'Étanchéité silicone', phrase: () => 'Étanchéité silicone.' },
            { id: 'compribande',   label: 'Mousse compribande',  phrase: () => 'Étanchéité par mousse compribande.' },
            { id: 'habillage_ext', label: 'Habillage extérieur', phrase: () => 'Habillage extérieur.' },
            { id: 'habillage_int', label: 'Habillage intérieur', phrase: () => 'Habillage intérieur.' },
        ],
    },
    chantier: {
        titre: 'Chantier', type: 'check', options: [
            { id: 'nettoyage', label: 'Nettoyage du chantier', phrase: () => "Nettoyage du chantier en fin d'intervention." },
        ],
    },
    reserves: {
        titre: 'Réserves & exclusions', type: 'check', options: [
            { id: 'reserve_maco', label: 'Réserve maçonnerie à prévoir',           phrase: () => 'Réserve maçonnerie à prévoir.' },
            { id: 'peinture',     label: 'Reprise peinture non comprise',          phrase: () => 'Reprise de peinture non comprise.' },
            { id: 'vegetaux',     label: 'Végétaux à supprimer par le client',     phrase: () => 'Végétaux à supprimer par le client.' },
            { id: 'acces',        label: 'Accès chantier à prévoir par le client', phrase: () => 'Accès chantier à prévoir par le client.' },
        ],
    },
    sav: {
        titre: 'Intervention SAV', type: 'check', options: [
            { id: 'diagnostic',     label: 'Diagnostic sur site',                    phrase: () => 'Diagnostic réalisé sur site.' },
            { id: 'remplacement',   label: 'Remplacement de pièce',                  phrase: () => 'Remplacement de la pièce défectueuse.' },
            { id: 'reglage_sav',    label: 'Réglage',                                phrase: () => 'Réglage et remise en fonctionnement.' },
            { id: 'remise_service', label: 'Remise en service',                      phrase: () => "Remise en service de l'installation." },
            { id: 'essai_sav',      label: 'Essai de fonctionnement avec le client', phrase: () => 'Essai de fonctionnement réalisé avec le client.' },
        ],
    },
};

/* ── Produits : chacun a SON type de pose + ses groupes actifs (dans l'ordre) ── */
const PRODUITS = [
    {
        id: 'volet', label: 'Volet roulant', nom: 'volet roulant', genre: 'm',
        pose: { titre: 'Type de pose', options: [
            { id: 'renovation', label: 'En rénovation',         suffixe: 'en rénovation' },
            { id: 'applique',   label: 'En applique extérieure', suffixe: 'en applique extérieure' },
            { id: 'linteau',    label: 'Sous linteau',           suffixe: 'sous linteau' },
            { id: 'entremurs',  label: 'Entre murs',             suffixe: 'entre murs' },
        ] },
        groupes: ['depose', 'pose', 'raccord', 'moto', 'finitions', 'chantier', 'reserves'],
    },
    {
        id: 'fenetre', label: 'Fenêtre', nom: 'fenêtre', genre: 'f',
        pose: { titre: 'Type de pose', options: [
            { id: 'renovation',   label: 'En rénovation',   suffixe: 'en rénovation' },
            { id: 'depose_totale', label: 'En dépose totale', suffixe: 'en dépose totale' },
        ] },
        groupes: ['depose', 'pose', 'finitions', 'chantier', 'reserves'],
    },
    {
        id: 'porte_entree', label: "Porte d'entrée", nom: "porte d'entrée", genre: 'f',
        pose: { titre: 'Type de pose', options: [
            { id: 'renovation',    label: 'En rénovation',    suffixe: 'en rénovation' },
            { id: 'depose_totale', label: 'En dépose totale', suffixe: 'en dépose totale' },
            { id: 'neuf',          label: 'En neuf (tunnel)', suffixe: 'en neuf, pose en tunnel' },
        ] },
        groupes: ['depose', 'pose', 'finitions', 'chantier', 'reserves'],
    },
    {
        id: 'porte_garage', label: 'Porte de garage', nom: 'porte de garage', genre: 'f',
        pose: { titre: 'Type de pose', options: [
            { id: 'linteau', label: 'Sous linteau',      suffixe: 'sous linteau' },
            { id: 'tableau', label: 'Derrière tableau',  suffixe: 'derrière tableau' },
            { id: 'applique', label: 'En applique',      suffixe: 'en applique' },
        ] },
        groupes: ['depose', 'pose', 'raccord', 'moto', 'finitions', 'chantier', 'reserves'],
    },
    {
        id: 'portail', label: 'Portail', nom: 'portail', genre: 'm',
        pose: { titre: 'Type de pose', options: [
            { id: 'scellement', label: 'Scellement des poteaux', suffixe: 'avec scellement des poteaux' },
            { id: 'platines',   label: 'Sur platines',           suffixe: 'sur platines' },
        ] },
        groupes: ['depose', 'pose', 'raccord', 'moto', 'chantier', 'reserves'],
    },
    {
        id: 'cloture', label: 'Clôture', nom: 'clôture', genre: 'f',
        pose: { titre: 'Type de pose', options: [
            { id: 'scellement', label: 'Scellement',   suffixe: 'avec scellement' },
            { id: 'platines',   label: 'Sur platines',  suffixe: 'sur platines' },
        ] },
        groupes: ['depose', 'pose', 'chantier', 'reserves'],
    },
    {
        id: 'store', label: 'Store banne', nom: 'store banne', genre: 'm',
        pose: { titre: 'Type de pose', options: [
            { id: 'mur',     label: 'Fixation murale',    suffixe: 'en fixation murale' },
            { id: 'plafond', label: 'Fixation au plafond', suffixe: 'en fixation au plafond' },
            { id: 'sousface', label: 'Sous-face de toit',  suffixe: 'en sous-face de toit' },
        ] },
        groupes: ['depose', 'pose', 'raccord', 'moto', 'chantier', 'reserves'],
    },
    {
        id: 'pergola', label: 'Pergola', nom: 'pergola', genre: 'f',
        pose: { titre: 'Type de pose', options: [
            { id: 'adossee',    label: 'Adossée',    suffixe: 'en version adossée' },
            { id: 'autoportee', label: 'Autoportée', suffixe: 'en version autoportée' },
        ] },
        groupes: ['pose', 'raccord', 'moto', 'chantier', 'reserves'],
    },
    {
        id: 'garde_corps', label: 'Garde-corps', nom: 'garde-corps', genre: 'm',
        pose: { titre: 'Type de pose', options: [
            { id: 'francaise', label: 'À la française (dessus de dalle)', suffixe: 'à la française, sur le dessus de dalle' },
            { id: 'anglaise',  label: "À l'anglaise (en tableau)",        suffixe: "à l'anglaise, en tableau" },
            { id: 'platines',  label: 'Sur platines',                     suffixe: 'sur platines' },
        ] },
        groupes: ['depose', 'pose', 'chantier', 'reserves'],
    },
    {
        id: 'sav', label: 'SAV / intervention', nom: 'intervention', genre: 'f',
        pose: null,
        groupes: ['sav', 'chantier'],
    },
];

/* ── Génération du texte (fonction pure, testable) ── */
export function genererDescriptif(produit, selection) {
    if (!produit) return '';
    const nouveau = produit.genre === 'f' ? 'nouvelle' : 'nouveau';
    const parts = [];

    produit.groupes.forEach((gKey) => {
        if (gKey === 'pose') {
            if (!produit.pose) return;
            const sel = selection.radios.pose;
            if (!sel) return;
            const opt = produit.pose.options.find(o => o.id === sel);
            if (opt) parts.push(`Pose de votre ${nouveau} ${produit.nom} ${opt.suffixe}.`);
            return;
        }
        const groupe = GROUPES[gKey];
        if (!groupe) return;
        if (groupe.type === 'radio') {
            const sel = selection.radios[gKey];
            if (!sel) return;
            const opt = groupe.options.find(o => o.id === sel);
            if (opt) parts.push(opt.phrase(produit));
        } else {
            groupe.options.forEach((o) => {
                if (selection.checks[o.id]) parts.push(o.phrase(produit));
            });
        }
    });

    return parts.join(' ');
}

/* ── Petit check / radio stylé ── */
function OptionRow({ type, checked, onChange, label }) {
    return (
        // relative : ancre les inputs sr-only (position absolute) dans le label,
        // sinon ils débordent du document et font défiler toute la page
        <label className="relative flex items-center gap-3 px-2.5 py-2 rounded-lg cursor-pointer select-none hover:bg-gray-50 transition-colors">
            <input type={type} checked={checked} onChange={onChange} className="sr-only peer" />
            <span
                className={`flex-none w-5 h-5 grid place-items-center border-2 transition-all ${type === 'radio' ? 'rounded-full' : 'rounded-md'} ${
                    checked ? 'bg-[#FFB103] border-[#FFB103]' : 'bg-white border-gray-300'
                }`}
            >
                {checked && <Check size={13} strokeWidth={3.5} className="text-[#1a1a1a]" />}
            </span>
            <span className={`text-sm ${checked ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{label}</span>
        </label>
    );
}

const emptySelection = () => ({ checks: {}, radios: {} });

const GenerateurDescriptifs = () => {
    const [produitId, setProduitId] = useState(PRODUITS[0].id);
    const [selection, setSelection] = useState(emptySelection);
    const [manualText, setManualText] = useState(null); // null = suit la génération auto
    const [copied, setCopied] = useState(false);

    const produit = useMemo(() => PRODUITS.find(p => p.id === produitId), [produitId]);
    const autoText = useMemo(() => genererDescriptif(produit, selection), [produit, selection]);
    const text = manualText ?? autoText;

    const nbSelections = useMemo(() => {
        return Object.values(selection.checks).filter(Boolean).length + Object.keys(selection.radios).length;
    }, [selection]);

    const changeProduit = (id) => {
        setProduitId(id);
        setSelection(emptySelection());
        setManualText(null);
        setCopied(false);
    };

    const toggleCheck = (optId) => {
        setManualText(null);
        setCopied(false);
        setSelection(prev => {
            const checks = { ...prev.checks };
            if (checks[optId]) delete checks[optId]; else checks[optId] = true;
            return { ...prev, checks };
        });
    };

    const setRadio = (groupKey, optId) => {
        setManualText(null);
        setCopied(false);
        setSelection(prev => ({ ...prev, radios: { ...prev.radios, [groupKey]: optId } }));
    };

    const reset = () => {
        setSelection(emptySelection());
        setManualText(null);
        setCopied(false);
    };

    const copier = useCallback(async () => {
        const value = (text || '').trim();
        if (!value) return;
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(value);
            } else {
                throw new Error('no clipboard api');
            }
        } catch {
            const ta = document.createElement('textarea');
            ta.value = value;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); } catch { /* ignore */ }
            document.body.removeChild(ta);
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
    }, [text]);

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-1">
                <FileText size={22} className="text-[#FFB103]" />
                <h1 className="text-xl font-bold text-gray-900">Générateur de descriptifs de pose</h1>
            </div>
            <p className="text-sm text-gray-500 mb-5">
                Cochez les prestations, le descriptif se rédige tout seul. Retouchez-le si besoin, puis copiez-le dans ProDevis ou un mail.
            </p>

            {/* Sélecteur de produit */}
            <div className="flex flex-wrap gap-2 mb-6">
                {PRODUITS.map(p => (
                    <button
                        key={p.id}
                        onClick={() => changeProduit(p.id)}
                        className={`px-3.5 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                            produitId === p.id
                                ? 'bg-[#1a1a1a] text-white shadow-sm'
                                : 'bg-white text-gray-600 border border-gray-200 hover:border-[#FFB103]/60 hover:text-amber-700'
                        }`}
                    >
                        {p.label}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                {/* Colonne cases */}
                <div className="lg:col-span-3 space-y-4">
                    {produit.groupes.map((gKey) => {
                        const isPose = gKey === 'pose';
                        const groupe = isPose ? produit.pose : GROUPES[gKey];
                        if (!groupe) return null;
                        const isRadio = isPose || groupe.type === 'radio';
                        const groupKey = isPose ? 'pose' : gKey;
                        return (
                            <div key={gKey} className="bg-white border border-gray-200 rounded-2xl p-4">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-2">
                                    {groupe.titre}{isRadio && <span className="text-gray-400 font-medium normal-case tracking-normal"> — un seul</span>}
                                </h3>
                                <div className="flex flex-col">
                                    {groupe.options.map((o) => (
                                        <OptionRow
                                            key={o.id}
                                            type={isRadio ? 'radio' : 'checkbox'}
                                            label={o.label}
                                            checked={isRadio ? selection.radios[groupKey] === o.id : !!selection.checks[o.id]}
                                            onChange={() => (isRadio ? setRadio(groupKey, o.id) : toggleCheck(o.id))}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Colonne résultat */}
                <div className="lg:col-span-2">
                    <div className="bg-[#1a1a1a] rounded-2xl p-5 lg:sticky lg:top-4">
                        <h2 className="text-white font-bold text-sm mb-0.5">Descriptif généré</h2>
                        <p className="text-[11px] text-gray-400 mb-3">Éditable — retouchez avant de copier.</p>
                        <textarea
                            value={text}
                            onChange={(e) => setManualText(e.target.value)}
                            placeholder="Cochez des prestations pour générer le descriptif…"
                            spellCheck
                            className="w-full min-h-[180px] rounded-xl bg-[#111] text-gray-100 text-sm leading-relaxed p-3.5 resize-y border border-gray-700 focus:outline-none focus:ring-2 focus:ring-[#FFB103] placeholder:text-gray-600"
                        />
                        <div className="flex gap-2 mt-3">
                            <button
                                onClick={copier}
                                disabled={!text.trim()}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                                    copied ? 'bg-green-600 text-white' : 'bg-[#FFB103] text-[#1a1a1a] hover:bg-amber-400'
                                }`}
                            >
                                {copied ? <><Check size={16} strokeWidth={3} /> Copié !</> : <><Copy size={16} /> Copier le descriptif</>}
                            </button>
                            <button
                                onClick={reset}
                                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm text-gray-300 border border-gray-700 hover:text-white hover:border-gray-500 transition-colors"
                            >
                                <RotateCcw size={15} /> Réinitialiser
                            </button>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-3 text-right">
                            <span className="text-[#FFB103] font-semibold">{nbSelections}</span> prestation(s) sélectionnée(s)
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GenerateurDescriptifs;
