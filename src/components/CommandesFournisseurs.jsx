import React, { useEffect, useMemo, useState } from 'react';
import { Search, ShoppingCart, ExternalLink, BookOpen, AlertCircle, RefreshCw, Link2, Save, X } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || '/hello-gestion/php';

export default function CommandesFournisseurs() {
    const [suppliers, setSuppliers] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [draftUrl, setDraftUrl] = useState('');
    const [savingId, setSavingId] = useState(null);
    const [message, setMessage] = useState('');

    const loadSuppliers = async () => {
        try {
            setLoading(true);
            setError('');
            const response = await fetch(`${API_BASE}/annuaire.php`, {
                method: 'GET',
                credentials: 'include',
                headers: { Accept: 'application/json' },
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Impossible de charger les fournisseurs.');
            }
            setSuppliers(Array.isArray(data.suppliers) ? data.suppliers : []);
        } catch (err) {
            setError(err.message || 'Erreur réseau lors du chargement.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadSuppliers(); }, []);

    const saveOrderUrl = async (supplier) => {
        const url = draftUrl.trim();
        if (url) {
            try {
                const parsed = new URL(url);
                if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
            } catch {
                setError('Entre une adresse valide commençant par https:// ou http://.');
                return;
            }
        }

        try {
            setSavingId(supplier.id);
            setError('');
            setMessage('');
            const response = await fetch(`${API_BASE}/annuaire.php`, {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({ type: 'supplier_url', id: supplier.id, order_url: url }),
            });
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.message || 'Impossible d’enregistrer le lien.');
            setSuppliers(current => current.map(item => item.id === supplier.id ? { ...item, order_url: url } : item));
            setEditingId(null);
            setDraftUrl('');
            setMessage(`Lien de commande enregistré pour ${supplier.name}.`);
        } catch (err) {
            setError(err.message || 'Erreur lors de l’enregistrement du lien.');
        } finally {
            setSavingId(null);
        }
    };

    const filteredSuppliers = useMemo(() => suppliers.filter(supplier =>
        String(supplier.name || '').toLowerCase().includes(search.trim().toLowerCase())
    ), [suppliers, search]);

    const getOrderUrl = supplier =>
        supplier.order_url || supplier.orderUrl || supplier.url_commande || supplier.order_link || '';

    const validUrl = value => {
        try {
            const parsed = new URL(value);
            return parsed.protocol === 'https:' || parsed.protocol === 'http:';
        } catch { return false; }
    };

    return (
        <div className="space-y-6 p-1">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-400 text-black">
                        <ShoppingCart size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Commandes fournisseurs</h1>
                        <p className="text-sm text-gray-500">Accès rapide aux sites de commande de tes fournisseurs.</p>
                    </div>
                </div>
                <button onClick={loadSuppliers} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                    <RefreshCw size={16} /> Actualiser
                </button>
            </div>

            {message && <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">{message}</div>}

            <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} type="search" placeholder="Rechercher un fournisseur..." className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100" />
            </div>

            {loading && <div className="rounded-xl border border-gray-100 bg-white p-8 text-center text-gray-500">Chargement des fournisseurs...</div>}
            {!loading && error && <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700"><AlertCircle size={20} /><span>{error}</span></div>}
            {!loading && !error && filteredSuppliers.length === 0 && <div className="rounded-xl border border-gray-100 bg-white p-8 text-center text-gray-500">Aucun fournisseur trouvé.</div>}

            {!loading && !error && filteredSuppliers.length > 0 && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {filteredSuppliers.map(supplier => {
                        const url = getOrderUrl(supplier);
                        const hasUrl = validUrl(url);
                        return (
                            <article key={supplier.id} className="flex min-h-44 flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                                <div className="mb-5 flex items-center gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><BookOpen size={20} /></div>
                                    <h2 className="font-semibold text-gray-900">{supplier.name}</h2>
                                </div>
                                {editingId === supplier.id ? (
                                    <div className="mt-auto space-y-2">
                                        <label className="block text-xs font-medium text-gray-600">Lien du site de commande</label>
                                        <input
                                            type="url"
                                            value={draftUrl}
                                            onChange={e => setDraftUrl(e.target.value)}
                                            placeholder="https://..."
                                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                                        />
                                        <div className="flex gap-2">
                                            <button onClick={() => saveOrderUrl(supplier)} disabled={savingId === supplier.id} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-amber-400 px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-amber-500 disabled:opacity-50">
                                                <Save size={15} /> {savingId === supplier.id ? 'Enregistrement...' : 'Enregistrer'}
                                            </button>
                                            <button onClick={() => { setEditingId(null); setDraftUrl(''); }} className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50" aria-label="Annuler">
                                                <X size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-auto space-y-2">
                                        {hasUrl ? (
                                            <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 text-sm font-semibold text-gray-900 transition hover:bg-amber-500">
                                                <ShoppingCart size={17} /> Commander <ExternalLink size={15} />
                                            </a>
                                        ) : (
                                            <div className="rounded-xl bg-gray-50 px-3 py-3 text-center text-sm text-gray-400">Aucun lien de commande enregistré</div>
                                        )}
                                        <button onClick={() => { setEditingId(supplier.id); setDraftUrl(url); setError(''); setMessage(''); }} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                                            <Link2 size={16} /> {hasUrl ? 'Modifier le lien' : 'Ajouter un lien'}
                                        </button>
                                    </div>
                                )}
                            </article>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
