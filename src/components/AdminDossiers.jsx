import React, { useState, useEffect } from 'react';
import Skeleton from './Skeleton';
import {
    Users, FolderOpen, Search, ChevronRight, ArrowLeft,
    UserCircle, Shield, Briefcase, HardHat, TrendingUp, Wrench,
    Plus, Trash2, X, Eye, EyeOff, UserPlus, AlertTriangle
} from 'lucide-react';
import { useToast, useConfirm } from './ToastProvider';
import Casier from './Casier';

const API_BASE = import.meta.env.VITE_API_BASE || '/hello-gestion/php';

const ROLE_LABELS = {
    admin:          'Administrateur',
    gerant:         'Gérant',
    administration: 'Administration',
    chef_equipe:    "Chef d'équipe",
    commercial:     'Commercial',
    poseur:         'Poseur',
};

const ROLE_ICONS = {
    admin:          Shield,
    gerant:         Briefcase,
    administration: Briefcase,
    chef_equipe:    HardHat,
    commercial:     TrendingUp,
    poseur:         Wrench,
};

const ROLE_COLORS = {
    admin:          'bg-red-100 text-red-700',
    gerant:         'bg-amber-100 text-amber-700',
    administration: 'bg-blue-100 text-blue-700',
    chef_equipe:    'bg-orange-100 text-orange-700',
    commercial:     'bg-green-100 text-green-700',
    poseur:         'bg-gray-100 text-gray-600',
};

// ── Modal : Ajouter un employé ─────────────────────────────

const ACCESS_LEVELS = [
    {
        value: 'basique',
        label: 'Accès basique',
        perms: ['Produits reçus / posés', 'Consommables & outils', 'Mon casier', 'Annuaire, Assistant IA, Comparateur'],
    },
    {
        value: 'gestion',
        label: 'Accès gestion',
        perms: ["Tout l'accès basique", 'Tableau de bord', 'Gestion des employés', 'Notes de frais & commissions'],
    },
];

