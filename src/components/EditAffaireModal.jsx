import React, { useState, useEffect, useRef } from 'react';
import { X, User, Phone, Mail, MapPin, Building2, FileText, UserCheck, Share2, MessageSquare, Plus, Paperclip, FileImage, Trash2, Euro, Loader2, CheckCircle2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || '/hello-gestion/php';

const STATUSES = [
    { value: 'a_traiter', label: 'À traiter',  color: 'bg-amber-50  text-amber-700  border-amber-200'  },
    { value: 'en_cours',  label: 'En cours',   color: 'bg-blue-50   text-blue-700   border-blue-200'   },
    { value: 'accepte',   label: 'Accepté',    color: 'bg-green-50  text-green-700  border-green-200'  },
    { value: 'refuse',    label: 'Refusé',     color: 'bg-red-50    text-red-700    border-red-200'    },
];

const EditAffaireModal = ({ isOpen, onClose, affaire, onSave, isAdmin }) => {
    const [form, setForm] = useState({});
    const [collaborateurs, setCollaborateurs] = useState([]);
    const [donneParOptions, setDonneParOptions] = useState([
        { id: '1', name: 'Sébastien Petit' },
        { id: '2', name: 'Henrique Marques' }
    ]);
    const [loading, setLoading]               = useState(false);
    const [newFile, setNewFile]               = useState(null);
    const [newFilePreview, setNewFilePreview] = useState(null);
    const [removeAttachment, setRemoveAttachment] = useState(false);
    const fileInputRef = useRef(null);

    const [interlocuteurs, setInterlocuteurs] = useState([]);
    const [interlocuteursLoading, setInterlocuteursLoading] = useState(false);

    useEffect(() => {
        if (affaire) {
            setForm({ ...affaire });
            setNewFile(null);
            setNewFilePreview(null);
            setRemoveAttachment(false);
        }
    }, [affaire]);

    useEffect(() => {
        if (!form.assigned_to) {
            setInterlocuteurs([]);
            return;
        }
        setInterlocuteursLoading(true);
        fetch(`${API_BASE}/interlocuteurs_api.php?collaborateur_id=${form.assigned_to}`, { credentials: 'include' })
            .then(r => r.json())
            .then(d => {
                if (d.success) {
                    setInterlocuteurs(d.data || []);
                }
            })
            .catch(() => {})
            .finally(() => setInterlocuteursLoading(false));
    }, [form.assigned_to]);

    useEffect(() => {
        if (!isOpen) return;
        if (isAdmin) {
            fetch(`${API_BASE}/affaires_api.php?collaborateurs=1`, { credentials: 'include' })
                .then(r => r.json())
                .then(d => { if (d.success) setCollaborateurs(d.data); })
                .catch(() => {});
        }
        fetch(`${API_BASE}/affaires_api.php?donne_par_options=1`, { credentials: 'include' })
            .then(r => {
                if (!r.ok) throw new Error("HTTP error " + r.status);
                return r.json();
            })
            .then(d => {
                let list = (d.success && d.data && d.data.length > 0) ? [...d.data] : [
                    { id: '1', name: 'Sébastien Petit' },
                    { id: '2', name: 'Henrique Marques' }
                ];
                if (affaire && affaire.donne_par) {
                    const exists = list.some(o => o.name.toLowerCase() === affaire.donne_par.toLowerCase());
                    if (!exists) {
                        list.push({ id: 'temp-' + Date.now(), name: affaire.donne_par });
                    }
                }
                setDonneParOptions(list.sort((a, b) => a.name.localeCompare(b.name)));
            })
            .catch((err) => {
                console.warn("Utilisation des valeurs d'apporteurs par défaut :", err);
                let list = [
                    { id: '1', name: 'Sébastien Petit' },
                    { id: '2', name: 'Henrique Marques' }
                ];
                if (affaire && affaire.donne_par) {
                    const exists = list.some(o => o.name.toLowerCase() === affaire.donne_par.toLowerCase());
                    if (!exists) {
                        list.push({ id: 'temp-' + Date.now(), name: affaire.donne_par });
                    }
                }
                setDonneParOptions(list.sort((a, b) => a.name.localeCompare(b.name)));
            });
    }, [isOpen, isAdmin, affaire]);

    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

    const handleFileChange = (file) => {
        if (!file) return;
        const allowed = ['image/jpeg','image/png','image/gif','image/webp','application/pdf'];
        if (!allowed.includes(file.type)) { alert('Type non autorisé. Utilisez une image ou un PDF.'); return; }
        if (file.size > 10 * 1024 * 1024) { alert('Fichier trop volumineux (max 10 Mo).'); return; }
        setNewFile(file);
        setRemoveAttachment(false);
        setNewFilePreview(file.type.startsWith('image/') ? URL.createObjectURL(file) : 'pdf');
    };

    const handleClearNewFile = () => {
        if (newFilePreview && newFilePreview !== 'pdf') URL.revokeObjectURL(newFilePreview);
        setNewFile(null);
        setNewFilePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleAddDonneParOption = async () => {
        const name = prompt("Nom de l'apporteur d'affaire :");
        if (!name || !name.trim()) return;
        const trimmedName = name.trim();
        try {
            const res = await fetch(`${API_BASE}/affaires_api.php?donne_par_options=1`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ name: trimmedName })
            });
            const data = await res.json();
            if (data && data.success) {
                const newOpt = { id: data.id || Date.now(), name: trimmedName };
                setDonneParOptions(prev => {
                    const exists = prev.some(o => o.name.toLowerCase() === trimmedName.toLowerCase());
                    if (exists) return prev;
                    return [...prev, newOpt].sort((a, b) => a.name.localeCompare(b.name));
                });
                set('donne_par', trimmedName);
            } else {
                // Fallback local
                const newOpt = { id: Date.now(), name: trimmedName };
                setDonneParOptions(prev => {
                    const exists = prev.some(o => o.name.toLowerCase() === trimmedName.toLowerCase());
                    if (exists) return prev;
                    return [...prev, newOpt].sort((a, b) => a.name.localeCompare(b.name));
                });
                set('donne_par', trimmedName);
            }
        } catch (error) {
            console.error("Erreur ajout option", error);
            // Fallback local
            const newOpt = { id: Date.now(), name: trimmedName };
            setDonneParOptions(prev => {
                const exists = prev.some(o => o.name.toLowerCase() === trimmedName.toLowerCase());
                if (exists) return prev;
                return [...prev, newOpt].sort((a, b) => a.name.localeCompare(b.name));
            });
            set('donne_par', trimmedName);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        await onSave({ ...form, remove_attachment: removeAttachment || undefined }, newFile);
        setLoading(false);
        onClose();
    };

    if (!isOpen || !affaire) return null;

    const inputCls    = 'w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFB103] bg-white';
    const readonlyCls = 'w-full border border-gray-100 rounded-xl px-3 py-2.5 text-sm bg-gray-50 text-gray-500 cursor-not-allowed';
    const labelCls    = 'block text-xs font-semibold text-gray-500 mb-1';

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
            <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">

                <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
                    <div className="w-10 h-1 bg-gray-300 rounded-full" />
                </div>

                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
                    <div>
                        <h3 className="text-base font-bold text-gray-900">{affaire.prenom} {affaire.nom}</h3>
                        {!isAdmin && <p className="text-xs text-amber-600 mt-0.5">Tu peux uniquement modifier le statut et l'observation collaborateur</p>}
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

                    {/* Statut — modifiable par tous */}
                    <div>
                        <label className={labelCls}>Statut</label>
                        <div className="grid grid-cols-2 gap-2">
                            {STATUSES.map(s => (
                                <button
                                    key={s.value}
                                    type="button"
                                    onClick={() => set('status', s.value)}
                                    className={`py-2.5 px-3 rounded-xl border-2 text-sm font-semibold transition-all text-left flex items-center gap-2 ${
                                        form.status === s.value
                                            ? s.color + ' border-current'
                                            : 'border-gray-200 text-gray-500 hover:border-gray-300'
                                    }`}
                                >
                                    <div className={`w-2 h-2 rounded-full ${form.status === s.value ? 'bg-current' : 'bg-gray-300'}`} />
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Assignation — admin only */}
                    {isAdmin && (
                        <div>
                            <label className={labelCls}><UserCheck size={11} className="inline mr-1" />Assigné à</label>
                            <select value={form.assigned_to} onChange={e => setForm(p => ({ ...p, assigned_to: e.target.value, interlocuteur_id: '' }))} className={inputCls}>
                                {collaborateurs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    )}

                    {/* Interlocuteur — admin: select, collaborateur: lecture seule */}
                    {form.assigned_to && (interlocuteurs.length > 0 || interlocuteursLoading || form.interlocuteur_name) && (
                        <div>
                            <label className={labelCls}><User size={11} className="inline mr-1" />Interlocuteur</label>
                            {isAdmin ? (
                                interlocuteursLoading ? (
                                    <div className="text-xs text-gray-400 flex items-center gap-1.5 py-2">
                                        <Loader2 size={12} className="animate-spin text-[#FFB103]" /> Chargement des contacts…
                                    </div>
                                ) : (
                                    <select
                                        value={form.interlocuteur_id || ''}
                                        onChange={e => set('interlocuteur_id', e.target.value)}
                                        className={inputCls}
                                    >
                                        <option value="">— Toute l'entreprise (ou choix de l'interlocuteur) —</option>
                                        {interlocuteurs.map(i => (
                                            <option key={i.id} value={i.id}>
                                                {i.name} {i.role === 'patron' ? '(Patron / Copie)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                )
                            ) : (
                                <input className={readonlyCls} value={form.interlocuteur_name || '—'} readOnly />
                            )}
                        </div>
                    )}

                    {/* Coordonnées — admin: éditable, collaborateur: lecture seule */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelCls}><User size={11} className="inline mr-1" />Prénom</label>
                            {isAdmin
                                ? <input className={inputCls} value={form.prenom || ''} onChange={e => set('prenom', e.target.value)} required />
                                : <input className={readonlyCls} value={affaire.prenom} readOnly />
                            }
                        </div>
                        <div>
                            <label className={labelCls}>Nom</label>
                            {isAdmin
                                ? <input className={inputCls} value={form.nom || ''} onChange={e => set('nom', e.target.value)} required />
                                : <input className={readonlyCls} value={affaire.nom} readOnly />
                            }
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelCls}><Phone size={11} className="inline mr-1" />Téléphone</label>
                            {isAdmin
                                ? <input className={inputCls} value={form.telephone || ''} onChange={e => set('telephone', e.target.value)} type="tel" />
                                : <input className={readonlyCls} value={affaire.telephone || '—'} readOnly />
                            }
                        </div>
                        <div>
                            <label className={labelCls}><Mail size={11} className="inline mr-1" />Email</label>
                            {isAdmin
                                ? <input className={inputCls} value={form.email || ''} onChange={e => set('email', e.target.value)} type="email" />
                                : <input className={readonlyCls} value={affaire.email || '—'} readOnly />
                            }
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelCls}><MapPin size={11} className="inline mr-1" />Adresse</label>
                            {isAdmin
                                ? <input className={inputCls} value={form.adresse || ''} onChange={e => set('adresse', e.target.value)} />
                                : <input className={readonlyCls} value={affaire.adresse || '—'} readOnly />
                            }
                        </div>
                        <div>
                            <label className={labelCls}><Building2 size={11} className="inline mr-1" />Ville</label>
                            {isAdmin
                                ? <input className={inputCls} value={form.ville || ''} onChange={e => set('ville', e.target.value)} />
                                : <input className={readonlyCls} value={affaire.ville || '—'} readOnly />
                            }
                        </div>
                    </div>

                    {/* Affaire donnée par */}
                    <div>
                        <label className={labelCls}><Share2 size={11} className="inline mr-1" />Affaire donnée par</label>
                        {isAdmin
                            ? (
                                <div className="flex gap-2">
                                    <select
                                        value={form.donne_par || ''}
                                        onChange={e => set('donne_par', e.target.value)}
                                        className={inputCls}
                                    >
                                        <option value="">— Sélectionner —</option>
                                        {donneParOptions.map(opt => (
                                            <option key={opt.id} value={opt.name}>{opt.name}</option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={handleAddDonneParOption}
                                        className="px-3 bg-[#FFB103] text-[#1a1a1a] rounded-xl font-bold hover:bg-[#d49400] transition-colors shrink-0 flex items-center justify-center"
                                        title="Ajouter un apporteur"
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>
                              )
                            : <input className={readonlyCls} value={form.donne_par || '—'} readOnly />
                        }
                    </div>

                    {/* Observation collaborateur */}
                    <div>
                        <label className={labelCls}><MessageSquare size={11} className="inline mr-1" />Observation collaborateur</label>
                        {!isAdmin
                            ? <textarea
                                className={inputCls + ' resize-none'}
                                rows={3}
                                value={form.observation_collaborateur || ''}
                                onChange={e => set('observation_collaborateur', e.target.value)}
                                placeholder="Saisissez vos observations sur cette affaire..."
                              />
                            : <div className="text-sm text-gray-600 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100 min-h-[60px] italic">
                                {affaire.observation_collaborateur || "Aucune observation saisie par le collaborateur."}
                              </div>
                        }
                    </div>

                    {/* Commission */}
                    <div>
                        <label className={labelCls}><Euro size={11} className="inline mr-1" />Commission <span className="text-gray-400 font-normal">(€, optionnel)</span></label>
                        <div className="relative">
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                className={inputCls + ' pr-8'}
                                value={form.commission ?? ''}
                                onChange={e => set('commission', e.target.value)}
                                placeholder="0.00"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
                        </div>
                    </div>

                    {/* Commission payée — admin/gérant uniquement : archive l'affaire dans le dossier "Payé" */}
                    {isAdmin && (
                        <label className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={!!form.commission_payee}
                                onChange={e => set('commission_payee', e.target.checked)}
                                className="w-4 h-4 accent-emerald-600 shrink-0"
                            />
                            <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-emerald-800">Commission payée</p>
                                <p className="text-xs text-emerald-600">
                                    {form.commission_payee
                                        ? 'Affaire archivée dans le dossier « Payé »'
                                        : 'Une fois cochée, l\'affaire est archivée dans le dossier « Payé »'}
                                </p>
                            </div>
                        </label>
                    )}

                    {(isAdmin || affaire.description) && (
                        <div>
                            <label className={labelCls}><FileText size={11} className="inline mr-1" />Description</label>
                            {isAdmin
                                ? <textarea className={inputCls + ' resize-none'} rows={3} value={form.description || ''} onChange={e => set('description', e.target.value)} placeholder="Détails…" />
                                : <p className="text-sm text-gray-600 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100">{affaire.description || '—'}</p>
                            }
                        </div>
                    )}

                    {/* Pièce jointe */}
                    <div>
                        <label className={labelCls}><Paperclip size={11} className="inline mr-1" />Pièce jointe <span className="text-gray-400 font-normal">(photo ou PDF, max 10 Mo)</span></label>

                            {/* Fichier existant */}
                            {affaire.attachment && !removeAttachment && !newFilePreview && (() => {
                                const url = `${API_BASE}/${affaire.attachment}`;
                                const isPdf = affaire.attachment.endsWith('.pdf');
                                return (
                                    <div className="relative border border-gray-200 rounded-xl overflow-hidden mb-2">
                                        {isPdf ? (
                                            <div className="flex items-center gap-3 px-4 py-3 bg-red-50">
                                                <FileImage size={24} className="text-red-500 shrink-0" />
                                                <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-red-700 hover:underline truncate">Voir le PDF joint</a>
                                            </div>
                                        ) : (
                                            <a href={url} target="_blank" rel="noopener noreferrer">
                                                <img src={url} alt="pièce jointe" className="w-full max-h-36 object-cover" />
                                            </a>
                                        )}
                                        <button type="button" onClick={() => setRemoveAttachment(true)}
                                            className="absolute top-2 right-2 w-6 h-6 bg-white/90 rounded-full flex items-center justify-center text-red-500 hover:bg-white shadow-sm"
                                            title="Supprimer la pièce jointe">
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                );
                            })()}

                            {/* Marqué pour suppression */}
                            {removeAttachment && !newFilePreview && (
                                <div className="flex items-center justify-between text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-2">
                                    <span>Pièce jointe supprimée à l'enregistrement</span>
                                    <button type="button" onClick={() => setRemoveAttachment(false)} className="underline font-semibold">Annuler</button>
                                </div>
                            )}

                            {/* Bouton sélection + chip */}
                            <div className="flex items-center gap-2 flex-wrap">
                                {!newFilePreview && (
                                    <button type="button" onClick={() => fileInputRef.current?.click()}
                                        className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-500 hover:border-[#FFB103] hover:text-[#FFB103] transition-colors bg-white">
                                        <Paperclip size={13} />
                                        {affaire.attachment && !removeAttachment ? 'Remplacer' : 'Joindre une photo ou PDF'}
                                    </button>
                                )}
                                {newFilePreview && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-100 rounded-lg text-xs text-gray-700 font-medium max-w-[200px]">
                                        <FileImage size={12} className={newFile?.type === 'application/pdf' ? 'text-red-500' : 'text-blue-500'} />
                                        <span className="truncate">{newFile?.name}</span>
                                        <button type="button" onClick={handleClearNewFile} className="text-gray-400 hover:text-red-500 shrink-0 ml-0.5">
                                            <Trash2 size={11} />
                                        </button>
                                    </span>
                                )}
                            </div>
                            <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden"
                                onChange={e => handleFileChange(e.target.files[0])} />
                    </div>

                    <div className="flex gap-3 pt-1 pb-2">
                        <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">
                            Annuler
                        </button>
                        <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-[#FFB103] text-[#1a1a1a] rounded-xl text-sm font-bold hover:bg-[#d49400] transition-colors disabled:opacity-50">
                            {loading ? 'Enregistrement…' : 'Enregistrer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditAffaireModal;
