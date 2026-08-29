import React, { useState, useEffect, useCallback } from 'react';
import { Plus, User, RefreshCw, Handshake, ChevronRight, Eye, Mail, Euro, ChevronDown, FolderClosed, Inbox, FolderPlus, Pencil, Trash2, Archive, CheckCircle2 } from 'lucide-react';
import AddAffaireModal from './AddAffaireModal';
import EditAffaireModal from './EditAffaireModal';
import AffaireDetailDrawer from './AffaireDetailDrawer';
import { useToast, useConfirm } from './ToastProvider';

const API_BASE = import.meta.env.VITE_API_BASE || '/hello-gestion/php';

const STATUSES = [
    { value: 'a_traiter',  label: 'À traiter',  dot: 'bg-amber-400',  badge: 'bg-amber-50  text-amber-700  border-amber-200'  },
    { value: 'en_cours',   label: 'En cours',   dot: 'bg-blue-500',   badge: 'bg-blue-50   text-blue-700   border-blue-200'   },
    { value: 'rdv_pris',   label: 'RDV pris',   dot: 'bg-violet-500', badge: 'bg-violet-50 text-violet-700 border-violet-200' },
    { value: 'accepte',    label: 'Accepté',    dot: 'bg-green-500',  badge: 'bg-green-50  text-green-700  border-green-200'  },
    { value: 'refuse',     label: 'Refusé',     dot: 'bg-red-500',    badge: 'bg-red-50    text-red-700    border-red-200'    },
    { value: 'sans_suite', label: 'Sans suite', dot: 'bg-gray-400',   badge: 'bg-gray-100  text-gray-500   border-gray-200'   },
];

// Montant en euros, sans décimales (ex. "1 200 €")
const fEuro = (n) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0);

