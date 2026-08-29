import React, { useState, useEffect, useRef } from 'react';
import {
    FolderOpen, FileText, ClipboardList, Receipt, Calculator,
    Plus, Trash2, Eye, AlertCircle, Info, Bell, Upload, X, Download, Pencil, Check, Users
} from 'lucide-react';
import { useToast, useConfirm } from './ToastProvider';
import ExpenseReports from './ExpenseReports';
import CommissionCalculator from './CommissionCalculator';

const API_BASE = import.meta.env.VITE_API_BASE || '/hello-gestion/php';

const DOC_CATEGORIES = [
    { value: 'contracts',  label: 'Contrat' },
    { value: 'payslips',   label: 'Fiche de paie' },
    { value: 'admin',      label: 'Administratif' },
    { value: 'attestation', label: 'Attestation' },
    { value: 'autre',      label: 'Autre' },
];

const SUIVI_CATEGORIES = [
    { value: 'note',   label: 'Note',   icon: FileText, color: 'bg-blue-100 text-blue-700' },
    { value: 'alerte', label: 'Alerte', icon: Bell,     color: 'bg-yellow-100 text-yellow-700' },
    { value: 'info',   label: 'Info',   icon: Info,     color: 'bg-green-100 text-green-700' },
];

// ── Onglet Documents ───────────────────────────────────────

