import React, { useState, useEffect, useCallback } from 'react';
import Skeleton from './Skeleton';
import { Terminal, RefreshCw, AlertTriangle, CheckCircle, XCircle, Info, Filter, Search } from 'lucide-react';
import { useToast } from './ToastProvider';

const API_BASE = import.meta.env.VITE_API_BASE || '/hello-gestion/php';

const LEVEL_CONFIG = {
    SUCCESS: { icon: CheckCircle,    color: 'text-green-600',  bg: 'bg-green-50',  badge: 'bg-green-100 text-green-700' },
    ERROR:   { icon: XCircle,        color: 'text-red-600',    bg: 'bg-red-50',    badge: 'bg-red-100 text-red-700' },
    WARNING: { icon: AlertTriangle,  color: 'text-yellow-600', bg: 'bg-yellow-50', badge: 'bg-yellow-100 text-yellow-700' },
    INFO:    { icon: Info,           color: 'text-blue-600',   bg: 'bg-blue-50',   badge: 'bg-blue-100 text-blue-700' },
};

const Logs = () => {
    const toast = useToast();
    const [logs, setLogs]         = useState([]);
    const [loading, setLoading]   = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [search, setSearch]     = useState('');
    const [filterLevel, setFilterLevel] = useState('ALL');
    const [page, setPage]         = useState(1);
    const PER_PAGE = 50;

    const fetchLogs = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const res  = await fetch(`${API_BASE}/logs.php`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) setLogs(data.data);
            else toast.error(data.message || 'Erreur chargement logs');
        } catch { if (!silent) toast.error('Erreur réseau'); }
        finally { if (!silent) setLoading(false); }
    }, []);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);

    // Auto-refresh toutes les 15s
    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(() => fetchLogs(true), 15000);
        return () => clearInterval(interval);
    }, [autoRefresh, fetchLogs]);

    // Filtres
    const filtered = logs.filter(log => {
        const matchLevel  = filterLevel === 'ALL' || log.level === filterLevel;
        const matchSearch = !search || [log.message, log.user, log.action, log.ip]
            .some(f => f?.toLowerCase().includes(search.toLowerCase()));
        return matchLevel && matchSearch;
    });

    const totalPages = Math.ceil(filtered.length / PER_PAGE);
    const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

    // Stats
    const stats = {
        SUCCESS: logs.filter(l => l.level === 'SUCCESS').length,
        ERROR:   logs.filter(l => l.level === 'ERROR').length,
        WARNING: logs.filter(l => l.level === 'WARNING').length,
        INFO:    logs.filter(l => l.level === 'INFO').length,
    };

    if (loading) return (
        <div className="space-y-4">
            <div className="flex items-center gap-3 animate-pulse">
                <div className="h-12 w-12 rounded-xl bg-gray-200" />
                <div className="h-5 w-32 bg-gray-200 rounded" />
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <Skeleton.LogList rows={10} />
            </div>
        </div>
    );

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-gray-900 rounded-xl flex items-center justify-center">
                    <Terminal size={24} className="text-green-400" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Journal Technique</h2>
                    <p className="text-sm text-gray-500">{logs.length} entrées au total · Admin uniquement</p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                    <button
                        onClick={() => setAutoRefresh(a => !a)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                            autoRefresh
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                        }`}
                    >
                        <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                        {autoRefresh ? 'Live' : 'Pause'}
                    </button>
                    <button
                        onClick={() => fetchLogs()}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-white border border-gray-200 hover:border-[#FFB103]/50 text-gray-600 transition-colors"
                    >
                        <RefreshCw size={14} /> Actualiser
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-3">
                {Object.entries(stats).map(([level, count]) => {
                    const cfg  = LEVEL_CONFIG[level];
                    const Icon = cfg.icon;
                    return (
                        <button
                            key={level}
                            onClick={() => { setFilterLevel(filterLevel === level ? 'ALL' : level); setPage(1); }}
                            className={`rounded-xl p-3 flex items-center gap-3 border-2 transition-all ${
                                filterLevel === level
                                    ? `${cfg.bg} border-current`
                                    : 'bg-white border-transparent hover:border-gray-100'
                            } shadow-sm`}
                        >
                            <Icon size={18} className={cfg.color} />
                            <div>
                                <p className="text-lg font-black text-gray-900">{count}</p>
                                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{level}</p>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Filtres */}
            <div className="flex gap-3">
                <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                        placeholder="Rechercher dans les logs…"
                        className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FFB103] bg-white"
                    />
                </div>
                <select
                    value={filterLevel}
                    onChange={e => { setFilterLevel(e.target.value); setPage(1); }}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-[#FFB103]"
                >
                    <option value="ALL">Tous les niveaux</option>
                    {Object.keys(LEVEL_CONFIG).map(l => (
                        <option key={l} value={l}>{l}</option>
                    ))}
                </select>
            </div>

            {/* Tableau des logs */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {paginated.length === 0 ? (
                    <div className="text-center py-14 text-gray-400">
                        <Terminal size={40} className="mx-auto mb-3 opacity-30" />
                        <p className="text-sm">Aucun log trouvé</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {paginated.map((log, i) => {
                            const cfg  = LEVEL_CONFIG[log.level] || LEVEL_CONFIG.INFO;
                            const Icon = cfg.icon;
                            return (
                                <div key={i} className={`flex items-start gap-3 px-4 py-3 ${cfg.bg} hover:brightness-[0.985] transition-all`}>
                                    <Icon size={15} className={`${cfg.color} mt-0.5 flex-shrink-0`} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.badge}`}>
                                                {log.level}
                                            </span>
                                            {log.action && (
                                                <span className="text-[10px] font-mono bg-black/5 px-1.5 py-0.5 rounded text-gray-600">
                                                    {log.action}
                                                </span>
                                            )}
                                            {log.user && (
                                                <span className="text-xs text-gray-500">👤 {log.user}</span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-800 mt-1 font-medium">{log.message}</p>
                                        {log.details && (
                                            <p className="text-xs text-gray-400 mt-0.5 font-mono truncate">{log.details}</p>
                                        )}
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="text-xs text-gray-400 whitespace-nowrap">
                                            {log.date ? new Date(log.date).toLocaleString('fr-FR', {
                                                day: '2-digit', month: '2-digit',
                                                hour: '2-digit', minute: '2-digit'
                                            }) : '—'}
                                        </p>
                                        {log.ip && <p className="text-[10px] text-gray-300 mt-0.5">{log.ip}</p>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>{filtered.length} entrées</span>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:border-[#FFB103]/50 transition-colors"
                        >
                            ←
                        </button>
                        <span className="px-3 font-medium">{page} / {totalPages}</span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:border-[#FFB103]/50 transition-colors"
                        >
                            →
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Logs;
