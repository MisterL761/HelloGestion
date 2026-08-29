import React, { useState, useEffect, useCallback } from 'react';
import { Mail, Users, Settings } from 'lucide-react';
import CourrierEditor from './CourrierEditor';
import CourrierContacts from './CourrierContacts';
import CourrierReglages from './CourrierReglages';

const API_BASE = import.meta.env.VITE_API_BASE || '/hello-gestion/php';

const ROLES_COURRIER = ['admin', 'gerant', 'administration', 'chef_equipe', 'commercial'];
const ROLES_REGLAGES = ['admin', 'gerant'];

const GenerateurCourrier = ({ user }) => {
    const role      = user?.role ?? '';
    const canWrite  = ROLES_COURRIER.includes(role);
    const canConfig = ROLES_REGLAGES.includes(role);

    const [tab, setTab]       = useState(canWrite ? 'courrier' : 'contacts');
    const [config, setConfig] = useState(null);

    // Courrier rouvert depuis l'historique (ou repris comme modèle)
    const [loadedCourrier, setLoadedCourrier] = useState(null);
    const [loadedContact, setLoadedContact]   = useState(null);

    useEffect(() => {
        fetch(`${API_BASE}/courrier_config_api.php`, { credentials: 'include' })
            .then(r => r.json())
            .then(d => { if (d.success) setConfig(d.data); })
            .catch(() => {});
    }, []);

    const openCourrier = useCallback((courrier, contact, asModel = false) => {
        setLoadedCourrier(asModel ? { ...courrier, id: null, created_at: null } : courrier);
        setLoadedContact(contact);
        setTab('courrier');
    }, []);

    const consumeLoaded = useCallback(() => {
        setLoadedCourrier(null);
        setLoadedContact(null);
    }, []);

    const tabs = [
        ...(canWrite ? [{ id: 'courrier', label: 'Nouveau courrier', icon: Mail }] : []),
        { id: 'contacts', label: 'Interlocuteurs', icon: Users },
        ...(canConfig ? [{ id: 'reglages', label: 'Réglages en-tête', icon: Settings }] : []),
    ];

    return (
        <div className="mt-6">
            <div className="no-print flex items-center gap-2 mb-4 flex-wrap">
                {tabs.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        onClick={() => setTab(id)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                            tab === id
                                ? 'bg-[#FFB103] text-[#1a1a1a]'
                                : 'bg-white text-gray-600 border border-gray-200 hover:border-[#FFB103]/50'
                        }`}
                    >
                        <Icon size={15} />
                        {label}
                    </button>
                ))}
            </div>

            {canConfig && config && !config.adresse && tab !== 'reglages' && (
                <div className="no-print mb-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm">
                    Les coordonnées de l'en-tête ne sont pas encore renseignées —
                    <button onClick={() => setTab('reglages')} className="underline font-medium ml-1">
                        remplir les réglages en-tête
                    </button>
                </div>
            )}

            {tab === 'courrier' && canWrite && (
                <CourrierEditor
                    config={config}
                    loadedCourrier={loadedCourrier}
                    loadedContact={loadedContact}
                    onConsumeLoaded={consumeLoaded}
                />
            )}
            {tab === 'contacts' && (
                <CourrierContacts user={user} canOpenCourrier={canWrite} onOpenCourrier={openCourrier} />
            )}
            {tab === 'reglages' && canConfig && (
                <CourrierReglages config={config} onSaved={setConfig} />
            )}
        </div>
    );
};

export default GenerateurCourrier;
