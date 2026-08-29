import React, { useState, useEffect, useRef } from 'react';
import { BookMarked, FileText, Trash2, Eye, Download, Pencil, Check, X, Upload, Store, Briefcase } from 'lucide-react';
import { useToast, useConfirm } from './ToastProvider';

const API_BASE = import.meta.env.VITE_API_BASE || '/hello-gestion/php';

const CATEGORIES = [
    { value: 'magasin', label: 'Catalogue Magasin', icon: Store,     color: 'bg-blue-100 text-blue-700',   dot: 'bg-blue-500' },
    { value: 'pro',     label: 'Catalogue Pro',     icon: Briefcase, color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
];

const Catalogue = ({ user }) => {
    const toast   = useToast();
    const confirm = useConfirm();
    const [docs, setDocs]               = useState([]);
    const [loading, setLoading]         = useState(true);
    const [activeFilter, setActiveFilter] = useState('all');
    const [showForm, setShowForm]       = useState(false);
    const [form, setForm]               = useState({ name: '', category: 'magasin' });
    const [file, setFile]               = useState(null);
    const [uploading, setUploading]     = useState(false);
    const [renamingId, setRenamingId]   = useState(null);
    const [renameValue, setRenameValue] = useState('');
    const fileRef = useRef();

    const fetchDocs = async () => {
        setLoading(true);
        try {
            const res  = await fetch(`${API_BASE}/catalogue.php`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) setDocs(data.data);
        } catch { toast.error('Erreur chargement'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchDocs(); }, []);

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) { toast.error('Sélectionnez un fichier PDF'); return; }
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('name', form.name);
            fd.append('category', form.category);
            fd.append('file', file);
            const res  = await fetch(`${API_BASE}/catalogue.php`, { method: 'POST', body: fd, credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                toast.success('Document ajouté ✓');
                setShowForm(false);
                setForm({ name: '', category: 'magasin' });
                setFile(null);
                fetchDocs();
            } else toast.error(data.message || 'Erreur');
        } catch { toast.error('Erreur réseau'); }
        finally { setUploading(false); }
    };

    const handleDelete = async (id) => {
        if (!await confirm('Supprimer ce document du catalogue ?')) return;
        try {
            const res  = await fetch(`${API_BASE}/catalogue.php?id=${id}`, { method: 'DELETE', credentials: 'include' });
            const data = await res.json();
            if (data.success) { setDocs(d => d.filter(x => x.id !== id)); toast.success('Document supprimé'); }
            else toast.error(data.message || 'Erreur');
        } catch { toast.error('Erreur réseau'); }
    };

    const handleRename = async (id) => {
        const name = renameValue.trim();
        if (!name) { setRenamingId(null); return; }
        try {
            const res  = await fetch(`${API_BASE}/catalogue.php`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ id, name }),
            });
            const data = await res.json();
            if (data.success) {
                setDocs(ds => ds.map(d => d.id === id ? { ...d, name } : d));
                toast.success('Renommé ✓');
            } else toast.error(data.message || 'Erreur');
        } catch { toast.error('Erreur réseau'); }
        setRenamingId(null);
    };

    const filteredDocs = activeFilter === 'all' ? docs : docs.filter(d => d.category === activeFilter);

    const getCat = (value) => CATEGORIES.find(c => c.value === value);

    const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFB103]';

    const counts = {
        all:     docs.length,
        magasin: docs.filter(d => d.category === 'magasin').length,
        pro:     docs.filter(d => d.category === 'pro').length,
    };

    return (
        <div>
            {/* En-tête */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                    <BookMarked size={24} className="text-amber-700" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Catalogue</h2>
                    <p className="text-sm text-gray-500">Documents PDF partagés avec toute l'équipe</p>
                </div>
            </div>

            <div className="space-y-4">

                {/* Filtres + bouton ajout */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    {/* Onglets filtre */}
                    <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1">
                        <button
                            onClick={() => setActiveFilter('all')}
                            className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                                activeFilter === 'all'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            Tous
                            <span className="ml-1.5 text-xs text-gray-400 font-normal">{counts.all}</span>
                        </button>
                        {CATEGORIES.map(cat => {
                            const Icon = cat.icon;
                            return (
                                <button
                                    key={cat.value}
                                    onClick={() => setActiveFilter(cat.value)}
                                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                                        activeFilter === cat.value
                                            ? 'bg-white text-gray-900 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    <Icon size={13} />
                                    {cat.label}
                                    <span className="text-xs text-gray-400 font-normal">{counts[cat.value]}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Bouton ajout */}
                    <button onClick={() => {
                            if (!showForm) {
                                setForm({ name: '', category: activeFilter !== 'all' ? activeFilter : 'magasin' });
                                setFile(null);
                            }
                            setShowForm(!showForm);
                        }}
                        className="flex items-center gap-2 bg-[#FFB103] text-[#1a1a1a] px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#d49400] transition-colors">
                        <Upload size={15} /> Ajouter un PDF
                    </button>
                </div>

                {/* Formulaire d'ajout */}
                {showForm && (
                    <form onSubmit={handleUpload} className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Nom du document *</label>
                                <input className={inputCls} required value={form.name}
                                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder="Catalogue produits 2024…" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Type de catalogue *</label>
                                <select className={inputCls} value={form.category}
                                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                                    {CATEGORIES.map(c => (
                                        <option key={c.value} value={c.value}>{c.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Fichier PDF *</label>
                            <input ref={fileRef} type="file" accept=".pdf,application/pdf" className="hidden"
                                onChange={e => {
                                    const f = e.target.files[0] || null;
                                    setFile(f);
                                    if (f && !form.name) {
                                        setForm(prev => ({ ...prev, name: f.name.replace(/\.[^/.]+$/, '') }));
                                    }
                                }} />
                            <button type="button" onClick={() => fileRef.current.click()}
                                className="w-full border-2 border-dashed border-[#FFB103]/50 rounded-lg py-3 text-sm text-amber-700 hover:border-[#FFB103] transition-colors">
                                {file ? `✓ ${file.name}` : '+ Sélectionner un fichier PDF'}
                            </button>
                        </div>
                        <div className="flex gap-3">
                            <button type="button" onClick={() => { setShowForm(false); setFile(null); setForm({ name: '', category: 'magasin' }); }}
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

                {/* Liste */}
                {loading ? (
                    <div className="py-10 text-center text-gray-400 text-sm">Chargement…</div>
                ) : filteredDocs.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                        <BookMarked size={40} className="mx-auto mb-3 opacity-30" />
                        <p className="text-sm">Aucun document{activeFilter !== 'all' ? ` dans ce catalogue` : ''}</p>
                        <p className="text-xs mt-1">Ajoutez votre premier PDF ci-dessus</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filteredDocs.map(doc => {
                            const cat = getCat(doc.category);
                            return (
                                <div key={doc.id} className="bg-white rounded-xl border border-gray-100 shadow-sm flex items-center gap-3 px-4 py-3">
                                    {/* Icône PDF */}
                                    <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <FileText size={18} className="text-red-500" />
                                    </div>

                                    {/* Mode renommage */}
                                    {renamingId === doc.id ? (
                                        <div className="flex-1 flex items-center gap-2 min-w-0">
                                            <input
                                                className="flex-1 border border-[#FFB103]/50 rounded-lg px-2.5 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFB103]"
                                                value={renameValue}
                                                onChange={e => setRenameValue(e.target.value)}
                                                onKeyDown={e => { if (e.key === 'Enter') handleRename(doc.id); if (e.key === 'Escape') setRenamingId(null); }}
                                                autoFocus
                                            />
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
                                        /* Infos document */
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <p className="font-medium text-gray-800 truncate">{doc.name}</p>
                                                {cat && (
                                                    <span className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${cat.color}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full mr-1 ${cat.dot}`} />
                                                        {cat.label}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                PDF{doc.file_size ? ` · ${doc.file_size}` : ''}
                                                {' · '}{new Date(doc.created_at).toLocaleDateString('fr-FR')}
                                                {doc.uploaded_by_name && ` · Ajouté par ${doc.uploaded_by_name}`}
                                            </p>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    {renamingId !== doc.id && (
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            <a href={`/hello-gestion/php/${doc.file_path}`} target="_blank" rel="noopener noreferrer"
                                                className="p-1.5 text-amber-700 hover:bg-amber-50 rounded-lg" title="Ouvrir">
                                                <Eye size={16} />
                                            </a>
                                            <a href={`/hello-gestion/php/${doc.file_path}`} download={doc.name || true}
                                                className="p-1.5 text-gray-500 hover:bg-gray-50 rounded-lg" title="Télécharger">
                                                <Download size={16} />
                                            </a>
                                            <button onClick={() => { setRenamingId(doc.id); setRenameValue(doc.name || ''); }}
                                                className="p-1.5 text-gray-400 hover:text-amber-700 hover:bg-amber-50 rounded-lg" title="Renommer">
                                                <Pencil size={15} />
                                            </button>
                                            <button onClick={() => handleDelete(doc.id)}
                                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg" title="Supprimer">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Catalogue;
