import React, { useState } from 'react';
import { KeyRound, Eye, EyeOff, ShieldAlert } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || '/hello-gestion/php';

// Défini EN DEHORS pour éviter le remontage à chaque frappe
const PwdInput = ({ id, label, value, onChange, visible, onToggle }) => (
    <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
        <div className="relative">
            <input
                type={visible ? 'text' : 'password'}
                value={value}
                onChange={onChange}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFB103]"
                required
                autoComplete={id === 'current' ? 'current-password' : 'new-password'}
            />
            <button
                type="button"
                tabIndex={-1}
                onClick={onToggle}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
                {visible ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
        </div>
    </div>
);

const ForcePasswordChangeModal = ({ onSuccess }) => {
    const [form, setForm]       = useState({ current: '', next: '', confirm: '' });
    const [show, setShow]       = useState({ current: false, next: false, confirm: false });
    const [error, setError]     = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (form.next.length < 8) {
            setError('Le nouveau mot de passe doit faire au moins 8 caractères.');
            return;
        }
        if (form.next !== form.confirm) {
            setError('Les deux mots de passe ne correspondent pas.');
            return;
        }
        if (form.next === form.current) {
            setError('Le nouveau mot de passe doit être différent de l\'ancien.');
            return;
        }

        setLoading(true);
        try {
            const res  = await fetch(`${API_BASE}/profile.php?action=password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    current_password: form.current,
                    new_password:     form.next,
                    confirm_password: form.confirm,
                }),
            });
            const data = await res.json();
            if (data.success) {
                onSuccess();
            } else {
                setError(data.message || 'Erreur lors du changement de mot de passe.');
            }
        } catch {
            setError('Erreur réseau, réessaie.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1a1a1a]/90 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="bg-[#1a1a1a] px-6 py-6 text-center">
                    <div className="w-14 h-14 bg-[#FFB103] rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <ShieldAlert size={26} className="text-[#1a1a1a]" />
                    </div>
                    <h2 className="text-white font-black text-lg">Changement de mot de passe requis</h2>
                    <p className="text-white/60 text-xs mt-1">
                        Pour sécuriser ton compte, tu dois définir un nouveau mot de passe avant de continuer.
                    </p>
                </div>

                {/* Formulaire */}
                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-3">
                    <PwdInput
                        id="current"
                        label="Mot de passe actuel (reçu par email)"
                        value={form.current}
                        onChange={e => setForm(p => ({ ...p, current: e.target.value }))}
                        visible={show.current}
                        onToggle={() => setShow(p => ({ ...p, current: !p.current }))}
                    />
                    <PwdInput
                        id="next"
                        label="Nouveau mot de passe (min. 8 caractères)"
                        value={form.next}
                        onChange={e => setForm(p => ({ ...p, next: e.target.value }))}
                        visible={show.next}
                        onToggle={() => setShow(p => ({ ...p, next: !p.next }))}
                    />
                    <PwdInput
                        id="confirm"
                        label="Confirmer le nouveau mot de passe"
                        value={form.confirm}
                        onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))}
                        visible={show.confirm}
                        onToggle={() => setShow(p => ({ ...p, confirm: !p.confirm }))}
                    />

                    {error && (
                        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-[#FFB103] text-[#1a1a1a] rounded-xl font-bold text-sm hover:bg-[#d49400] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                    >
                        <KeyRound size={15} />
                        {loading ? 'Enregistrement…' : 'Enregistrer mon nouveau mot de passe'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ForcePasswordChangeModal;
