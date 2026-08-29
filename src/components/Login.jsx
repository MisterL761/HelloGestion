import React, { useState, useEffect, useRef } from 'react';
import { Lock, User, AlertCircle, Eye, EyeOff, Mail, CheckCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import { API_BASE } from '../utils/constants';

const API_RESET = import.meta.env.VITE_API_BASE || '/hello-gestion/php';

const Login = ({ onLoginSuccess }) => {
    const [view, setView]           = useState('login'); // 'login' | 'forgot' | 'forgot_sent'
    const [email, setEmail]         = useState('');
    const [password, setPassword]   = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError]         = useState('');
    const [loading, setLoading]     = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [countdown, setCountdown]     = useState(0);
    const timerRef = useRef(null);

    useEffect(() => {
        if (countdown <= 0) return;
        timerRef.current = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(timerRef.current);
    }, [countdown]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/auth.php?action=login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email, password })
            });
            const result = await response.json();
            if (result.success) {
                onLoginSuccess(result.data.user);
            } else {
                setError(result.message || 'Erreur de connexion');
            }
        } catch {
            setError('Erreur de connexion au serveur');
        } finally {
            setLoading(false);
        }
    };

    const handleForgot = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const response = await fetch(`${API_RESET}/password_reset.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'request', email: forgotEmail }),
            });
            const data = await response.json();
            if (data.success) {
                setView('forgot_sent');
                setCountdown(60);
            } else {
                setError(data.message || 'Impossible d\'envoyer l\'email de réinitialisation');
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
            <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[#FFB103]/5 rounded-full blur-3xl pointer-events-none" />
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 md:p-8 relative z-10">

                {/* ── VUE CONNEXION ── */}
                {view === 'login' && (
                    <>
                        <div className="text-center mb-6 md:mb-8">
                            <img src={import.meta.env.BASE_URL + 'logoHelloGestion.ico'} alt="Hello Gestion" className="w-20 h-20 md:w-24 md:h-24 mx-auto mb-3 md:mb-4 object-contain" />
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-1 md:mb-2">Hello Gestion</h1>
                            <p className="text-sm md:text-base text-gray-500">Connectez-vous à votre compte</p>
                        </div>

                        {error && (
                            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
                                <AlertCircle className="text-red-600 mr-3 flex-shrink-0 mt-0.5" size={20} />
                                <p className="text-sm text-red-800">{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Adresse e-mail</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                    <input
                                        type="email" value={email} onChange={e => setEmail(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFB103]"
                                        placeholder="votre@email.com" required autoFocus autoComplete="email"
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-medium text-gray-700">Mot de passe</label>
                                    <button
                                        type="button"
                                        onClick={() => { setForgotEmail(email); setView('forgot'); setError(''); }}
                                        className="text-xs text-[#FFB103] hover:text-[#d49400] font-medium transition-colors"
                                    >
                                        Mot de passe oublié ?
                                    </button>
                                </div>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                    <input
                                        type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                                        className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFB103]"
                                        placeholder="Entrez votre mot de passe" required autoComplete="current-password"
                                    />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>

                            <button type="submit" disabled={loading}
                                className={`w-full py-3 px-4 rounded-lg font-semibold text-[#1a1a1a] transition-colors ${loading ? 'bg-[#FFB103]/50 cursor-not-allowed' : 'bg-[#FFB103] hover:bg-[#d49400]'}`}
                            >
                                {loading ? 'Connexion en cours…' : 'Se connecter'}
                            </button>
                        </form>
                    </>
                )}

                {/* ── VUE MOT DE PASSE OUBLIÉ ── */}
                {view === 'forgot' && (
                    <>
                        <div className="text-center mb-6">
                            <div className="w-14 h-14 bg-[#FFB103]/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                <Mail size={24} className="text-[#FFB103]" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-800">Mot de passe oublié</h2>
                            <p className="text-sm text-gray-500 mt-1">Entrez votre email, vous recevrez un lien de réinitialisation.</p>
                        </div>

                        {error && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                                <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleForgot} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Adresse e-mail</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFB103]"
                                        placeholder="votre@email.com" required autoFocus
                                    />
                                </div>
                            </div>
                            <button type="submit" disabled={loading}
                                className="w-full py-3 bg-[#FFB103] hover:bg-[#d49400] text-[#1a1a1a] font-bold rounded-xl transition-colors disabled:opacity-50"
                            >
                                {loading ? 'Envoi…' : 'Envoyer le lien'}
                            </button>
                            <button type="button" onClick={() => { setView('login'); setError(''); }}
                                className="w-full flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <ArrowLeft size={15} /> Retour à la connexion
                            </button>
                        </form>
                    </>
                )}

                {/* ── VUE EMAIL ENVOYÉ ── */}
                {view === 'forgot_sent' && (
                    <div className="text-center py-4">
                        <CheckCircle size={52} className="text-green-500 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-gray-800 mb-2">Email envoyé !</h2>
                        <p className="text-sm text-gray-500 mb-6">
                            Un lien de réinitialisation valable 1 heure a été envoyé à <strong>{forgotEmail}</strong>.
                        </p>
                        {/* Renvoi email avec compteur */}
                        {countdown > 0 ? (
                            <p className="text-sm text-gray-400 text-center">
                                Renvoyer dans <span className="font-bold text-gray-600">{countdown}s</span>
                            </p>
                        ) : (
                            <button
                                onClick={() => { setView('forgot'); setError(''); }}
                                className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-200 text-gray-600 hover:border-[#FFB103] hover:text-[#FFB103] rounded-xl text-sm font-semibold transition-colors"
                            >
                                <RefreshCw size={14} /> Renvoyer l'email
                            </button>
                        )}

                        <button onClick={() => { setView('login'); setError(''); }}
                            className="w-full py-3 bg-[#FFB103] hover:bg-[#d49400] text-[#1a1a1a] font-bold rounded-xl transition-colors"
                        >
                            Retour à la connexion
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Login;
