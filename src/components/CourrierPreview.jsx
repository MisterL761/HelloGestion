import React, { useRef, useEffect, useState } from 'react';
import { Copy, Check, Printer, Save, Loader2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || '/hello-gestion/php';

const MENTIONS = {
    recommande:    'LETTRE RECOMMANDÉE',
    recommande_ar: 'LETTRE RECOMMANDÉE AVEC ACCUSÉ DE RÉCEPTION',
};

const formatDateFR = (mysqlDate) => {
    const d = mysqlDate ? new Date(mysqlDate.replace(' ', 'T')) : new Date();
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
};

const CourrierPreview = ({
    config, contact, objet, reference, typeCourrier, corps,
    onCorpsChange, dateCourrier, onSave, saving, savedMsg,
}) => {
    const [copied, setCopied] = useState(false);
    const textareaRef = useRef(null);

    // Textarea auto-ajustée à son contenu
    useEffect(() => {
        const el = textareaRef.current;
        if (el) {
            el.style.height = 'auto';
            el.style.height = el.scrollHeight + 'px';
        }
    }, [corps]);

    const lignesDestinataire = contact ? [
        [contact.civilite, contact.prenom, contact.nom].filter(Boolean).join(' '),
        contact.societe,
        contact.adresse,
        [contact.code_postal, contact.ville].filter(Boolean).join(' '),
    ].filter(Boolean) : [];

    const texteComplet = () => {
        const lines = [];
        if (MENTIONS[typeCourrier]) lines.push(MENTIONS[typeCourrier], '');
        lines.push(...lignesDestinataire, '');
        lines.push(`${config?.ville ? config.ville + ', le ' : 'Le '}${formatDateFR(dateCourrier)}`, '');
        if (objet) lines.push(`Objet : ${objet}`);
        if (reference) lines.push(`Réf. : ${reference}`);
        lines.push('', corps || '');
        if (config?.signataire) lines.push('', config.signataire);
        return lines.join('\n');
    };

    const copier = async () => {
        try {
            await navigator.clipboard.writeText(texteComplet());
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { /* clipboard indisponible : rien à faire */ }
    };

    return (
        <div>
            {/* Impression : seul le courrier est visible */}
            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    #courrier-a4, #courrier-a4 * { visibility: visible; }
                    #courrier-a4 {
                        position: absolute; left: 0; top: 0; width: 100%;
                        box-shadow: none !important; border: none !important; border-radius: 0 !important;
                    }
                    #courrier-a4 .print-hide { display: none !important; }
                    #courrier-a4 .print-show { display: block !important; }
                    @page { size: A4; margin: 15mm; }
                }
            `}</style>

            {/* Barre d'actions */}
            <div className="no-print flex items-center justify-between flex-wrap gap-2 mb-3 bg-white rounded-xl p-3 border border-gray-100">
                <p className="text-sm text-gray-500">
                    Aperçu — le texte du courrier reste modifiable directement ci-dessous
                </p>
                <div className="flex gap-2 flex-wrap">
                    <button onClick={copier}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200">
                        {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                        {copied ? 'Copié' : 'Copier'}
                    </button>
                    <button onClick={() => window.print()}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200">
                        <Printer size={14} /> Imprimer / PDF
                    </button>
                    <button onClick={onSave} disabled={saving}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-[#FFB103] text-[#1a1a1a] hover:bg-[#d49400] disabled:opacity-50">
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        Sauvegarder
                    </button>
                </div>
            </div>
            {savedMsg && (
                <p className="no-print text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5 mb-3">
                    {savedMsg}
                </p>
            )}

            {/* Page A4 */}
            <div id="courrier-a4"
                className="bg-white rounded-2xl shadow-sm border border-gray-100 mx-auto max-w-[794px] p-10 md:p-14 text-[#1a1a1a] text-[15px] leading-relaxed">

                {/* En-tête entreprise */}
                <div className="flex items-start justify-between gap-6 pb-6 border-b-2 border-[#FFB103]">
                    <div className="flex items-center gap-4">
                        {config?.logo_path && (
                            <img src={`${API_BASE}/${config.logo_path}`} alt="Logo"
                                className="h-16 w-auto object-contain" />
                        )}
                        <div>
                            <p className="font-bold text-lg">{config?.nom || 'Hello Fermetures'}</p>
                        </div>
                    </div>
                    <div className="text-right text-xs text-gray-600 leading-snug">
                        {config?.adresse && <p>{config.adresse}</p>}
                        {(config?.code_postal || config?.ville) && (
                            <p>{[config.code_postal, config.ville].filter(Boolean).join(' ')}</p>
                        )}
                        {config?.telephone && <p>{config.telephone}</p>}
                        {config?.email && <p>{config.email}</p>}
                        {config?.siret && <p>SIRET {config.siret}</p>}
                    </div>
                </div>

                {/* Destinataire */}
                <div className="flex justify-end mt-8">
                    <div className="text-left min-w-[220px]">
                        {lignesDestinataire.length > 0
                            ? lignesDestinataire.map((l, i) => <p key={i} className={i === 0 ? 'font-semibold' : ''}>{l}</p>)
                            : <p className="text-gray-300 italic">Destinataire…</p>}
                    </div>
                </div>

                {/* Lieu, date */}
                <p className="mt-6 text-right">
                    {config?.ville ? `${config.ville}, le ` : 'Le '}{formatDateFR(dateCourrier)}
                </p>

                {/* Mention recommandé */}
                {MENTIONS[typeCourrier] && (
                    <p className="mt-6 font-bold tracking-wide">{MENTIONS[typeCourrier]}</p>
                )}

                {/* Objet / référence */}
                <div className="mt-6 space-y-1">
                    {objet && <p><span className="font-semibold">Objet :</span> {objet}</p>}
                    {reference && <p><span className="font-semibold">Réf. :</span> {reference}</p>}
                </div>

                {/* Corps — éditable à l'écran, texte simple à l'impression */}
                <textarea
                    ref={textareaRef}
                    value={corps}
                    onChange={e => onCorpsChange(e.target.value)}
                    placeholder="Le corps du courrier apparaîtra ici après reformulation — vous pouvez aussi l'écrire directement."
                    className="print-hide w-full mt-6 resize-none outline-none bg-transparent leading-relaxed overflow-hidden focus:bg-amber-50/40 rounded-lg"
                />
                <div className="print-show hidden mt-6 whitespace-pre-wrap">{corps}</div>

                {/* Signature */}
                <div className="mt-10 flex justify-end">
                    <div className="text-center">
                        <p className="font-semibold">{config?.signataire || ''}</p>
                        <div className="h-20" />
                    </div>
                </div>

                {/* Pied de page mentions légales */}
                {config?.mentions_legales && (
                    <p className="mt-8 pt-4 border-t border-gray-200 text-[10px] text-gray-400 text-center">
                        {config.mentions_legales}
                    </p>
                )}
            </div>
        </div>
    );
};

export default CourrierPreview;
