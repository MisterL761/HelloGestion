import React, { useState, useEffect, useCallback } from 'react';
import {
    Calculator, Trash2, Plus, TrendingUp, TrendingDown,
    AlertTriangle, Euro, RotateCcw, ChevronDown, ChevronUp
} from 'lucide-react';

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const r2    = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const fEuro = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);
const fPct  = (n) => (n ?? 0).toFixed(2) + ' %';

/* ─── Barème commission par coefficient ───────────────────────────────────── */
function getCommissionRate(coef) {
    if (coef < 1.90) return 0;
    if (coef <= 2.00) return 3;
    if (coef <= 2.20) return 4;
    if (coef <= 2.40) return 6;
    if (coef <= 2.60) return 7;
    if (coef <= 2.80) return 8;
    if (coef <= 3.00) return 9;
    return 10;
}

/* ─── Échelle baromètre client ────────────────────────────────────────────── */
function getRentabilityScale(profit, margin) {
    if (profit < 0) return { badge: 'bad',  label: 'Refuser le chantier', text: 'Ce chantier serait vendu à perte. Il faut le refuser.', position: 2,   bubble: 'Refuser' };
    if (margin >= 30) return { badge: 'good', label: 'Excellente',       text: 'Très belle marge pour absorber les imprévus et rester confortable.', position: 100, bubble: 'Excellente' };
    if (margin >= 20) return { badge: 'good', label: 'Très bonne',        text: 'Chantier bien positionné, avec une marge solide.', position: 82, bubble: 'Très bonne' };
    if (margin >= 12) return { badge: 'good', label: 'Bonne',             text: 'Bonne affaire : le dossier reste sain et intéressant.', position: 64, bubble: 'Bonne' };
    if (margin >= 7)  return { badge: 'warn', label: 'Passable',          text: 'Rentabilité correcte mais à surveiller de près.', position: 46, bubble: 'Passable' };
    if (margin >= 3)  return { badge: 'warn', label: 'Médiocre',          text: 'Marge courte : le moindre imprévu peut vite peser.', position: 28, bubble: 'Médiocre' };
    if (margin > 0)   return { badge: 'bad',  label: 'Faible',            text: 'Très faible marge : chantier peu confortable.', position: 14, bubble: 'Faible' };
    return { badge: 'bad', label: 'À l\'équilibre', text: 'Le chantier est à l\'équilibre, sans vraie marge de sécurité.', position: 6, bubble: '0 %' };
}