const AddEmployeeModal = ({ onClose, onAdded }) => {
    const toast = useToast();
    const [form, setForm] = useState({ name: '', email: '', password: '', position: '', access_level: 'basique' });
    const [showPwd, setShowPwd] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const role = form.access_level === 'gestion' ? 'administration' : 'poseur';
            const res  = await fetch(`${API_BASE}/users.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ ...form, role, app_access: true }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Employé créé avec succès ✓');
                onAdded();
                onClose();
            } else {
                toast.error(data.message || 'Erreur lors de la création');
            }
        } catch { toast.error('Erreur réseau'); }
        finally { setLoading(false); }
    };

    const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFB103] transition-colors';

    return (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 sm:p-4">
            <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center">
                            <UserPlus size={18} className="text-amber-700" />
                        </div>
                        <h3 className="text-base font-bold text-gray-900">Nouvel employé</h3>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    {/* Nom + Poste */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nom complet *</label>
                            <input className={inp} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Jean Dupont" required />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Poste / Intitulé</label>
                            <input className={inp} value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))} placeholder="Ex : Menuisier poseur" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email *</label>
                            <input type="email" className={inp} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jean@hello-fermetures.com" required />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Mot de passe *</label>
                            <div className="relative">
                                <input type={showPwd ? 'text' : 'password'} className={inp + ' pr-10'} value={form.password}
                                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="8 caractères minimum" required />
                                <button type="button" onClick={() => setShowPwd(s => !s)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Niveau d'accès */}
                    <div>
                        <p className="text-xs font-semibold text-gray-600 mb-2">Niveau d'accès *</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {ACCESS_LEVELS.map(opt => {
                                const selected = form.access_level === opt.value;
                                return (
                                    <button key={opt.value} type="button"
                                        onClick={() => setForm(f => ({ ...f, access_level: opt.value }))}
                                        className={`text-left p-3 rounded-xl border-2 transition-all ${selected ? 'border-[#FFB103] bg-amber-50/50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
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

                    {/* Actions */}
                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                            Annuler
                        </button>
                        <button type="submit" disabled={loading}
                            className="flex-1 py-2.5 bg-[#FFB103] text-[#1a1a1a] rounded-lg text-sm font-semibold hover:bg-[#d49400] disabled:opacity-50 transition-colors">
                            {loading ? 'Création…' : "Créer l'employé"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ── Vue liste des utilisateurs ─────────────────────────────

const UserList = ({ currentUser, onSelectUser }) => {
    const toast   = useToast();
    const confirm = useConfirm();
    const [users, setUsers]         = useState([]);
    const [loading, setLoading]     = useState(true);
    const [search, setSearch]       = useState('');
    const [showAddModal, setShowAddModal] = useState(false);

    const isAdmin = currentUser?.role === 'admin';
    const canAddEmployee = ['admin', 'gerant', 'administration'].includes(currentUser?.role);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res  = await fetch(`${API_BASE}/users.php`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) setUsers(data.data);
            else toast.error(data.message || 'Erreur chargement');
        } catch { toast.error('Erreur réseau'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchUsers(); }, []);

    const handleDelete = async (user) => {
        if (!await confirm(`Désactiver le compte de ${user.name} ? Il ne pourra plus se connecter.`)) return;
        try {
            const res  = await fetch(`${API_BASE}/users.php?id=${user.id}`, { method: 'DELETE', credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                toast.success('Compte désactivé ✓');
                setUsers(prev => prev.filter(u => u.id !== user.id));
            } else {
                toast.error(data.message || 'Erreur');
            }
        } catch { toast.error('Erreur réseau'); }
    };

    const filtered = users.filter(u =>
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase()) ||
        ROLE_LABELS[u.role]?.toLowerCase().includes(search.toLowerCase())
    );

    const byRole = Object.fromEntries(Object.keys(ROLE_LABELS).map(r => [r, []]));
    filtered.forEach(u => { if (byRole[u.role]) byRole[u.role].push(u); });

    if (loading) return (
        <div className="space-y-4">
            <div className="flex items-center gap-3 animate-pulse">
                <div className="h-10 w-10 rounded-xl bg-gray-200" />
                <div className="h-5 w-40 bg-gray-200 rounded" />
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <Skeleton.EmployeeList count={6} />
            </div>
        </div>
    );

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                    <Users size={20} className="text-amber-700 sm:hidden" />
                    <Users size={24} className="text-amber-700 hidden sm:block" />
                </div>
                <div className="flex-1 min-w-0">
                    <h2 className="text-base sm:text-xl font-bold text-gray-900 truncate">Gestion des Employés</h2>
                    <p className="text-xs sm:text-sm text-gray-500">{users.length} collaborateur{users.length > 1 ? 's' : ''} actif{users.length > 1 ? 's' : ''}</p>
                </div>
                {canAddEmployee && (
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 bg-[#FFB103] text-[#1a1a1a] px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold hover:bg-[#d49400] transition-colors shadow-sm shrink-0"
                    >
                        <Plus size={14} /> <span className="hidden sm:inline">Ajouter un employé</span><span className="sm:hidden">Ajouter</span>
                    </button>
                )}
            </div>

            {/* Barre de recherche */}
            <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Rechercher un collaborateur…"
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FFB103] bg-white"
                />
            </div>

            {/* Liste groupée */}
            {Object.entries(byRole).map(([role, roleUsers]) => {
                if (!roleUsers.length) return null;
                const Icon = ROLE_ICONS[role] || UserCircle;
                const colorCls = ROLE_COLORS[role] || 'bg-gray-100 text-gray-600';
                return (
                    <div key={role}>
                        <div className="flex items-center gap-2 mb-2 px-1">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${colorCls}`}>
                                <Icon size={11} /> {ROLE_LABELS[role]}
                            </span>
                            <span className="text-xs text-gray-400">{roleUsers.length} personne{roleUsers.length > 1 ? 's' : ''}</span>
                        </div>
                        <div className="space-y-1.5">
                            {roleUsers.map(u => (
                                <div
                                    key={u.id}
                                    className="bg-white rounded-xl border border-gray-100 shadow-sm flex items-center gap-4 px-4 py-3 hover:border-amber-200 transition-all group"
                                >
                                    {/* Avatar */}
                                    {u.avatar_path ? (
                                        <img src={`/hello-gestion/php/${u.avatar_path}`} alt="avatar"
                                            className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                                            <UserCircle size={22} className="text-amber-600" />
                                        </div>
                                    )}

                                    {/* Infos — cliquables pour ouvrir le casier */}
                                    <button
                                        onClick={() => onSelectUser(u)}
                                        className="flex-1 min-w-0 text-left"
                                    >
                                        <p className="font-semibold text-gray-800 truncate">
                                            {u.name}
                                            {u.id === currentUser?.id && (
                                                <span className="ml-2 text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">Vous</span>
                                            )}
                                        </p>
                                        <p className="text-xs text-gray-400 truncate">{u.email}</p>
                                    </button>

                                    {/* Actions */}
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        <button
                                            onClick={() => onSelectUser(u)}
                                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                            title="Ouvrir le casier"
                                        >
                                            <FolderOpen size={16} />
                                        </button>
                                        {isAdmin && u.id !== currentUser?.id && (
                                            <button
                                                onClick={() => handleDelete(u)}
                                                className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Désactiver ce compte"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}

            {filtered.length === 0 && (
                <div className="text-center py-14 text-gray-400">
                    <Users size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Aucun collaborateur trouvé</p>
                </div>
            )}

            {/* Modal ajout */}
            {showAddModal && (
                <AddEmployeeModal
                    onClose={() => setShowAddModal(false)}
                    onAdded={fetchUsers}
                />
            )}
        </div>
    );
};

// ── Composant principal AdminDossiers ─────────────────────

const AdminDossiers = ({ currentUser, initialUser = null }) => {
    const [selectedUser, setSelectedUser] = useState(initialUser);

    // Sync si initialUser change (navigation depuis Dashboard)
    React.useEffect(() => {
        if (initialUser) setSelectedUser(initialUser);
    }, [initialUser]);

    if (selectedUser) {
        return (
            <div>
                <button
                    onClick={() => setSelectedUser(null)}
                    className="flex items-center gap-2 text-sm text-amber-700 hover:text-amber-800 font-medium mb-5 group"
                >
                    <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                    Retour à la liste
                </button>

                <div className="flex items-center gap-3 mb-6">
                    {selectedUser.avatar_path ? (
                        <img src={`/hello-gestion/php/${selectedUser.avatar_path}`} alt="avatar"
                            className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                            <UserCircle size={26} className="text-amber-600" />
                        </div>
                    )}
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">
                            Casier de {selectedUser.name}
                            {selectedUser.id === currentUser?.id && (
                                <span className="ml-2 text-sm font-normal text-amber-600">(vous)</span>
                            )}
                        </h2>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${ROLE_COLORS[selectedUser.role] || 'bg-gray-100 text-gray-600'}`}>
                            {ROLE_LABELS[selectedUser.role] || selectedUser.role}
                        </span>
                    </div>
                </div>

                <Casier user={currentUser} targetUserId={selectedUser.id} targetUserRole={selectedUser.role} />
            </div>
        );
    }

    return <UserList currentUser={currentUser} onSelectUser={setSelectedUser} />;
};

export default AdminDossiers;
