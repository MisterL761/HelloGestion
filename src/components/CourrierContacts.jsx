import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Pencil, Trash2, Loader2, Mail, ChevronDown, ChevronUp, FileText, CopyPlus } from 'lucide-react';
import CourrierContactForm from './CourrierContactForm';
import { typeContactLabel, typeCourrierLabel, contactDisplayName } from '../utils/courrierConstants';

const API_BASE = import.meta.env.VITE_API_BASE || '/hello-gestion/php';

const BADGES = {
    client:         'bg-emerald-50 text-emerald-700',
    fournisseur:    'bg-blue-50 text-blue-700',
    administration: 'bg-purple-50 text-purple-700',
    partenaire:     'bg-amber-50 text-amber-700',
    autre:          'bg-gray-100 text-gray-600',
};

const HistoriqueCourriers = ({ contact, onOpenCourrier }) => {
    const [courriers, setCourriers] = useState(null); // null = pas encore chargé
    const [error, setError] = useState('');

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`${API_BASE}/courriers_api.php?contact_id=${contact.id}`, { credentials: 'include' });
                const data = await res.json();
                if (!data.success) throw new Error(data.message);
                setCourriers(data.data);
            } catch (e) {
                setError('Historique indisponible : ' + e.message);
            }
        })();
    }, [contact.id]);

    if (error) return <p className="text-xs text-red-500 mt-2">{error}</p>;
    if (courriers === null) return <Loader2 size={14} className="animate-spin text-gray-300 mt-2" />;
    if (courriers.length === 0) return <p className="text-xs text-gray-400 mt-2">Aucun courrier pour cet interlocuteur.</p>;

    return (
        <div className="mt-2 space-y-1.5">
            {courriers.map(c => (
                <div key={c.id} className="flex items-center justify-between gap-2 bg-gray-50 rounded-lg px-2.5 py-2">
                    <div className="min-w-0">
                        <p className="text-xs font-medium text-[#1a1a1a] truncate" title={c.objet}>{c.objet}</p>
                        <p className="text-[11px] text-gray-400">
                            {new Date(c.created_at.replace(' ', 'T')).toLocaleDateString('fr-FR')}
                            {' · '}{typeCourrierLabel(c.type_courrier)}
                            {c.created_by_name ? ` · ${c.created_by_name}` : ''}
                        </p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => onOpenCourrier(c, contact, false)} title="Rouvrir (réimprimer)"
                            className="p-1.5 rounded-lg hover:bg-white text-gray-400 hover:text-gray-600">
                            <FileText size={13} />
                        </button>
                        <button onClick={() => onOpenCourrier(c, contact, true)} title="Repartir comme modèle"
                            className="p-1.5 rounded-lg hover:bg-white text-gray-400 hover:text-gray-600">
                            <CopyPlus size={13} />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};

const CourrierContacts = ({ user, canOpenCourrier, onOpenCourrier }) => {
    const role = user?.role ?? '';
    const canDelete = ['admin', 'gerant'].includes(role);

    const [contacts, setContacts]       = useState([]);
    const [loading, setLoading]         = useState(true);
    const [query, setQuery]             = useState('');
    const [editing, setEditing]         = useState(null);   // null | {} (création) | contact
    const [error, setError]             = useState('');
    const [openHistoId, setOpenHistoId] = useState(null);

    const load = useCallback(async (q = '') => {
        setLoading(true);
        try {
            const url = q.trim().length >= 2
                ? `${API_BASE}/courrier_contacts_api.php?q=${encodeURIComponent(q.trim())}`
                : `${API_BASE}/courrier_contacts_api.php`;
            const res = await fetch(url, { credentials: 'include' });
            const data = await res.json();
            if (data.success) setContacts(data.data);
        } catch {
            setError('Chargement impossible');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const t = setTimeout(() => load(query), query ? 300 : 0);
        return () => clearTimeout(t);
    }, [query, load]);

    const remove = async (contact) => {
        if (!window.confirm(`Supprimer ${contactDisplayName(contact)} et tous ses courriers ?`)) return;
        try {
            const res = await fetch(`${API_BASE}/courrier_contacts_api.php?id=${contact.id}`, {
                method: 'DELETE', credentials: 'include',
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.message);
            setContacts(prev => prev.filter(c => c.id !== contact.id));
        } catch (e) {
            setError('Suppression impossible : ' + e.message);
        }
    };

    return (
        <div>
            <div className="flex items-center gap-2 mb-4 flex-wrap">
                <div className="relative flex-1 max-w-md min-w-[220px]">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Rechercher (nom, société, ville, téléphone…)"
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#FFB103]"
                    />
                </div>
                <button
                    onClick={() => setEditing({})}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-[#FFB103] text-[#1a1a1a] hover:bg-[#d49400]"
                >
                    <Plus size={15} /> Nouvel interlocuteur
                </button>
            </div>

            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

            {loading ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-gray-300" /></div>
            ) : contacts.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-10">
                    {query ? 'Aucun résultat.' : 'Aucun interlocuteur enregistré pour le moment.'}
                </p>
            ) : (
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {contacts.map(c => (
                        <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="font-semibold text-[#1a1a1a] text-sm truncate">{contactDisplayName(c)}</p>
                                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${BADGES[c.type] || BADGES.autre}`}>
                                        {typeContactLabel(c.type)}
                                    </span>
                                </div>
                                <div className="flex gap-1 flex-shrink-0">
                                    <button onClick={() => setEditing(c)} title="Modifier"
                                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                                        <Pencil size={14} />
                                    </button>
                                    {canDelete && (
                                        <button onClick={() => remove(c)} title="Supprimer"
                                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="mt-2 text-xs text-gray-500 space-y-0.5">
                                {c.adresse && <p>{c.adresse}</p>}
                                {(c.code_postal || c.ville) && <p>{[c.code_postal, c.ville].filter(Boolean).join(' ')}</p>}
                                {c.telephone && <p>{c.telephone}</p>}
                                {c.email && <p className="truncate">{c.email}</p>}
                                {c.notes && <p className="italic text-gray-400 truncate" title={c.notes}>{c.notes}</p>}
                            </div>
                            {canOpenCourrier && (
                                <div className="mt-3 pt-2 border-t border-gray-50">
                                    <button
                                        onClick={() => setOpenHistoId(openHistoId === c.id ? null : c.id)}
                                        className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-[#1a1a1a]"
                                    >
                                        <Mail size={12} />
                                        Courriers
                                        {openHistoId === c.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                    </button>
                                    {openHistoId === c.id && (
                                        <HistoriqueCourriers contact={c} onOpenCourrier={onOpenCourrier} />
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {editing !== null && (
                <CourrierContactForm
                    contact={editing.id ? editing : null}
                    onClose={() => setEditing(null)}
                    onSaved={(saved) => {
                        setEditing(null);
                        setContacts(prev => {
                            const exists = prev.some(c => c.id === saved.id);
                            return exists ? prev.map(c => c.id === saved.id ? saved : c) : [saved, ...prev];
                        });
                    }}
                />
            )}
        </div>
    );
};

export default CourrierContacts;