/* ─── Calcul global ───────────────────────────────────────────────────────── */
function compute(form) {
    const salePrice   = +form.salePrice || 0;
    const discVal     = +form.discountValue || 0;
    const discType    = form.discountType;
    const supplierHT  = +form.supplierHT || 0;
    const installDays = +form.installationDays || 0;
    const dailyCost   = +form.dailyCost || 0;
    const useSub      = form.useSubcontractor === 'oui';
    const subAmount   = useSub ? (+form.subcontractorAmount || 0) : 0;
    const vatRows     = form.vatRows || [];

    const discountAmount = r2(Math.max(0, Math.min(
        discType === 'percent' ? salePrice * (discVal / 100) : discVal,
        salePrice
    )));
    const netSalePrice = r2(Math.max(0, salePrice - discountAmount));

    const operationCost = useSub ? subAmount : installDays * dailyCost;
    const baseCost      = supplierHT + operationCost;

    const commissionCoefficient = supplierHT > 0 ? r2(netSalePrice / supplierHT) : 0;
    const commissionRate        = getCommissionRate(commissionCoefficient);
    const commissionBonus       = (commissionCoefficient > 3 && netSalePrice >= 30000)
        ? Math.floor(netSalePrice / 10000) * 100 : 0;
    const commissionGross = r2(netSalePrice * (commissionRate / 100) + commissionBonus);

    const totalCost = baseCost + commissionGross;
    const profit    = r2(netSalePrice - totalCost);
    const margin    = netSalePrice > 0 ? r2((profit / netSalePrice) * 100) : 0;

    const vatDeductible = r2(supplierHT * 0.20 + subAmount * 0.20);
    const vatCollected  = r2(vatRows.reduce((s, row) => s + (+row.base_ht || 0) * ((+row.rate || 0) / 100), 0));
    const vatCredit     = vatDeductible > vatCollected ? r2(vatDeductible - vatCollected) : 0;
    const vatToPay      = vatCollected > vatDeductible ? r2(vatCollected - vatDeductible) : 0;

    const subRate = salePrice > 0 ? r2((subAmount / salePrice) * 100) : 0;

    // TTC : taux effectif calculé depuis les lignes TVA (défaut 10 % si aucune ligne remplie)
    const totalBaseHT      = vatRows.reduce((s, row) => s + (+row.base_ht || 0), 0);
    const effectiveVatRate = totalBaseHT > 0 ? vatCollected / totalBaseHT : 0.10;
    const salePriceTTC     = r2(salePrice     * (1 + effectiveVatRate));
    const netSalePriceTTC  = r2(netSalePrice  * (1 + effectiveVatRate));
    const discountAmountTTC = r2(discountAmount * (1 + effectiveVatRate));

    let rentLabel, rentCls;
    if (profit > 0 && margin >= 20) { rentLabel = 'Rentable';     rentCls = 'good'; }
    else if (profit >= 0)            { rentLabel = 'Attention';    rentCls = 'warn'; }
    else                             { rentLabel = 'Non rentable'; rentCls = 'bad'; }

    return {
        discountAmount, netSalePrice, operationCost, baseCost,
        commissionCoefficient, commissionRate, commissionBonus, commissionGross,
        totalCost, profit, margin, vatDeductible, vatCollected,
        vatCredit, vatToPay, subRate, rentLabel, rentCls,
        salePriceTTC, netSalePriceTTC, discountAmountTTC,
    };
}

/* ─── Formulaire vide ─────────────────────────────────────────────────────── */
const EMPTY = {
    salePrice: '', discountValue: '', discountType: 'amount',
    supplierHT: '', installationDays: 1, dailyCost: 2500,
    useSubcontractor: 'non', subcontractorAmount: '',
    vatRows: [{ rate: 10, base_ht: 0 }],
};

/* ─── Styles partagés ─────────────────────────────────────────────────────── */
const inp   = 'border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFB103] w-full bg-white';
const inpSm = 'border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#FFB103] w-full bg-white';

/* ─── Carte résultat ──────────────────────────────────────────────────────── */
function Card({ label, value, accent = 'gray', sub }) {
    const accents = {
        gray:   'border-gray-100 bg-white',
        green:  'border-green-100 bg-green-50',
        red:    'border-red-100 bg-red-50',
        blue:   'border-blue-100 bg-blue-50',
        orange: 'border-orange-100 bg-orange-50',
        purple: 'border-amber-100 bg-amber-50',
    };
    const textAccents = {
        gray: 'text-gray-700', green: 'text-green-700', red: 'text-red-700',
        blue: 'text-blue-700', orange: 'text-orange-600', purple: 'text-amber-700',
    };
    return (
        <div className={`rounded-xl border p-4 ${accents[accent]}`}>
            <p className={`text-[11px] font-bold uppercase tracking-wide mb-1 ${textAccents[accent]} opacity-70`}>{label}</p>
            <p className={`text-xl font-bold ${textAccents[accent]}`}>{value}</p>
            {sub && <p className="text-xs mt-1 opacity-60">{sub}</p>}
        </div>
    );
}

