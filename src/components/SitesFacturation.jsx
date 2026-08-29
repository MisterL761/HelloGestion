import React, { useState, useEffect } from 'react';
import { Plus, ExternalLink, Pencil, Trash2, X, Globe, User, FileText, CreditCard, Copy, Check } from 'lucide-react';
import { useToast, useConfirm } from './ToastProvider';

const API_BASE = import.meta.env.VITE_API_BASE || '/hello-gestion/php';

const EMPTY_FORM = { nom: '', url: '', identifiant: '', notes: '' };

const SitesFacturation = ({ user }) => {
    const toast   = useToast();
    const confirm = useConfirm();

    const isAdmin = ['admin', 'gerant', 'administration'].includes(user?.role);

    const [sites,   setSites]   = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal,   setModal]   = useState(null); // null | 'add' | { ...site }
    const [form,    setForm]    = useState(EMPTY_FORM);
    const [saving,  setSaving]  = useState(false);
    const [copiedId, setCopiedId] = useState(null);

    const copyIdentifiant = (site) => {
        navigator.clipboard.writeText(site.identifiant).then(() => {
            setCopiedId(site.id);
            setTimeout(() => setCopiedId(null), 2000);
        });
    };

    const load = async () => {
        setLoading(true);
        try {
            const res  = await fetch(`${API_BASE}/sites_facturation_api.php`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) setSites(data.data);
        } catch { toast.error('Erreur de chargement'); }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const openAdd = () => { setForm(EMPTY_FORM); setModal('add'); };
    const openEdit = (site) => {
        setForm({ nom: site.nom, url: site.url, identifiant: site.identifiant || '', notes: site.notes || '' });
        setModal(site);
    };
    const closeModal = () => { setModal(null); setForm(EMPTY_FORM); };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const isEdit  = modal !== 'add';
            const payload = isEdit ? { ...form, id: modal.id } : form;
            const res  = await fetch(`${API_BASE}/sites_facturation_api.php`, {
                method:  isEdit ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (data.success) {
                toast.success(isEdit ? 'Site modifié' : 'Site ajouté');
                closeModal();
                await load();
            } else {
                toast.error(data.message || 'Erreur');
            }
        } catch { toast.error('Erreur réseau'); }
        finally { setSaving(false); }
    };

    const handleDelete = async (site) => {
        const ok = await confirm(`Supprimer "${site.nom}" ?`);
        if (!ok) return;
        try {
            const res  = await fetch(`${API_BASE}/sites_facturation_api.php`, {
                method:  'DELETE',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ id: site.id }),
            });
            const data = await res.json();
            if (data.success) { toast.success('Supprimé'); await load(); }
            else toast.error(data.message || 'Erreur');
        } catch { toast.error('Erreur réseau'); }
    };

    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

    const inputCls = 'w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFB103] bg-white';
    const labelCls = 'block text-xs font-semibold text-gray-500 mb-1';

    return (
        <div className="p-4 md:p-6 max-w-4xl mx-auto">

            {/* En-tête */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <CreditCard size={22} className="text-[#FFB103]" />
                        Sites de facturation
                    </h1>
                    <p className="text-sm text-gray-400 mt-0.5">Liens et identifiants de vos espaces de facturation</p>
                </div>
                {isAdmin && (
                    <button
                        onClick={openAdd}
                        className="flex items-center gap-2 px-4 py-2.5 bg-[#FFB103] text-[#1a1a1a] rounded-xl text-sm font-bold hover:bg-[#d49400] transition-colors shadow-sm"
                    >
                        <Plus size={16} /> Ajouter
                    </button>
                )}
            </div>

            {/* Contenu */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1,2,3].map(i => (
                        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
                            <div className="h-4 bg-gray-200 rounded w-2/3 mb-3" />
                            <div className="h-3 bg-gray-100 rounded w-full mb-2" />
                            <div className="h-3 bg-gray-100 rounded w-1/2" />
                        </div>
                    ))}
                </div>
            ) : sites.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                        <CreditCard size={28} className="text-gray-300" />
                    </div>
                    <p className="text-gray-500 font-medium">Aucun site enregistré</p>
                    {isAdmin && (
                        <p className="text-sm text-gray-400 mt-1">Cliquez sur <strong>Ajouter</strong> pour commencer</p>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sites.map(site => (
                        <div key={site.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                            <div className="p-5 flex-1">
                                {/* Nom */}
                                <div className="flex items-start justify-between gap-2 mb-3">
                                    <h3 className="font-bold text-gray-900 text-base leading-tight">{site.nom}</h3>
                                    {isAdmin && (
                                        <div className="flex gap-1 shrink-0">
                                            <button onClick={() => openEdit(site)}
                                                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
                                                <Pencil size={13} />
                                            </button>
                                            <button onClick={() => handleDelete(site)}
                                                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Identifiant */}
                                {site.identifiant && (
                                    <div className="flex items-center gap-2 mb-2">
                                        <User size={13} className="text-gray-400 shrink-0" />
                                        <span className="truncate font-mono text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 flex-1">{site.identifiant}</span>
                                        <button
                                            onClick={() => copyIdentifiant(site)}
                                            className={`shrink-0 w-7 h-7 flex items-center justify-center rounded-lg border transition-colors ${
                                                copiedId === site.id
                                                    ? 'bg-green-50 border-green-200 text-green-600'
                                                    : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100 hover:text-gray-700'
                                            }`}
                                            title="Copier l'identifiant"
                                        >
                                            {copiedId === site.id ? <Check size={12} /> : <Copy size={12} />}
                                        </button>
                                    </div>
                                )}

                                {/* Notes */}
                                {site.notes && (
                                    <div className="flex items-start gap-2 mt-2 text-xs text-gray-400">
                                        <FileText size={12} className="shrink-0 mt-0.5" />
                                        <span className="line-clamp-2">{site.notes}</span>
                                    </div>
                                )}
                            </div>

                            {/* Lien facturation */}
                            <div className="px-5 pb-4">
                                <a
                                    href={site.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#1a1a1a] hover:bg-[#333] text-white rounded-xl text-sm font-semibold transition-colors"
                                >
                                    <Globe size={14} />
                                    Accéder à la facturation
                                    <ExternalLink size={12} className="opacity-60" />
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal Ajouter / Modifier */}
            {modal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
                    <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">

                        <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
                            <div className="w-10 h-1 bg-gray-300 rounded-full" />
                        </div>

                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
                            <h3 className="text-base font-bold text-gray-900">
                                {modal === 'add' ? 'Ajouter un site' : `Modifier : ${modal.nom}`}
                            </h3>
                            <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
                            <div>
                                <label className={labelCls}>Nom du service *</label>
                                <input
                                    className={inputCls}
                                    value={form.nom}
                                    onChange={e => set('nom', e.target.value)}
                                    placeholder="Ex : ChatGPT, CapCut, Adobe…"
                                    required
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className={labelCls}><Globe size={11} className="inline mr-1" />URL de l'espace facturation *</label>
                                <input
                                    className={inputCls}
                                    value={form.url}
                                    onChange={e => set('url', e.target.value)}
                                    placeholder="https://..."
                                    type="url"
                                    required
                                />
                            </div>

                            <div>
                                <label className={labelCls}><User size={11} className="inline mr-1" />Email / Identifiant de connexion</label>
                                <input
                                    className={inputCls}
                                    value={form.identifiant}
                                    onChange={e => set('identifiant', e.target.value)}
                                    placeholder="email@exemple.fr ou nom d'utilisateur"
                                />
                            </div>

                            <div>
                                <label className={labelCls}><FileText size={11} className="inline mr-1" />Notes <span className="text-gray-400 font-normal">(optionnel)</span></label>
                                <textarea
                                    className={inputCls + ' resize-none'}
                                    rows={3}
                                    value={form.notes}
                                    onChange={e => set('notes', e.target.value)}
                                    placeholder="Informations supplémentaires…"
                                />
                            </div>

                            <div className="flex gap-3 pt-1 pb-2">
                                <button type="button" onClick={closeModal}
                                    className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">
                                    Annuler
                                </button>
                                <button type="submit" disabled={saving}
                                    className="flex-1 py-2.5 bg-[#FFB103] text-[#1a1a1a] rounded-xl text-sm font-bold hover:bg-[#d49400] transition-colors disabled:opacity-50">
                                    {saving ? 'Enregistrement…' : modal === 'add' ? 'Ajouter' : 'Enregistrer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SitesFacturation;