// "relancé il y a 2j" / "à l'instant" — à partir d'une datetime SQL
const timeAgo = (sqlDate) => {
    if (!sqlDate) return null;
    const then = new Date(sqlDate.replace(' ', 'T'));
    if (isNaN(then)) return null;
    const sec = Math.floor((Date.now() - then.getTime()) / 1000);
    if (sec < 60)    return "à l'instant";
    const min = Math.floor(sec / 60);
    if (min < 60)    return `il y a ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24)      return `il y a ${h}h`;
    const d = Math.floor(h / 24);
    if (d < 30)      return `il y a ${d}j`;
    const mo = Math.floor(d / 30);
    return `il y a ${mo} mois`;
};

const StatusBadge = ({ status }) => {
    const s = STATUSES.find(x => x.value === status) || STATUSES[0];
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${s.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
            {s.label}
        </span>
    );
};

const Affaires = ({ user }) => {
    const toast   = useToast();
    const confirm = useConfirm();

    const isAdmin        = ['admin', 'gerant', 'administration'].includes(user?.role);
    const isCollaborateur = user?.role === 'collaborateur';

    // Rôle de gestion, tolérant casse/accents (ex. "Gérant" == "gerant")
    const normRole = (user?.role || '')
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const isManagement = ['admin', 'gerant', 'administration'].includes(normRole);

    const [affaires, setAffaires]       = useState([]);
    const [loading, setLoading]         = useState(true);
    const [showAdd, setShowAdd]           = useState(false);
    const [editAffaire, setEditAffaire]   = useState(null);
    const [detailAffaire, setDetailAffaire] = useState(null);

    const [dossiers, setDossiers]             = useState([]);
    const [newDossierName, setNewDossierName] = useState('');
    const [expandedGroups, setExpandedGroups] = useState({});

    const toggleGroup = (groupName) => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupName]: !prev[groupName]
        }));
    };

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res  = await fetch(`${API_BASE}/affaires_api.php`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) setAffaires(data.data);
            else toast.error('Erreur chargement affaires');
        } catch { toast.error('Erreur réseau'); }
        finally { setLoading(false); }
    }, []);

    const loadDossiers = async () => {
        try {
            const res = await fetch(`${API_BASE}/affaire_dossiers_api.php?action=list`, { credentials: 'include' })
                .then(r => r.json());
            if (res.success) setDossiers(res.data || []);
        } catch { /* silencieux : la vue par dossier restera vide */ }
    };

    useEffect(() => { load(); loadDossiers(); }, [load]);

    const handleAdd = async (form, file) => {
        try {
            let body, headers = {};
            if (file) {
                const fd = new FormData();
                Object.entries(form).forEach(([k, v]) => fd.append(k, v));
                fd.append('attachment', file);
                body = fd;
            } else {
                headers['Content-Type'] = 'application/json';
                body = JSON.stringify(form);
            }
            const res  = await fetch(`${API_BASE}/affaires_api.php`, {
                method: 'POST', headers, credentials: 'include', body,
            });
            const data = await res.json();
            if (data.success) { await load(); toast.success('Affaire créée ✓'); }
            else toast.error(data.message || 'Erreur');
        } catch { toast.error('Erreur réseau'); }
    };

    const handleSave = async (form, file) => {
        try {
            const res  = await fetch(`${API_BASE}/affaires_api.php`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                credentials: 'include', body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!data.success) { toast.error(data.message || 'Erreur'); return; }

            if (file) {
                const fd = new FormData();
                fd.append('id', form.id);
                fd.append('attachment', file);
                await fetch(`${API_BASE}/affaires_api.php?upload_attachment=1`, {
                    method: 'POST', credentials: 'include', body: fd,
                });
            }

            await load();
            toast.success('Affaire mise à jour ✓');
        } catch { toast.error('Erreur réseau'); }
    };

    const handleDelete = async (id) => {
        if (!await confirm('Supprimer cette affaire ?')) return;
        try {
            const res  = await fetch(`${API_BASE}/affaires_api.php?id=${id}`, { method: 'DELETE', credentials: 'include' });
            const data = await res.json();
            if (data.success) { setAffaires(p => p.filter(a => a.id !== id)); toast.success('Affaire supprimée'); }
            else toast.error(data.message || 'Erreur');
        } catch { toast.error('Erreur réseau'); }
    };

    const handleSendReminder = async (affaire) => {
        if (!affaire.assigned_to) { toast.error('Aucun collaborateur assigné'); return; }
        try {
            const res  = await fetch(`${API_BASE}/affaires_api.php?action=send_reminder`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                credentials: 'include', body: JSON.stringify({ affaire_id: affaire.id }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Relance envoyée ✓');
                setAffaires(p => p.map(a => a.id === affaire.id ? { ...a, last_reminder_at: data.last_reminder_at } : a));
            }
            else toast.error(data.message || 'Erreur lors de l\'envoi');
        } catch { toast.error('Erreur réseau'); }
    };

    // Changement rapide de statut inline
    const handleStatusChange = async (affaire, newStatus) => {
        try {
            const res  = await fetch(`${API_BASE}/affaires_api.php`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ ...affaire, id: affaire.id, status: newStatus }),
            });
            const data = await res.json();
            if (data.success) {
                setAffaires(p => p.map(a => a.id === affaire.id ? { ...a, status: newStatus } : a));
            } else toast.error(data.message || 'Erreur');
        } catch { toast.error('Erreur réseau'); }
    };

    // Déplacement d'une affaire vers un dossier (ou hors dossier) — optimiste + rollback
    const moveAffaire = async (affaireId, dossierId) => {
        const prev = affaires;
        // Mise à jour optimiste
        setAffaires(p => p.map(a => a.id === affaireId ? { ...a, dossier_id: dossierId } : a));
        try {
            const res = await fetch(`${API_BASE}/affaire_dossiers_api.php?action=move`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ affaire_id: affaireId, dossier_id: dossierId }),
            }).then(r => r.json());
            if (!res.success) { setAffaires(prev); toast.error(res.message || 'Déplacement impossible'); return; }
            loadDossiers(); // rafraîchir les compteurs
        } catch {
            setAffaires(prev);
            toast.error('Déplacement impossible');
        }
    };

    // Création d'un dossier (gestion uniquement)
    const createDossier = async () => {
        const name = newDossierName.trim();
        if (!name) { toast.error('Le nom du dossier est requis'); return; }
        try {
            const res = await fetch(`${API_BASE}/affaire_dossiers_api.php?action=create`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                credentials: 'include', body: JSON.stringify({ name }),
            }).then(r => r.json());
            if (!res.success) { toast.error(res.message || 'Création impossible'); return; }
            setDossiers(p => [...p, res.data]);
            setNewDossierName('');
            toast.success('Dossier créé');
        } catch { toast.error('Création impossible'); }
    };

    // Renommage d'un dossier (gestion uniquement)
    const renameDossier = async (id, current) => {
        const name = window.prompt('Nouveau nom du dossier :', current);
        if (name === null) return;
        if (!name.trim()) { toast.error('Le nom du dossier est requis'); return; }
        try {
            const res = await fetch(`${API_BASE}/affaire_dossiers_api.php?action=rename`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                credentials: 'include', body: JSON.stringify({ id, name: name.trim() }),
            }).then(r => r.json());
            if (!res.success) { toast.error(res.message || 'Renommage impossible'); return; }
            setDossiers(p => p.map(d => d.id === id ? { ...d, name: name.trim() } : d));
            toast.success('Dossier renommé');
        } catch { toast.error('Renommage impossible'); }
    };

    // Suppression d'un dossier (gestion uniquement) — les affaires repassent en « Sans dossier »
    const deleteDossier = async (id) => {
        const okConfirm = await confirm('Supprimer ce dossier ? Les affaires ne seront pas supprimées : elles repasseront dans « Sans dossier ».');
        if (!okConfirm) return;
        try {
            const res = await fetch(`${API_BASE}/affaire_dossiers_api.php?action=delete`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                credentials: 'include', body: JSON.stringify({ id }),
            }).then(r => r.json());
            if (!res.success) { toast.error(res.message || 'Suppression impossible'); return; }
            setDossiers(p => p.filter(d => d.id !== id));
            toast.success('Dossier supprimé');
            load(); // recharge les affaires : celles du dossier repassent en "Sans dossier"
        } catch { toast.error('Suppression impossible'); }
    };

    // Total des commissions de toutes les affaires (et part déjà payée)
    const totalCommission      = affaires.reduce((sum, a) => sum + (Number(a.commission) || 0), 0);
    const totalCommissionPayee = affaires.reduce((sum, a) => sum + (a.commission_payee ? (Number(a.commission) || 0) : 0), 0);

    // Dossier système "Payé" (archives, géré automatiquement via la case "Commission payée") vs dossiers normaux
    const payeDossier    = dossiers.find(d => d.is_system);
    const normalDossiers = dossiers.filter(d => !d.is_system);

    // Regroupement par dossier (id -> affaires) + affaires sans dossier
    const affairesParDossier = {};
    dossiers.forEach(d => { affairesParDossier[d.id] = []; });
    const sansDossier = [];
    affaires.forEach(a => {
        const did = a.dossier_id;
        if (did && affairesParDossier[did]) affairesParDossier[did].push(a);
        else sansDossier.push(a);
    });
    const payeesArchivees = payeDossier ? (affairesParDossier[payeDossier.id] || []) : [];

    // Cible de dépôt : dépose une affaire glissée sur un dossier (ou null = Sans dossier)
    const handleDropOnDossier = (e, dossierId) => {
        e.preventDefault();
        const raw = e.dataTransfer.getData('text/affaire');
        const id = parseInt(raw, 10);
        if (id) moveAffaire(id, dossierId);
    };
    const allowDrop = (e) => e.preventDefault();

    const renderAffaireCard = (a) => (
        <div key={a.id}
            onClick={() => setDetailAffaire(a)}
            draggable={!a.commission_payee}
            onDragStart={e => {
                e.dataTransfer.setData('text/affaire', String(a.id));
                e.dataTransfer.effectAllowed = 'move';
            }}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-3 sm:px-4 sm:py-3 flex flex-col sm:flex-row sm:items-center gap-3 cursor-pointer">

            {/* Ligne haut : avatar + identité (+ statut sur mobile) */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Avatar */}
                <div className="w-9 h-9 rounded-xl bg-[#1a1a1a] flex items-center justify-center flex-shrink-0">
                    <User size={16} className="text-[#FFB103]" />
                </div>

                {/* Nom + sous-infos */}
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm truncate">{a.prenom} {a.nom}</p>
                    {isAdmin && a.assigned_to_name ? (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">
                            → {a.assigned_to_name}
                            {a.interlocuteur_name && <span className="font-semibold text-gray-600"> ({a.interlocuteur_name})</span>}
                        </p>
                    ) : (
                        a.interlocuteur_name && (
                            <p className="text-xs text-amber-700 mt-0.5 font-semibold">
                                Attribué à : {a.interlocuteur_name}
                            </p>
                        )
                    )}
                    {isAdmin && a.last_view_at && (
                        <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1 truncate">
                            <Eye size={10} className="shrink-0" /> vu {timeAgo(a.last_view_at)}
                        </p>
                    )}
                    {isAdmin && a.last_reminder_at && (
                        <p className="text-[11px] text-amber-600 mt-0.5 flex items-center gap-1 truncate">
                            <Mail size={10} className="shrink-0" /> relancé {timeAgo(a.last_reminder_at)}
                        </p>
                    )}
                </div>

                {/* Statut — visible en haut à droite sur mobile */}
                <div className="sm:hidden shrink-0">
                    <StatusBadge status={a.status} />
                </div>
            </div>

            {/* Badges : commission + vues + statut (desktop) */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                {Number(a.commission) > 0 && (
                    <div className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg border font-bold shrink-0 bg-green-50 text-green-700 border-green-200">
                        <Euro size={11} /> {fEuro(a.commission)}
                    </div>
                )}
                {!!a.commission_payee && (
                    <div className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg border font-bold shrink-0 bg-emerald-100 text-emerald-800 border-emerald-300">
                        <CheckCircle2 size={11} /> Payée
                    </div>
                )}
                {isAdmin && (
                    <div className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg border font-semibold shrink-0 ${
                        a.views_total > 0 ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-gray-50 text-gray-400 border-gray-200'
                    }`}>
                        <Eye size={11} /> {a.views_total || 0}
                    </div>
                )}
                <div className="hidden sm:block shrink-0">
                    <StatusBadge status={a.status} />
                </div>
                <select
                    value={a.dossier_id || ''}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                        const v = e.target.value;
                        moveAffaire(a.id, v === '' ? null : parseInt(v, 10));
                    }}
                    disabled={!!a.commission_payee}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={a.commission_payee ? 'Décochez "Commission payée" pour déplacer cette affaire' : 'Déplacer vers un dossier'}>
                    <option value="">Sans dossier</option>
                    {normalDossiers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
                {isAdmin && (
                    <button
                        onClick={(e) => { e.stopPropagation(); handleSendReminder(a); }}
                        title="Envoyer une relance au collaborateur"
                        className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-red-100 hover:text-red-600 transition-colors shrink-0"
                    >
                        <Mail size={16} />
                    </button>
                )}
                <button
                    onClick={(e) => { e.stopPropagation(); setDetailAffaire(a); }}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-[#FFB103] text-[#1a1a1a] rounded-xl text-xs font-bold hover:bg-[#d49400] transition-colors"
                >
                    Ouvrir <ChevronRight size={13} />
                </button>
            </div>
        </div>
    );

    return (
        <div className="space-y-5">

            {/* En-tête */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
                        <Handshake size={22} className="text-[#FFB103]" />
                        Affaires
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {affaires.length} affaire{affaires.length > 1 ? 's' : ''}
                        {isCollaborateur && ' · Leads qui vous ont été envoyés'}
                    </p>
                    {totalCommission > 0 && (
                        <p className="text-sm font-bold text-green-700 mt-1 flex items-center gap-1">
                            <Euro size={14} /> {fEuro(totalCommission)} de commission
                        </p>
                    )}
                    {totalCommissionPayee > 0 && (
                        <p className="text-xs font-semibold text-emerald-700 mt-0.5 flex items-center gap-1">
                            <CheckCircle2 size={12} /> dont {fEuro(totalCommissionPayee)} payée
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={load} className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:border-[#FFB103] hover:text-[#FFB103] transition-colors" title="Actualiser">
                        <RefreshCw size={16} />
                    </button>
                    {isAdmin && (
                        <button
                            onClick={() => setShowAdd(true)}
                            className="flex items-center gap-2 bg-[#FFB103] text-[#1a1a1a] px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-[#d49400] transition-colors shadow-sm"
                        >
                            <Plus size={16} /> Nouvelle affaire
                        </button>
                    )}
                </div>
            </div>

            {/* Liste */}
            {loading ? (
                <div className="flex items-center justify-center py-16 text-gray-400 gap-3">
                    <div className="w-5 h-5 border-2 border-[#FFB103] border-t-transparent rounded-full animate-spin" />
                    Chargement…
                </div>
            ) : affaires.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                    <div className="w-14 h-14 bg-[#FFB103]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Handshake size={26} className="text-[#FFB103]" />
                    </div>
                    <p className="font-bold text-gray-800">Aucune affaire</p>
                    <p className="text-sm text-gray-400 mt-1">
                        {isAdmin ? 'Crée ta première affaire et assigne-la à un collaborateur.' : 'Aucun lead ne t\'a encore été envoyé.'}
                    </p>
                    {isAdmin && (
                        <button onClick={() => setShowAdd(true)} className="mt-4 bg-[#FFB103] text-[#1a1a1a] px-5 py-2.5 rounded-xl text-sm font-bold inline-flex items-center gap-2 hover:bg-[#d49400] transition-colors">
                            <Plus size={15} /> Nouvelle affaire
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {isManagement && (
                        <div className="flex items-center gap-2">
                            <input
                                value={newDossierName}
                                onChange={(e) => setNewDossierName(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') createDossier(); }}
                                placeholder="Nom du nouveau dossier (ex. Renostyle)"
                                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2" />
                            <button onClick={createDossier}
                                    className="flex items-center gap-1 text-sm px-3 py-2 rounded-lg bg-[#1a1a1a] text-[#FFB103] font-semibold hover:opacity-90">
                                <FolderPlus size={16} /> Nouveau dossier
                            </button>
                        </div>
                    )}
                    {normalDossiers.map(d => {
                        const items = affairesParDossier[d.id] || [];
                        const isExpanded = !!expandedGroups['dossier_' + d.id];
                        return (
                            <div key={'d' + d.id}
                                 onDragOver={allowDrop}
                                 onDrop={(e) => handleDropOnDossier(e, d.id)}
                                 className="border border-gray-100 bg-gray-50/10 rounded-2xl overflow-hidden shadow-sm">
                                <div onClick={() => toggleGroup('dossier_' + d.id)}
                                     className="flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 border-b border-gray-100 cursor-pointer select-none transition-colors">
                                    <div className="flex items-center gap-2">
                                        <FolderClosed size={16} className="text-[#FFB103]" />
                                        <span className="font-bold text-gray-800 text-sm">{d.name}</span>
                                        <span className="text-xs bg-amber-100 text-amber-800 font-extrabold px-2 py-0.5 rounded-full">
                                            {items.length}
                                        </span>
                                    </div>
                                    <div className="flex items-center">
                                        {isManagement && (
                                            <div className="flex items-center gap-1 mr-2" onClick={(e) => e.stopPropagation()}>
                                                <button onClick={() => renameDossier(d.id, d.name)}
                                                        className="p-1 text-gray-400 hover:text-gray-700" title="Renommer">
                                                    <Pencil size={14} />
                                                </button>
                                                <button onClick={() => deleteDossier(d.id)}
                                                        className="p-1 text-gray-400 hover:text-red-600" title="Supprimer">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        )}
                                        <div className="text-gray-400">
                                            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                        </div>
                                    </div>
                                </div>
                                {isExpanded && (
                                    <div className="p-3 space-y-2 bg-white border-t border-gray-50">
                                        {items.length === 0
                                            ? <p className="text-xs text-gray-400 px-1 py-2">Aucune affaire dans ce dossier.</p>
                                            : items.map(a => renderAffaireCard(a))}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Section Sans dossier */}
                    <div className="border border-dashed border-gray-200 bg-gray-50/30 rounded-2xl overflow-hidden"
                         onDragOver={allowDrop}
                         onDrop={(e) => handleDropOnDossier(e, null)}>
                        <div onClick={() => toggleGroup('dossier_none')}
                             className="flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 border-b border-gray-100 cursor-pointer select-none">
                            <div className="flex items-center gap-2">
                                <Inbox size={16} className="text-gray-400" />
                                <span className="font-bold text-gray-600 text-sm">Sans dossier</span>
                                <span className="text-xs bg-gray-100 text-gray-500 font-extrabold px-2 py-0.5 rounded-full">
                                    {sansDossier.length}
                                </span>
                            </div>
                            <div className="text-gray-400">
                                {expandedGroups['dossier_none'] ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                            </div>
                        </div>
                        {expandedGroups['dossier_none'] && (
                            <div className="p-3 space-y-2 bg-white border-t border-gray-50">
                                {sansDossier.map(a => renderAffaireCard(a))}
                            </div>
                        )}
                    </div>

                    {/* Archives : affaires dont la commission a été marquée payée (dossier "Payé" géré automatiquement) */}
                    {payeDossier && payeesArchivees.length > 0 && (
                        <div className="border border-gray-200 bg-gray-100/50 rounded-2xl overflow-hidden">
                            <div onClick={() => toggleGroup('dossier_' + payeDossier.id)}
                                 className="flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 border-b border-gray-200 cursor-pointer select-none transition-colors">
                                <div className="flex items-center gap-2">
                                    <Archive size={16} className="text-gray-400" />
                                    <span className="font-bold text-gray-500 text-sm">Payé</span>
                                    <span className="text-[10px] uppercase tracking-wide font-bold text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">
                                        Archives
                                    </span>
                                    <span className="text-xs bg-gray-200 text-gray-500 font-extrabold px-2 py-0.5 rounded-full">
                                        {payeesArchivees.length}
                                    </span>
                                    {totalCommissionPayee > 0 && (
                                        <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                                            <Euro size={12} /> {fEuro(totalCommissionPayee)}
                                        </span>
                                    )}
                                </div>
                                <div className="text-gray-400">
                                    {expandedGroups['dossier_' + payeDossier.id] ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                </div>
                            </div>
                            {expandedGroups['dossier_' + payeDossier.id] && (
                                <div className="p-3 space-y-2 bg-white border-t border-gray-50 opacity-90">
                                    {payeesArchivees.map(a => renderAffaireCard(a))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            <AddAffaireModal isOpen={showAdd} onClose={() => setShowAdd(false)} onAdd={handleAdd} />
            <EditAffaireModal
                isOpen={!!editAffaire}
                onClose={() => setEditAffaire(null)}
                affaire={editAffaire}
                onSave={handleSave}
                isAdmin={isAdmin}
            />
            {detailAffaire && (
                <AffaireDetailDrawer
                    affaire={detailAffaire}
                    isAdmin={isAdmin}
                    isCollaborateur={isCollaborateur}
                    onClose={() => setDetailAffaire(null)}
                    onStatusChange={(id, newStatus) => setAffaires(p => p.map(a => a.id === id ? { ...a, status: newStatus } : a))}
                    onEdit={(a) => { setEditAffaire(a); setDetailAffaire(null); }}
                    onDelete={handleDelete}
                    onRefresh={load}
                />
            )}
        </div>
    );
};

export default Affaires;
