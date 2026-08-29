import React, { useMemo, useState, useEffect } from 'react';
import Skeleton from './Skeleton';
import {
    TrendingUp, AlertTriangle, XCircle, Euro,
    Package, ShoppingCart, BarChart2, CheckCircle,
    Receipt, Clock, Users, Calculator, Flame,
    FileBarChart, ChevronRight
} from 'lucide-react';
import SupplierLogo from './SupplierLogo';
import MonthlyReport from './MonthlyReport';

const fmt = (n) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

const KpiCard = ({ icon: Icon, label, value, sub, color }) => {
    const colors = {
        blue:   { bg: 'bg-blue-50',          icon: 'text-blue-600',    ring: 'bg-blue-100' },
        green:  { bg: 'bg-green-50',          icon: 'text-green-600',   ring: 'bg-green-100' },
        yellow: { bg: 'bg-[#FFB103]/10',      icon: 'text-[#FFB103]',   ring: 'bg-[#FFB103]/20' },
        red:    { bg: 'bg-red-50',            icon: 'text-red-600',     ring: 'bg-red-100' },
    };
    const c = colors[color] ?? colors.blue;
    return (
        <div className={`rounded-2xl ${c.bg} p-5 flex items-center gap-4`}>
            <div className={`w-12 h-12 rounded-xl ${c.ring} flex items-center justify-center shrink-0`}>
                <Icon size={22} className={c.icon} />
            </div>
            <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">{label}</p>
                <p className="text-2xl font-black text-gray-900 leading-none">{value}</p>
                {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
            </div>
        </div>
    );
};

const CATEGORIES_LABEL = {
    transport:   'Transport',
    repas:       'Repas',
    hebergement: 'Hébergement',
    materiel:    'Matériel',
    autre:       'Autre',
};

const STATUS_CFG = {
    en_attente: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
    validee:    { label: 'Validée',    color: 'bg-green-100 text-green-800' },
    rejetee:    { label: 'Rejetée',    color: 'bg-red-100 text-red-800' },
};

const API_BASE = import.meta.env.VITE_API_BASE || '/hello-gestion/php';

// ── Hook fetch générique ───────────────────────────────────

function useFetch(url, deps = []) {
    const [data, setData]     = useState(null);
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        if (!url) { setLoading(false); return; }  // guard : ne pas fetcher si URL nulle
        let cancelled = false;
        setLoading(true);
        fetch(url, { credentials: 'include' })
            .then(r => r.json())
            .then(d => { if (!cancelled && d.success) setData(d.data); })
            .catch(() => {})
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
    return { data, loading };
}

const MONTH_NAMES_SHORT = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

const Dashboard = ({ inventoryItems = [], user, onViewUserCommission, onNavigate }) => {

    const {
        totalStockValue,
        ruptureValue,
        ruptureItems,
        faibleItems,
        topByValue,
        bySupplier,
        supplierMax,
        totalWithPrice,
        cartonCount,
        uniteCount,
    } = useMemo(() => {
        const ruptureItems = inventoryItems.filter(
            i => i.status === 'Rupture' || i.status?.includes('Rupture')
        );
        const faibleItems = inventoryItems.filter(i => i.status?.includes('Faible'));

        const totalStockValue = inventoryItems.reduce((sum, i) => {
            if (!i.price) return sum;
            return sum + Number(i.stock) * parseFloat(i.price);
        }, 0);

        const ruptureValue = ruptureItems.reduce((sum, i) => {
            if (!i.price) return sum;
            return sum + Number(i.threshold) * parseFloat(i.price);
        }, 0);

        const topByValue = [...inventoryItems]
            .filter(i => i.price && Number(i.stock) > 0)
            .map(i => ({ ...i, totalValue: Number(i.stock) * parseFloat(i.price) }))
            .sort((a, b) => b.totalValue - a.totalValue)
            .slice(0, 8);

        const bySupplier = inventoryItems.reduce((acc, item) => {
            if (!item.supplier) return acc;
            if (!acc[item.supplier]) acc[item.supplier] = { count: 0, value: 0 };
            acc[item.supplier].count++;
            if (item.price) acc[item.supplier].value += Number(item.stock) * parseFloat(item.price);
            return acc;
        }, {});

        const supplierMax = Math.max(...Object.values(bySupplier).map(s => s.value), 1);
        const totalWithPrice = inventoryItems.filter(i => i.price).length;
        const cartonCount = inventoryItems.filter(i => i.conditionnement === 'carton').length;
        const uniteCount = inventoryItems.filter(i => i.conditionnement !== 'carton').length;

        return {
            totalStockValue, ruptureValue, ruptureItems, faibleItems,
            topByValue, bySupplier, supplierMax, totalWithPrice,
            cartonCount, uniteCount,
        };
    }, [inventoryItems]);

    const alertItems = [...ruptureItems, ...faibleItems].slice(0, 12);

    const canManageExpenses    = ['admin', 'gerant'].includes(user?.role);
    const canViewCommissions   = ['admin', 'gerant'].includes(user?.role);
    const canViewReports       = ['admin', 'gerant', 'administration'].includes(user?.role);

    // Widget prefs (localStorage, mis à jour depuis Paramètres)
    const [widgetPrefs] = useState(() => {
        try {
            const raw = localStorage.getItem(`dashboard_widgets_${user?.id}`);
            return raw ? JSON.parse(raw) : {};
        } catch { return {}; }
    });
    const wOn = (id) => widgetPrefs[id] !== false;

    // Fetch frais (admin/gerant uniquement)
    const { data: allExpenses, loading: expLoading } = useFetch(
        canManageExpenses ? `${API_BASE}/expense_reports.php` : null,
        [canManageExpenses]
    );

    // Fetch top consommés du mois
    const { data: topConsumedData } = useFetch(`${API_BASE}/top_consumed.php`, []);
    const topConsumed = topConsumedData || [];

    // Fetch derniers rapports (3 max pour le widget)
    const { data: reportsData } = useFetch(
        canViewReports ? `${API_BASE}/reports.php` : null,
        [canViewReports]
    );
    const lastReports = (reportsData || []).slice(0, 3);

    // Fetch commerciaux (admin/gérant uniquement)
    const { data: allUsers } = useFetch(
        canViewCommissions ? `${API_BASE}/users.php` : null,
        [canViewCommissions]
    );
    const commerciaux = (allUsers || []).filter(u => u.role === 'commercial');

    const [localExpenses, setLocalExpenses] = useState(null);
    useEffect(() => { if (allExpenses) setLocalExpenses(allExpenses); }, [allExpenses]);
    const expenses = localExpenses || allExpenses || [];

    const pendingExpenses = expenses.filter(e => e.status === 'en_attente');

    const [valLoading, setValLoading] = useState(false);

    const handleValidate = async (id, action) => {
        setValLoading(true);
        try {
            await fetch(`${API_BASE}/expense_reports.php`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ id, action }),
            });
            setLocalExpenses(prev =>
                (prev || []).map(e =>
                    e.id === id
                        ? { ...e, status: action === 'validate' ? 'validee' : 'rejetee' }
                        : e
                )
            );
        } catch { /* ignore */ }
        finally { setValLoading(false); }
    };

    return (
        <div className="space-y-6">

            {/* ── Widget Derniers rapports ── */}
            {canViewReports && lastReports.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
                        <FileBarChart size={16} className="text-[#FFB103]" />
                        <h2 className="font-bold text-gray-800 text-sm">Derniers rapports générés</h2>
                        <button
                            onClick={() => onNavigate?.('rapports')}
                            className="ml-auto flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors"
                        >
                            Voir tous <ChevronRight size={12} />
                        </button>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {lastReports.map(r => {
                            const s = r.stats || {};
                            const label = r.month && r.year
                                ? `${MONTH_NAMES_SHORT[r.month - 1]} ${r.year}`
                                : r.title;
                            return (
                                <div key={r.id} className="flex items-center gap-4 px-5 py-3">
                                    <div className="w-9 h-9 rounded-xl bg-[#FFB103]/10 flex items-center justify-center flex-shrink-0">
                                        <FileBarChart size={16} className="text-[#FFB103]" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-800 truncate">{r.title}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {new Date(r.generated_at).toLocaleDateString('fr-FR')} · {r.user_name}
                                        </p>
                                    </div>
                                    <div className="hidden sm:flex items-center gap-2 flex-shrink-0 text-xs text-gray-500">
                                        {s.monthInstalled != null && <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">{s.monthInstalled} posés</span>}
                                        {s.outOfStock > 0 && <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-medium">{s.outOfStock} rupture{s.outOfStock > 1 ? 's' : ''}</span>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── Rapport mensuel ── */}
            <MonthlyReport inventoryItems={inventoryItems} />

            {/* ── KPIs ── */}
            {wOn('kpis') && <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                <KpiCard
                    icon={Euro}
                    label="Valeur totale du stock"
                    value={fmt(totalStockValue)}
                    sub={`sur ${totalWithPrice} articles valorisés`}
                    color="blue"
                />
                <KpiCard
                    icon={ShoppingCart}
                    label="À commander (ruptures)"
                    value={fmt(ruptureValue)}
                    sub={`${ruptureItems.length} article${ruptureItems.length > 1 ? 's' : ''} en rupture`}
                    color="red"
                />
                <KpiCard
                    icon={AlertTriangle}
                    label="Stock faible"
                    value={faibleItems.length}
                    sub="articles sous le seuil"
                    color="yellow"
                />
                <KpiCard
                    icon={CheckCircle}
                    label="Articles disponibles"
                    value={inventoryItems.length - ruptureItems.length - faibleItems.length}
                    sub={`sur ${inventoryItems.length} articles`}
                    color="green"
                />
            </div>}

            {/* ── Ligne 2 : Alertes + Top articles ── */}
            {(wOn('alertes') || wOn('top_valeur')) && (
            <div className={`grid gap-4 ${wOn('alertes') && wOn('top_valeur') ? 'grid-cols-5' : 'grid-cols-1'}`}>

                {/* Alertes actives */}
                {wOn('alertes') && <div className={`${wOn('top_valeur') ? 'col-span-2' : ''} bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden`}>
                    <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
                        <XCircle size={16} className="text-red-500" />
                        <h2 className="font-bold text-gray-800 text-sm">Alertes actives</h2>
                        {alertItems.length > 0 && (
                            <span className="ml-auto bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
                                {ruptureItems.length + faibleItems.length}
                            </span>
                        )}
                    </div>

                    {alertItems.length === 0 ? (
                        <div className="px-5 py-10 text-center text-gray-400">
                            <CheckCircle size={32} className="mx-auto mb-2 text-green-400" />
                            <p className="text-sm font-medium">Tout est en ordre !</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
                            {alertItems.map(item => {
                                const isRupture = item.status === 'Rupture' || item.status?.includes('Rupture');
                                return (
                                    <li key={item.id} className="flex items-center gap-3 px-5 py-3">
                                        <span className={`w-2 h-2 rounded-full shrink-0 ${isRupture ? 'bg-red-500' : 'bg-yellow-400'}`} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-gray-900 truncate">{item.material}</p>
                                            <p className="text-[10px] text-gray-400">{item.supplier} · stock : {item.stock} / {item.threshold}</p>
                                        </div>
                                        <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                            isRupture
                                                ? 'bg-red-100 text-red-700'
                                                : 'bg-yellow-100 text-yellow-700'
                                        }`}>
                                            {isRupture ? 'Rupture' : 'Faible'}
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>}

                {/* Top articles par valeur */}
                {wOn('top_valeur') && <div className={`${wOn('alertes') ? 'col-span-3' : ''} bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden`}>
                    <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
                        <TrendingUp size={16} className="text-blue-500" />
                        <h2 className="font-bold text-gray-800 text-sm">Top articles par valeur</h2>
                    </div>

                    {topByValue.length === 0 ? (
                        <div className="px-5 py-10 text-center text-gray-400">
                            <Euro size={32} className="mx-auto mb-2 opacity-30" />
                            <p className="text-sm">Aucun article avec un prix renseigné</p>
                        </div>
                    ) : (
                        <div className="px-5 py-3 space-y-2.5 max-h-72 overflow-y-auto">
                            {topByValue.map((item, i) => {
                                const pct = Math.round((item.totalValue / topByValue[0].totalValue) * 100);
                                return (
                                    <div key={item.id} className="flex items-center gap-3">
                                        <span className="w-5 text-xs font-bold text-gray-300 text-right shrink-0">#{i + 1}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-xs font-semibold text-gray-800 truncate pr-2">{item.material}</span>
                                                <span className="text-xs font-bold text-gray-900 shrink-0">{fmt(item.totalValue)}</span>
                                            </div>
                                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                                                <div
                                                    className="h-1.5 rounded-full bg-blue-500 transition-all"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>}
            </div>)}

            {/* ── Ligne 3 : Répartition fournisseurs + Conditionnement ── */}
            {(wOn('fournisseurs') || wOn('conditionnement')) && (
            <div className={`grid gap-4 ${wOn('fournisseurs') && wOn('conditionnement') ? 'grid-cols-3' : 'grid-cols-1'}`}>

                {/* Répartition par fournisseur */}
                {wOn('fournisseurs') && <div className={`${wOn('conditionnement') ? 'col-span-2' : ''} bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden`}>
                    <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
                        <BarChart2 size={16} className="text-amber-600" />
                        <h2 className="font-bold text-gray-800 text-sm">Valeur du stock par fournisseur</h2>
                    </div>
                    <div className="px-5 py-4 space-y-3">
                        {Object.entries(bySupplier)
                            .sort((a, b) => b[1].value - a[1].value)
                            .map(([supplier, data]) => {
                                const pct = supplierMax > 0 ? Math.round((data.value / supplierMax) * 100) : 0;
                                return (
                                    <div key={supplier} className="flex items-center gap-3">
                                        <div className="w-20 shrink-0">
                                            <SupplierLogo supplier={supplier} className="h-4 w-auto object-contain opacity-80" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="w-full bg-gray-100 rounded-full h-2">
                                                <div
                                                    className="h-2 rounded-full bg-amber-500 transition-all"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0 w-24">
                                            <span className="text-xs font-bold text-gray-800">{fmt(data.value)}</span>
                                            <span className="text-[10px] text-gray-400 ml-1">({data.count} art.)</span>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                </div>}

                {/* Conditionnement */}
                {wOn('conditionnement') && <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
                        <Package size={16} className="text-orange-500" />
                        <h2 className="font-bold text-gray-800 text-sm">Conditionnement</h2>
                    </div>
                    <div className="px-5 py-6 space-y-4">
                        {/* Carton */}
                        <div>
                            <div className="flex justify-between items-center mb-1.5">
                                <span className="text-xs font-semibold text-blue-700">📦 Carton</span>
                                <span className="text-sm font-black text-gray-900">{cartonCount}</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-3">
                                <div
                                    className="h-3 rounded-full bg-blue-400 transition-all"
                                    style={{ width: `${inventoryItems.length ? (cartonCount / inventoryItems.length) * 100 : 0}%` }}
                                />
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1">
                                {inventoryItems.length ? Math.round((cartonCount / inventoryItems.length) * 100) : 0}% du total
                            </p>
                        </div>
                        {/* Unité */}
                        <div>
                            <div className="flex justify-between items-center mb-1.5">
                                <span className="text-xs font-semibold text-orange-700">🔩 Unité</span>
                                <span className="text-sm font-black text-gray-900">{uniteCount}</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-3">
                                <div
                                    className="h-3 rounded-full bg-orange-400 transition-all"
                                    style={{ width: `${inventoryItems.length ? (uniteCount / inventoryItems.length) * 100 : 0}%` }}
                                />
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1">
                                {inventoryItems.length ? Math.round((uniteCount / inventoryItems.length) * 100) : 0}% du total
                            </p>
                        </div>
                        {/* Total */}
                        <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                            <span className="text-xs text-gray-500 font-medium">Total articles</span>
                            <span className="text-xl font-black text-gray-900">{inventoryItems.length}</span>
                        </div>
                    </div>
                </div>}
            </div>)}

            {/* ── Section RH : Notes de frais (Admin/Gérant) ── */}
            {canManageExpenses && wOn('frais') && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
                        <Receipt size={16} className="text-emerald-500" />
                        <h2 className="font-bold text-gray-800 text-sm">Suivi RH — Notes de frais</h2>
                        {pendingExpenses.length > 0 && (
                            <span className="ml-auto bg-yellow-100 text-yellow-700 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                                <Clock size={11} /> {pendingExpenses.length} en attente
                            </span>
                        )}
                    </div>

                    {expLoading ? (
                        <Skeleton.ExpenseList count={3} />
                    ) : expenses.length === 0 ? (
                        <div className="py-8 text-center text-gray-400 text-sm">
                            <Receipt size={30} className="mx-auto mb-2 opacity-30" />
                            Aucune note de frais
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
                            {expenses.slice(0, 20).map(exp => {
                                const statusCfg = STATUS_CFG[exp.status] || STATUS_CFG.en_attente;
                                return (
                                    <div key={exp.id} className="flex items-center gap-3 px-5 py-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-semibold text-gray-800 truncate">{exp.title}</span>
                                                <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${statusCfg.color}`}>
                                                    {statusCfg.label}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                {exp.user_name} · {CATEGORIES_LABEL[exp.category] || exp.category}
                                            </p>
                                        </div>
                                        {exp.status === 'en_attente' && (
                                            <div className="flex gap-1 shrink-0">
                                                <button
                                                    onClick={() => handleValidate(exp.id, 'validate')}
                                                    disabled={valLoading}
                                                    className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Valider"
                                                >
                                                    <CheckCircle size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleValidate(exp.id, 'reject')}
                                                    disabled={valLoading}
                                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Rejeter"
                                                >
                                                    <XCircle size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
            {/* ── Top 5 articles consommés du mois ── */}
            {wOn('top_consommes') && <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
                    <Flame size={16} className="text-orange-500" />
                    <h2 className="font-bold text-gray-800 text-sm">Top 5 consommés ce mois-ci</h2>
                    <span className="ml-auto text-[10px] text-gray-400 font-medium">
                        {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                    </span>
                </div>

                {topConsumed.length === 0 ? (
                    <div className="py-8 text-center text-gray-400 text-sm">
                        <Flame size={30} className="mx-auto mb-2 opacity-20" />
                        Aucune consommation enregistrée ce mois-ci
                    </div>
                ) : (
                    <div className="px-5 py-4 space-y-3">
                        {topConsumed.map((item, i) => {
                            const pct = Math.round((item.consumed / topConsumed[0].consumed) * 100);
                            const colors = ['bg-orange-500', 'bg-orange-400', 'bg-amber-400', 'bg-yellow-400', 'bg-yellow-300'];
                            return (
                                <div key={item.id} className="flex items-center gap-3">
                                    <span className="w-5 text-xs font-bold text-gray-300 text-right shrink-0">#{i + 1}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-xs font-semibold text-gray-800 truncate pr-2">{item.material}</span>
                                            <span className="text-xs font-bold text-orange-600 shrink-0">−{item.consumed} unité{item.consumed > 1 ? 's' : ''}</span>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                                            <div
                                                className={`h-1.5 rounded-full transition-all ${colors[i] || 'bg-gray-300'}`}
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                        <p className="text-[10px] text-gray-400 mt-0.5">{item.supplier} · stock actuel : {item.stock}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>}

            {/* ── Section Commissions (Admin/Gérant) ── */}
            {canViewCommissions && wOn('commissions') && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
                        <Calculator size={16} className="text-amber-600" />
                        <h2 className="font-bold text-gray-800 text-sm">Supervision — Calculateurs de commission</h2>
                        {commerciaux.length > 0 && (
                            <span className="ml-auto bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full">
                                {commerciaux.length} commercial{commerciaux.length > 1 ? 'x' : ''}
                            </span>
                        )}
                    </div>

                    {commerciaux.length === 0 ? (
                        <div className="py-8 text-center text-gray-400 text-sm">
                            <Users size={30} className="mx-auto mb-2 opacity-30" />
                            Aucun commercial actif
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {commerciaux.map(u => (
                                <div key={u.id} className="flex items-center gap-4 px-5 py-3">
                                    {u.avatar_path ? (
                                        <img src={`/hello-gestion/php/${u.avatar_path}`} alt="avatar"
                                            className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                                    ) : (
                                        <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                                            <Users size={16} className="text-amber-600" />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-800">{u.name}</p>
                                        <p className="text-xs text-gray-400">{u.position || 'Commercial'}</p>
                                    </div>
                                    {onViewUserCommission && (
                                        <button
                                            onClick={() => onViewUserCommission(u)}
                                            className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
                                        >
                                            <Calculator size={13} /> Voir calculateur
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Dashboard;
