import React, { useState, useRef, useEffect } from 'react';
import {
    UserCircle, Camera, Lock, Eye, EyeOff, Check, AlertCircle, X,
    LayoutDashboard, Users, UserPlus, Trash2, Edit3,
    BarChart2, AlertTriangle, TrendingUp, Package, Flame, Receipt, Calculator,
    Bell, BellOff, Loader2, Megaphone, Send, Clock, ChevronDown, ChevronUp,
    Handshake, Building2, KeyRound, RefreshCw, Mail,
} from 'lucide-react';
import { useToast } from './ToastProvider';
import { useNotifications } from '../hooks/useNotifications';

const API_BASE = import.meta.env.VITE_API_BASE || '/hello-gestion/php';

const ROLE_LABELS = {
    admin:          'Administrateur',
    gerant:         'Gérant',
    administration: 'Administration',
    chef_equipe:    "Chef d'équipe",
    commercial:     'Commercial',
    poseur:         'Poseur',
    collaborateur:  'Collaborateur',
};

export const WIDGET_DEFS = [
    { id: 'kpis',            label: 'KPIs Stock',              desc: 'Valeur, ruptures, alertes, disponibles',   icon: BarChart2 },
    { id: 'alertes',         label: 'Alertes actives',          desc: 'Articles en rupture ou stock faible',      icon: AlertTriangle },
    { id: 'top_valeur',      label: 'Top articles par valeur',  desc: 'Articles les plus valorisés en stock',     icon: TrendingUp },
    { id: 'fournisseurs',    label: 'Répartition fournisseurs', desc: 'Valeur du stock par fournisseur',          icon: Package },
    { id: 'conditionnement', label: 'Conditionnement',          desc: 'Répartition carton / unité',              icon: Package },
    { id: 'top_consommes',   label: 'Top 5 consommés',          desc: 'Articles les + utilisés ce mois',         icon: Flame },
    { id: 'frais',           label: 'Notes de frais',           desc: 'Validation RH (admin / gérant)',          icon: Receipt,    adminOnly: true },
    { id: 'commissions',     label: 'Supervisions commissions', desc: 'Tableau des commerciaux',                 icon: Calculator, adminOnly: true },
];