const DocumentsTab = ({ user, targetUserId }) => {
    const toast   = useToast();
    const confirm = useConfirm();
    const [docs, setDocs]       = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm]       = useState({ title: '', category: 'payslips', description: '' });
    const [file, setFile]       = useState(null);
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef();
    const [renamingId, setRenamingId]         = useState(null);
    const [renameValue, setRenameValue]       = useState('');
    const [renameCatValue, setRenameCatValue] = useState('');

    const fetchDocs = async () => {
        setLoading(true);
        try {
            const url = `${API_BASE}/casier_documents.php${targetUserId ? `?user_id=${targetUserId}` : ''}`;
            const res  = await fetch(url, { credentials: 'include' });
            const data = await res.json();
            if (data.success) setDocs(data.data);
        } catch { toast.error('Erreur chargement'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchDocs(); }, [targetUserId]);

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) { toast.error('Sélectionnez un fichier'); return; }
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('title', form.title);
            fd.append('category', form.category);
            fd.append('description', form.description);
            fd.append('file', file);
            if (targetUserId) fd.append('user_id', targetUserId);

            const res  = await fetch(`${API_BASE}/casier_documents.php`, { method: 'POST', body: fd, credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                toast.success('Document ajouté ✓');
                setShowForm(false);
                setForm({ title: '', category: 'payslips', description: '' });
                setFile(null);
                fetchDocs();
            } else toast.error(data.message || 'Erreur');
        } catch { toast.error('Erreur réseau'); }
        finally { setUploading(false); }
    };

    const handleDelete = async (id) => {
        if (!await confirm('Supprimer ce document ?')) return;
        try {
            const res  = await fetch(`${API_BASE}/casier_documents.php?id=${id}`, { method: 'DELETE', credentials: 'include' });
            const data = await res.json();
            if (data.success) { setDocs(d => d.filter(x => x.id !== id)); toast.success('Document supprimé'); }
            else toast.error(data.message || 'Erreur');
        } catch { toast.error('Erreur réseau'); }
    };

    const handleRename = async (id) => {
        const name = renameValue.trim();
        if (!name) { setRenamingId(null); return; }
        try {
            const res  = await fetch(`${API_BASE}/casier_documents.php`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ id, name, category: renameCatValue }),
            });
            const data = await res.json();
            if (data.success) {
                setDocs(ds => ds.map(d => d.id === id ? { ...d, name, title: name, category: renameCatValue } : d));
                toast.success('Modifié ✓');
            } else toast.error(data.message || 'Erreur');
        } catch { toast.error('Erreur réseau'); }
        setRenamingId(null);
    };

    const canUpload = ['admin', 'gerant', 'administration'].includes(user?.role);
    const canRename = canUpload || !targetUserId; // le propriétaire peut renommer ses propres documents
    const inputCls  = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFB103]';

    if (loading) return <div className="py-10 text-center text-gray-400 text-sm">Chargement…</div>;

    return (
        <div className="space-y-4">
            {canUpload && (
                <div className="flex justify-end">
                    <button onClick={() => setShowForm(!showForm)}
                        className="flex items-center gap-2 bg-[#FFB103] text-[#1a1a1a] px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#d49400] transition-colors">
                        <Upload size={15} /> Ajouter un document
                    </button>
                </div>
            )}

            {showForm && canUpload && (
                <form onSubmit={handleUpload} className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Titre *</label>
                            <input className={inputCls} required value={form.title}
                                onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Contrat de travail…" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Catégorie *</label>
                            <select className={inputCls} value={form.category}
                                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                                {DOC_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Fichier *</label>
                        <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden"
                            onChange={e => {
                                const f = e.target.files[0] || null;
                                setFile(f);
                                if (f) {
                                    const nameWithoutExt = f.name.replace(/\.[^/.]+$/, '');
                                    setForm(prev => ({ ...prev, title: prev.title || nameWithoutExt }));
                                }
                            }} />
                        <button type="button" onClick={() => fileRef.current.click()}
                            className="w-full border-2 border-dashed border-[#FFB103]/50 rounded-lg py-3 text-sm text-amber-700 hover:border-[#FFB103] transition-colors">
                            {file ? `✓ ${file.name}` : '+ Sélectionner un fichier (JPG/PNG/PDF)'}
                        </button>
                    </div>
                    <div className="flex gap-3">
                        <button type="button" onClick={() => setShowForm(false)}
                            className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
                            Annuler
                        </button>
                        <button type="submit" disabled={uploading}
                            className="flex-1 py-2 bg-[#FFB103] text-[#1a1a1a] rounded-lg text-sm font-semibold hover:bg-[#d49400] disabled:opacity-50">
                            {uploading ? 'Upload…' : 'Enregistrer'}
                        </button>
                    </div>
                </form>
            )}

            {docs.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                    <FolderOpen size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Aucun document dans ce casier</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {docs.map(doc => (
                        <div key={doc.id} className="bg-white rounded-xl border border-gray-100 shadow-sm flex items-center gap-3 px-4 py-3">
                            <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <FileText size={18} className="text-amber-700" />
                            </div>

                            {renamingId === doc.id ? (
                                <div className="flex-1 flex items-center gap-2 min-w-0 flex-wrap">
                                    <input
                                        className="flex-1 min-w-0 border border-[#FFB103]/50 rounded-lg px-2.5 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFB103]"
                                        value={renameValue}
                                        onChange={e => setRenameValue(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') handleRename(doc.id); if (e.key === 'Escape') setRenamingId(null); }}
                                        autoFocus
                                    />
                                    <select
                                        className="border border-[#FFB103]/50 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFB103] bg-white"
                                        value={renameCatValue}
                                        onChange={e => setRenameCatValue(e.target.value)}
                                    >
                                        {DOC_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                    </select>
                                    <button onClick={() => handleRename(doc.id)}
                                        className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg" title="Valider">
                                        <Check size={15} />
                                    </button>
                                    <button onClick={() => setRenamingId(null)}
                                        className="p-1.5 text-gray-400 hover:bg-gray-50 rounded-lg" title="Annuler">
                                        <X size={15} />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-800 truncate">{doc.title || doc.name}</p>
                                    <p className="text-xs text-gray-400">
                                        {DOC_CATEGORIES.find(c => c.value === doc.category)?.label || doc.category}
                                        {' · '}{new Date(doc.created_at).toLocaleDateString('fr-FR')}
                                        {doc.uploaded_by_name && ` · Ajouté par ${doc.uploaded_by_name}`}
                                    </p>
                                </div>
                            )}

                            <div className="flex items-center gap-1 flex-shrink-0">
                                <a href={`/hello-gestion/php/${doc.file_path}`} target="_blank" rel="noopener noreferrer"
                                    className="p-1.5 text-amber-700 hover:bg-amber-50 rounded-lg" title="Ouvrir">
                                    <Eye size={16} />
                                </a>
                                <a href={`/hello-gestion/php/${doc.file_path}`} download={doc.title || doc.name || true}
                                    className="p-1.5 text-gray-500 hover:bg-gray-50 rounded-lg" title="Télécharger">
                                    <Download size={16} />
                                </a>
                                {canRename && renamingId !== doc.id && (
                                    <button onClick={() => { setRenamingId(doc.id); setRenameValue(doc.title || doc.name || ''); setRenameCatValue(doc.category || 'payslips'); }}
                                        className="p-1.5 text-gray-400 hover:text-amber-700 hover:bg-amber-50 rounded-lg" title="Renommer">
                                        <Pencil size={15} />
                                    </button>
                                )}
                                {canUpload && (
                                    <button onClick={() => handleDelete(doc.id)}
                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg" title="Supprimer">
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ── Onglet Suivi Administratif ─────────────────────────────

const SuiviTab = ({ user, targetUserId }) => {
    const toast   = useToast();
    const confirm = useConfirm();
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ title: '', content: '', category: 'note' });
    const [saving, setSaving] = useState(false);

    const canCreate = ['admin', 'gerant', 'administration'].includes(user?.role);

    const fetchEntries = async () => {
        setLoading(true);
        try {
            const url = `${API_BASE}/casier_suivi.php${targetUserId ? `?user_id=${targetUserId}` : ''}`;
            const res  = await fetch(url, { credentials: 'include' });
            const data = await res.json();
            if (data.success) setEntries(data.data);
        } catch { toast.error('Erreur chargement'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchEntries(); }, [targetUserId]);

    const handleCreate = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res  = await fetch(`${API_BASE}/casier_suivi.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ ...form, user_id: targetUserId || user.id })
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Entrée créée ✓');
                setShowForm(false);
                setForm({ title: '', content: '', category: 'note' });
                fetchEntries();
            } else toast.error(data.message || 'Erreur');
        } catch { toast.error('Erreur réseau'); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        if (!await confirm('Supprimer cette entrée ?')) return;
        try {
            const res  = await fetch(`${API_BASE}/casier_suivi.php?id=${id}`, { method: 'DELETE', credentials: 'include' });
            const data = await res.json();
            if (data.success) { setEntries(e => e.filter(x => x.id !== id)); toast.success('Supprimé'); }
        } catch { toast.error('Erreur réseau'); }
    };

    const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFB103]';

    if (loading) return <div className="py-10 text-center text-gray-400 text-sm">Chargement…</div>;

    return (
        <div className="space-y-4">
            {canCreate && (
                <div className="flex justify-end">
                    <button onClick={() => setShowForm(!showForm)}
                        className="flex items-center gap-2 bg-[#FFB103] text-[#1a1a1a] px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#d49400] transition-colors">
                        <Plus size={15} /> Ajouter une entrée
                    </button>
                </div>
            )}

            {showForm && canCreate && (
                <form onSubmit={handleCreate} className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Titre *</label>
                            <input className={inputCls} required value={form.title}
                                onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                            <select className={inputCls} value={form.category}
                                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                                {SUIVI_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Contenu</label>
                        <textarea className={inputCls} rows={3} value={form.content}
                            onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
                    </div>
                    <div className="flex gap-3">
                        <button type="button" onClick={() => setShowForm(false)}
                            className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Annuler</button>
                        <button type="submit" disabled={saving}
                            className="flex-1 py-2 bg-[#FFB103] text-[#1a1a1a] rounded-lg text-sm font-semibold disabled:opacity-50">
                            {saving ? 'Enregistrement…' : 'Créer'}
                        </button>
                    </div>
                </form>
            )}

            {entries.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                    <ClipboardList size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Aucun suivi administratif</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {entries.map(entry => {
                        const cat = SUIVI_CATEGORIES.find(c => c.value === entry.category) || SUIVI_CATEGORIES[0];
                        const Icon = cat.icon;
                        return (
                            <div key={entry.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3">
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cat.color}`}>
                                            <Icon size={11} /> {cat.label}
                                        </span>
                                        <div>
                                            <p className="font-medium text-gray-800">{entry.title}</p>
                                            {entry.content && <p className="text-sm text-gray-500 mt-1">{entry.content}</p>}
                                            <p className="text-xs text-gray-400 mt-1.5">
                                                {entry.created_by_name} · {new Date(entry.created_at).toLocaleDateString('fr-FR')}
                                            </p>
                                        </div>
                                    </div>
                                    {canCreate && (
                                        <button onClick={() => handleDelete(entry.id)}
                                            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg flex-shrink-0">
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

// ── Onglet Clients (chef d'équipe) ────────────────────────

const ClientsTab = ({ user, targetUserId }) => {
    const toast   = useToast();
    const confirm = useConfirm();
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ client_name: '', signature_date: '' });
    const [saving, setSaving] = useState(false);

    const canManage = ['admin', 'gerant', 'administration', 'chef_equipe'].includes(user?.role);
    const inputCls  = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFB103]';

    const fetchClients = async () => {
        setLoading(true);
        try {
            const url = `${API_BASE}/casier_clients.php${targetUserId ? `?user_id=${targetUserId}` : ''}`;
            const res  = await fetch(url, { credentials: 'include' });
            const data = await res.json();
            if (data.success) setClients(data.data);
        } catch { toast.error('Erreur chargement'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchClients(); }, [targetUserId]);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!form.client_name.trim()) { toast.error('Nom du client requis'); return; }
        setSaving(true);
        try {
            const res  = await fetch(`${API_BASE}/casier_clients.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    ...form,
                    signature_date: form.signature_date || null,
                    user_id: targetUserId,
                }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Client ajouté ✓');
                setShowForm(false);
                setForm({ client_name: '', signature_date: '' });
                fetchClients();
            } else toast.error(data.message || 'Erreur');
        } catch { toast.error('Erreur réseau'); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        if (!await confirm('Supprimer ce client ?')) return;
        try {
            const res  = await fetch(`${API_BASE}/casier_clients.php?id=${id}`, { method: 'DELETE', credentials: 'include' });
            const data = await res.json();
            if (data.success) { setClients(c => c.filter(x => x.id !== id)); toast.success('Client supprimé'); }
            else toast.error(data.message || 'Erreur');
        } catch { toast.error('Erreur réseau'); }
    };

    if (loading) return <div className="py-10 text-center text-gray-400 text-sm">Chargement…</div>;

    return (
        <div className="space-y-4">
            {canManage && (
                <div className="flex justify-end">
                    <button onClick={() => setShowForm(!showForm)}
                        className="flex items-center gap-2 bg-[#FFB103] text-[#1a1a1a] px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#d49400] transition-colors">
                        <Plus size={15} /> Ajouter un client
                    </button>
                </div>
            )}

            {showForm && canManage && (
                <form onSubmit={handleCreate} className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Nom du client *</label>
                            <input className={inputCls} required value={form.client_name}
                                onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))}
                                placeholder="Dupont Jean…" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Date de signature</label>
                            <input type="date" className={inputCls} value={form.signature_date}
                                onChange={e => setForm(f => ({ ...f, signature_date: e.target.value }))} />
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button type="button" onClick={() => setShowForm(false)}
                            className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Annuler</button>
                        <button type="submit" disabled={saving}
                            className="flex-1 py-2 bg-[#FFB103] text-[#1a1a1a] rounded-lg text-sm font-semibold disabled:opacity-50">
                            {saving ? 'Enregistrement…' : 'Ajouter'}
                        </button>
                    </div>
                </form>
            )}

            {clients.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                    <Users size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Aucun client enregistré</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {clients.map(client => (
                        <div key={client.id} className="bg-white rounded-xl border border-gray-100 shadow-sm flex items-center gap-3 px-4 py-3">
                            <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Users size={18} className="text-amber-700" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-800 truncate">{client.client_name}</p>
                                <p className="text-xs text-gray-400">
                                    {client.signature_date
                                        ? `Signé le ${new Date(client.signature_date).toLocaleDateString('fr-FR')}`
                                        : 'Pas de date de signature'}
                                    {client.created_by_name && ` · Ajouté par ${client.created_by_name}`}
                                </p>
                            </div>
                            {canManage && (
                                <button onClick={() => handleDelete(client.id)}
                                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg flex-shrink-0">
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ── Composant principal Casier ─────────────────────────────

const TABS_CONFIG = [
    { id: 'documents', label: 'Documents',           icon: FolderOpen,     targetRoles: null },
    { id: 'suivi',     label: 'Suivi Administratif', icon: ClipboardList,  targetRoles: null },
    { id: 'frais',     label: 'Notes de frais',      icon: Receipt,        targetRoles: null },
    { id: 'commission',label: 'Commission',           icon: Calculator,     targetRoles: ['commercial'] },
    { id: 'clients',   label: 'Clients',              icon: Users,          targetRoles: ['chef_equipe'] },
];

/**
 * Casier — espace personnel d'un utilisateur.
 * @param user          L'utilisateur connecté
 * @param targetUserId  Si défini, affiche le casier d'un autre utilisateur (Admin/Administration/Gérant)
 * @param targetUserRole Rôle de l'utilisateur cible (pour filtrer les onglets)
 */
const Casier = ({ user, targetUserId = null, targetUserRole = null }) => {
    const [activeTab, setActiveTab] = useState('documents');

    // Le rôle effectif pour filtrer les onglets : celui de la cible si on consulte un autre casier
    const effectiveRole = targetUserRole || user?.role;

    const availableTabs = TABS_CONFIG.filter(t =>
        !t.targetRoles || t.targetRoles.includes(effectiveRole)
    );

    // Réinitialiser l'onglet si la cible change
    React.useEffect(() => {
        setActiveTab('documents');
    }, [targetUserId]);

    return (
        <div>
            {/* ── En-tête casier (uniquement quand c'est son propre casier) ── */}
            {!targetUserId && (
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                        <FolderOpen size={24} className="text-amber-700" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Mon Casier</h2>
                        <p className="text-sm text-gray-500">{user?.name || user?.email}</p>
                    </div>
                </div>
            )}

            {/* ── Tabs internes ── */}
            <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
                {availableTabs.map(tab => {
                    const Icon = tab.icon;
                    const active = activeTab === tab.id;
                    return (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${
                                active
                                    ? 'text-[#FFB103] border-[#FFB103]'
                                    : 'text-gray-500 border-transparent hover:text-gray-800'
                            }`}>
                            <Icon size={16} /> {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* ── Contenu ── */}
            {activeTab === 'documents'  && <DocumentsTab        user={user} targetUserId={targetUserId} />}
            {activeTab === 'suivi'      && <SuiviTab            user={user} targetUserId={targetUserId} />}
            {activeTab === 'frais'      && <ExpenseReports      user={user} targetUserId={targetUserId} />}
            {activeTab === 'commission' && <CommissionCalculator user={user} targetUserId={targetUserId} />}
            {activeTab === 'clients'    && <ClientsTab          user={user} targetUserId={targetUserId} />}
        </div>
    );
};

export default Casier;
