import React, { useState, useEffect, useCallback } from 'react';
import {
    Plus, Pencil, Trash2, Download, X, Check,
    TrendingUp, TrendingDown, AlertTriangle, BarChart3, Search,
    Calendar, FileText, Euro, Layers
} from 'lucide-react';
import { useToast, useConfirm } from './ToastProvider';

const API_BASE = import.meta.env.VITE_API_BASE || '/hello-gestion/php';

/* ─── Formatters ─────────────────────────────────────────────────────────── */
const fEuro = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);
const fPct  = (n) => (n ?? 0).toFixed(2) + ' %';
const fMonth = (m) => {
    if (!m) return '—';
    try {
        const [y, mo] = m.split('-');
        const d = new Date(+y, +mo - 1, 1);
        return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    } catch { return m; }
};

/* ─── Empty form ─────────────────────────────────────────────────────────── */
const EMPTY_FORM = {
    client_name: '', folder_month: '', sale_price: '', order_client_date: '',
    our_order_date: '', goods_date: '', installation_days: 1, daily_cost: 2500,
    use_subcontractor: 'non', subcontractor_amount: 0,
    supply_only: false,
    commercial: 'sebastien',
    notes: '',
    suppliers: [],
    clients_billing: [],
    vat_sales: [],
};

/* ─── Computation ────────────────────────────────────────────────────────── */
function computeTotals(form) {
    const salePrice     = +form.sale_price || 0;
    const installDays   = +form.installation_days || 0;
    const dailyCost     = +form.daily_cost || 0;
    const useSub        = form.use_subcontractor === 'oui';
    const supplyOnly    = form.supply_only === true || form.supply_only === 1 || form.supply_only === '1';
    const commercial    = form.commercial || 'sebastien';
    const subAmount     = useSub ? (+form.subcontractor_amount || 0) : 0;

    const suppliers      = form.suppliers || [];
    const clientsBilling = form.clients_billing || [];
    const vatSales       = form.vat_sales || [];

    const totalSuppliersHT   = suppliers.reduce((s, r) => s + (+r.amount_ht || 0), 0);
    const suppliersVAT       = totalSuppliersHT * 0.20;
    const subVAT             = subAmount * 0.20;
    const totalDeductibleVAT = suppliersVAT + subVAT;

    const totalInvoicedHT = clientsBilling.reduce((s, r) => s + (+r.invoice_amount_ht || 0), 0);
    const totalPaid       = clientsBilling.reduce((s, r) => s + (+r.paid_amount || 0), 0);

    // Fourniture seule → pose à 0 ; sous-traitance → remplace la pose
    const operationsCost = useSub ? subAmount : (supplyOnly ? 0 : installDays * dailyCost);
    const totalCost      = totalSuppliersHT + operationsCost;
    const grossProfit    = salePrice - totalCost;

    // Commission commerciale : Aurélien → 10 % du profit brut
    const commission     = commercial === 'aurelien' ? Math.max(0, grossProfit * 0.10) : 0;
    const profit         = grossProfit - commission;
    const margin         = salePrice > 0 ? (profit / salePrice) * 100 : null;
    const remaining      = salePrice - totalPaid;

    const totalCollectedVAT = vatSales.reduce((s, r) => s + ((+r.base_ht || 0) * ((+r.rate || 0) / 100)), 0);
    const creditVAT  = totalDeductibleVAT > totalCollectedVAT ? totalDeductibleVAT - totalCollectedVAT : 0;
    const vatToPay   = totalCollectedVAT > totalDeductibleVAT ? totalCollectedVAT - totalDeductibleVAT : 0;
    const subcontractRate = salePrice > 0 ? (subAmount / salePrice) * 100 : 0;

    return {
        salePrice, totalSuppliersHT, suppliersVAT, subAmount, subVAT,
        totalDeductibleVAT, totalInvoicedHT, totalPaid, operationsCost,
        totalCost, grossProfit, commission, profit, margin, remaining,
        totalCollectedVAT, creditVAT, vatToPay, subcontractRate,
    };
}

/* ─── Rentability helpers ─────────────────────────────────────────────────── */
function rentabilityBadge(profit, margin) {
    if (profit > 0 && margin >= 20) return { label: 'Rentable',      cls: 'bg-green-100 text-green-700' };
    if (profit >= 0)                return { label: 'Attention',      cls: 'bg-orange-100 text-orange-700' };
    return                                 { label: 'Non rentable',   cls: 'bg-red-100 text-red-700' };
}

