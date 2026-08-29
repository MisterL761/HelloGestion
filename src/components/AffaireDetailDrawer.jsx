import React, { useState, useRef, useEffect } from 'react';
import {
    X, Phone, Mail, MapPin, Share2, MessageSquare, Paperclip,
    FileImage, Euro, Eye, Pencil, Trash2, User, CheckCircle2
} from 'lucide-react';
import { useToast } from './ToastProvider';

const API_BASE = import.meta.env.VITE_API_BASE || '/hello-gestion/php';

const STATUSES = [
    { value: 'a_traiter',  label: 'À traiter',  dot: 'bg-amber-400',  badge: 'bg-amber-50  text-amber-700  border-amber-200'  },
    { value: 'en_cours',   label: 'En cours',   dot: 'bg-blue-500',   badge: 'bg-blue-50   text-blue-700   border-blue-200'   },
    { value: 'rdv_pris',   label: 'RDV pris',   dot: 'bg-violet-500', badge: 'bg-violet-50 text-violet-700 border-violet-200' },
    { value: 'accepte',    label: 'Accepté',    dot: 'bg-green-500',  badge: 'bg-green-50  text-green-700  border-green-200'  },
    { value: 'refuse',     label: 'Refusé',     dot: 'bg-red-500',    badge: 'bg-red-50    text-red-700    border-red-200'    },
    { value: 'sans_suite', label: 'Sans suite', dot: 'bg-gray-400',   badge: 'bg-gray-100  text-gray-500   border-gray-200'   },
];

const StatusBadge = ({ status }) => {
    const s = STATUSES.find(x => x.value === status) || STATUSES[0];
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${s.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
            {s.label}
        </span>
    );
};

