import { useState, useEffect, useCallback } from 'react';
import { Mail, RefreshCw, Settings2, AlertTriangle, Plug } from 'lucide-react';
import { useToast } from './ToastProvider';
import { API_BASE } from '../utils/constants';

export default function Fournisseurs({ user, onOpenSupplier, onOpenConfig }) {
    const toast = useToast();
    const [suppliers, setSuppliers] = useState([]);
    const [lastSync, setLastSync] = useState(null);
    const [connected, setConnected] = useState(true);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);

    const load = useCallback(async () => {
        try {
            const [supRes, connRes] = await Promise.all([
                fetch(`${API_BASE}/supplier_emails_api.php?action=list_suppliers`, { credentials: 'include' }).then(r => r.json()),
                fetch(`${API_BASE}/supplier_emails_api.php?action=connection_status`, { credentials: 'include' }).then(r => r.json()),
            ]);
            if (supRes.success) { setSuppliers(supRes.data); setLastSync(supRes.last_sync); }
            else toast.error(supRes.message || 'Erreur de chargement des fournisseurs');
            if (connRes.success) setConnected(connRes.data.connected);
        } catch { toast.error('Erreur de chargement'); }
        setLoading(false);
    }, [toast]);

    useEffect(() => { load(); }, [load]);

    const handleSync = async () => {
        setSyncing(true);
        try {
            const res = await fetch(`${API_BASE}/supplier_emails_api.php?action=sync`, { method: 'POST', credentials: 'include' }).then(r => r.json());
            if (res.success) { toast.success(`Synchronisé — ${res.new_received} nouveau(x) mail(s)`); await load(); }
            else toast.error(res.message || 'Échec de la synchronisation');
        } catch { toast.error('Échec de la synchronisation'); }
        setSyncing(false);
    };

    const handleConnect = async () => {
        try {
            const res = await fetch(`${API_BASE}/supplier_emails_api.php?action=oauth_start`, { credentials: 'include' }).then(r => r.json());
            if (res.success) window.location.href = res.data.url;
            else toast.error(res.message || 'Connexion impossible');
        } catch { toast.error('Connexion impossible'); }
    };

    if (loading) return <div className="p-6 text-gray-400">Chargement…</div>;

    return (
        <div className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h2 className="text-xl font-bold flex items-center gap-2"><Mail size={22}/> Boîte Fournisseurs</h2>
                <div className="flex items-center gap-2">
                    {lastSync && <span className="text-xs text-gray-400">Dernière synchro : {new Date(lastSync + 'Z').toLocaleString('fr-FR')}</span>}
                    <button onClick={handleSync} disabled={syncing || !connected}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50">
                        <RefreshCw size={15} className={syncing ? 'animate-spin' : ''}/> Synchroniser
                    </button>
                    {user?.role === 'admin' && (
                        <button onClick={onOpenConfig} className="p-2 rounded-lg border hover:bg-gray-50" title="Configuration">
                            <Settings2 size={17}/>
                        </button>
                    )}
                </div>
            </div>

            {!connected && (
                <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-300 flex items-center justify-between">
                    <span className="text-sm text-amber-800 flex items-center gap-2"><AlertTriangle size={16}/> Boîte Outlook non connectée</span>
                    {['admin', 'gerant', 'administration'].includes(user?.role) && (
                        <button onClick={handleConnect} className="flex items-center gap-1 text-sm px-3 py-1 rounded bg-amber-600 text-white hover:bg-amber-700">
                            <Plug size={14}/> Connecter la boîte Outlook
                        </button>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {suppliers.map(s => (
                    <button key={s.id} onClick={() => onOpenSupplier(s)}
                        className="relative text-left p-4 rounded-xl border bg-white hover:shadow-md transition">
                        {s.overdue_count > 0 && (
                            <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full min-w-6 h-6 px-1.5 flex items-center justify-center">
                                {s.overdue_count}
                            </span>
                        )}
                        <p className="font-semibold">{s.name}</p>
                        <p className="text-xs text-gray-500 mt-1">
                            {s.pending_count} en attente de réponse{s.unread_count > 0 && ` · ${s.unread_count} non lu(s)`}
                        </p>
                    </button>
                ))}
                {suppliers.length === 0 && (
                    <p className="text-sm text-gray-400 col-span-full">Aucun fournisseur configuré. {user?.role === 'admin' ? 'Ajoutez-en via ⚙ Configuration.' : ''}</p>
                )}
            </div>
        </div>
    );
}