/* ─── CSV export ─────────────────────────────────────────────────────────── */
function exportCSV(rows, filename) {
    const headers = [
        'Mois', 'Client', 'Prix vente HT', 'Fournisseurs HT', 'Coût total',
        'Profit', 'Marge %', 'Total facturé HT', 'Total encaissé',
        'Reste à enc.', 'TVA déductible', 'TVA collectée', 'Crédit TVA',
        'TVA à reverser', 'Taux sous-traitance', 'Notes',
    ];
    const lines = [headers.join(';')];
    for (const r of rows) {
        const t = r.totals || {};
        lines.push([
            r.folder_month || '',
            (r.client_name || '').replace(/;/g, ','),
            t.salePrice ?? r.sale_price ?? '',
            t.totalSuppliersHT ?? '',
            t.totalCost ?? '',
            t.profit ?? '',
            t.margin != null ? t.margin.toFixed(2) : '',
            t.totalInvoicedHT ?? '',
            t.totalPaid ?? '',
            t.remaining ?? '',
            t.totalDeductibleVAT ?? '',
            t.totalCollectedVAT ?? '',
            t.creditVAT ?? '',
            t.vatToPay ?? '',
            t.subcontractRate != null ? t.subcontractRate.toFixed(2) : '',
            (r.notes || '').replace(/;/g, ',').replace(/\n/g, ' '),
        ].join(';'));
    }
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

/* ─── Shared input style ─────────────────────────────────────────────────── */
const inp = 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFB103] w-full';
const inpSm = 'border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[#FFB103] w-full';

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
export default function Chantiers({ user }) {
    const toast   = useToast();
    const confirm = useConfirm();

    /* ── List state ── */
    const [view, setView]         = useState('list'); // 'list' | 'form'
    const [chantiers, setChantiers] = useState([]);
    const [loading, setLoading]   = useState(true);
    const [editingId, setEditingId] = useState(null);

    /* ── Filters ── */
    const [search, setSearch]         = useState('');
    const [filterYear, setFilterYear] = useState('');
    const [filterMonth, setFilterMonth] = useState('');
    const [filterRent, setFilterRent] = useState('tous');

    /* ── Form state ── */
    const [form, setForm]   = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    /* ─── Fetch list ─────────────────────────────────────────────────────── */
    const fetchList = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filterYear)  params.set('year', filterYear);
            if (filterMonth) params.set('month', filterMonth);
            if (filterRent !== 'tous') params.set('rentability', filterRent);
            const res  = await fetch(`${API_BASE}/chantiers.php?${params}`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                const rows = (data.data || []).map(r => ({
                    ...r,
                    totals: computeTotals({
                        ...r,
                        suppliers:       r.suppliers       || [],
                        clients_billing: r.clients_billing || [],
                        vat_sales:       r.vat_sales       || [],
                    }),
                }));
                setChantiers(rows);
            } else toast.error(data.message || 'Erreur chargement');
        } catch { toast.error('Erreur réseau'); }
        finally { setLoading(false); }
    }, [filterYear, filterMonth, filterRent]);

    useEffect(() => { fetchList(); }, [fetchList]);

    /* ─── Filtered rows (client-side text search) ────────────────────────── */
    const filtered = chantiers.filter(r => {
        const q = search.toLowerCase();
        if (q && !(r.client_name || '').toLowerCase().includes(q) && !(r.notes || '').toLowerCase().includes(q)) return false;
        if (filterRent !== 'tous') {
            const { profit, margin } = r.totals;
            if (filterRent === 'rentable'    && !(profit > 0 && margin >= 20)) return false;
            if (filterRent === 'attention'   && !(profit >= 0 && !(profit > 0 && margin >= 20))) return false;
            if (filterRent === 'non_rentable' && !(profit < 0)) return false;
        }
        return true;
    });

    /* ─── KPIs rentabilité ───────────────────────────────────────────────── */
    const kpiTotal     = filtered.length;
    const kpiRentables = filtered.filter(r => r.totals.profit > 0 && r.totals.margin >= 20).length;
    const rentProfit   = filtered.filter(r => r.totals.profit > 0 && r.totals.margin >= 20);
    const kpiMargin    = rentProfit.length > 0
        ? rentProfit.reduce((s, r) => s + r.totals.margin, 0) / rentProfit.length
        : 0;
    const kpiBenef     = filtered.reduce((s, r) => s + r.totals.profit, 0);

    /* ─── KPIs TVA ───────────────────────────────────────────────────────── */
    const kpiVatDeductible = filtered.reduce((s, r) => s + (r.totals.totalDeductibleVAT || 0), 0);
    const kpiVatCollected  = filtered.reduce((s, r) => s + (r.totals.totalCollectedVAT  || 0), 0);
    const kpiCreditVat     = filtered.reduce((s, r) => s + (r.totals.creditVAT  || 0), 0);
    const kpiVatToPay      = filtered.reduce((s, r) => s + (r.totals.vatToPay   || 0), 0);
    const kpiVatNet        = kpiCreditVat - kpiVatToPay; // positif = crédit net, négatif = TVA à reverser nette

    /* ─── Year/month options from data ───────────────────────────────────── */
    const years  = [...new Set(chantiers.map(r => (r.folder_month || '').slice(0, 4)).filter(Boolean))].sort().reverse();
    const months = ['01','02','03','04','05','06','07','08','09','10','11','12'];
    const monthLabels = { '01':'Janvier','02':'Février','03':'Mars','04':'Avril','05':'Mai','06':'Juin',
        '07':'Juillet','08':'Août','09':'Septembre','10':'Octobre','11':'Novembre','12':'Décembre' };

    /* ─── Open form for new / edit ───────────────────────────────────────── */
    const openNew = () => {
        setEditingId(null);
        setForm(EMPTY_FORM);
        setView('form');
    };

    const openEdit = async (id) => {
        try {
            const res  = await fetch(`${API_BASE}/chantiers.php?id=${id}`, { credentials: 'include' });
            const data = await res.json();
            if (data.success && data.data) {
                const r = data.data;
                setForm({
                    ...EMPTY_FORM,
                    ...r,
                    // Coerce nullable DB fields to empty strings (React 19 controlled inputs disallow null)
                    order_client_date: r.order_client_date || '',
                    our_order_date:    r.our_order_date    || '',
                    goods_date:        r.goods_date        || '',
                    notes:             r.notes             || '',
                    supply_only:       r.supply_only === 1 || r.supply_only === true,
                    commercial:        r.commercial || 'sebastien',
                    suppliers:       r.suppliers       || [],
                    clients_billing: r.clients_billing || [],
                    vat_sales:       r.vat_sales       || [],
                });
                setEditingId(id);
                setView('form');
            } else toast.error(data.message || 'Erreur chargement');
        } catch { toast.error('Erreur réseau'); }
    };

    /* ─── Delete ─────────────────────────────────────────────────────────── */
    const handleDelete = async (id) => {
        if (!await confirm('Supprimer ce chantier définitivement ?')) return;
        try {
            const res  = await fetch(`${API_BASE}/chantiers.php?id=${id}`, { method: 'DELETE', credentials: 'include' });
            const data = await res.json();
            if (data.success) { toast.success('Chantier supprimé'); fetchList(); }
            else toast.error(data.message || 'Erreur');
        } catch { toast.error('Erreur réseau'); }
    };

    /* ─── Save ───────────────────────────────────────────────────────────── */
    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.client_name.trim()) { toast.error('Nom du client requis'); return; }
        setSaving(true);
        try {
            const totals = computeTotals(form);
            const body   = { ...form, totals };
            const method = editingId ? 'PUT' : 'POST';
            if (editingId) body.id = editingId;
            const res  = await fetch(`${API_BASE}/chantiers.php`, {
                method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (data.success) {
                toast.success(editingId ? 'Chantier mis à jour ✓' : 'Chantier créé ✓');
                setView('list');
                fetchList();
            } else toast.error(data.message || 'Erreur sauvegarde');
        } catch { toast.error('Erreur réseau'); }
        finally { setSaving(false); }
    };

    /* ─── Form field helpers ─────────────────────────────────────────────── */
    const setField = (field, value) => setForm(f => ({ ...f, [field]: value }));

    // Suppliers
    const addSupplierRow  = () => setForm(f => ({ ...f, suppliers: [...f.suppliers, { supplier_name: '', designation: '', amount_ht: 0, invoice_date: '', payment_date: '' }] }));
    const updateSupplier  = (i, field, value) => setForm(f => { const s = [...f.suppliers]; s[i] = { ...s[i], [field]: value }; return { ...f, suppliers: s }; });
    const removeSupplier  = (i) => setForm(f => ({ ...f, suppliers: f.suppliers.filter((_, idx) => idx !== i) }));

    // Client billing
    const addClientRow    = () => setForm(f => ({ ...f, clients_billing: [...f.clients_billing, { invoice_date: '', invoice_ref: '', invoice_amount_ht: 0, payment_date: '', paid_amount: 0, comment: '' }] }));
    const updateClient    = (i, field, value) => setForm(f => { const s = [...f.clients_billing]; s[i] = { ...s[i], [field]: value }; return { ...f, clients_billing: s }; });
    const removeClient    = (i) => setForm(f => ({ ...f, clients_billing: f.clients_billing.filter((_, idx) => idx !== i) }));

    // VAT sales
    const addVatRow       = () => setForm(f => ({ ...f, vat_sales: [...f.vat_sales, { label: '', rate: 20, base_ht: 0 }] }));
    const updateVat       = (i, field, value) => setForm(f => { const s = [...f.vat_sales]; s[i] = { ...s[i], [field]: value }; return { ...f, vat_sales: s }; });
    const removeVat       = (i) => setForm(f => ({ ...f, vat_sales: f.vat_sales.filter((_, idx) => idx !== i) }));

    /* ─── Computed totals for current form ───────────────────────────────── */
    const totals = computeTotals(form);

    /* ─── Exports ────────────────────────────────────────────────────────── */
    const handleExportMonthly = () => {
        if (!filterYear && !filterMonth) { toast.error('Sélectionnez une année et/ou un mois'); return; }
        const rows = filtered.filter(r => {
            const m = r.folder_month || '';
            if (filterYear  && !m.startsWith(filterYear))  return false;
            if (filterMonth && !m.endsWith('-' + filterMonth)) return false;
            return true;
        });
        exportCSV(rows, `chantiers_mensuel_${filterYear || ''}_${filterMonth || ''}.csv`);
    };
    const handleExportAnnual = () => {
        const rows = filterYear ? filtered.filter(r => (r.folder_month || '').startsWith(filterYear)) : filtered;
        exportCSV(rows, `chantiers_annuel_${filterYear || 'tous'}.csv`);
    };

    /* ── Rentability pill counts (for tabs) ── */
    const countAll         = chantiers.filter(r => {
        const q = search.toLowerCase();
        return !q || (r.client_name||'').toLowerCase().includes(q) || (r.notes||'').toLowerCase().includes(q);
    }).length;
    const countRentable    = chantiers.filter(r => { const t = r.totals; return t.profit > 0 && t.margin >= 20; }).length;
    const countAttention   = chantiers.filter(r => { const t = r.totals; return t.profit >= 0 && !(t.profit > 0 && t.margin >= 20); }).length;
    const countNonRentable = chantiers.filter(r => r.totals.profit < 0).length;

    /* ── Context label for stats ── */
    const ctxLabel = (() => {
        const parts = [];
        if (filterMonth && filterYear) parts.push(`${monthLabels[filterMonth]} ${filterYear}`);
        else if (filterYear)  parts.push(filterYear);
        else if (filterMonth) parts.push(monthLabels[filterMonth]);
        if (filterRent === 'rentable')    parts.push('Rentables');
        if (filterRent === 'attention')   parts.push('Attention');
        if (filterRent === 'non_rentable') parts.push('Non rentables');
        if (search) parts.push(`"${search}"`);
        return parts.length ? parts.join(' · ') : null;
    })();

    /* ════════════════════════════════════════════════════════════════════════
       RENDER — LIST VIEW
    ════════════════════════════════════════════════════════════════════════ */
    if (view === 'list') return (
        <div className="space-y-5">

            {/* ── En-tête ── */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#FFB103' }}>
                        <BarChart3 size={22} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Rentabilité chantiers</h2>
                        <p className="text-sm text-gray-500">Suivi financier de vos chantiers</p>
                    </div>
                </div>
                <button
                    onClick={openNew}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg hover:opacity-90 transition-opacity"
                    style={{ background: '#FFB103' }}
                >
                    <Plus size={16} /> Nouveau chantier
                </button>
            </div>

            {/* ── KPI cards — réactifs aux filtres ── */}
            <div>
                {ctxLabel && (
                    <p className="text-xs font-semibold text-gray-400 uppercase mb-2 flex items-center gap-1.5">
                        <Calendar size={11} /> Sélection : {ctxLabel}
                    </p>
                )}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Chantiers</p>
                        <p className="text-3xl font-bold text-gray-900">{kpiTotal}</p>
                        <p className="text-xs text-gray-400 mt-1">sur la sélection</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Rentables</p>
                        <p className="text-3xl font-bold text-green-600">{kpiRentables}</p>
                        <p className="text-xs text-gray-400 mt-1">
                            {kpiTotal > 0 ? ((kpiRentables / kpiTotal) * 100).toFixed(0) : 0}% du total
                        </p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Marge moyenne</p>
                        <p className="text-3xl font-bold" style={{ color: '#FFB103' }}>{fPct(kpiMargin)}</p>
                        <p className="text-xs text-gray-400 mt-1">chantiers rentables</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Bénéfice total</p>
                        <p className={`text-2xl font-bold ${kpiBenef >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fEuro(kpiBenef)}</p>
                        <p className="text-xs text-gray-400 mt-1">profit net HT</p>
                    </div>
                </div>

                {/* ── Rangée TVA ── */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mt-3">
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">TVA déductible</p>
                        <p className="text-xl font-bold text-gray-700">{fEuro(kpiVatDeductible)}</p>
                        <p className="text-xs text-gray-400 mt-1">achats fournisseurs</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">TVA collectée</p>
                        <p className="text-xl font-bold text-gray-700">{fEuro(kpiVatCollected)}</p>
                        <p className="text-xs text-gray-400 mt-1">ventes clients</p>
                    </div>
                    <div className="bg-white rounded-xl border border-blue-100 shadow-sm p-4 bg-blue-50">
                        <p className="text-[11px] font-semibold text-blue-400 uppercase tracking-wide mb-2">Crédit TVA total</p>
                        <p className="text-xl font-bold text-blue-600">{fEuro(kpiCreditVat)}</p>
                        <p className="text-xs text-blue-400 mt-1">à récupérer</p>
                    </div>
                    <div className="bg-white rounded-xl border border-orange-100 shadow-sm p-4 bg-orange-50">
                        <p className="text-[11px] font-semibold text-orange-400 uppercase tracking-wide mb-2">TVA à reverser</p>
                        <p className="text-xl font-bold text-orange-500">{fEuro(kpiVatToPay)}</p>
                        <p className="text-xs text-orange-400 mt-1">à payer au fisc</p>
                    </div>
                    <div className={`rounded-xl border shadow-sm p-4 ${kpiVatNet >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                        <p className={`text-[11px] font-semibold uppercase tracking-wide mb-2 ${kpiVatNet >= 0 ? 'text-green-400' : 'text-red-400'}`}>Position TVA nette</p>
                        <p className={`text-xl font-bold ${kpiVatNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fEuro(Math.abs(kpiVatNet))}</p>
                        <p className={`text-xs mt-1 ${kpiVatNet >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {kpiVatNet >= 0 ? 'crédit net global' : 'TVA nette à reverser'}
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Barre de filtres ── */}
            <div className="flex items-center justify-between gap-3 flex-wrap">

                {/* Pills rentabilité */}
                <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1">
                    {[
                        { val: 'tous',        label: 'Tous',         count: countAll,         cls: '' },
                        { val: 'rentable',    label: 'Rentable',     count: countRentable,    cls: 'text-green-600' },
                        { val: 'attention',   label: 'Attention',    count: countAttention,   cls: 'text-orange-500' },
                        { val: 'non_rentable',label: 'Non rentable', count: countNonRentable, cls: 'text-red-500' },
                    ].map(({ val, label, count, cls }) => (
                        <button
                            key={val}
                            onClick={() => setFilterRent(val)}
                            className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${
                                filterRent === val
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <span>{label}</span>
                            <span className={`text-xs font-normal ${filterRent === val ? cls || 'text-gray-400' : 'text-gray-400'}`}>{count}</span>
                        </button>
                    ))}
                </div>

                {/* Droite : recherche + période + exports */}
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Recherche */}
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Client, notes…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFB103] w-44 bg-white"
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                <X size={12} />
                            </button>
                        )}
                    </div>

                    {/* Année */}
                    <select
                        value={filterYear}
                        onChange={e => { setFilterYear(e.target.value); setFilterMonth(''); }}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFB103] bg-white text-gray-700"
                    >
                        <option value="">Toutes années</option>
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>

                    {/* Mois */}
                    <select
                        value={filterMonth}
                        onChange={e => setFilterMonth(e.target.value)}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFB103] bg-white text-gray-700"
                    >
                        <option value="">Tous les mois</option>
                        {months.map(m => <option key={m} value={m}>{monthLabels[m]}</option>)}
                    </select>

                    {/* Exports */}
                    <button
                        onClick={handleExportMonthly}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 bg-white transition-colors"
                        title="Export CSV du mois sélectionné"
                    >
                        <Download size={13} /> Mensuel
                    </button>
                    <button
                        onClick={handleExportAnnual}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 bg-white transition-colors"
                        title="Export CSV de l'année sélectionnée"
                    >
                        <Download size={13} /> Annuel
                    </button>
                </div>
            </div>

            {/* ── Tableau ── */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-10 text-center text-gray-400 text-sm">Chargement…</div>
                ) : filtered.length === 0 ? (
                    <div className="p-16 text-center text-gray-400">
                        <BarChart3 size={40} className="mx-auto mb-3 opacity-30" />
                        <p className="text-sm">Aucun chantier trouvé</p>
                        <p className="text-xs mt-1">Modifiez les filtres ou ajoutez un premier chantier</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    {['Mois','Client','Prix vente HT','Fournisseurs HT','Coût total','Rentabilité','Marge','Encaissé','Reste à enc.','TVA','Sous-trait.','']
                                        .map((h, i) => (
                                            <th key={i} className={`px-3 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap ${i >= 2 && i <= 8 ? 'text-right' : 'text-left'}`}>{h}</th>
                                        ))
                                    }
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.map(r => {
                                    const t   = r.totals;
                                    const bdg = rentabilityBadge(t.profit, t.margin);
                                    return (
                                        <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500 capitalize">{fMonth(r.folder_month)}</td>
                                            <td className="px-3 py-3 font-semibold text-gray-900 whitespace-nowrap max-w-[160px] truncate">{r.client_name}</td>
                                            <td className="px-3 py-3 whitespace-nowrap text-right text-gray-700">{fEuro(t.salePrice)}</td>
                                            <td className="px-3 py-3 whitespace-nowrap text-right text-gray-600">{fEuro(t.totalSuppliersHT)}</td>
                                            <td className="px-3 py-3 whitespace-nowrap text-right text-gray-700 font-medium">{fEuro(t.totalCost)}</td>
                                            <td className="px-3 py-3 whitespace-nowrap">
                                                <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${bdg.cls}`}>{bdg.label}</span>
                                            </td>
                                            <td className="px-3 py-3 whitespace-nowrap text-right">
                                                <span className={`font-semibold ${t.margin != null && t.margin >= 20 ? 'text-green-700' : t.margin != null && t.margin >= 0 ? 'text-orange-500' : 'text-red-600'}`}>
                                                    {t.margin != null ? fPct(t.margin) : '—'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 whitespace-nowrap text-right text-gray-600">{fEuro(t.totalPaid)}</td>
                                            <td className="px-3 py-3 whitespace-nowrap text-right">
                                                <span className={t.remaining > 0 ? 'text-orange-500 font-medium' : 'text-green-600'}>{fEuro(t.remaining)}</span>
                                            </td>
                                            <td className="px-3 py-3 whitespace-nowrap text-right text-xs">
                                                {t.creditVAT > 0
                                                    ? <span className="text-blue-600 font-medium">+{fEuro(t.creditVAT)}</span>
                                                    : t.vatToPay > 0
                                                        ? <span className="text-orange-500 font-medium">-{fEuro(t.vatToPay)}</span>
                                                        : <span className="text-gray-400">—</span>
                                                }
                                            </td>
                                            <td className="px-3 py-3 whitespace-nowrap text-right">
                                                {r.use_subcontractor === 'oui'
                                                    ? <span className={`font-medium ${t.subcontractRate > 30 ? 'text-red-600' : t.subcontractRate >= 25 ? 'text-orange-500' : 'text-green-600'}`}>{fPct(t.subcontractRate)}</span>
                                                    : <span className="text-gray-400">—</span>
                                                }
                                            </td>
                                            <td className="px-3 py-3 whitespace-nowrap">
                                                <div className="flex gap-1">
                                                    <button onClick={() => openEdit(r.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-amber-700 hover:bg-amber-50 transition-colors">
                                                        <Pencil size={14} />
                                                    </button>
                                                    <button onClick={() => handleDelete(r.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );

    /* ════════════════════════════════════════════════════════════════════════
       RENDER — FORM VIEW
    ════════════════════════════════════════════════════════════════════════ */
    const t = totals; // shorthand for computed totals
    const bdgForm = rentabilityBadge(t.profit, t.margin);

    return (
        <div className="fixed inset-0 z-40 bg-gray-100 overflow-y-auto">
            <form onSubmit={handleSave}>
                {/* ── Sticky header ── */}
                <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#FFB103' }}>
                            <BarChart3 size={18} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">
                                {editingId ? `Modifier — ${form.client_name || '…'}` : 'Nouveau chantier'}
                            </h2>
                            <p className="text-xs text-gray-400">Rentabilité chantier</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setView('list')}
                            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
                        >
                            <X size={14} /> Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-60"
                            style={{ background: '#FFB103' }}
                        >
                            <Check size={14} /> {saving ? 'Enregistrement…' : 'Enregistrer'}
                        </button>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">

                    {/* ── Section 1: Informations du chantier ── */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                        <h3 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide flex items-center gap-2">
                            <FileText size={15} /> Informations du chantier
                        </h3>
                        <div className="grid grid-cols-12 gap-3">
                            {/* client_name col-4 */}
                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-xs font-medium text-gray-600 mb-1">Client *</label>
                                <input type="text" required value={form.client_name}
                                    onChange={e => setField('client_name', e.target.value)}
                                    placeholder="Nom du client" className={inp} />
                            </div>
                            {/* folder_month col-4 (mois + année) */}
                            <div className="col-span-6 md:col-span-2">
                                <label className="block text-xs font-medium text-gray-600 mb-1">Mois du dossier</label>
                                <div className="flex gap-2">
                                    <select
                                        value={(form.folder_month || '').slice(5, 7) || ''}
                                        onChange={e => {
                                            const yr = (form.folder_month || '').slice(0, 4) || new Date().getFullYear();
                                            setField('folder_month', e.target.value ? `${yr}-${e.target.value}` : '');
                                        }}
                                        className={inp}
                                    >
                                        <option value="">Mois</option>
                                        {['01','02','03','04','05','06','07','08','09','10','11','12'].map((m, i) => (
                                            <option key={m} value={m}>{['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'][i]}</option>
                                        ))}
                                    </select>
                                    <select
                                        value={(form.folder_month || '').slice(0, 4) || ''}
                                        onChange={e => {
                                            const mo = (form.folder_month || '').slice(5, 7) || '01';
                                            setField('folder_month', e.target.value ? `${e.target.value}-${mo}` : '');
                                        }}
                                        className={inp}
                                    >
                                        <option value="">Année</option>
                                        {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                                            <option key={y} value={y}>{y}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            {/* sale_price col-2 */}
                            <div className="col-span-6 md:col-span-2">
                                <label className="block text-xs font-medium text-gray-600 mb-1">Prix vente HT (€)</label>
                                <input type="number" min="0" step="0.01" value={form.sale_price}
                                    onChange={e => setField('sale_price', e.target.value)}
                                    placeholder="0.00" className={inp} />
                            </div>
                            {/* order_client_date col-2 */}
                            <div className="col-span-6 md:col-span-2">
                                <label className="block text-xs font-medium text-gray-600 mb-1">Date commande client</label>
                                <input type="date" value={form.order_client_date}
                                    onChange={e => setField('order_client_date', e.target.value)}
                                    className={inp} />
                            </div>
                            {/* our_order_date col-2 */}
                            <div className="col-span-6 md:col-span-2">
                                <label className="block text-xs font-medium text-gray-600 mb-1">Notre commande</label>
                                <input type="date" value={form.our_order_date}
                                    onChange={e => setField('our_order_date', e.target.value)}
                                    className={inp} />
                            </div>
                            {/* goods_date col-2 */}
                            <div className="col-span-6 md:col-span-2">
                                <label className="block text-xs font-medium text-gray-600 mb-1">Date réception marchandise</label>
                                <input type="date" value={form.goods_date}
                                    onChange={e => setField('goods_date', e.target.value)}
                                    className={inp} />
                            </div>
                            {/* installation_days col-2 */}
                            <div className="col-span-6 md:col-span-2">
                                <label className="block text-xs font-medium text-gray-600 mb-1">Jours pose</label>
                                <input type="number" min="0" step="0.5" value={form.installation_days}
                                    onChange={e => setField('installation_days', e.target.value)}
                                    disabled={!!form.supply_only}
                                    className={`${inp} ${form.supply_only ? 'opacity-40 bg-gray-50 cursor-not-allowed' : ''}`} />
                            </div>
                            {/* daily_cost col-2 */}
                            <div className="col-span-6 md:col-span-2">
                                <label className="block text-xs font-medium text-gray-600 mb-1">Coût journalier (€)</label>
                                <input type="number" min="0" step="0.01" value={form.supply_only ? 0 : form.daily_cost}
                                    onChange={e => setField('daily_cost', e.target.value)}
                                    disabled={!!form.supply_only}
                                    className={`${inp} ${form.supply_only ? 'opacity-40 bg-gray-50 cursor-not-allowed' : ''}`} />
                            </div>
                            {/* supply_only checkbox col-2 */}
                            <div className="col-span-6 md:col-span-2 flex items-end pb-1">
                                <label className={`flex items-center gap-2.5 cursor-pointer select-none group px-3 py-2 rounded-lg border transition-all w-full ${
                                    form.supply_only
                                        ? 'border-[#FFB103]/50 bg-amber-50 text-amber-700'
                                        : 'border-gray-200 bg-white text-gray-600 hover:border-amber-200'
                                }`}>
                                    <input
                                        type="checkbox"
                                        checked={!!form.supply_only}
                                        onChange={e => setField('supply_only', e.target.checked)}
                                        className="w-4 h-4 accent-amber-500 flex-shrink-0"
                                    />
                                    <span className="text-sm font-medium leading-tight">Fourniture seule<br/><span className="text-xs font-normal opacity-70">Pose à 0 €</span></span>
                                </label>
                            </div>
                            {/* commercial col-2 */}
                            <div className="col-span-6 md:col-span-2">
                                <label className="block text-xs font-medium text-gray-600 mb-1">Commercial</label>
                                <div className="flex gap-2">
                                    {['sebastien','aurelien'].map(name => (
                                        <button
                                            key={name}
                                            type="button"
                                            onClick={() => setField('commercial', name)}
                                            className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-all ${
                                                form.commercial === name
                                                    ? 'border-[#FFB103]/70 bg-[#FFB103] text-white shadow-sm'
                                                    : 'border-gray-200 bg-white text-gray-500 hover:border-[#FFB103]/50'
                                            }`}
                                        >
                                            {name === 'sebastien' ? 'Sébastien' : 'Aurélien'}
                                            {name === 'aurelien' && <span className="block text-[10px] font-normal opacity-80">−10% profit</span>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {/* use_subcontractor col-2 */}
                            <div className="col-span-6 md:col-span-2">
                                <label className="block text-xs font-medium text-gray-600 mb-1">Sous-traitance</label>
                                <select value={form.use_subcontractor}
                                    onChange={e => setField('use_subcontractor', e.target.value)}
                                    className={inp}>
                                    <option value="non">Non</option>
                                    <option value="oui">Oui</option>
                                </select>
                            </div>
                            {/* subcontractor_amount col-2 (conditional) */}
                            {form.use_subcontractor === 'oui' && (
                                <div className="col-span-6 md:col-span-2">
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Montant sous-traitance HT (€)</label>
                                    <input type="number" min="0" step="0.01" value={form.subcontractor_amount}
                                        onChange={e => setField('subcontractor_amount', e.target.value)}
                                        className={inp} />
                                </div>
                            )}
                            {/* notes col-12 */}
                            <div className="col-span-12">
                                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                                <textarea rows={3} value={form.notes}
                                    onChange={e => setField('notes', e.target.value)}
                                    placeholder="Remarques, informations complémentaires…"
                                    className={inp} />
                            </div>
                        </div>
                    </div>

                    {/* ── Section 1.1: TVA ventes ── */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                                <Euro size={15} /> TVA ventes du chantier
                            </h3>
                            <button type="button" onClick={addVatRow}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#FFB103]/50 text-amber-700 hover:bg-amber-50">
                                <Plus size={12} /> Ligne TVA
                            </button>
                        </div>
                        {form.vat_sales.length === 0 ? (
                            <p className="text-xs text-gray-400 text-center py-4">Aucune ligne TVA — cliquez sur "+ Ligne TVA"</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-100">
                                            {['Libellé','Taux TVA','Base HT (€)','TVA calculée','Total TTC',''].map(h => (
                                                <th key={h} className="px-2 py-2 text-left font-semibold text-gray-500 uppercase">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {form.vat_sales.map((row, i) => {
                                            const vatCalc = (+row.base_ht || 0) * ((+row.rate || 0) / 100);
                                            const ttc     = (+row.base_ht || 0) + vatCalc;
                                            return (
                                                <tr key={i}>
                                                    <td className="px-2 py-1.5">
                                                        <input type="text" value={row.label}
                                                            onChange={e => updateVat(i, 'label', e.target.value)}
                                                            placeholder="Libellé" className={inpSm} />
                                                    </td>
                                                    <td className="px-2 py-1.5 w-28">
                                                        <select value={row.rate}
                                                            onChange={e => updateVat(i, 'rate', +e.target.value)}
                                                            className={inpSm}>
                                                            {[0, 5.5, 10, 20].map(r => <option key={r} value={r}>{r} %</option>)}
                                                        </select>
                                                    </td>
                                                    <td className="px-2 py-1.5 w-32">
                                                        <input type="number" min="0" step="0.01" value={row.base_ht}
                                                            onChange={e => updateVat(i, 'base_ht', e.target.value)}
                                                            className={inpSm} />
                                                    </td>
                                                    <td className="px-2 py-1.5 w-28 text-right text-gray-600">{fEuro(vatCalc)}</td>
                                                    <td className="px-2 py-1.5 w-28 text-right font-semibold text-gray-800">{fEuro(ttc)}</td>
                                                    <td className="px-2 py-1.5 w-8">
                                                        <button type="button" onClick={() => removeVat(i)}
                                                            className="text-gray-300 hover:text-red-500 transition-colors">
                                                            <X size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* ── Section 2: Fournisseurs ── */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                                <Layers size={15} /> Fournisseurs
                            </h3>
                            <button type="button" onClick={addSupplierRow}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#FFB103]/50 text-amber-700 hover:bg-amber-50">
                                <Plus size={12} /> Fournisseur
                            </button>
                        </div>
                        {form.suppliers.length === 0 ? (
                            <p className="text-xs text-gray-400 text-center py-4">Aucun fournisseur — cliquez sur "+ Fournisseur"</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-100">
                                            {['Nom fournisseur','Désignation','Montant HT (€)','TVA 20%','Montant TTC','Date facture','Date règlement',''].map(h => (
                                                <th key={h} className="px-2 py-2 text-left font-semibold text-gray-500 uppercase">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {form.suppliers.map((row, i) => {
                                            const tva = (+row.amount_ht || 0) * 0.20;
                                            const ttc = (+row.amount_ht || 0) * 1.20;
                                            return (
                                                <tr key={i}>
                                                    <td className="px-2 py-1.5">
                                                        <input type="text" value={row.supplier_name}
                                                            onChange={e => updateSupplier(i, 'supplier_name', e.target.value)}
                                                            placeholder="Fournisseur" className={inpSm} />
                                                    </td>
                                                    <td className="px-2 py-1.5">
                                                        <input type="text" value={row.designation}
                                                            onChange={e => updateSupplier(i, 'designation', e.target.value)}
                                                            placeholder="Désignation" className={inpSm} />
                                                    </td>
                                                    <td className="px-2 py-1.5 w-28">
                                                        <input type="number" min="0" step="0.01" value={row.amount_ht}
                                                            onChange={e => updateSupplier(i, 'amount_ht', e.target.value)}
                                                            className={inpSm} />
                                                    </td>
                                                    <td className="px-2 py-1.5 w-24 text-right text-gray-600">{fEuro(tva)}</td>
                                                    <td className="px-2 py-1.5 w-28 text-right font-semibold text-gray-800">{fEuro(ttc)}</td>
                                                    <td className="px-2 py-1.5 w-32">
                                                        <input type="date" value={row.invoice_date}
                                                            onChange={e => updateSupplier(i, 'invoice_date', e.target.value)}
                                                            className={inpSm} />
                                                    </td>
                                                    <td className="px-2 py-1.5 w-32">
                                                        <input type="date" value={row.payment_date}
                                                            onChange={e => updateSupplier(i, 'payment_date', e.target.value)}
                                                            className={inpSm} />
                                                    </td>
                                                    <td className="px-2 py-1.5 w-8">
                                                        <button type="button" onClick={() => removeSupplier(i)}
                                                            className="text-gray-300 hover:text-red-500 transition-colors">
                                                            <X size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* ── Section 3: Factures + règlements client ── */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                                <FileText size={15} /> Factures &amp; règlements client
                            </h3>
                            <button type="button" onClick={addClientRow}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#FFB103]/50 text-amber-700 hover:bg-amber-50">
                                <Plus size={12} /> Facture / règlement
                            </button>
                        </div>
                        {form.clients_billing.length === 0 ? (
                            <p className="text-xs text-gray-400 text-center py-4">Aucune facture — cliquez sur "+ Facture / règlement"</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-100">
                                            {['Date facture','Réf facture','Montant facturé HT (€)','Date règlement','Montant réglé (€)','Commentaire',''].map(h => (
                                                <th key={h} className="px-2 py-2 text-left font-semibold text-gray-500 uppercase">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {form.clients_billing.map((row, i) => (
                                            <tr key={i}>
                                                <td className="px-2 py-1.5 w-32">
                                                    <input type="date" value={row.invoice_date}
                                                        onChange={e => updateClient(i, 'invoice_date', e.target.value)}
                                                        className={inpSm} />
                                                </td>
                                                <td className="px-2 py-1.5">
                                                    <input type="text" value={row.invoice_ref}
                                                        onChange={e => updateClient(i, 'invoice_ref', e.target.value)}
                                                        placeholder="FA-0001" className={inpSm} />
                                                </td>
                                                <td className="px-2 py-1.5 w-32">
                                                    <input type="number" min="0" step="0.01" value={row.invoice_amount_ht}
                                                        onChange={e => updateClient(i, 'invoice_amount_ht', e.target.value)}
                                                        className={inpSm} />
                                                </td>
                                                <td className="px-2 py-1.5 w-32">
                                                    <input type="date" value={row.payment_date}
                                                        onChange={e => updateClient(i, 'payment_date', e.target.value)}
                                                        className={inpSm} />
                                                </td>
                                                <td className="px-2 py-1.5 w-32">
                                                    <input type="number" min="0" step="0.01" value={row.paid_amount}
                                                        onChange={e => updateClient(i, 'paid_amount', e.target.value)}
                                                        className={inpSm} />
                                                </td>
                                                <td className="px-2 py-1.5">
                                                    <input type="text" value={row.comment}
                                                        onChange={e => updateClient(i, 'comment', e.target.value)}
                                                        placeholder="Commentaire" className={inpSm} />
                                                </td>
                                                <td className="px-2 py-1.5 w-8">
                                                    <button type="button" onClick={() => removeClient(i)}
                                                        className="text-gray-300 hover:text-red-500 transition-colors">
                                                        <X size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* ── Section 4: Synthèse financière ── */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2 mb-4">
                            <TrendingUp size={15} /> Synthèse financière
                        </h3>

                        {/* Summary cards row */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                            <SummaryCard label="Prix vente HT"       value={fEuro(t.salePrice)} />
                            <SummaryCard label="Total fournisseurs HT" value={fEuro(t.totalSuppliersHT)} />
                            <SummaryCard label="Pose / fonctionnement" value={fEuro(t.operationsCost)} />
                            <SummaryCard label="Total facturé HT"    value={fEuro(t.totalInvoicedHT)} />
                            <SummaryCard label="Total encaissé"       value={fEuro(t.totalPaid)} />
                        </div>

                        {/* Big profitability box */}
                        <div className={`rounded-xl p-5 mb-4 border-2 ${
                            bdgForm.label === 'Rentable'
                                ? 'bg-green-50 border-green-200'
                                : bdgForm.label === 'Attention'
                                ? 'bg-orange-50 border-orange-200'
                                : 'bg-red-50 border-red-200'
                        }`}>
                            <div className="flex items-center gap-3 mb-2">
                                {bdgForm.label === 'Rentable'
                                    ? <TrendingUp size={22} className="text-green-600" />
                                    : bdgForm.label === 'Attention'
                                    ? <AlertTriangle size={22} className="text-orange-500" />
                                    : <TrendingDown size={22} className="text-red-600" />
                                }
                                <span className={`text-base font-bold ${
                                    bdgForm.label === 'Rentable' ? 'text-green-700'
                                    : bdgForm.label === 'Attention' ? 'text-orange-700'
                                    : 'text-red-700'
                                }`}>Rentabilité chantier</span>
                                <span className={`ml-auto px-3 py-1 rounded-full text-sm font-bold ${bdgForm.cls}`}>{bdgForm.label}</span>
                            </div>
                            <div className="flex gap-8 flex-wrap">
                                {form.commercial === 'aurelien' && (
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase">Profit brut</p>
                                        <p className="text-xl font-semibold text-gray-500 line-through">{fEuro(t.grossProfit)}</p>
                                    </div>
                                )}
                                {form.commercial === 'aurelien' && (
                                    <div>
                                        <p className="text-xs text-orange-400 uppercase">Commission Aurélien (10%)</p>
                                        <p className="text-xl font-bold text-orange-500">− {fEuro(t.commission)}</p>
                                    </div>
                                )}
                                <div>
                                    <p className="text-xs text-gray-500 uppercase">Profit net</p>
                                    <p className={`text-2xl font-bold ${t.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>{fEuro(t.profit)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase">Marge</p>
                                    <p className={`text-2xl font-bold ${t.margin != null && t.margin >= 20 ? 'text-green-700' : t.margin != null && t.margin >= 0 ? 'text-orange-600' : 'text-red-700'}`}>
                                        {t.margin != null ? fPct(t.margin) : '—'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <SummaryCard label="Coût total"          value={fEuro(t.totalCost)} />
                            <SummaryCard label="Reste à encaisser"   value={fEuro(t.remaining)} highlight={t.remaining > 0 ? 'orange' : 'green'} />
                        </div>

                        {/* Sous-traitance */}
                        {form.use_subcontractor === 'oui' && (
                            <div className="bg-gray-50 rounded-xl p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold text-gray-600 uppercase">Sous-traitance</span>
                                    <div className="flex gap-3 items-center">
                                        <span className="text-sm font-bold text-gray-800">{fEuro(t.subAmount)}</span>
                                        <span className="text-sm font-bold text-gray-800">{fPct(t.subcontractRate)}</span>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                            t.subcontractRate > 30 ? 'bg-red-100 text-red-700'
                                            : t.subcontractRate >= 25 ? 'bg-orange-100 text-orange-700'
                                            : 'bg-green-100 text-green-700'
                                        }`}>
                                            {t.subcontractRate > 30 ? '⚠ Alerte Qualibat' : t.subcontractRate >= 25 ? '⚠ Limite Qualibat' : '✓ Qualibat OK'}
                                        </span>
                                    </div>
                                </div>
                                {/* Progress bar */}
                                <div className="relative h-3 bg-gray-200 rounded-full overflow-visible">
                                    <div
                                        className={`h-3 rounded-full transition-all ${
                                            t.subcontractRate > 30 ? 'bg-red-500'
                                            : t.subcontractRate >= 25 ? 'bg-orange-400'
                                            : 'bg-green-500'
                                        }`}
                                        style={{ width: `${Math.min(t.subcontractRate, 100)}%` }}
                                    />
                                    {/* 30% marker */}
                                    <div className="absolute top-0 bottom-0 border-l-2 border-dashed border-gray-500" style={{ left: '30%' }}>
                                        <span className="absolute -top-5 left-1 text-[10px] text-gray-500 whitespace-nowrap">30%</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Section 5: Crédit de TVA prévisionnel ── */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2 mb-4">
                            <Euro size={15} /> Crédit de TVA prévisionnel
                        </h3>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                            <SummaryCard label="TVA déductible achats"  value={fEuro(t.totalDeductibleVAT)} />
                            <SummaryCard label="TVA collectée ventes"   value={fEuro(t.totalCollectedVAT)} />
                            <SummaryCard label="Crédit TVA prévisionnel" value={fEuro(t.creditVAT)}  highlight={t.creditVAT > 0 ? 'blue' : 'none'} />
                            <SummaryCard label="TVA à reverser"         value={fEuro(t.vatToPay)}   highlight={t.vatToPay > 0 ? 'orange' : 'none'} />
                        </div>

                        {/* Position TVA pill */}
                        <div className="flex items-center gap-3 mb-4">
                            <span className="text-xs font-semibold text-gray-500 uppercase">Position TVA :</span>
                            {t.creditVAT > 0
                                ? <span className="px-3 py-1 rounded-full text-sm font-bold bg-blue-100 text-blue-700">Crédit TVA — {fEuro(t.creditVAT)}</span>
                                : t.vatToPay > 0
                                ? <span className="px-3 py-1 rounded-full text-sm font-bold bg-orange-100 text-orange-700">TVA à reverser — {fEuro(t.vatToPay)}</span>
                                : <span className="px-3 py-1 rounded-full text-sm font-bold bg-gray-100 text-gray-600">Équilibre</span>
                            }
                        </div>

                        {/* TVA déductible achats detail table */}
                        {form.suppliers.length > 0 && (
                            <div className="overflow-x-auto">
                                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Détail TVA achats (auto depuis fournisseurs)</p>
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-100">
                                            {['Fournisseur','Base HT','Taux TVA','TVA déductible'].map(h => (
                                                <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 uppercase">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {form.suppliers.map((s, i) => (
                                            <tr key={i}>
                                                <td className="px-3 py-2 text-gray-700">{s.supplier_name || '—'} {s.designation ? `(${s.designation})` : ''}</td>
                                                <td className="px-3 py-2 text-right">{fEuro(+s.amount_ht || 0)}</td>
                                                <td className="px-3 py-2 text-center text-gray-500">20 %</td>
                                                <td className="px-3 py-2 text-right font-semibold text-blue-700">{fEuro((+s.amount_ht || 0) * 0.20)}</td>
                                            </tr>
                                        ))}
                                        {form.use_subcontractor === 'oui' && t.subAmount > 0 && (
                                            <tr className="bg-orange-50">
                                                <td className="px-3 py-2 text-gray-700">Sous-traitance</td>
                                                <td className="px-3 py-2 text-right">{fEuro(t.subAmount)}</td>
                                                <td className="px-3 py-2 text-center text-gray-500">20 %</td>
                                                <td className="px-3 py-2 text-right font-semibold text-blue-700">{fEuro(t.subVAT)}</td>
                                            </tr>
                                        )}
                                        <tr className="bg-gray-50 font-bold">
                                            <td className="px-3 py-2 text-gray-800" colSpan={3}>Total TVA déductible</td>
                                            <td className="px-3 py-2 text-right text-blue-800">{fEuro(t.totalDeductibleVAT)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Bottom save button */}
                    <div className="flex justify-end gap-3 pb-10">
                        <button type="button" onClick={() => setView('list')}
                            className="px-5 py-2.5 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50">
                            Annuler
                        </button>
                        <button type="submit" disabled={saving}
                            className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white rounded-lg disabled:opacity-60"
                            style={{ background: '#FFB103' }}>
                            <Check size={14} /> {saving ? 'Enregistrement…' : 'Enregistrer le chantier'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}

/* ─── Helper: small read-only summary card ──────────────────────────────── */
function SummaryCard({ label, value, highlight = 'none' }) {
    const borderCls = highlight === 'green'  ? 'border-green-200 bg-green-50'
                    : highlight === 'orange' ? 'border-orange-200 bg-orange-50'
                    : highlight === 'blue'   ? 'border-blue-200 bg-blue-50'
                    : 'border-gray-100 bg-gray-50';
    const valueCls  = highlight === 'green'  ? 'text-green-700'
                    : highlight === 'orange' ? 'text-orange-700'
                    : highlight === 'blue'   ? 'text-blue-700'
                    : 'text-gray-800';
    return (
        <div className={`rounded-xl border p-3 ${borderCls}`}>
            <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
            <p className={`text-sm font-bold ${valueCls}`}>{value}</p>
        </div>
    );
}
