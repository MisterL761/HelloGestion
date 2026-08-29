import React, { useState, useEffect } from 'react';
import Skeleton from './Skeleton';
import { History, TrendingDown, TrendingUp, RefreshCw } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || '/hello-gestion/php';

const StockHistory = () => {
    const [movements, setMovements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/stock_history.php?limit=200`, { credentials: 'include' });
            const data = await res.json();
            if (Array.isArray(data)) setMovements(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchHistory(); }, []);

    const filtered = movements.filter(m => {
        const matchFilter = filter === 'all' ? true : filter === 'out' ? m.delta < 0 : m.delta > 0;
        const matchSearch = search
            ? m.material.toLowerCase().includes(search.toLowerCase()) ||
              m.user_name.toLowerCase().includes(search.toLowerCase())
            : true;
        return matchFilter && matchSearch;
    });

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('fr-FR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className="bg-white rounded-xl shadow-sm p-4 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                        <History size={20} className="text-amber-700" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Historique des mouvements</h3>
                        <p className="text-xs text-gray-400">{filtered.length} mouvement{filtered.length > 1 ? 's' : ''}</p>
                    </div>
                </div>
                <button
                    onClick={fetchHistory}
                    className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                    title="Rafraîchir"
                >
                    <RefreshCw size={16} />
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-5">
                <input
                    type="text"
                    placeholder="Rechercher un article ou un utilisateur…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="flex-1 min-w-[200px] px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFB103] bg-gray-50 focus:bg-white"
                />
                <div className="flex gap-2">
                    {[
                        { value: 'all', label: 'Tous' },
                        { value: 'out', label: '↓ Sorties' },
                        { value: 'in',  label: '↑ Entrées' },
                    ].map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => setFilter(opt.value)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                filter === opt.value
                                    ? 'bg-[#FFB103] text-[#1a1a1a]'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <Skeleton.Table rows={8} cols={['w-1/4','w-1/6','w-1/6','w-1/6','w-1/6','w-1/12']} />
            ) : filtered.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                    <History size={40} className="mx-auto mb-3 opacity-40" />
                    <p className="text-sm">Aucun mouvement trouvé</p>
                    <p className="text-xs mt-1 text-gray-300">Les mouvements apparaissent dès qu'un stock est modifié</p>
                </div>
            ) : (
                <>
                    {/* Desktop table */}
                    <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Date & Heure</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Article</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Fournisseur</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Utilisateur</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Mouvement</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {filtered.map(m => (
                                    <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{formatDate(m.moved_at)}</td>
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-gray-900">{m.material}</p>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500">{m.supplier || '—'}</td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                                                {m.user_name}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {m.delta < 0 ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full text-xs font-bold">
                                                    <TrendingDown size={12} /> {m.delta}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-bold">
                                                    <TrendingUp size={12} /> +{m.delta}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile cards */}
                    <div className="md:hidden space-y-2">
                        {filtered.map(m => (
                            <div key={m.id} className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 text-sm truncate">{m.material}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">{m.user_name} · {m.supplier || '—'}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">{formatDate(m.moved_at)}</p>
                                    </div>
                                    {m.delta < 0 ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full text-xs font-bold whitespace-nowrap flex-shrink-0">
                                            <TrendingDown size={11} /> {m.delta}
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-bold whitespace-nowrap flex-shrink-0">
                                            <TrendingUp size={11} /> +{m.delta}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default StockHistory;