function getWidgetPrefs(userId) {
    try {
        const raw = localStorage.getItem(`dashboard_widgets_${userId}`);
        return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
}
function saveWidgetPrefs(userId, prefs) {
    localStorage.setItem(`dashboard_widgets_${userId}`, JSON.stringify(prefs));
}

const roleBadge = (role) => {
    const map = {
        admin: 'bg-amber-100 text-amber-800', gerant: 'bg-blue-100 text-blue-800',
        administration: 'bg-indigo-100 text-indigo-800', chef_equipe: 'bg-green-100 text-green-800',
        commercial: 'bg-orange-100 text-orange-800', poseur: 'bg-gray-100 text-gray-600',
    };
    return map[role] || 'bg-gray-100 text-gray-600';
};

const Toggle = ({ checked, onChange }) => (
    <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex w-10 h-5 rounded-full transition-colors shrink-0 ${checked ? 'bg-[#FFB103]' : 'bg-gray-200'}`}
    >
        <span className={`inline-block w-4 h-4 mt-0.5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-1'}`} />
    </button>
);

// ── PwdField défini EN DEHORS pour éviter le remontage à chaque keystroke ────
const PwdField = ({ id, label, value, onChange, showPassword, onToggleShow }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
        <div className="relative">
            <input
                type={showPassword ? 'text' : 'password'} value={value} onChange={onChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFB103]"
                required
                autoComplete={id === 'current' ? 'current-password' : 'new-password'}
            />
            <button type="button" tabIndex={-1} onClick={onToggleShow}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
        </div>
    </div>
);

// ── Composant Notifications ──────────────────────────────────────────────────
const NotificationsSection = () => {
    const { supported, subscribed, loading, subscribe, unsubscribe, permission } = useNotifications();

    if (!supported) return (
        <div>
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Bell size={15} className="text-amber-600" /> Notifications push
            </h3>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <BellOff size={16} className="text-gray-400 shrink-0" />
                <p className="text-xs text-gray-500">Les notifications push ne sont pas supportées sur ce navigateur.</p>
            </div>
        </div>
    );

    return (
        <div>
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Bell size={15} className="text-amber-600" /> Notifications push
            </h3>
            <div className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                subscribed ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'
            }`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    subscribed ? 'bg-[#FFB103]' : 'bg-gray-200'
                }`}>
                    {loading
                        ? <Loader2 size={18} className="text-white animate-spin" />
                        : subscribed
                            ? <Bell size={18} className="text-white" />
                            : <BellOff size={18} className="text-gray-500" />
                    }
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">
                        {subscribed ? 'Notifications activées' : 'Notifications désactivées'}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                        {subscribed
                            ? 'Tu recevras les alertes de stock et les nouveaux documents'
                            : 'Active les notifications pour recevoir les alertes en temps réel'
                        }
                    </p>
                    {permission === 'denied' && (
                        <p className="text-xs text-red-500 mt-1">
                            ⚠️ Notifications bloquées — autorise-les dans les réglages du navigateur
                        </p>
                    )}
                </div>
                <button
                    onClick={subscribed ? unsubscribe : subscribe}
                    disabled={loading || permission === 'denied'}
                    className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 ${
                        subscribed
                            ? 'bg-white border border-gray-200 text-gray-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                            : 'bg-[#FFB103] text-[#1a1a1a] hover:bg-[#d49400]'
                    }`}
                >
                    {loading ? 'Chargement…' : subscribed ? 'Désactiver' : 'Activer'}
                </button>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
const Settings = ({ isOpen, onClose, user, onUserUpdate, viewAsRole, onViewAsRole }) => {
    const toast   = useToast();
    const fileRef = useRef();

    // ── Avatar ────────────────────────────────────────────
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [avatarFile, setAvatarFile]       = useState(null);

    // ── Profil (champs) ───────────────────────────────────
    const [profileForm, setProfileForm] = useState({ name: '', position: '' });
    const [profileDirty, setProfileDirty] = useState(false);

    // ── Mot de passe ──────────────────────────────────────
    const [pwd, setPwd]   = useState({ current: '', next: '', confirm: '' });
    const [show, setShow] = useState({ current: false, next: false, confirm: false });
    const [pwdLoading, setPwdLoading] = useState(false);

    // ── Widgets ───────────────────────────────────────────
    const [widgetPrefs, setWidgetPrefs] = useState({});

    // Rôles avec accès aux sections avancées
    const isManager      = ['admin', 'gerant', 'administration'].includes(user?.role);
    const canManageUsers = ['admin', 'gerant', 'administration'].includes(user?.role);
    const canBroadcast   = ['admin', 'gerant', 'administration'].includes(user?.role);
    const canDisableUsers = user?.role === 'admin';
    const canSeeUsers    = isManager;
    const [users, setUsers]           = useState([]);
    const [usersLoading, setUsersLoading] = useState(false);
    const [showAddForm, setShowAddForm]   = useState(false);
    const [newUser, setNewUser] = useState({ name: '', email: '', password: '', position: '', access_level: 'basique' });
    const [addLoading, setAddLoading] = useState(false);

    // ── Collaborateurs ────────────────────────────────────
    const [showAddCollab, setShowAddCollab]   = useState(false);
    const [newCollab, setNewCollab]           = useState({ company: '', email: '', password: '' });
    const [collabLoading, setCollabLoading]   = useState(false);
    const [collabs, setCollabs]               = useState([]);
    const [collabsLoading, setCollabsLoading] = useState(false);

    const [selectedCollabForInterlocuteurs, setSelectedCollabForInterlocuteurs] = useState(null);
    const [interlocuteurs, setInterlocuteurs] = useState([]);
    const [interlocuteursLoading, setInterlocuteursLoading] = useState(false);
    const [newInterlocuteur, setNewInterlocuteur] = useState({ name: '', email: '', role: 'interlocuteur' });
    const [addInterlocuteurLoading, setAddInterlocuteurLoading] = useState(false);

    const generatePassword = () => {
        const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!';
        return Array.from({ length: 15 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    };

    // ── Broadcast ─────────────────────────────────────────
    const [broadcastMsg, setBroadcastMsg]     = useState('');
    const [broadcastSending, setBroadcastSending] = useState(false);
    const [broadcastHistory, setBroadcastHistory] = useState([]);
    const [broadcastExpanded, setBroadcastExpanded] = useState(false);

    // ── Save global ───────────────────────────────────────
    const [saving, setSaving] = useState(false);

    // Init quand le modal s'ouvre
    useEffect(() => {
        if (!isOpen) return;
        setAvatarPreview(user?.avatar_path ? `/hello-gestion/php/${user.avatar_path}` : null);
        setAvatarFile(null);
        setProfileForm({ name: user?.name || '', position: user?.position || '' });
        setProfileDirty(false);
        setPwd({ current: '', next: '', confirm: '' });
        setShow({ current: false, next: false, confirm: false });
        setWidgetPrefs(getWidgetPrefs(user?.id));
        setShowAddForm(false);
        setShowAddCollab(false);
    }, [isOpen, user]);

    // Charger l'historique des broadcasts
    useEffect(() => {
        if (!isOpen || !canBroadcast) return;
        fetch(`${API_BASE}/broadcast.php?action=all`, { credentials: 'include' })
            .then(r => r.json())
            .then(d => { if (d.success) setBroadcastHistory(d.messages || []); })
            .catch(() => {});
    }, [isOpen, canBroadcast]);

    const handleSendBroadcast = async () => {
        if (!broadcastMsg.trim()) return;
        setBroadcastSending(true);
        try {
            const res  = await fetch(`${API_BASE}/broadcast.php`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'send', message: broadcastMsg }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Message envoyé à toute l\'équipe ✓');
                setBroadcastMsg('');
                // Recharger l'historique
                fetch(`${API_BASE}/broadcast.php?action=all`, { credentials: 'include' })
                    .then(r => r.json())
                    .then(d => { if (d.success) setBroadcastHistory(d.messages || []); })
                    .catch(() => {});
            } else {
                toast.error(data.message || 'Erreur envoi');
            }
        } catch { toast.error('Erreur réseau'); }
        finally { setBroadcastSending(false); }
    };

    const handleDeleteBroadcast = async (id) => {
        try {
            await fetch(`${API_BASE}/broadcast.php?id=${id}`, { method: 'DELETE', credentials: 'include' });
            setBroadcastHistory(prev => prev.filter(m => m.id !== id));
        } catch { /* ignore */ }
    };

    // Charger les utilisateurs
    useEffect(() => {
        if (!isOpen || !canSeeUsers) return;
        setUsersLoading(true);
        fetch(`${API_BASE}/users.php`, { credentials: 'include' })
            .then(r => r.json())
            .then(d => { if (d.success) setUsers(d.data); })
            .catch(() => {})
            .finally(() => setUsersLoading(false));
    }, [isOpen, canSeeUsers]);

    useEffect(() => {
        if (!isOpen || !canManageUsers) return;
        setCollabsLoading(true);
        fetch(`${API_BASE}/collaborateurs.php`, { credentials: 'include' })
            .then(r => r.json())
            .then(d => { if (d.success) setCollabs(d.data); })
            .catch(() => {})
            .finally(() => setCollabsLoading(false));
    }, [isOpen, canManageUsers]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
    };

    const toggleWidget = (id, val) => {
        const next = { ...widgetPrefs, [id]: val };
        setWidgetPrefs(next);
        saveWidgetPrefs(user?.id, next); // localStorage → immédiat
    };

    // ── Enregistrer (avatar + profil) ─────────────────────
    const handleSave = async () => {
        setSaving(true);
        try {
            let updates = {};

            // Avatar
            if (avatarFile) {
                const fd = new FormData();
                fd.append('avatar', avatarFile);
                const res  = await fetch(`${API_BASE}/profile.php?action=avatar`, { method: 'POST', body: fd, credentials: 'include' });
                const data = await res.json();
                if (data.success) {
                    updates.avatar_path = data.avatar_path;
                } else {
                    toast.error(data.message || 'Erreur upload photo');
                    setSaving(false);
                    return;
                }
            }

            // Profil (nom / poste)
            if (profileDirty) {
                if (!profileForm.name.trim()) { toast.error('Le nom est requis'); setSaving(false); return; }
                const res  = await fetch(`${API_BASE}/profile.php?action=update`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(profileForm),
                });
                const data = await res.json();
                if (data.success) {
                    updates.name     = profileForm.name;
                    updates.position = profileForm.position;
                } else {
                    toast.error(data.message || 'Erreur sauvegarde profil');
                    setSaving(false);
                    return;
                }
            }

            if (Object.keys(updates).length > 0 && onUserUpdate) onUserUpdate(updates);
            toast.success('Paramètres enregistrés ✓');
            onClose();
        } catch {
            toast.error('Erreur réseau');
        } finally {
            setSaving(false);
        }
    };

    // ── Mot de passe ──────────────────────────────────────
    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (pwd.next !== pwd.confirm) { toast.error('Les mots de passe ne correspondent pas'); return; }
        if (pwd.next.length < 8)      { toast.error('Au moins 8 caractères requis'); return; }
        setPwdLoading(true);
        try {
            const res  = await fetch(`${API_BASE}/profile.php?action=password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ current_password: pwd.current, new_password: pwd.next, confirm_password: pwd.confirm }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Mot de passe modifié ✓');
                setPwd({ current: '', next: '', confirm: '' });
            } else {
                toast.error(data.message || 'Erreur');
            }
        } catch { toast.error('Erreur réseau'); }
        finally { setPwdLoading(false); }
    };

    // ── Utilisateurs ──────────────────────────────────────
    const handleAddUser = async (e) => {
        e.preventDefault();
        setAddLoading(true);
        try {
            const role = newUser.access_level === 'gestion' ? 'administration' : 'poseur';
            const app_access = true; // tous ont accès à l'app
            const res  = await fetch(`${API_BASE}/users.php`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ ...newUser, role, app_access }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Employé créé ✓');
                setNewUser({ name: '', email: '', password: '', position: '', access_level: 'basique' });
                setShowAddForm(false);
                fetch(`${API_BASE}/users.php`, { credentials: 'include' })
                    .then(r => r.json()).then(d => { if (d.success) setUsers(d.data); });
            } else {
                toast.error(data.message || 'Erreur création');
            }
        } catch { toast.error('Erreur réseau'); }
        finally { setAddLoading(false); }
    };

    const handleDeactivateUser = async (u) => {
        if (!window.confirm(`Désactiver ${u.name} ?`)) return;
        try {
            const res  = await fetch(`${API_BASE}/users.php?id=${u.id}`, { method: 'DELETE', credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                toast.success(`${u.name} désactivé`);
                setUsers(prev => prev.filter(x => x.id !== u.id));
            } else { toast.error(data.message || 'Erreur'); }
        } catch { toast.error('Erreur réseau'); }
    };

    const handleAddCollaborateur = async (e) => {
        e.preventDefault();
        setCollabLoading(true);
        try {
            const res  = await fetch(`${API_BASE}/collaborateurs.php`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                credentials: 'include', body: JSON.stringify(newCollab),
            });
            const data = await res.json();
            if (data.success) {
                toast.success(data.email_sent ? 'Collaborateur créé, email envoyé ✓' : 'Collaborateur créé (email non envoyé)');
                setNewCollab({ company: '', email: '', password: '' });
                setShowAddCollab(false);
                fetch(`${API_BASE}/collaborateurs.php`, { credentials: 'include' })
                    .then(r => r.json()).then(d => { if (d.success) setCollabs(d.data); });
            } else { toast.error(data.message || 'Erreur création'); }
        } catch { toast.error('Erreur réseau'); }
        finally { setCollabLoading(false); }
    };

    const handleDeleteCollaborateur = async (c) => {
        if (!window.confirm(`Désactiver ${c.name} ?`)) return;
        try {
            const res  = await fetch(`${API_BASE}/collaborateurs.php?id=${c.id}`, { method: 'DELETE', credentials: 'include' });
            const data = await res.json();
            if (data.success) { toast.success(`${c.name} désactivé`); setCollabs(prev => prev.filter(x => x.id !== c.id)); }
            else { toast.error(data.message || 'Erreur'); }
        } catch { toast.error('Erreur réseau'); }
    };

    const fetchInterlocuteurs = async (collabId) => {
        setInterlocuteursLoading(true);
        try {
            const res = await fetch(`${API_BASE}/interlocuteurs_api.php?collaborateur_id=${collabId}`, { credentials: 'include' });
            const d = await res.json();
            if (d.success) {
                setInterlocuteurs(d.data || []);
            } else {
                toast.error(d.message || 'Erreur lors du chargement des interlocuteurs');
            }
        } catch {
            toast.error('Erreur réseau');
        } finally {
            setInterlocuteursLoading(false);
        }
    };

    const handleToggleInterlocuteurs = (collabId) => {
        if (selectedCollabForInterlocuteurs === collabId) {
            setSelectedCollabForInterlocuteurs(null);
            setInterlocuteurs([]);
        } else {
            setSelectedCollabForInterlocuteurs(collabId);
            setNewInterlocuteur({ name: '', email: '', role: 'interlocuteur' });
            fetchInterlocuteurs(collabId);
        }
    };

    const handleAddInterlocuteur = async (e) => {
        e.preventDefault();
        if (!newInterlocuteur.name.trim() || !newInterlocuteur.email.trim()) return;
        setAddInterlocuteurLoading(true);
        try {
            const res = await fetch(`${API_BASE}/interlocuteurs_api.php`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    collaborateur_id: selectedCollabForInterlocuteurs,
                    name: newInterlocuteur.name,
                    email: newInterlocuteur.email,
                    role: newInterlocuteur.role
                })
            });
            const d = await res.json();
            if (d.success) {
                toast.success('Interlocuteur ajouté ✓');
                setNewInterlocuteur({ name: '', email: '', role: 'interlocuteur' });
                fetchInterlocuteurs(selectedCollabForInterlocuteurs);
            } else {
                toast.error(d.message || "Erreur lors de l'ajout");
            }
        } catch {
            toast.error('Erreur réseau');
        } finally {
            setAddInterlocuteurLoading(false);
        }
    };

    const handleDeleteInterlocuteur = async (id) => {
        if (!window.confirm('Voulez-vous vraiment supprimer cet interlocuteur ?')) return;
        try {
            const res = await fetch(`${API_BASE}/interlocuteurs_api.php?id=${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            const d = await res.json();
            if (d.success) {
                toast.success('Interlocuteur supprimé ✓');
                fetchInterlocuteurs(selectedCollabForInterlocuteurs);
            } else {
                toast.error(d.message || 'Erreur lors de la suppression');
            }
        } catch {
            toast.error('Erreur réseau');
        }
    };

    const inputCls2 = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFB103]';

    if (!isOpen) return null;

    const hasPendingChanges = !!avatarFile || profileDirty;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            {/* Panel — bottom-sheet sur mobile, centré sur desktop */}
            <div className="relative w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 shrink-0">
                    <h2 className="text-lg font-bold text-gray-900">Paramètres</h2>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Contenu scrollable */}
                <div className="overflow-y-auto flex-1 px-4 sm:px-6 py-4 sm:py-5 space-y-5 sm:space-y-6">

                    {/* ── SECTION PROFIL (tous les rôles) ── */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <UserCircle size={15} className="text-amber-600" /> Mon profil
                        </h3>
                        <div className="flex items-start gap-5">
                            <div className="relative shrink-0">
                                <div className="w-20 h-20 rounded-full overflow-hidden bg-amber-100 flex items-center justify-center border-2 border-amber-200">
                                    {avatarPreview
                                        ? <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
                                        : <UserCircle size={40} className="text-amber-500" />
                                    }
                                </div>
                                <button onClick={() => fileRef.current.click()}
                                    className="absolute bottom-0 right-0 w-7 h-7 bg-[#FFB103] text-[#1a1a1a] rounded-full flex items-center justify-center shadow-lg hover:bg-[#d49400] transition-colors"
                                >
                                    <Camera size={13} />
                                </button>
                                <input ref={fileRef} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                            </div>
                            <div className="flex-1 space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Nom complet</label>
                                        <input className={inputCls2} value={profileForm.name}
                                            onChange={e => { setProfileForm(p => ({ ...p, name: e.target.value })); setProfileDirty(true); }} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Poste / Titre</label>
                                        <input className={inputCls2} value={profileForm.position}
                                            onChange={e => { setProfileForm(p => ({ ...p, position: e.target.value })); setProfileDirty(true); }}
                                            placeholder="ex: Commercial, Poseur…" />
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-gray-400 pt-0.5">
                                    <span className={`font-bold px-2 py-0.5 rounded-full ${roleBadge(user?.role)}`}>
                                        {ROLE_LABELS[user?.role] || user?.role}
                                    </span>
                                    <span>{user?.email}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <hr className="border-gray-100" />

                    {/* ── SECTION MOT DE PASSE (tous les rôles) ── */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Lock size={15} className="text-amber-600" /> Changer le mot de passe
                        </h3>
                        <form onSubmit={handlePasswordChange} className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <PwdField id="current" label="Actuel"    value={pwd.current}  onChange={e => setPwd(p => ({ ...p, current:  e.target.value }))} showPassword={show.current}  onToggleShow={() => setShow(s => ({ ...s, current:  !s.current  }))} />
                                <PwdField id="next"    label="Nouveau"   value={pwd.next}     onChange={e => setPwd(p => ({ ...p, next:     e.target.value }))} showPassword={show.next}     onToggleShow={() => setShow(s => ({ ...s, next:     !s.next     }))} />
                                <PwdField id="confirm" label="Confirmer" value={pwd.confirm}  onChange={e => setPwd(p => ({ ...p, confirm:  e.target.value }))} showPassword={show.confirm}  onToggleShow={() => setShow(s => ({ ...s, confirm:  !s.confirm  }))} />
                            </div>
                            {pwd.next && pwd.confirm && pwd.next !== pwd.confirm && (
                                <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                                    <AlertCircle size={13} /> Les mots de passe ne correspondent pas
                                </div>
                            )}
                            {pwd.next.length > 0 && pwd.next.length < 8 && (
                                <div className="flex items-center gap-2 text-xs text-yellow-700 bg-yellow-50 rounded-lg px-3 py-2">
                                    <AlertCircle size={13} /> Au moins 8 caractères requis
                                </div>
                            )}
                            <button type="submit"
                                disabled={pwdLoading || !pwd.current || !pwd.next || !pwd.confirm}
                                className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                {pwdLoading ? 'Modification…' : 'Changer le mot de passe'}
                            </button>
                        </form>
                    </div>

                    {/* ── SECTION NOTIFICATIONS ── */}
                    <hr className="border-gray-100" />
                    <NotificationsSection />

                    {/* ══════════════════════════════════════════════════
                        Sections visibles uniquement pour
                        admin / gérant / administration
                    ══════════════════════════════════════════════════ */}
                    {isManager && (
                        <>
                            {/* ── Tableau de bord ── */}
                            <hr className="border-gray-100" />
                            <div>
                                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-2">
                                    <LayoutDashboard size={15} className="text-amber-600" /> Tableau de bord
                                </h3>
                                <p className="text-xs text-gray-400 mb-4">Les modifications s'appliquent immédiatement.</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    {WIDGET_DEFS
                                        .filter(w => !w.adminOnly || ['admin', 'gerant'].includes(user?.role))
                                        .map(w => {
                                            const enabled = widgetPrefs[w.id] !== false;
                                            const Icon    = w.icon;
                                            return (
                                                <div key={w.id} onClick={() => toggleWidget(w.id, !enabled)}
                                                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                                        enabled ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-gray-50'
                                                    }`}
                                                >
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${enabled ? 'bg-amber-100' : 'bg-gray-100'}`}>
                                                        <Icon size={15} className={enabled ? 'text-amber-700' : 'text-gray-400'} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`text-xs font-semibold ${enabled ? 'text-gray-800' : 'text-gray-400'}`}>{w.label}</p>
                                                        <p className="text-[10px] text-gray-400 truncate">{w.desc}</p>
                                                    </div>
                                                    <Toggle checked={enabled} onChange={val => toggleWidget(w.id, val)} />
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>

                            {/* ── Prévisualiser un rôle (admin uniquement) ── */}
                            {user?.role === 'admin' && onViewAsRole && (
                                <>
                                    <hr className="border-gray-100" />
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-2">
                                            <span className="text-base">👁</span> Prévisualiser en tant que
                                        </h3>
                                        <p className="text-xs text-gray-400 mb-4">Vois l'app depuis la perspective d'un autre rôle, sans changer ton compte.</p>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                            {Object.entries(ROLE_LABELS)
                                                .filter(([val]) => val !== 'admin')
                                                .map(([val, lbl]) => {
                                                    const active = viewAsRole === val;
                                                    return (
                                                        <button key={val} type="button"
                                                            onClick={() => onViewAsRole(active ? null : val)}
                                                            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                                                                active
                                                                    ? 'border-amber-400 bg-amber-50 text-amber-800'
                                                                    : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300 hover:bg-gray-100'
                                                            }`}
                                                        >
                                                            {active && <span className="text-xs">👁</span>}
                                                            {lbl}
                                                        </button>
                                                    );
                                                })}
                                        </div>
                                        {viewAsRole && (
                                            <button type="button" onClick={() => onViewAsRole(null)}
                                                className="mt-2 text-xs text-amber-700 hover:text-amber-900 font-medium underline underline-offset-2"
                                            >
                                                Quitter la prévisualisation
                                            </button>
                                        )}
                                    </div>
                                </>
                            )}

                            {/* ── Équipe ── */}
                            <hr className="border-gray-100" />
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                        <Users size={15} className="text-amber-600" /> Équipe
                                    </h3>
                                    {canManageUsers && (
                                        <button onClick={() => setShowAddForm(v => !v)}
                                            className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors"
                                        >
                                            <UserPlus size={13} /> Ajouter un employé
                                        </button>
                                    )}
                                </div>

                                {showAddForm && (
                                    <form onSubmit={handleAddUser} className="mb-4 p-4 bg-amber-50 rounded-xl border border-amber-100 space-y-3">
                                        <p className="text-xs font-semibold text-gray-700">Nouvel employé</p>

                                        {/* Infos de base */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            <div>
                                                <label className="block text-[10px] text-gray-400 mb-1">Nom complet *</label>
                                                <input className={inputCls2} value={newUser.name} onChange={e => setNewUser(p => ({ ...p, name: e.target.value }))} placeholder="Prénom Nom" required />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] text-gray-400 mb-1">Poste / Titre</label>
                                                <input className={inputCls2} value={newUser.position} onChange={e => setNewUser(p => ({ ...p, position: e.target.value }))} placeholder="ex: Technicien poseur" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] text-gray-400 mb-1">Email *</label>
                                                <input className={inputCls2} type="email" value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} placeholder="email@exemple.fr" required />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] text-gray-400 mb-1">Mot de passe *</label>
                                                <input className={inputCls2} type="password" value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} placeholder="Min. 8 caractères" required />
                                            </div>
                                        </div>

                                        {/* Niveau d'accès */}
                                        <div>
                                            <p className="text-[10px] text-gray-400 mb-2">Niveau d'accès *</p>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {[
                                                    {
                                                        value: 'basique',
                                                        label: 'Accès basique',
                                                        desc: 'Stock, consommables, outils, mon casier, ressources',
                                                        perms: ['Produits reçus / posés', 'Consommables & outils', 'Mon casier', 'Annuaire, Assistant IA, Comparateur'],
                                                    },
                                                    {
                                                        value: 'gestion',
                                                        label: 'Accès gestion',
                                                        desc: 'Tableau de bord, gestion employés, notes de frais',
                                                        perms: ['Tout l\'accès basique', 'Tableau de bord', 'Gestion des employés', 'Notes de frais & commissions'],
                                                    },
                                                ].map(opt => {
                                                    const selected = newUser.access_level === opt.value;
                                                    return (
                                                        <button
                                                            key={opt.value}
                                                            type="button"
                                                            onClick={() => setNewUser(p => ({ ...p, access_level: opt.value }))}
                                                            className={`text-left p-3 rounded-xl border-2 transition-all ${
                                                                selected
                                                                    ? 'border-[#FFB103] bg-white'
                                                                    : 'border-gray-200 bg-white/60 hover:border-gray-300'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-2 mb-1.5">
                                                                <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${selected ? 'border-[#FFB103]' : 'border-gray-300'}`}>
                                                                    {selected && <div className="w-1.5 h-1.5 rounded-full bg-[#FFB103]" />}
                                                                </div>
                                                                <p className={`text-xs font-bold ${selected ? 'text-[#FFB103]' : 'text-gray-700'}`}>{opt.label}</p>
                                                            </div>
                                                            <ul className="space-y-0.5 pl-5">
                                                                {opt.perms.map(p => (
                                                                    <li key={p} className="text-[10px] text-gray-500 flex items-center gap-1">
                                                                        <span className="text-green-500">✓</span> {p}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="flex gap-2 pt-1">
                                            <button type="submit" disabled={addLoading}
                                                className="flex items-center gap-1.5 bg-[#FFB103] text-[#1a1a1a] px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-[#d49400] disabled:opacity-50 transition-colors"
                                            >
                                                <Check size={13} /> {addLoading ? 'Création…' : "Créer l'employé"}
                                            </button>
                                            <button type="button" onClick={() => setShowAddForm(false)}
                                                className="px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-gray-100 border border-gray-200 transition-colors"
                                            >
                                                Annuler
                                            </button>
                                        </div>
                                    </form>
                                )}

                                {usersLoading ? (
                                    <div className="py-4 flex items-center justify-center gap-2 text-gray-400 text-sm">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#FFB103]" /> Chargement…
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        {users.map(u => (
                                            <div key={u.id} className="flex items-center gap-3 py-2 px-2 rounded-xl hover:bg-gray-50 transition-colors">
                                                {u.avatar_path
                                                    ? <img src={`/hello-gestion/php/${u.avatar_path}`} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                                                    : <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0"><UserCircle size={16} className="text-amber-500" /></div>
                                                }
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5 flex-wrap">
                                                        {u.name}
                                                        {u.id === user?.id && <span className="text-[10px] text-gray-400 font-normal">(vous)</span>}
                                                        {!u.app_access && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">Sans accès app</span>}
                                                    </p>
                                                    {u.app_access ? <p className="text-xs text-gray-400 truncate">{u.email}</p> : null}
                                                </div>
                                                <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${roleBadge(u.role)}`}>
                                                    {ROLE_LABELS[u.role] || u.role}
                                                </span>
                                                {canDisableUsers && u.id !== user?.id && (
                                                    <button onClick={() => handleDeactivateUser(u)}
                                                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                                                        title="Désactiver"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                    {/* ── SECTION COLLABORATEURS ── */}
                    {canManageUsers && (
                        <>
                            <hr className="border-gray-100" />
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                        <Handshake size={15} className="text-amber-600" /> Collaborateurs
                                    </h3>
                                    <button onClick={() => setShowAddCollab(v => !v)}
                                        className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors"
                                    >
                                        <UserPlus size={13} /> Ajouter un collaborateur
                                    </button>
                                </div>

                                {showAddCollab && (
                                    <form onSubmit={handleAddCollaborateur} className="mb-4 p-4 bg-amber-50 rounded-xl border border-amber-100 space-y-3">
                                        <p className="text-xs font-semibold text-gray-700">Nouveau collaborateur</p>
                                        <p className="text-[11px] text-gray-400">Les identifiants seront envoyés automatiquement par email.</p>

                                        <div>
                                            <label className="block text-[10px] text-gray-400 mb-1"><Building2 size={10} className="inline mr-1" />Nom d'entreprise *</label>
                                            <input className={inputCls2} value={newCollab.company} onChange={e => setNewCollab(p => ({ ...p, company: e.target.value }))} placeholder="Dupont Fermetures" required />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] text-gray-400 mb-1"><Mail size={10} className="inline mr-1" />Adresse email *</label>
                                            <input className={inputCls2} type="email" value={newCollab.email} onChange={e => setNewCollab(p => ({ ...p, email: e.target.value }))} placeholder="contact@entreprise.fr" required />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] text-gray-400 mb-1"><KeyRound size={10} className="inline mr-1" />Mot de passe *</label>
                                            <div className="flex gap-2">
                                                <input className={inputCls2} value={newCollab.password} onChange={e => setNewCollab(p => ({ ...p, password: e.target.value }))} placeholder="Min. 6 caractères" required />
                                                <button
                                                    type="button"
                                                    onClick={() => setNewCollab(p => ({ ...p, password: generatePassword() }))}
                                                    className="shrink-0 px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs text-gray-500 hover:border-[#FFB103] hover:text-[#FFB103] transition-colors flex items-center gap-1"
                                                    title="Générer un mot de passe"
                                                >
                                                    <RefreshCw size={12} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex gap-2 pt-1">
                                            <button type="submit" disabled={collabLoading}
                                                className="flex items-center gap-1.5 bg-[#FFB103] text-[#1a1a1a] px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-[#d49400] disabled:opacity-50 transition-colors"
                                            >
                                                <Send size={12} /> {collabLoading ? 'Envoi…' : 'Créer & envoyer les accès'}
                                            </button>
                                            <button type="button" onClick={() => setShowAddCollab(false)}
                                                className="px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-gray-100 border border-gray-200 transition-colors"
                                            >
                                                Annuler
                                            </button>
                                        </div>
                                    </form>
                                )}

                                {collabsLoading ? (
                                    <div className="py-4 flex items-center justify-center gap-2 text-gray-400 text-sm">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#FFB103]" /> Chargement…
                                    </div>
                                ) : collabs.length === 0 ? (
                                    <p className="text-sm text-gray-400 text-center py-4">Aucun collaborateur pour l'instant</p>
                                ) : (
                                    <div className="space-y-1">
                                        {collabs.map(c => (
                                            <div key={c.id} className="border border-transparent rounded-xl hover:border-gray-100 overflow-hidden">
                                                <div className="flex items-center gap-3 py-2 px-2 hover:bg-gray-50 transition-colors">
                                                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                                                        <Building2 size={15} className="text-amber-600" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold text-gray-800">{c.name}</p>
                                                        <p className="text-xs text-gray-400 truncate flex items-center gap-1">
                                                            <Mail size={10} /> {c.email}
                                                        </p>
                                                    </div>
                                                    <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                                                        Collaborateur
                                                    </span>

                                                    <button onClick={() => handleToggleInterlocuteurs(c.id)}
                                                        className={`p-1.5 rounded-lg transition-colors shrink-0 ${selectedCollabForInterlocuteurs === c.id ? 'bg-amber-100 text-amber-700' : 'text-gray-400 hover:text-amber-600 hover:bg-amber-50'}`}
                                                        title="Gérer les interlocuteurs"
                                                    >
                                                        <Users size={14} />
                                                    </button>

                                                    {canDisableUsers && (
                                                        <button onClick={() => handleDeleteCollaborateur(c)}
                                                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                                                            title="Désactiver"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </div>

                                                {selectedCollabForInterlocuteurs === c.id && (
                                                    <div className="p-3 bg-gray-50 border-t border-gray-100 space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <p className="text-xs font-bold text-gray-600 flex items-center gap-1">
                                                                <Users size={12} className="text-amber-500" /> Interlocuteurs / Contacts
                                                            </p>
                                                        </div>

                                                        {interlocuteursLoading ? (
                                                            <div className="text-[11px] text-gray-400 flex items-center gap-1.5 py-1">
                                                                <Loader2 size={12} className="animate-spin text-[#FFB103]" /> Chargement des contacts…
                                                            </div>
                                                        ) : interlocuteurs.length === 0 ? (
                                                            <p className="text-[11px] text-gray-400 italic">Aucun interlocuteur enregistré.</p>
                                                        ) : (
                                                            <div className="space-y-1.5 max-h-40 overflow-y-auto">
                                                                {interlocuteurs.map(i => (
                                                                    <div key={i.id} className="flex items-center justify-between bg-white border border-gray-100 p-2 rounded-lg text-xs">
                                                                        <div className="min-w-0">
                                                                            <p className="font-semibold text-gray-800 flex items-center gap-1">
                                                                                {i.name}
                                                                                {i.role === 'patron' && (
                                                                                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 uppercase tracking-wide">
                                                                                        Patron / CC
                                                                                    </span>
                                                                                )}
                                                                            </p>
                                                                            <p className="text-[10px] text-gray-400">{i.email}</p>
                                                                        </div>
                                                                        <button onClick={() => handleDeleteInterlocuteur(i.id)}
                                                                            className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                                                                            title="Supprimer"
                                                                        >
                                                                            <Trash2 size={12} />
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        <form onSubmit={handleAddInterlocuteur} className="grid grid-cols-1 md:grid-cols-3 gap-2 bg-white p-2 rounded-lg border border-gray-200">
                                                            <input
                                                                className="text-xs border border-gray-200 rounded p-1"
                                                                placeholder="Nom / Prénom"
                                                                value={newInterlocuteur.name}
                                                                onChange={e => setNewInterlocuteur(p => ({ ...p, name: e.target.value }))}
                                                                required
                                                            />
                                                            <input
                                                                className="text-xs border border-gray-200 rounded p-1"
                                                                type="email"
                                                                placeholder="Email"
                                                                value={newInterlocuteur.email}
                                                                onChange={e => setNewInterlocuteur(p => ({ ...p, email: e.target.value }))}
                                                                required
                                                            />
                                                            <div className="flex gap-1.5">
                                                                <select
                                                                    className="text-xs border border-gray-200 rounded p-1 flex-1"
                                                                    value={newInterlocuteur.role}
                                                                    onChange={e => setNewInterlocuteur(p => ({ ...p, role: e.target.value }))}
                                                                >
                                                                    <option value="interlocuteur">Interlocuteur</option>
                                                                    <option value="patron">Patron (Copie)</option>
                                                                </select>
                                                                <button
                                                                    type="submit"
                                                                    disabled={addInterlocuteurLoading}
                                                                    className="bg-[#FFB103] hover:bg-[#d49400] text-[#1a1a1a] rounded px-2.5 flex items-center justify-center shrink-0 disabled:opacity-50"
                                                                >
                                                                    {addInterlocuteurLoading ? <Loader2 size={12} className="animate-spin" /> : 'Ajouter'}
                                                                </button>
                                                            </div>
                                                        </form>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* ── SECTION MESSAGE ÉQUIPE (gérant, admin, administration, chef d'équipe) ── */}
                    {canBroadcast && (
                        <>
                            <hr className="border-gray-100" />
                            <div>
                                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-2">
                                    <Megaphone size={15} className="text-amber-600" /> Message à l'équipe
                                </h3>
                                <p className="text-xs text-gray-400 mb-4">
                                    Le message s'affiche en pop-up pour tous les membres lors de leur prochaine connexion.
                                </p>

                                {/* Zone de saisie */}
                                <div className="space-y-3">
                                    <textarea
                                        value={broadcastMsg}
                                        onChange={e => setBroadcastMsg(e.target.value)}
                                        rows={4}
                                        placeholder="Réunion demain à 8h30 en salle de pause…"
                                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FFB103] resize-none bg-gray-50"
                                    />
                                    <button
                                        onClick={handleSendBroadcast}
                                        disabled={broadcastSending || !broadcastMsg.trim()}
                                        className="flex items-center gap-2 bg-[#FFB103] text-[#1a1a1a] px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#d49400] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-md shadow-amber-200"
                                    >
                                        <Send size={14} />
                                        {broadcastSending ? 'Envoi…' : 'Envoyer à toute l\'équipe'}
                                    </button>
                                </div>

                                {/* Historique */}
                                {broadcastHistory.length > 0 && (
                                    <div className="mt-4">
                                        <button
                                            onClick={() => setBroadcastExpanded(v => !v)}
                                            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 font-medium mb-2"
                                        >
                                            {broadcastExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                            Historique ({broadcastHistory.length})
                                        </button>
                                        {broadcastExpanded && (
                                            <div className="space-y-2">
                                                {broadcastHistory.map(m => (
                                                    <div key={m.id} className="flex gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs text-gray-800 leading-relaxed whitespace-pre-wrap">{m.message}</p>
                                                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                                <span className="text-[10px] text-gray-500 flex items-center gap-1">
                                                                    <Clock size={9} />
                                                                    {new Date(m.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                                <span className="text-[10px] font-semibold text-amber-700">
                                                                    par {m.sender_name}
                                                                </span>
                                                                {m.read_count !== undefined && (
                                                                    <span className="text-[10px] text-gray-400">
                                                                        · {m.read_count} lu{m.read_count > 1 ? 's' : ''}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => handleDeleteBroadcast(m.id)}
                                                            className="shrink-0 p-1 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                                                            title="Supprimer"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                    {/* ── fin sections manager ── */}
                </div>

                {/* Footer */}
                <div className="shrink-0 px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
                    <p className="text-xs text-gray-400">
                        {hasPendingChanges
                            ? <span className="text-amber-700 font-medium">Modifications non enregistrées</span>
                            : 'Widgets sauvegardés automatiquement'}
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-100 border border-gray-200 transition-colors font-medium"
                        >
                            Annuler
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving || !hasPendingChanges}
                            className="flex items-center gap-2 px-5 py-2 bg-[#FFB103] text-[#1a1a1a] rounded-xl text-sm font-semibold hover:bg-[#d49400] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <Check size={15} />
                            {saving ? 'Enregistrement…' : 'Enregistrer'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
