import React, { useState, useEffect, useRef } from 'react';
import { X, User, Phone, Mail, MapPin, Building2, FileText, UserCheck, Share2, MessageSquare, Plus, Paperclip, FileImage, Trash2, Loader2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || '/hello-gestion/php';

const AddAffaireModal = ({ isOpen, onClose, onAdd }) => {
    const [form, setForm] = useState({
        nom: '', prenom: '', telephone: '', email: '',
        adresse: '', ville: '', description: '', assigned_to: '',
        donne_par: '', observation_collaborateur: '', interlocuteur_id: ''
    });
    const [collaborateurs, setCollaborateurs] = useState([]);
    const [donneParOptions, setDonneParOptions] = useState([
        { id: '1', name: 'Sébastien Petit' },
        { id: '2', name: 'Henrique Marques' }
    ]);
    const [loading, setLoading] = useState(false);
    const [attachment, setAttachment] = useState(null);
    const [attachmentPreview, setAttachmentPreview] = useState(null);
    const fileInputRef = useRef(null);

    const [interlocuteurs, setInterlocuteurs] = useState([]);
    const [interlocuteursLoading, setInterlocuteursLoading] = useState(false);

    // --- NOUVEAU : États pour l'autocomplétion d'adresse ---
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        fetch(`${API_BASE}/affaires_api.php?collaborateurs=1`, { credentials: 'include' })
            .then(r => r.json())
            .then(d => { if (d.success) setCollaborateurs(d.data); })
            .catch(() => {});

        fetch(`${API_BASE}/affaires_api.php?donne_par_options=1`, { credentials: 'include' })
            .then(r => {
                if (!r.ok) throw new Error("HTTP error " + r.status);
                return r.json();
            })
            .then(d => {
                if (d.success && d.data && d.data.length > 0) {
                    setDonneParOptions(d.data);
                }
            })
            .catch((err) => {
                console.warn("Utilisation des valeurs d'apporteurs par défaut :", err);
            });
    }, [isOpen]);

    // --- NOUVEAU : Appel API Adresse Gouv avec Debounce ---
    useEffect(() => {
        if (!showSuggestions || !form.adresse || form.adresse.length < 3) {
            setSuggestions([]);
            return;
        }

        const delayDebounce = setTimeout(async () => {
            try {
                const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(form.adresse)}&limit=5`);
                const data = await res.json();
                if (data.features) {
                    setSuggestions(data.features);
                }
            } catch (error) {
                console.error("Erreur API Adresse", error);
            }
        }, 300);

        return () => clearTimeout(delayDebounce);
    }, [form.adresse, showSuggestions]);

    useEffect(() => {
        if (!form.assigned_to) {
            setInterlocuteurs([]);
            setForm(p => ({ ...p, interlocuteur_id: '' }));
            return;
        }
        setInterlocuteursLoading(true);
        setForm(p => ({ ...p, interlocuteur_id: '' }));
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

    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

    // --- NOUVEAU : Clic sur une suggestion d'adresse ---
    const handleSelectAdresse = (feature) => {
        setForm(p => ({
            ...p,
            adresse: feature.properties.name, // Juste la rue (ex: "12 rue de la Paix")
            ville: feature.properties.city    // La ville automatique (ex: "Paris")
        }));
        setSuggestions([]); // Ferme la liste
        setShowSuggestions(false);
    };

    const handleAdresseChange = (val) => {
        set('adresse', val);
        setShowSuggestions(true);
    };

    const handleFileChange = (file) => {
        if (!file) return;
        const allowed = ['image/jpeg','image/png','image/gif','image/webp','application/pdf'];
        if (!allowed.includes(file.type)) {
            alert('Type de fichier non autorisé. Utilisez une image (JPG, PNG, WEBP) ou un PDF.');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            alert('Fichier trop volumineux (maximum 10 Mo).');
            return;
        }
        setAttachment(file);
        if (file.type.startsWith('image/')) {
            setAttachmentPreview(URL.createObjectURL(file));
        } else {
            setAttachmentPreview('pdf');
        }
    };

    const handleRemoveAttachment = () => {
        if (attachmentPreview && attachmentPreview !== 'pdf') URL.revokeObjectURL(attachmentPreview);
        setAttachment(null);
        setAttachmentPreview(null);
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
        if (!form.nom || !form.prenom || !form.assigned_to) return;
        setLoading(true);
        await onAdd(form, attachment);
        setForm({
            nom: '', prenom: '', telephone: '', email: '',
            adresse: '', ville: '', description: '', assigned_to: '',
            donne_par: '', observation_collaborateur: ''
        });
        setSuggestions([]);
        handleRemoveAttachment();
        setLoading(false);
        onClose();
    };

    if (!isOpen) return null;

    const inputCls = 'w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFB103] bg-white';
    const labelCls = 'block text-xs font-semibold text-gray-500 mb-1';

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
            <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">

                {/* Handle mobile */}
                <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
                    <div className="w-10 h-1 bg-gray-300 rounded-full" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
                    <h3 className="text-base font-bold text-gray-900">Nouvelle affaire</h3>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Formulaire */}
                <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

                    {/* Assignation */}
                    <div>
                        <label className={labelCls}><UserCheck size={11} className="inline mr-1" />Envoyer à *</label>
                        <select
                            value={form.assigned_to}
                            onChange={e => set('assigned_to', e.target.value)}
                            className={inputCls}
                            required
                        >
                            <option value="">— Sélectionner un collaborateur —</option>
                            {collaborateurs.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        {collaborateurs.length === 0 && (
                            <p className="text-xs text-amber-600 mt-1">Aucun collaborateur trouvé. Crée d'abord un compte collaborateur dans les Paramètres.</p>
                        )}
                    </div>

                    {/* Interlocuteur (affiché uniquement si le collaborateur a des interlocuteurs définis ou chargement) */}
                    {form.assigned_to && (interlocuteurs.length > 0 || interlocuteursLoading) && (
                        <div>
                            <label className={labelCls}><User size={11} className="inline mr-1" />Attribuer à l'interlocuteur <span className="text-gray-400 font-normal">(optionnel)</span></label>
                            {interlocuteursLoading ? (
                                <div className="text-xs text-gray-400 flex items-center gap-1.5 py-2">
                                    <Loader2 size={12} className="animate-spin text-[#FFB103]" /> Chargement des contacts…
                                </div>
                            ) : (
                                <select
                                    value={form.interlocuteur_id}
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
                            )}
                        </div>
                    )}

                    {/* Nom / Prénom */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelCls}><User size={11} className="inline mr-1" />Prénom *</label>
                            <input className={inputCls} value={form.prenom} onChange={e => set('prenom', e.target.value)} placeholder="Jean" required />
                        </div>
                        <div>
                            <label className={labelCls}>Nom *</label>
                            <input className={inputCls} value={form.nom} onChange={e => set('nom', e.target.value)} placeholder="Dupont" required />
                        </div>
                    </div>

                    {/* Téléphone / Email */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelCls}><Phone size={11} className="inline mr-1" />Téléphone</label>
                            <input className={inputCls} value={form.telephone} onChange={e => set('telephone', e.target.value)} placeholder="06 00 00 00 00" type="tel" />
                        </div>
                        <div>
                            <label className={labelCls}><Mail size={11} className="inline mr-1" />Email</label>
                            <input className={inputCls} value={form.email} onChange={e => set('email', e.target.value)} placeholder="jean@email.fr" type="email" />
                        </div>
                    </div>

                    {/* Adresse / Ville */}
                    <div className="grid grid-cols-2 gap-3">
                        {/* Bloc Adresse avec sa liste déroulante relative */}
                        <div className="relative">
                            <label className={labelCls}><MapPin size={11} className="inline mr-1" />Adresse</label>
                            <input
                                className={inputCls}
                                value={form.adresse}
                                onChange={e => handleAdresseChange(e.target.value)}
                                onFocus={() => setShowSuggestions(true)}
                                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                placeholder="12 rue de la Paix"
                                autoComplete="off"
                            />

                            {/* --- NOUVEAU : Affichage des suggestions sous l'input --- */}
                            {showSuggestions && suggestions.length > 0 && (
                                <ul className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto z-50 text-xs divide-y divide-gray-100">
                                    {suggestions.map((sug) => (
                                        <li
                                            key={sug.properties.id}
                                            onClick={() => handleSelectAdresse(sug)}
                                            className="px-3 py-2.5 hover:bg-amber-50 cursor-pointer transition-colors text-gray-700"
                                        >
                                            {sug.properties.label}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div>
                            <label className={labelCls}><Building2 size={11} className="inline mr-1" />Ville</label>
                            <input className={inputCls} value={form.ville} onChange={e => set('ville', e.target.value)} placeholder="Paris" />
                        </div>
                    </div>

                    {/* Affaire donnée par */}
                    <div>
                        <label className={labelCls}><Share2 size={11} className="inline mr-1" />Affaire donnée par <span className="text-gray-400 font-normal">(optionnel)</span></label>
                        <div className="flex gap-2">
                            <select
                                value={form.donne_par}
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
                    </div>

                    {/* Description */}
                    <div>
                        <label className={labelCls}><FileText size={11} className="inline mr-1" />Description <span className="text-gray-400 font-normal">(optionnel)</span></label>
                        <textarea
                            className={inputCls + ' resize-none'}
                            rows={3}
                            value={form.description}
                            onChange={e => set('description', e.target.value)}
                            placeholder="Détails sur l'affaire…"
                        />
                    </div>

                    {/* Pièce jointe */}
                    <div>
                        <label className={labelCls}><Paperclip size={11} className="inline mr-1" />Pièce jointe <span className="text-gray-400 font-normal">(optionnel)</span></label>
                        <div className="flex items-center gap-2 flex-wrap">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-500 hover:border-[#FFB103] hover:text-[#FFB103] transition-colors bg-white"
                            >
                                <Paperclip size={13} />
                                {attachment ? 'Remplacer' : 'Joindre une photo ou PDF'}
                            </button>
                            {attachment && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-100 rounded-lg text-xs text-gray-700 font-medium max-w-[180px]">
                                    <FileImage size={12} className={attachment.type === 'application/pdf' ? 'text-red-500' : 'text-blue-500'} />
                                    <span className="truncate">{attachment.name}</span>
                                    <button type="button" onClick={handleRemoveAttachment} className="text-gray-400 hover:text-red-500 shrink-0 ml-0.5">
                                        <Trash2 size={11} />
                                    </button>
                                </span>
                            )}
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,application/pdf"
                            className="hidden"
                            onChange={e => handleFileChange(e.target.files[0])}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-1 pb-2">
                        <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !form.assigned_to}
                            className="flex-1 py-2.5 bg-[#FFB103] text-[#1a1a1a] rounded-xl text-sm font-bold hover:bg-[#d49400] transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Envoi…' : 'Envoyer le lead'}
                        </button>

                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddAffaireModal;