import React, { useState } from 'react';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || '/hello-gestion/php';

const ResetPasswordPage = ({ token, onDone }) => {
    const [password, setPassword]   = useState('');
    const [confirm, setConfirm]     = useState('');
    const [showPwd, setShowPwd]     = useState(false);
    const [showConf, setShowConf]   = useState(false);
    const [loading, setLoading]     = useState(false);
    const [error, setError]         = useState('');
    const [success, setSuccess]     = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (password.length < 8) { setError('Mot de passe trop court (min. 8 caractères).'); return; }
        if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return; }

        setLoading(true);
        try {
            const res  = await fetch(`${API_BASE}/password_reset.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'reset', token, password, confirm }),
            });
            const data = await res.json();
            if (data.success) {
                setSuccess(true);
                setTimeout(() => {
                    window.history.replaceState({}, '', window.location.pathname);
                    onDone();
                }, 2500);
            } else {
                setError(data.message || 'Lien invalide ou expiré.');
            }
        } catch {
            setError('Erreur réseau, réessaie.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-[#FFB103]/10 rounded-full blur-3xl pointer-events-none" />
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 md:p-8 relative z-10">

                <div className="text-center mb-6">
                    <img src={import.meta.env.BASE_URL + 'logoHelloGestion.ico'} alt="Hello Gestion" className="w-16 h-16 mx-auto mb-3 object-contain" />
                    <h1 className="text-2xl font-bold text-gray-800">Nouveau mot de passe</h1>
                    <p className="text-sm text-gray-500 mt-1">Choisissez un mot de passe sécurisé</p>
                </div>

                {success ? (
                    <div className="text-center py-6">
                        <CheckCircle size={48} className="text-green-500 mx-auto mb-3" />
                        <p className="font-bold text-gray-800">Mot de passe modifié !</p>
                        <p className="text-sm text-gray-500 mt-1">Redirection vers la connexion…</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                                <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nouveau mot de passe</label>
                            <div className="relative">
                                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type={showPwd ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFB103]"
                                    placeholder="Min. 8 caractères"
                                    required
                                    autoFocus
                                />
                                <button type="button" tabIndex={-1} onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                    {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirmer le mot de passe</label>
                            <div className="relative">
                                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type={showConf ? 'text' : 'password'}
                                    value={confirm}
                                    onChange={e => setConfirm(e.target.value)}
                                    className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFB103]"
                                    placeholder="Répétez le mot de passe"
                                    required
                                />
                                <button type="button" tabIndex={-1} onClick={() => setShowConf(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                    {showConf ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-[#FFB103] hover:bg-[#d49400] text-[#1a1a1a] font-bold rounded-xl transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Enregistrement…' : 'Enregistrer le nouveau mot de passe'}
                        </button>

                        <button type="button" onClick={onDone} className="w-full text-sm text-gray-400 hover:text-gray-600 transition-colors">
                            Retour à la connexion
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ResetPasswordPage;
