import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    FileText, Download, Trash2, RefreshCw,
    Calendar, BarChart2, Package, AlertTriangle,
    Euro, ChevronDown, ChevronUp, FileBarChart
} from 'lucide-react';
import MonthlyReport from './MonthlyReport';
import { useToast, useConfirm } from './ToastProvider';

const API_BASE = import.meta.env.VITE_API_BASE || '/hello-gestion/php';

const MONTH_NAMES = [
    'Janvier','Février','Mars','Avril','Mai','Juin',
    'Juillet','Août','Septembre','Octobre','Novembre','Décembre'
];

const fmt = (n) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n ?? 0);

const fmtDate = (d) => d
    ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

// ── Carte d'un rapport ──────────────────────────────────────

const ReportCard = ({ report, canDelete, onDelete, onRegenerate }) => {
    const [expanded, setExpanded] = useState(false);
    const s = report.stats || {};
    const monthLabel = report.month && report.year
        ? `${MONTH_NAMES[report.month - 1]} ${report.year}`
        : report.title;

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            {/* En-tête de la carte */}
            <div className="flex items-center gap-4 px-5 py-4">
                <div className="w-10 h-10 rounded-xl bg-[#FFB103]/15 flex items-center justify-center flex-shrink-0">
                    <FileBarChart size={18} className="text-[#FFB103]" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm truncate">{report.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
                        <Calendar size={11} />
                        {fmtDate(report.generated_at)}
                        {report.user_name && (
                            <span className="text-gray-300">·</span>
                        )}
                        {report.user_name && (
                            <span>{report.user_name}</span>
                        )}
                    </p>
                </div>

                {/* Badges stats rapides */}
                <div className="hidden md:flex items-center gap-2 flex-shrink-0">
                    {s.monthInstalled != null && (
                        <span className="text-xs bg-green-50 text-green-700 font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                            <Package size={10} /> {s.monthInstalled} posés
                        </span>
                    )}
                    {s.outOfStock != null && (
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 ${
                            s.outOfStock > 0 ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-500'
                        }`}>
                            <AlertTriangle size={10} /> {s.outOfStock} rupture{s.outOfStock > 1 ? 's' : ''}
                        </span>
                    )}
                    {s.totalValue != null && (
                        <span className="text-xs bg-blue-50 text-blue-700 font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                            <Euro size={10} /> {fmt(s.totalValue)}
                        </span>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                        onClick={() => setExpanded(e => !e)}
                        className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                        title="Détails"
                    >
                        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    <button
                        onClick={() => onRegenerate(report)}
                        className="p-2 text-[#FFB103] hover:bg-[#FFB103]/10 rounded-lg transition-colors"
                        title="Regénérer le PDF"
                    >
                        <Download size={16} />
                    </button>
                    {canDelete && (
                        <button
                            onClick={() => onDelete(report.id)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Supprimer"
                        >
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* Panneau détails */}
            {expanded && s && Object.keys(s).length > 0 && (
                <div className="border-t border-gray-50 px-5 py-4 bg-gray-50/50">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {s.monthInstalled != null && (
                            <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
                                <p className="text-xl font-black text-gray-900">{s.monthInstalled}</p>
                                <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-0.5">Produits posés</p>
                            </div>
                        )}
                        {s.monthReceived != null && (
                            <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
                                <p className="text-xl font-black text-gray-900">{s.monthReceived}</p>
                                <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-0.5">Produits reçus</p>
                            </div>
                        )}
                        {s.outOfStock != null && (
                            <div className={`rounded-xl p-3 border text-center ${s.outOfStock > 0 ? 'bg-red-50 border-red-100' : 'bg-white border-gray-100'}`}>
                                <p className={`text-xl font-black ${s.outOfStock > 0 ? 'text-red-600' : 'text-gray-900'}`}>{s.outOfStock}</p>
                                <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-0.5">Ruptures stock</p>
                            </div>
                        )}
                        {s.lowStock != null && (
                            <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
                                <p className="text-xl font-black text-[#FFB103]">{s.lowStock}</p>
                                <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-0.5">Stock faible</p>
                            </div>
                        )}
                        {s.totalValue != null && (
                            <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
                                <p className="text-xl font-black text-blue-700">{fmt(s.totalValue)}</p>
                                <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-0.5">Valeur stock</p>
                            </div>
                        )}
                        {s.toolsCount != null && (
                            <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
                                <p className="text-xl font-black text-gray-900">{s.toolsCount}</p>
                                <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-0.5">Outils</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Composant principal ─────────────────────────────────────

const Rapports = ({ inventoryItems = [], user }) => {
    const toast   = useToast();
    const confirm = useConfirm();

    const [reports, setReports]       = useState([]);
    const [loading, setLoading]       = useState(true);
    const [filterYear, setFilterYear] = useState('');
    const monthlyRef = useRef(null);

    const canDelete = ['admin', 'gerant'].includes(user?.role);
    const canGenerate = ['admin', 'gerant', 'administration'].includes(user?.role);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = filterYear ? `?year=${filterYear}` : '';
            const res  = await fetch(`${API_BASE}/reports.php${params}`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) setReports(data.data);
        } catch {
            toast.error('Impossible de charger les rapports');
        } finally {
            setLoading(false);
        }
    }, [filterYear]);

    useEffect(() => { load(); }, [load]);

    const handleDelete = async (id) => {
        if (!await confirm('Supprimer ce rapport ?')) return;
        try {
            const res  = await fetch(`${API_BASE}/reports.php?id=${id}`, { method: 'DELETE', credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                setReports(prev => prev.filter(r => r.id !== id));
                toast.success('Rapport supprimé');
            } else {
                toast.error(data.message || 'Erreur');
            }
        } catch {
            toast.error('Erreur lors de la suppression');
        }
    };

    const handleRegenerate = () => {
        monthlyRef.current?.generate();
    };

    // Groupement par année
    const byYear = reports.reduce((acc, r) => {
        const y = r.year || new Date(r.generated_at).getFullYear();
        if (!acc[y]) acc[y] = [];
        acc[y].push(r);
        return acc;
    }, {});
    const years = Object.keys(byYear).sort((a, b) => b - a);

    // Années disponibles pour le filtre
    const availableYears = [...new Set(reports.map(r => r.year || new Date(r.generated_at).getFullYear()))].sort((a, b) => b - a);

    return (
        <div className="space-y-6">
            {/* En-tête */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
                        <BarChart2 size={22} className="text-[#FFB103]" />
                        Rapports
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Historique de tous les rapports générés · {reports.length} rapport{reports.length > 1 ? 's' : ''}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {/* Filtre année */}
                    {availableYears.length > 1 && (
                        <select
                            value={filterYear}
                            onChange={e => setFilterYear(e.target.value)}
                            className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#FFB103]"
                        >
                            <option value="">Toutes les années</option>
                            {availableYears.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    )}
                    <button
                        onClick={load}
                        className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:border-[#FFB103] hover:text-[#FFB103] transition-colors"
                        title="Actualiser"
                    >
                        <RefreshCw size={16} />
                    </button>
                </div>
            </div>

            {/* Générateur de rapport mensuel */}
            {canGenerate && (
                <div>
                    <MonthlyReport
                        ref={monthlyRef}
                        inventoryItems={inventoryItems}
                        onReportSaved={load}
                    />
                </div>
            )}

            {/* Liste des rapports */}
            {loading ? (
                <div className="flex items-center justify-center py-16 text-gray-400 gap-3">
                    <div className="w-6 h-6 border-2 border-[#FFB103] border-t-transparent rounded-full animate-spin" />
                    Chargement…
                </div>
            ) : reports.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                    <div className="w-16 h-16 bg-[#FFB103]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <FileText size={28} className="text-[#FFB103]" />
                    </div>
                    <p className="font-bold text-gray-800 text-lg">Aucun rapport pour l'instant</p>
                    <p className="text-sm text-gray-400 mt-1 max-w-xs mx-auto">
                        Génère ton premier rapport mensuel depuis le bouton ci-dessus. Il sera automatiquement sauvegardé ici.
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {years.map(year => (
                        <div key={year}>
                            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <span className="w-6 h-px bg-gray-200" />{year}<span className="flex-1 h-px bg-gray-200" />
                            </h2>
                            <div className="space-y-3">
                                {byYear[year].map(report => (
                                    <ReportCard
                                        key={report.id}
                                        report={report}
                                        canDelete={canDelete}
                                        onDelete={handleDelete}
                                        onRegenerate={handleRegenerate}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Rapports;
