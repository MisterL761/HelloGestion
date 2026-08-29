import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Trash2, Save, History, FileText } from 'lucide-react';
import { useToast } from './ToastProvider';

const API_BASE = import.meta.env.VITE_API_BASE || '/hello-gestion/php';
const TAUX_CHARGES = 0.2155;
const MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(n || 0);

let _uid = 1;
const uid = () => `r${_uid++}`;

function getTauxFromCoef(coef) {
    if (coef >= 3.01) return 0.10;
    if (coef >= 2.81) return 0.09;
    if (coef >= 2.61) return 0.08;
    if (coef >= 2.41) return 0.07;
    if (coef >= 2.21) return 0.06;
    if (coef >= 2.01) return 0.04;
    if (coef >= 1.90) return 0.03;
    return 0.00;
}

const emptyVente = () => ({ id: uid(), type: 'vente', client: '', note: '', venteHT: '', achatHT: '', metre: false, partage: '' });
const emptyMetre = () => ({ id: uid(), type: 'metre', client: '', note: '', venteHT: '' });
const emptyDecom = () => ({ id: uid(), client: '', note: '', montant: '' });
const emptyFrais = () => ({ id: uid(), description: '', montant: '' });

const inputCls = 'w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFB103] focus:border-transparent bg-white';
const thCls = 'bg-[#FFB103] text-[#1a1a1a] px-3 py-2.5 text-xs font-semibold text-left whitespace-nowrap';

