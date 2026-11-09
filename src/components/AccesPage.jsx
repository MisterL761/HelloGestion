import React, { useEffect, useRef, useState } from 'react';
import { Users, X } from 'lucide-react';
import { accesSuiviCommandes } from '../utils/suiviCommandes';

/**
 * Badge « Accès » en haut à droite de chaque page : qui peut ouvrir la page affichée.
 * Visible uniquement par le développeur.
 *
 * Les règles reprennent celles du menu (Sidebar.jsx) et de l'affichage des pages (App.jsx) :
 * si une règle change là-bas, il faut la mettre à jour ici.
 */

const EMAILS_DEVELOPPEUR = ['lotfi.ksantinipro@gmail.com'];

const API_BASE = import.meta.env.VITE_API_BASE || import.meta.env.BASE_URL + 'php';

const LIBELLES_ROLES = {
    admin: 'Administrateur',
    gerant: 'Gérant',
    administration: 'Administration',
    chef_equipe: "Chef d'équipe",
    commercial: 'Commercial',
    poseur: 'Poseur',
    collaborateur: 'Collaborateur',
};

const DIRECTION = ['admin', 'gerant', 'administration'];
const TOUS_SAUF_COLLAB = ['admin', 'gerant', 'administration', 'chef_equipe', 'commercial', 'poseur'];
const GENERATEURS = ['admin', 'gerant', 'administration', 'chef_equipe', 'commercial'];

// id de la page (activeSidebar) → règle d'accès
const REGLES = {
    dashboard: { roles: DIRECTION },
    received: { roles: TOUS_SAUF_COLLAB },
    installed: { roles: TOUS_SAUF_COLLAB },
    defective: { roles: TOUS_SAUF_COLLAB },
    inventory: { roles: TOUS_SAUF_COLLAB },
    tools: { roles: TOUS_SAUF_COLLAB },
    orders: { roles: TOUS_SAUF_COLLAB },
    history: { roles: DIRECTION },
    'commandes-fournisseurs': { roles: TOUS_SAUF_COLLAB },
    'suivi-commandes': {
        personnes: (u) => {
            const a = accesSuiviCommandes(u);
            if (a.suivi && a.compta) return 'Suivi + BC & factures';
            if (a.suivi) return 'Suivi seulement';
            if (a.compta) return 'BC & factures seulement';
            return null;
        },
        note: 'Accès par personne (e-mail), pas par rôle.',
    },
    affaires: { roles: [...DIRECTION, 'collaborateur'], note: 'Les collaborateurs voient seulement leurs propres affaires.' },
    annuaire: { roles: TOUS_SAUF_COLLAB },
    'remises-fournisseurs': { roles: TOUS_SAUF_COLLAB },
    'boite-fournisseurs': { roles: DIRECTION },
    assistant: { roles: TOUS_SAUF_COLLAB },
    comparateur: { roles: TOUS_SAUF_COLLAB },
    'generateur-arc': { roles: TOUS_SAUF_COLLAB },
    'generateur-descriptifs': { roles: GENERATEURS },
    'generateur-courrier': { roles: GENERATEURS },
    'generateur-prompts': { roles: GENERATEURS },
    catalogue: { roles: TOUS_SAUF_COLLAB.filter(r => r !== 'poseur') },
    'calcul-chantier': { roles: DIRECTION },
    chantiers: { roles: DIRECTION },
    'sites-facturation': { roles: DIRECTION },
    rapports: { roles: DIRECTION },
    casier: { roles: TOUS_SAUF_COLLAB, note: 'Chacun ne voit que son propre casier.' },
    dossiers: { roles: DIRECTION },
    logs: { roles: ['admin'] },
    settings: { roles: Object.keys(LIBELLES_ROLES), note: 'Chacun ne voit que ses propres paramètres.' },
};

const AccesPage = ({ page, user }) => {
    const [utilisateurs, setUtilisateurs] = useState(null);
    const [ouvert, setOuvert] = useState(false);
    const ref = useRef(null);
    const estDeveloppeur = EMAILS_DEVELOPPEUR.includes(String(user?.email || '').trim().toLowerCase());

    useEffect(() => {
        if (!estDeveloppeur) return;
        fetch(`${API_BASE}/users.php`, { credentials: 'include' })
            .then(r => r.json())
            .then(d => setUtilisateurs(Array.isArray(d) ? d : (d.users || d.data || [])))
            .catch(() => setUtilisateurs([]));
    }, [estDeveloppeur]);

    // Fermeture au clic à l'extérieur
    useEffect(() => {
        if (!ouvert) return;
        const fermer = (e) => { if (ref.current && !ref.current.contains(e.target)) setOuvert(false); };
        document.addEventListener('mousedown', fermer);
        return () => document.removeEventListener('mousedown', fermer);
    }, [ouvert]);

    useEffect(() => { setOuvert(false); }, [page]);

    if (!estDeveloppeur) return null;
    const regle = REGLES[page];
    if (!regle) return null;

    // Seuls les comptes qui peuvent se connecter ont réellement accès
    const actifs = (utilisateurs || []).filter(u => String(u.app_access ?? '1') !== '0');
    const personnes = regle.personnes
        ? actifs.map(u => ({ ...u, detail: regle.personnes(u) })).filter(u => u.detail)
        : actifs.filter(u => regle.roles.includes(u.role)).map(u => ({ ...u, detail: LIBELLES_ROLES[u.role] || u.role }));
    const collaborateurs = regle.roles?.includes('collaborateur');

    return (
        <div ref={ref} className="relative flex-shrink-0">
            <button
                type="button"
                onClick={() => setOuvert(o => !o)}
                title="Qui a accès à cette page (visible uniquement par toi)"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 transition-colors"
            >
                <Users size={14} />
                <span className="hidden sm:inline">Accès :</span>
                {utilisateurs === null ? '…' : `${personnes.length} pers.${collaborateurs ? ' + collab.' : ''}`}
            </button>

            {ouvert && (
                <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl border border-gray-200 shadow-xl z-50 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                        <div>
                            <p className="text-sm font-bold text-gray-900">Qui a accès à cette page</p>
                            <p className="text-[11px] text-gray-400">Visible uniquement par toi</p>
                        </div>
                        <button type="button" onClick={() => setOuvert(false)} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100"><X size={16} /></button>
                    </div>

                    <div className="px-4 py-3 space-y-3 max-h-[60vh] overflow-y-auto">
                        {regle.roles && (
                            <div className="flex flex-wrap gap-1">
                                {regle.roles.map(r => (
                                    <span key={r} className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[11px] font-semibold">{LIBELLES_ROLES[r] || r}</span>
                                ))}
                            </div>
                        )}
                        {regle.note && <p className="text-xs text-gray-500">{regle.note}</p>}

                        {utilisateurs === null ? (
                            <p className="text-xs text-gray-400">Chargement…</p>
                        ) : (
                            <ul className="divide-y divide-gray-50">
                                {personnes.map(u => (
                                    <li key={u.id} className="py-1.5 flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-gray-800 truncate">{u.name}</p>
                                            <p className="text-[11px] text-gray-400 truncate">{u.email}</p>
                                        </div>
                                        <span className="text-[11px] text-gray-500 whitespace-nowrap">{u.detail}</span>
                                    </li>
                                ))}
                                {!personnes.length && <li className="py-2 text-xs text-gray-400">Personne pour l'instant.</li>}
                            </ul>
                        )}
                        {collaborateurs && (
                            <p className="text-xs text-gray-500">+ tous les comptes « Collaborateur » (non listés ici).</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AccesPage;