const AffaireDetailDrawer = ({ affaire, isAdmin, isCollaborateur, onClose, onStatusChange, onEdit, onDelete, onRefresh }) => {
    const toast = useToast();

    const [inlineEdit, setInlineEdit]     = useState(null);
    const [inlineLoading, setInlineLoading] = useState(false);
    const inlineFileRef                   = useRef(null);
    const [a, setA]                       = useState(affaire);

    // Sync si l'affaire change depuis le parent (refresh)
    useEffect(() => { setA(affaire); }, [affaire]);

    // Scroll lock
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    // Enregistrer la vue à l'ouverture (collaborateur uniquement)
    useEffect(() => {
        if (!isCollaborateur) return;
        const fd = new FormData();
        fd.append('id', affaire.id);
        fetch(`${API_BASE}/affaires_api.php?track_view=1`, {
            method: 'POST', credentials: 'include', body: fd,
        }).catch(() => {});
    }, [affaire.id]);

    const startInline = (field) => {
        const value = field === 'observation' ? (a.observation_collaborateur || '') : (a.commission ?? '');
        setInlineEdit({ field, value });
    };

    const saveInline = async () => {
        if (!inlineEdit) return;
        setInlineLoading(true);
        try {
            const payload = { id: a.id, status: a.status };
            if (inlineEdit.field === 'observation') payload.observation_collaborateur = inlineEdit.value;
            if (inlineEdit.field === 'commission')  payload.commission = inlineEdit.value;
            const res  = await fetch(`${API_BASE}/affaires_api.php`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                credentials: 'include', body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (data.success) {
                const updated = {
                    ...a,
                    observation_collaborateur: inlineEdit.field === 'observation' ? inlineEdit.value : a.observation_collaborateur,
                    commission: inlineEdit.field === 'commission' ? inlineEdit.value : a.commission,
                };
                setA(updated);
                setInlineEdit(null);
                toast.success('Enregistré ✓');
                onRefresh();
            } else toast.error(data.message || 'Erreur');
        } catch { toast.error('Erreur réseau'); }
        finally { setInlineLoading(false); }
    };

    const handleStatusChange = async (newStatus) => {
        try {
            const res = await fetch(`${API_BASE}/affaires_api.php`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ ...a, status: newStatus }),
            });
            const data = await res.json();
            if (data.success) {
                setA(p => ({ ...p, status: newStatus }));
                onStatusChange(a.id, newStatus);
            } else toast.error(data.message || 'Erreur');
        } catch { toast.error('Erreur réseau'); }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const allowed = ['image/jpeg','image/png','image/gif','image/webp','application/pdf'];
        if (!allowed.includes(file.type)) { toast.error('Type non autorisé (image ou PDF)'); e.target.value = ''; return; }
        if (file.size > 10 * 1024 * 1024) { toast.error('Fichier trop volumineux (max 10 Mo)'); e.target.value = ''; return; }
        setInlineLoading(true);
        try {
            const fd = new FormData();
            fd.append('id', a.id);
            fd.append('attachment', file);
            const res  = await fetch(`${API_BASE}/affaires_api.php?upload_attachment=1`, {
                method: 'POST', credentials: 'include', body: fd,
            });
            const data = await res.json();
            if (data.success) {
                setA(p => ({ ...p, attachment: data.attachment }));
                toast.success('Fichier joint ✓');
                onRefresh();
            } else toast.error(data.message || 'Erreur upload');
        } catch { toast.error('Erreur réseau'); }
        finally { setInlineLoading(false); e.target.value = ''; }
    };

    const attachUrl = a.attachment ? `${API_BASE}/${a.attachment}` : null;
    const isPdf     = a.attachment?.endsWith('.pdf');

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50" onClick={onClose}>
            <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
                onClick={e => e.stopPropagation()}>

                {/* Poignée mobile */}
                <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
                    <div className="w-10 h-1 bg-gray-300 rounded-full" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
                    <div className="min-w-0 flex-1 pr-3">
                        <h3 className="text-base font-bold text-gray-900 truncate">{a.prenom} {a.nom}</h3>
                        <div className="mt-1">
                            <StatusBadge status={a.status} />
                        </div>
                    </div>
                    <button onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors shrink-0">
                        <X size={18} />
                    </button>
                </div>

                {/* Contenu scrollable */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

                    {/* Coordonnées */}
                    <div className="bg-gray-50 rounded-2xl p-4 space-y-2.5">
                        {a.telephone && (
                            <a href={`tel:${a.telephone}`} className="flex items-center gap-3 text-sm text-gray-700 hover:text-[#FFB103] transition-colors">
                                <Phone size={15} className="text-gray-400 shrink-0" /> {a.telephone}
                            </a>
                        )}
                        {a.email && (
                            <a href={`mailto:${a.email}`} className="flex items-center gap-3 text-sm text-gray-700 hover:text-[#FFB103] transition-colors">
                                <Mail size={15} className="text-gray-400 shrink-0" /> {a.email}
                            </a>
                        )}
                        {(a.adresse || a.ville) && (() => {
                            const query = [a.adresse, a.ville].filter(Boolean).join(', ');
                            const label = a.adresse ? `${a.adresse}${a.ville ? ', ' + a.ville : ''}` : a.ville;
                            return (
                                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`}
                                    target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-3 text-sm text-gray-700 hover:text-[#FFB103] transition-colors">
                                    <MapPin size={15} className="text-gray-400 shrink-0" /> {label}
                                </a>
                            );
                        })()}
                        {a.donne_par && (
                            <div className="flex items-center gap-3 text-sm">
                                <Share2 size={15} className="text-gray-400 shrink-0" />
                                <span className="text-amber-700 font-semibold">Donné par : {a.donne_par}</span>
                            </div>
                        )}
                    </div>

                    {/* Infos admin */}
                    {isAdmin && (
                        <div className="flex flex-wrap gap-2">
                            {a.assigned_to_name && (
                                <span className="flex items-center gap-1.5 text-xs bg-[#1a1a1a]/5 text-gray-600 px-3 py-1.5 rounded-xl font-semibold border border-gray-200">
                                    <User size={12} /> Assigné à : {a.assigned_to_name}
                                </span>
                            )}
                            {a.created_by_name && (
                                <span className="text-xs text-gray-400 px-3 py-1.5 rounded-xl border border-gray-100 bg-gray-50">
                                    par {a.created_by_name}
                                </span>
                            )}
                            {/* Badge vues */}
                            <div className="relative group">
                                <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border font-semibold cursor-default select-none ${
                                    a.views_total > 0 ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-gray-50 text-gray-400 border-gray-200'
                                }`}>
                                    <Eye size={12} /> {a.views_total || 0} vue{a.views_total > 1 ? 's' : ''}
                                </div>
                                {a.views_detail?.length > 0 && (
                                    <div className="absolute left-0 top-9 hidden group-hover:block z-30 bg-white border border-gray-200 rounded-xl shadow-xl p-3 min-w-[190px]">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Consultations</p>
                                        {a.views_detail.map((v, i) => (
                                            <div key={i} className="flex items-center justify-between gap-4 py-1.5 border-b border-gray-50 last:border-0">
                                                <span className="text-xs font-semibold text-gray-700 truncate">{v.name}</span>
                                                <span className="text-[11px] text-gray-400 shrink-0">{v.count}×</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Commission */}
                    {a.commission != null && a.commission !== '' && (
                        <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-2 text-sm font-bold text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-xl w-fit">
                                <Euro size={14} />
                                {parseFloat(a.commission).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                            </div>
                            {!!a.commission_payee && (
                                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-3 py-2 rounded-xl w-fit">
                                    <CheckCircle2 size={13} /> Commission payée
                                </div>
                            )}
                        </div>
                    )}

                    {/* Description */}
                    {a.description && (
                        <div className="bg-gray-50 rounded-2xl px-4 py-3 border border-gray-100">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Description</p>
                            <p className="text-sm text-gray-700 leading-relaxed">{a.description}</p>
                        </div>
                    )}

                    {/* Pièce jointe */}
                    {attachUrl && (
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Pièce jointe</p>
                            {isPdf ? (
                                <a href={attachUrl} target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-xl hover:bg-red-100 transition-colors font-semibold">
                                    <FileImage size={14} /> Voir le PDF
                                </a>
                            ) : (
                                <a href={attachUrl} target="_blank" rel="noopener noreferrer">
                                    <img src={attachUrl} alt="pièce jointe" className="max-h-48 rounded-xl border border-gray-100 object-cover w-full hover:opacity-90 transition-opacity cursor-zoom-in" />
                                </a>
                            )}
                        </div>
                    )}

                    {/* Observation collaborateur */}
                    {a.observation_collaborateur && !inlineEdit && (
                        <div className="bg-amber-50/60 border border-amber-100 rounded-2xl px-4 py-3">
                            <div className="flex items-center gap-1.5 font-bold text-amber-800 text-xs mb-1.5">
                                <MessageSquare size={12} /> Observation collaborateur
                            </div>
                            <p className="text-sm text-gray-700 leading-relaxed italic">{a.observation_collaborateur}</p>
                        </div>
                    )}

                    {/* Changement de statut */}
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Statut</p>
                        <div className="flex flex-wrap gap-1.5">
                            {STATUSES.map(s => (
                                <button key={s.value}
                                    onClick={() => handleStatusChange(s.value)}
                                    disabled={a.status === s.value}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                                        a.status === s.value
                                            ? s.badge + ' border-current cursor-default'
                                            : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                                    }`}>
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Formulaires inline collaborateur */}
                    {isCollaborateur && (
                        <div className="space-y-3">
                            {/* Inline observation */}
                            {inlineEdit?.field === 'observation' && (
                                <div className="space-y-2">
                                    <textarea autoFocus rows={3}
                                        className="w-full border border-amber-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none bg-amber-50/50"
                                        placeholder="Votre observation…"
                                        value={inlineEdit.value}
                                        onChange={e => setInlineEdit(p => ({ ...p, value: e.target.value }))}
                                    />
                                    <div className="flex gap-2">
                                        <button onClick={saveInline} disabled={inlineLoading}
                                            className="flex-1 py-2 bg-[#FFB103] text-[#1a1a1a] rounded-xl text-xs font-bold hover:bg-[#d49400] transition-colors disabled:opacity-50">
                                            {inlineLoading ? 'Enregistrement…' : 'Enregistrer'}
                                        </button>
                                        <button onClick={() => setInlineEdit(null)}
                                            className="px-4 py-2 border border-gray-200 text-gray-500 rounded-xl text-xs font-semibold hover:bg-gray-50">
                                            Annuler
                                        </button>
                                    </div>
                                </div>
                            )}
                            {/* Inline commission */}
                            {inlineEdit?.field === 'commission' && (
                                <div className="flex gap-2 items-center">
                                    <div className="relative flex-1">
                                        <input autoFocus type="number" min="0" step="0.01"
                                            className="w-full border border-green-300 rounded-xl px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-green-50/50"
                                            placeholder="0.00" value={inlineEdit.value}
                                            onChange={e => setInlineEdit(p => ({ ...p, value: e.target.value }))}
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
                                    </div>
                                    <button onClick={saveInline} disabled={inlineLoading}
                                        className="px-4 py-2 bg-[#FFB103] text-[#1a1a1a] rounded-xl text-xs font-bold hover:bg-[#d49400] disabled:opacity-50">
                                        {inlineLoading ? '…' : 'OK'}
                                    </button>
                                    <button onClick={() => setInlineEdit(null)}
                                        className="px-3 py-2 border border-gray-200 text-gray-500 rounded-xl text-xs font-semibold hover:bg-gray-50">✕</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer actions */}
                <div className="shrink-0 border-t border-gray-100 px-5 py-4 bg-gray-50/80 space-y-2">
                    {isCollaborateur && !inlineEdit && (
                        <div className="flex gap-2 flex-wrap">
                            <button onClick={() => onEdit(a)}
                                className="flex items-center gap-1.5 px-3 py-2.5 bg-[#1a1a1a] text-white rounded-xl text-xs font-bold hover:bg-[#333] transition-colors">
                                <Pencil size={12} /> Modifier
                            </button>
                            <button onClick={() => startInline('observation')}
                                className="flex items-center gap-1.5 px-3 py-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-semibold hover:bg-amber-100 transition-colors">
                                <MessageSquare size={12} />
                                {a.observation_collaborateur ? 'Observation' : 'Ajouter observation'}
                            </button>
                            <button onClick={() => inlineFileRef.current?.click()} disabled={inlineLoading}
                                className="flex items-center gap-1.5 px-3 py-2.5 bg-gray-100 border border-gray-200 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50">
                                <Paperclip size={12} />
                                {a.attachment ? 'Remplacer' : 'Joindre'}
                            </button>
                            <button onClick={() => startInline('commission')}
                                className="flex items-center gap-1.5 px-3 py-2.5 bg-green-50 border border-green-200 text-green-700 rounded-xl text-xs font-semibold hover:bg-green-100 transition-colors">
                                <Euro size={12} />
                                {a.commission ? `${parseFloat(a.commission).toLocaleString('fr-FR')} €` : 'Commission'}
                            </button>
                        </div>
                    )}
                    {isAdmin && (
                        <div className="flex gap-2">
                            <button onClick={() => { onEdit(a); onClose(); }}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#1a1a1a] text-white rounded-xl text-sm font-bold hover:bg-[#333] transition-colors">
                                <Pencil size={14} /> Modifier
                            </button>
                            <button onClick={() => { onDelete(a.id); onClose(); }}
                                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-100 transition-colors border border-red-200">
                                <Trash2 size={14} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Input fichier caché */}
                <input ref={inlineFileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileUpload} />
            </div>
        </div>
    );
};

export default AffaireDetailDrawer;