const CommissionCalculator = ({ user, targetUserId = null }) => {
    const toast = useToast();
    const now = new Date();
    const currentYear  = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const [month, setMonth] = useState(currentMonth);
    const [year, setYear]   = useState(currentYear);
    const [ventes, setVentes] = useState([emptyVente()]);
    const [decoms, setDecoms] = useState([]);
    const [frais, setFrais]   = useState([]);
    const [saving, setSaving] = useState(false);
    const [records, setRecords] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const userId   = targetUserId || user?.id;
    const userName = user?.name || '';

    const years = [];
    for (let y = currentYear; y >= currentYear - 3; y--) years.push(y);

    // ── Fetch historique ─────────────────────────────────────

    const fetchRecords = async () => {
        if (!userId) return;
        setLoadingHistory(true);
        try {
            const res  = await fetch(`${API_BASE}/commissions.php?user_id=${userId}`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) setRecords(data.data || []);
        } catch { /* ignore */ }
        finally { setLoadingHistory(false); }
    };

    useEffect(() => { fetchRecords(); }, [userId]);

    // ── Calculs ──────────────────────────────────────────────

    const computedVentes = useMemo(() => ventes.map(v => {
        if (v.type === 'metre') {
            const vHT = parseFloat(v.venteHT) || 0;
            return { ...v, coef: '—', taux: '1 %', commission: vHT * 0.01 };
        }
        const vHT = parseFloat(v.venteHT) || 0;
        const aHT = parseFloat(v.achatHT) || 0;
        if (vHT <= 0 || aHT <= 0) return { ...v, coef: '—', taux: '0 %', commission: 0 };
        const coef = vHT / aHT;
        const taux = getTauxFromCoef(coef);
        let com = vHT * taux;
        if (v.metre) com += vHT * 0.01;
        const partage = Math.min(Math.max(parseFloat(v.partage) || 0, 0), 100);
        if (partage > 0) com = com * ((100 - partage) / 100);
        return { ...v, coef: coef.toFixed(2), taux: `${(taux * 100).toFixed(0)} %`, commission: com };
    }), [ventes]);

    const totals = useMemo(() => {
        const totalCA    = computedVentes.reduce((s, v) => s + (parseFloat(v.venteHT) || 0), 0);
        const totalCom   = computedVentes.reduce((s, v) => s + v.commission, 0);
        const totalDecom = decoms.reduce((s, d) => s + (parseFloat(d.montant) || 0), 0);
        const totalFrais = frais.reduce((s, f) => s + (parseFloat(f.montant) || 0), 0);
        const prime      = totalCA >= 30000 ? Math.floor(totalCA / 10000) * 100 : 0;
        const brut       = Math.max(totalCom + prime - totalDecom, 0);
        const charges    = brut * TAUX_CHARGES;
        return { totalCA, totalCom, totalDecom, totalFrais, prime, charges, net: brut - charges + totalFrais };
    }, [computedVentes, decoms, frais]);

    // ── Mutations ventes / décoms ────────────────────────────

    const updateVente = (id, field, val) => setVentes(vs => vs.map(v => v.id === id ? { ...v, [field]: val } : v));
    const removeVente = (id) => setVentes(vs => vs.filter(v => v.id !== id));
    const updateDecom = (id, field, val) => setDecoms(ds => ds.map(d => d.id === id ? { ...d, [field]: val } : d));
    const removeDecom = (id) => setDecoms(ds => ds.filter(d => d.id !== id));
    const updateFrais = (id, field, val) => setFrais(fs => fs.map(f => f.id === id ? { ...f, [field]: val } : f));
    const removeFrais = (id) => setFrais(fs => fs.filter(f => f.id !== id));

    // ── Save ────────────────────────────────────────────────

    const handleSave = async () => {
        if (!userId) return;
        setSaving(true);
        try {
            const res = await fetch(`${API_BASE}/commissions.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ user_id: userId, commercial_name: userName, month, year, data: { ventes, decoms, frais } }),
            });
            const d = await res.json();
            if (d.success) { toast.success('Bordereau enregistré ✓'); fetchRecords(); }
            else toast.error(d.message || 'Erreur');
        } catch { toast.error('Erreur réseau'); }
        finally { setSaving(false); }
    };

    const loadRecord = (r) => {
        const d = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
        setMonth(+r.month);
        setYear(+r.year);
        setVentes((d.ventes || [emptyVente()]).map(v => ({ ...v, id: uid() })));
        setDecoms((d.decoms || []).map(x => ({ ...x, id: uid() })));
        setFrais((d.frais  || []).map(x => ({ ...x, id: uid() })));
        setShowHistory(false);
        toast.success(`${MOIS[r.month - 1]} ${r.year} chargé`);
    };

    const deleteRecord = async (id) => {
        try {
            await fetch(`${API_BASE}/commissions.php?id=${id}`, { method: 'DELETE', credentials: 'include' });
            setRecords(rs => rs.filter(r => r.id !== id));
        } catch { /* ignore */ }
    };

    // ── Render ───────────────────────────────────────────────

    return (
        <div className="space-y-5">

            {/* ── En-tête ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex flex-wrap items-end gap-4 justify-between">
                    <div className="flex flex-wrap gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Mois</label>
                            <select className={inputCls + ' w-36'} value={month} onChange={e => setMonth(+e.target.value)}>
                                {MOIS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Année</label>
                            <select className={inputCls + ' w-24'} value={year} onChange={e => setYear(+e.target.value)}>
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => { if (!showHistory) fetchRecords(); setShowHistory(!showHistory); }}
                            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                            <History size={15} />
                            Historique
                            {records.length > 0 && (
                                <span className="bg-amber-100 text-amber-700 text-xs font-bold px-1.5 py-0.5 rounded-full">{records.length}</span>
                            )}
                        </button>
                        <button
                            onClick={handleSave} disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 bg-[#FFB103] text-[#1a1a1a] rounded-xl text-sm font-semibold hover:bg-[#d49400] transition-colors disabled:opacity-50"
                        >
                            <Save size={15} /> {saving ? 'Sauvegarde…' : 'Enregistrer'}
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Historique ── */}
            {showHistory && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2 font-semibold text-gray-800 text-sm">
                        <History size={15} className="text-amber-600" /> Bordereaux enregistrés
                    </div>
                    {loadingHistory ? (
                        <div className="py-6 text-center text-gray-400 text-sm">Chargement…</div>
                    ) : records.length === 0 ? (
                        <div className="py-8 text-center text-gray-400 text-sm">
                            <FileText size={28} className="mx-auto mb-2 opacity-30" />
                            Aucun bordereau enregistré
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {[...records]
                                .sort((a, b) => (b.year * 100 + b.month) - (a.year * 100 + a.month))
                                .map(r => (
                                    <div key={r.id} className="flex items-center gap-3 px-5 py-3">
                                        <FileText size={14} className="text-amber-500 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-800">{MOIS[r.month - 1]} {r.year}</p>
                                            {r.commercial_name && <p className="text-xs text-gray-400">{r.commercial_name}</p>}
                                        </div>
                                        <button
                                            onClick={() => loadRecord(r)}
                                            className="text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors shrink-0"
                                        >
                                            Charger
                                        </button>
                                        <button
                                            onClick={() => deleteRecord(r.id)}
                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))
                            }
                        </div>
                    )}
                </div>
            )}

            {/* ── Table Ventes ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 text-sm font-semibold text-gray-800">Ventes</div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[780px]">
                        <thead>
                            <tr>
                                <th className={thCls}>Client / Projet</th>
                                <th className={thCls}>Note</th>
                                <th className={thCls}>Vente HT (€)</th>
                                <th className={thCls}>Achat HT (€)</th>
                                <th className={thCls}>Coef</th>
                                <th className={thCls}>Taux</th>
                                <th className={thCls}>Métré ?</th>
                                <th className={thCls}>Partage %</th>
                                <th className={thCls}>Commission</th>
                                <th className={thCls + ' w-10'}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {computedVentes.map(v => (
                                <tr key={v.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                                    <td className="px-2 py-1.5">
                                        <input className={inputCls} placeholder="Client / Projet" value={v.client}
                                            onChange={e => updateVente(v.id, 'client', e.target.value)} />
                                    </td>
                                    <td className="px-2 py-1.5">
                                        <input className={inputCls} placeholder="Note (optionnel)" value={v.note}
                                            onChange={e => updateVente(v.id, 'note', e.target.value)} />
                                    </td>
                                    <td className="px-2 py-1.5">
                                        <input className={inputCls} type="number" step="0.01" min="0" placeholder="0,00"
                                            value={v.venteHT} onChange={e => updateVente(v.id, 'venteHT', e.target.value)} />
                                    </td>
                                    {v.type === 'metre' ? (
                                        <>
                                            <td className="px-2 py-1.5 bg-gray-50 text-center text-xs text-gray-400">—</td>
                                            <td className="px-2 py-1.5 text-center text-xs text-gray-400">—</td>
                                            <td className="px-2 py-1.5 text-center text-xs font-bold text-amber-700">1 %</td>
                                            <td className="px-2 py-1.5 bg-gray-50 text-center text-xs text-gray-400">Oui</td>
                                            <td className="px-2 py-1.5 bg-gray-50 text-center text-xs text-gray-400">—</td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="px-2 py-1.5">
                                                <input className={inputCls} type="number" step="0.01" min="0" placeholder="0,00"
                                                    value={v.achatHT} onChange={e => updateVente(v.id, 'achatHT', e.target.value)} />
                                            </td>
                                            <td className="px-2 py-1.5 text-center text-xs font-semibold text-gray-700">{v.coef}</td>
                                            <td className="px-2 py-1.5 text-center text-xs font-bold text-amber-700">{v.taux}</td>
                                            <td className="px-2 py-1.5">
                                                <select className={inputCls} value={v.metre ? '1' : '0'}
                                                    onChange={e => updateVente(v.id, 'metre', e.target.value === '1')}>
                                                    <option value="0">Non</option>
                                                    <option value="1">Oui</option>
                                                </select>
                                            </td>
                                            <td className="px-2 py-1.5">
                                                <input className={inputCls} type="number" step="1" min="0" max="100" placeholder="%"
                                                    value={v.partage} onChange={e => updateVente(v.id, 'partage', e.target.value)} />
                                            </td>
                                        </>
                                    )}
                                    <td className="px-3 py-1.5 text-right text-sm font-bold text-gray-800 whitespace-nowrap">
                                        {fmt(v.commission)}
                                    </td>
                                    <td className="px-2 py-1.5">
                                        <button onClick={() => removeVente(v.id)}
                                            className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                            <Trash2 size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="px-5 py-3 border-t border-gray-50 flex flex-wrap gap-3">
                    <button onClick={() => setVentes(vs => [...vs, emptyVente()])}
                        className="flex items-center gap-2 text-sm font-semibold text-[#FFB103] bg-amber-50 hover:bg-amber-100 px-4 py-2 rounded-xl transition-colors">
                        <Plus size={14} /> Ajouter une vente
                    </button>
                    <button onClick={() => setVentes(vs => [...vs, emptyMetre()])}
                        className="flex items-center gap-2 text-sm font-semibold text-teal-600 bg-teal-50 hover:bg-teal-100 px-4 py-2 rounded-xl transition-colors">
                        <Plus size={14} /> Ajouter un métré
                    </button>
                </div>
            </div>

            {/* ── Table Décommissionnements ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 text-sm font-semibold text-gray-800">Décommissionnements</div>
                {decoms.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[480px]">
                            <thead>
                                <tr>
                                    <th className={thCls}>Client / Motif</th>
                                    <th className={thCls}>Note</th>
                                    <th className={thCls}>Montant (€)</th>
                                    <th className={thCls + ' w-10'}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {decoms.map(d => (
                                    <tr key={d.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                                        <td className="px-2 py-1.5">
                                            <input className={inputCls} placeholder="Client / Motif" value={d.client}
                                                onChange={e => updateDecom(d.id, 'client', e.target.value)} />
                                        </td>
                                        <td className="px-2 py-1.5">
                                            <input className={inputCls} placeholder="Note (optionnel)" value={d.note}
                                                onChange={e => updateDecom(d.id, 'note', e.target.value)} />
                                        </td>
                                        <td className="px-2 py-1.5">
                                            <input className={inputCls} type="number" step="0.01" min="0" placeholder="0,00"
                                                value={d.montant} onChange={e => updateDecom(d.id, 'montant', e.target.value)} />
                                        </td>
                                        <td className="px-2 py-1.5">
                                            <button onClick={() => removeDecom(d.id)}
                                                className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <div className="px-5 py-3 border-t border-gray-50">
                    <button onClick={() => setDecoms(ds => [...ds, emptyDecom()])}
                        className="flex items-center gap-2 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-xl transition-colors">
                        <Plus size={14} /> Ajouter un décommissionnement
                    </button>
                </div>
            </div>

            {/* ── Notes de frais ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 text-sm font-semibold text-gray-800">Notes de frais</div>
                {frais.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[400px]">
                            <thead>
                                <tr>
                                    <th className={thCls}>Description</th>
                                    <th className={thCls}>Montant (€)</th>
                                    <th className={thCls + ' w-10'}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {frais.map(f => (
                                    <tr key={f.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                                        <td className="px-2 py-1.5">
                                            <input className={inputCls} placeholder="Description" value={f.description}
                                                onChange={e => updateFrais(f.id, 'description', e.target.value)} />
                                        </td>
                                        <td className="px-2 py-1.5">
                                            <input className={inputCls} type="number" step="0.01" min="0" placeholder="0,00"
                                                value={f.montant} onChange={e => updateFrais(f.id, 'montant', e.target.value)} />
                                        </td>
                                        <td className="px-2 py-1.5">
                                            <button onClick={() => removeFrais(f.id)}
                                                className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <div className="px-5 py-3 border-t border-gray-50">
                    <button onClick={() => setFrais(fs => [...fs, emptyFrais()])}
                        className="flex items-center gap-2 text-sm font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 px-4 py-2 rounded-xl transition-colors">
                        <Plus size={14} /> Ajouter une note de frais
                    </button>
                </div>
            </div>

            {/* ── Récapitulatif ── */}
            <div className="bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] rounded-2xl p-6 text-white">
                <h3 className="font-bold text-base mb-4">Récapitulatif — {MOIS[month - 1]} {year}</h3>
                <div className="space-y-2.5 mb-4">
                    {[
                        { label: "Chiffre d'affaires",       value: fmt(totals.totalCA),    extra: '' },
                        { label: 'Total commissions',        value: fmt(totals.totalCom),   extra: '' },
                        { label: `Prime palier${totals.prime > 0 ? ' (CA ≥ 30 000 €)' : ''}`,
                                                             value: fmt(totals.prime),      extra: '' },
                        { label: 'Décommissionnements',      value: `– ${fmt(totals.totalDecom)}` },
                        { label: 'Charges sociales (21,55%)',value: `– ${fmt(totals.charges)}` },
                        { label: 'Notes de frais',           value: `+ ${fmt(totals.totalFrais)}` },
                    ].map(({ label, value }) => (
                        <div key={label} className="flex justify-between items-center text-sm">
                            <span className="text-white/75">{label}</span>
                            <span className="font-semibold">{value}</span>
                        </div>
                    ))}
                </div>
                <div className="bg-white/20 rounded-xl px-5 py-4 flex justify-between items-center">
                    <span className="font-bold text-lg">NET À PAYER</span>
                    <span className="text-3xl font-black">{fmt(totals.net)}</span>
                </div>
            </div>
        </div>
    );
};

export default CommissionCalculator;