/* ─── Baromètre client ────────────────────────────────────────────────────── */
function Barometre({ t, form, onDiscountChange, onDiscountTypeChange }) {
    const [showDiscount, setShowDiscount] = useState(false);

    const scale    = getRentabilityScale(t.profit, t.margin);
    const position = Math.max(2, Math.min(scale.position, 98));

    const badgeClasses = {
        good: 'bg-green-100 text-green-800 border-green-300',
        warn: 'bg-orange-100 text-orange-800 border-orange-300',
        bad:  'bg-red-100 text-red-800 border-red-300',
    };
    const markerColors = {
        good: 'bg-green-600',
        warn: 'bg-orange-500',
        bad:  'bg-red-500',
    };

    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    Baromètre de rentabilité
                </p>
                {/* Bouton discret — invisible pour le client */}
                <button
                    type="button"
                    onClick={() => setShowDiscount(v => !v)}
                    className="w-5 h-5 flex items-center justify-center text-gray-200 hover:text-gray-400 transition-colors rounded focus:outline-none"
                    tabIndex={-1}
                >
                    <Plus size={11} />
                </button>
            </div>

            {/* Barre de progression */}
            <div className="relative pt-8 mb-4">
                {/* Bulle flottante */}
                <div
                    className={`absolute top-0 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm transform -translate-x-1/2 transition-all duration-300 ${
                        scale.badge === 'good' ? 'bg-green-600' : scale.badge === 'warn' ? 'bg-orange-500' : 'bg-red-500'
                    }`}
                    style={{ left: `${position}%` }}
                >
                    {scale.bubble}
                </div>
                {/* Barre dégradée */}
                <div className="relative h-5 rounded-full overflow-hidden border border-gray-200"
                    style={{ background: 'linear-gradient(90deg, #dc2626 0%, #f97316 20%, #f59e0b 40%, #84cc16 62%, #22c55e 80%, #16a34a 100%)' }}>
                    {/* Marqueur */}
                    <div
                        className={`absolute top-0 w-1 h-full ${markerColors[scale.badge]} shadow-md transition-all duration-300`}
                        style={{ left: `${position}%`, transform: 'translateX(-50%)', boxShadow: '0 0 0 2px rgba(255,255,255,0.8)' }}
                    />
                </div>
                {/* Légende */}
                <div className="flex justify-between mt-2 text-[10px] font-bold text-gray-400">
                    <span>Perte</span><span>Faible</span><span>Correcte</span><span>Bonne</span><span>Excellente</span>
                </div>
            </div>

            {/* Résumé */}
            <div className="flex items-center justify-between gap-3 mt-4">
                <p className="text-sm text-gray-600 flex-1">{scale.text}</p>
                <span className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border ${badgeClasses[scale.badge]}`}>
                    {scale.label}
                </span>
            </div>

            {/* Remise — visible uniquement si déverrouillée via le bouton discret */}
            {showDiscount && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Remise</p>
                    <div className="flex gap-2">
                        <input
                            type="number" min="0" step="0.01" placeholder="0"
                            value={form.discountValue}
                            onChange={e => onDiscountChange(e.target.value)}
                            className={`${inp} flex-1`}
                            autoFocus
                        />
                        <select
                            value={form.discountType}
                            onChange={e => onDiscountTypeChange(e.target.value)}
                            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFB103] bg-white w-20"
                        >
                            <option value="amount">€</option>
                            <option value="percent">%</option>
                        </select>
                    </div>
                    {t.discountAmount > 0 && (
                        <p className="text-xs text-orange-500 mt-1">
                            Remise : {fEuro(t.discountAmount)} → Net : {fEuro(t.netSalePrice)}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPOSANT PRINCIPAL
═══════════════════════════════════════════════════════════════════════════ */
export default function CalculChantier() {
    const [form, setForm]         = useState(EMPTY);
    const [showComm, setShowComm] = useState(false);
    const [clientMode, setClientMode] = useState(false);

    const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

    /* ── Lignes TVA ── */
    const addVatRow    = () => setForm(f => ({ ...f, vatRows: [...f.vatRows, { rate: 10, base_ht: 0 }] }));
    const updateVatRow = (i, k, v) => setForm(f => {
        const rows = [...f.vatRows]; rows[i] = { ...rows[i], [k]: v }; return { ...f, vatRows: rows };
    });
    const removeVatRow = (i) => setForm(f => ({
        ...f, vatRows: f.vatRows.length > 1 ? f.vatRows.filter((_, idx) => idx !== i) : [{ rate: 10, base_ht: 0 }],
    }));

    /* ── Reset ── */
    const reset = () => { setForm(EMPTY); setClientMode(false); };

    useEffect(() => {
        const handler = (e) => {
            if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'h') {
                e.preventDefault();
                setClientMode(v => !v);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    /* ── Calcul ── */
    const t = compute(form);

    const heroBg = t.rentCls === 'good'
        ? 'bg-green-50 border-green-300 text-green-700'
        : t.rentCls === 'warn'
        ? 'bg-orange-50 border-orange-300 text-orange-600'
        : 'bg-red-50 border-red-300 text-red-600';

    return (
        <div className="space-y-5">

            {/* ── En-tête ── */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                    {/* L'icône est le bouton secret de bascule mode client */}
                    <button
                        onClick={() => setClientMode(v => !v)}
                        title=""
                        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 focus:outline-none"
                        style={{ background: '#FFB103' }}
                    >
                        <Calculator size={22} className="text-white" />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Calcul chantier</h2>
                        <p className="text-sm text-gray-500">Calculette de rentabilité — temps réel</p>
                    </div>
                </div>
                {!clientMode && (
                    <button
                        onClick={reset}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 bg-white transition-colors"
                    >
                        <RotateCcw size={14} /> Effacer
                    </button>
                )}
            </div>


            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

                {/* ══ COLONNE GAUCHE : saisie ══ */}
                <div className="space-y-4">

                    {/* Section saisie principale */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Informations chantier</h3>

                        <div className="space-y-4">
                            {/* Prix de vente */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">
                                    {clientMode ? 'Prix de vente HT (€)' : 'Prix de vente HT (€)'}
                                </label>
                                <input type="number" min="0" step="0.01" placeholder="0.00"
                                    value={form.salePrice}
                                    onChange={e => setField('salePrice', e.target.value)}
                                    className={inp} />
                            </div>

                            {/* Remise — masquée en mode client (elle est dans le baromètre) */}
                            {!clientMode && (
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Remise accordée</label>
                                    <div className="flex gap-2">
                                        <input type="number" min="0" step="0.01" placeholder="0"
                                            value={form.discountValue}
                                            onChange={e => setField('discountValue', e.target.value)}
                                            className={`${inp} flex-1`} />
                                        <select value={form.discountType}
                                            onChange={e => setField('discountType', e.target.value)}
                                            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFB103] bg-white w-20">
                                            <option value="amount">€</option>
                                            <option value="percent">%</option>
                                        </select>
                                    </div>
                                    {t.discountAmount > 0 && (
                                        <p className="text-xs text-orange-500 mt-1">Remise : {fEuro(t.discountAmount)} → Vente nette : {fEuro(t.netSalePrice)}</p>
                                    )}
                                </div>
                            )}

                            {/* Achats fournisseurs — masqués en mode client */}
                            {!clientMode && (
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Total achats fournisseurs HT (€)</label>
                                    <input type="number" min="0" step="0.01" placeholder="0.00"
                                        value={form.supplierHT}
                                        onChange={e => setField('supplierHT', e.target.value)}
                                        className={inp} />
                                </div>
                            )}

                            {/* Jours + coût journalier — masqués en mode client */}
                            {!clientMode && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">Jours de pose</label>
                                        <input type="number" min="0" step="0.5"
                                            value={form.installationDays}
                                            onChange={e => setField('installationDays', e.target.value)}
                                            disabled={form.useSubcontractor === 'oui'}
                                            className={`${inp} ${form.useSubcontractor === 'oui' ? 'opacity-40 cursor-not-allowed' : ''}`} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">Frais / jour HT (€)</label>
                                        <input type="number" min="0" step="0.01"
                                            value={form.dailyCost}
                                            onChange={e => setField('dailyCost', e.target.value)}
                                            disabled={form.useSubcontractor === 'oui'}
                                            className={`${inp} ${form.useSubcontractor === 'oui' ? 'opacity-40 cursor-not-allowed' : ''}`} />
                                    </div>
                                </div>
                            )}

                            {/* Sous-traitance — masquée en mode client */}
                            {!clientMode && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">Sous-traitance</label>
                                        <select value={form.useSubcontractor}
                                            onChange={e => setField('useSubcontractor', e.target.value)}
                                            className={inp}>
                                            <option value="non">Non</option>
                                            <option value="oui">Oui</option>
                                        </select>
                                    </div>
                                    {form.useSubcontractor === 'oui' && (
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-600 mb-1">Montant sous-traitance HT (€)</label>
                                            <input type="number" min="0" step="0.01" placeholder="0.00"
                                                value={form.subcontractorAmount}
                                                onChange={e => setField('subcontractorAmount', e.target.value)}
                                                className={inp} />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Section TVA — masquée en mode client */}
                    {!clientMode && (
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                    <Euro size={13} /> Lignes TVA ventes
                                </h3>
                                <button type="button" onClick={addVatRow}
                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50">
                                    <Plus size={11} /> Ligne
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-100">
                                            {['Taux TVA', 'Base HT (€)', 'TVA calculée', ''].map(h => (
                                                <th key={h} className="px-2 py-2 text-left font-semibold text-gray-500 uppercase">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {form.vatRows.map((row, i) => {
                                            const vatCalc = (+row.base_ht || 0) * ((+row.rate || 0) / 100);
                                            return (
                                                <tr key={i}>
                                                    <td className="px-2 py-1.5 w-24">
                                                        <select value={row.rate}
                                                            onChange={e => updateVatRow(i, 'rate', +e.target.value)}
                                                            className={inpSm}>
                                                            {[0, 5.5, 10, 20].map(r => <option key={r} value={r}>{r} %</option>)}
                                                        </select>
                                                    </td>
                                                    <td className="px-2 py-1.5 w-32">
                                                        <input type="number" min="0" step="0.01" value={row.base_ht}
                                                            onChange={e => updateVatRow(i, 'base_ht', e.target.value)}
                                                            className={inpSm} />
                                                    </td>
                                                    <td className="px-2 py-1.5 font-semibold text-blue-700">{fEuro(vatCalc)}</td>
                                                    <td className="px-2 py-1.5 w-8">
                                                        <button type="button" onClick={() => removeVatRow(i)}
                                                            className="text-gray-300 hover:text-red-500 transition-colors">
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* ══ COLONNE DROITE : résultats ══ */}
                <div className="space-y-4">

                    {/* MODE CLIENT : baromètre */}
                    {clientMode && (
                        <Barometre
                            t={t}
                            form={form}
                            onDiscountChange={v => setField('discountValue', v)}
                            onDiscountTypeChange={v => setField('discountType', v)}
                        />
                    )}

                    {/* MODE INTERNE : hero rentabilité */}
                    {!clientMode && (
                        <div className={`rounded-xl border-2 p-6 ${heroBg}`}>
                            <div className="flex items-center gap-3 mb-4">
                                {t.rentCls === 'good'
                                    ? <TrendingUp size={24} />
                                    : t.rentCls === 'warn'
                                    ? <AlertTriangle size={24} />
                                    : <TrendingDown size={24} />
                                }
                                <span className="font-bold text-base">Rentabilité chantier</span>
                                <span className={`ml-auto px-3 py-1 rounded-full text-sm font-bold border ${
                                    t.rentCls === 'good' ? 'bg-green-100 border-green-300 text-green-800'
                                    : t.rentCls === 'warn' ? 'bg-orange-100 border-orange-300 text-orange-800'
                                    : 'bg-red-100 border-red-300 text-red-800'
                                }`}>{t.rentLabel}</span>
                            </div>
                            <div className="flex gap-8">
                                <div>
                                    <p className="text-xs uppercase font-semibold opacity-70 mb-1">Profit net</p>
                                    <p className="text-4xl font-black">{fEuro(t.profit)}</p>
                                </div>
                                <div>
                                    <p className="text-xs uppercase font-semibold opacity-70 mb-1">Marge nette</p>
                                    <p className="text-4xl font-black">{fPct(t.margin)}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Cartes principales */}
                    <div className="grid grid-cols-2 gap-3">
                        <Card
                            label="Prix vente HT"
                            value={fEuro(+form.salePrice || 0)}
                        />
                        {t.discountAmount > 0 && (
                            <Card
                                label="Remise accordée"
                                value={clientMode ? fEuro(t.discountAmountTTC) : fEuro(t.discountAmount)}
                                accent="orange"
                            />
                        )}
                        <Card
                            label={clientMode ? 'Vente nette TTC' : 'Vente nette HT'}
                            value={clientMode ? fEuro(t.netSalePriceTTC) : fEuro(t.netSalePrice)}
                            accent="blue"
                        />
                        {!clientMode && <Card label="Achats fournisseurs" value={fEuro(+form.supplierHT || 0)} />}
                        {!clientMode && (
                            <>
                                <Card label="Pose / sous-traitance" value={fEuro(t.operationCost)} />
                                <Card label="Coût technique"        value={fEuro(t.baseCost)} />
                                <Card label="Coût total + com."     value={fEuro(t.totalCost)} accent="red" />
                            </>
                        )}
                    </div>

                    {/* Commission — accordéon, masqué en mode client */}
                    {!clientMode && (
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                            <button
                                type="button"
                                onClick={() => setShowComm(v => !v)}
                                className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-gray-50 transition-colors"
                            >
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Commission commerciale</span>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-bold text-amber-700">{fEuro(t.commissionGross)} ({t.commissionRate} %)</span>
                                    {showComm ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                                </div>
                            </button>
                            {showComm && (
                                <div className="px-5 pb-4 grid grid-cols-2 gap-3 border-t border-gray-100 pt-4">
                                    <Card label="Coef commercial"  value={t.commissionCoefficient.toFixed(2)} accent="purple" />
                                    <Card label="Taux commission"  value={t.commissionRate + ' %'} accent="purple" />
                                    <Card label="Commission brute" value={fEuro(t.commissionGross)} accent="purple" />
                                    {t.commissionBonus > 0 && (
                                        <Card label="Bonus palier" value={fEuro(t.commissionBonus)} accent="purple"
                                            sub="100€ / tranche de 10 000€ au-delà de 30 000€" />
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Sous-traitance alerte Qualibat — masquée en mode client */}
                    {!clientMode && form.useSubcontractor === 'oui' && (
                        <div className={`rounded-xl border p-4 text-sm font-medium ${
                            t.subRate > 30    ? 'bg-red-50 border-red-200 text-red-700'
                            : t.subRate >= 25 ? 'bg-orange-50 border-orange-200 text-orange-600'
                            : 'bg-green-50 border-green-200 text-green-700'
                        }`}>
                            <div className="flex items-center justify-between mb-2">
                                <span>Taux sous-traitance</span>
                                <span className="font-bold text-base">{fPct(t.subRate)}</span>
                            </div>
                            <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden mb-1">
                                <div className={`h-2 rounded-full transition-all ${
                                    t.subRate > 30 ? 'bg-red-500' : t.subRate >= 25 ? 'bg-orange-400' : 'bg-green-500'
                                }`} style={{ width: `${Math.min(t.subRate, 100)}%` }} />
                            </div>
                            <p className="text-xs opacity-80">
                                {t.subRate > 30 ? '⚠ Alerte Qualibat — seuil de 30 % dépassé'
                                    : t.subRate >= 25 ? '⚠ Proche limite Qualibat (30 %)'
                                    : '✓ Qualibat OK (< 25 %)'}
                            </p>
                        </div>
                    )}

                    {/* TVA — masquée en mode client */}
                    {!clientMode && (
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Euro size={13} /> Position TVA
                            </h3>
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <Card label="TVA déductible achats" value={fEuro(t.vatDeductible)} accent="blue" />
                                <Card label="TVA collectée ventes"  value={fEuro(t.vatCollected)} />
                            </div>
                            {t.vatCredit > 0 ? (
                                <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 text-center">
                                    <p className="text-xs font-bold text-blue-500 uppercase mb-1">Crédit TVA à récupérer</p>
                                    <p className="text-2xl font-black text-blue-700">{fEuro(t.vatCredit)}</p>
                                </div>
                            ) : t.vatToPay > 0 ? (
                                <div className="rounded-xl bg-orange-50 border border-orange-200 p-4 text-center">
                                    <p className="text-xs font-bold text-orange-500 uppercase mb-1">TVA à reverser au fisc</p>
                                    <p className="text-2xl font-black text-orange-600">{fEuro(t.vatToPay)}</p>
                                </div>
                            ) : (
                                <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 text-center">
                                    <p className="text-sm font-semibold text-gray-500">TVA équilibrée</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

