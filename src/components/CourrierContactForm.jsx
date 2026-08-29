import React, { useState } from 'react';
import { X, Loader2, Save } from 'lucide-react';
import { TYPES_CONTACT } from '../utils/courrierConstants';

const API_BASE = import.meta.env.VITE_API_BASE || '/hello-gestion/php';

const VIDE = {
    civilite: '', nom: '', prenom: '', societe: '', adresse: '',
    code_postal: '', ville: '', email: '', telephone: '', type: 'client', notes: '',
};

const CourrierContactForm = ({ contact, onClose, onSaved }) => {
    const [form, setForm]     = useState(contact ? { ...VIDE, ...contact } : VIDE);
    const [saving, setSaving] = useState(false);
    const [error, setError]   = useState('');

    const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

    const save = async () => {
        if (!form.nom.trim() && !form.societe.trim()) {
            setError('Renseignez au moins un nom ou une société.');
            return;
        }
        setSaving(true); setError('');
        try {
            const res = await fetch(`${API_BASE}/courrier_contacts_api.php`, {
                method: contact?.id ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(contact?.id ? { ...form, id: contact.id } : form),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.message || 'Erreur serveur');
            onSaved(data.data);
        } catch (e) {
            setError(e.message);
        } finally {
            setSaving(false);
        }
    };

    const input = 'w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#FFB103]';

    return (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-[#1a1a1a]">
                        {contact?.id ? "Modifier l'interlocuteur" : 'Nouvel interlocuteur'}
                    </h3>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                        <X size={18} />
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Civilité</label>
                        <select value={form.civilite} onChange={set('civilite')} className={input}>
                            <option value="">—</option>
                            <option value="M.">M.</option>
                            <option value="Mme">Mme</option>
                            <option value="Maître">Maître</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                        <select value={form.type} onChange={set('type')} className={input}>
                            {TYPES_CONTACT.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Prénom</label>
                        <input type="text" value={form.prenom} onChange={set('prenom')} className={input} />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Nom</label>
                        <input type="text" value={form.nom} onChange={set('nom')} className={input} />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Société</label>
                        <input type="text" value={form.societe} onChange={set('societe')} className={input} />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Adresse</label>
                        <input type="text" value={form.adresse} onChange={set('adresse')} className={input} />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Code postal</label>
                        <input type="text" value={form.code_postal} onChange={set('code_postal')} className={input} />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Ville</label>
                        <input type="text" value={form.ville} onChange={set('ville')} className={input} />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                        <input type="email" value={form.email} onChange={set('email')} className={input} />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Téléphone</label>
                        <input type="tel" value={form.telephone} onChange={set('telephone')} className={input} />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Notes internes</label>
                        <textarea value={form.notes} onChange={set('notes')} rows={3} className={input} />
                    </div>
                </div>

                {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

                <div className="flex justify-end gap-2 mt-4">
                    <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200">
                        Annuler
                    </button>
                    <button
                        onClick={save} disabled={saving}
                        className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold bg-[#FFB103] text-[#1a1a1a] hover:bg-[#d49400] disabled:opacity-50"
                    >
                        {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                        Enregistrer
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CourrierContactForm;
