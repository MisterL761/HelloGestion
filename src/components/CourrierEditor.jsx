import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Plus, X, Mic, Square, Wand2, Loader2 } from 'lucide-react';
import CourrierPreview from './CourrierPreview';
import CourrierContactForm from './CourrierContactForm';
import { TYPES_COURRIER, TONS, contactDisplayName } from '../utils/courrierConstants';

const API_BASE = import.meta.env.VITE_API_BASE || '/hello-gestion/php';
const SR = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;

const input = 'w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#FFB103]';

const CourrierEditor = ({ config, loadedCourrier, loadedContact, onConsumeLoaded }) => {
    // Destinataire
    const [contact, setContact]       = useState(null);
    const [query, setQuery]           = useState('');
    const [results, setResults]       = useState([]);
    const [searching, setSearching]   = useState(false);
    const [showCreate, setShowCreate] = useState(false);

    // Courrier
    const [reference, setReference]       = useState('');
    const [objet, setObjet]               = useState('');
    const [typeCourrier, setTypeCourrier] = useState('simple');
    const [ton, setTon]                   = useState('professionnel');
    const [brouillon, setBrouillon]       = useState('');
    const [corps, setCorps]               = useState('');
    const [courrierId, setCourrierId]     = useState(null);
    const [dateCourrier, setDateCourrier] = useState(null); // null = aujourd'hui

    // UI
    const [reformulating, setReformulating] = useState(false);
    const [saving, setSaving]       = useState(false);
    const [savedMsg, setSavedMsg]   = useState('');
    const [error, setError]         = useState('');
    const [listening, setListening] = useState(false);
    const recRef = useRef(null);

    // ── Réouverture depuis l'historique ───────────────────────
    useEffect(() => {
        if (!loadedCourrier) return;
        setContact(loadedContact);
        setReference(loadedCourrier.reference || '');
        setObjet(loadedCourrier.objet || '');
        setTypeCourrier(loadedCourrier.type_courrier || 'simple');
        setTon(loadedCourrier.ton || 'professionnel');
        setBrouillon(loadedCourrier.brouillon || '');
        setCorps(loadedCourrier.corps || '');
        setCourrierId(loadedCourrier.id || null);
        setDateCourrier(loadedCourrier.created_at || null);
        setSavedMsg(''); setError('');
        onConsumeLoaded();
    }, [loadedCourrier, loadedContact, onConsumeLoaded]);

    // ── Recherche destinataire (debounce 300 ms) ──────────────
    useEffect(() => {
        if (query.trim().length < 2) { setResults([]); return; }
        setSearching(true);
        const t = setTimeout(async () => {
            try {
                const res = await fetch(
                    `${API_BASE}/courrier_contacts_api.php?q=${encodeURIComponent(query.trim())}`,
                    { credentials: 'include' }
                );
                const data = await res.json();
                setResults(data.success ? data.data : []);
            } catch {
                setResults([]);
            } finally {
                setSearching(false);
            }
        }, 300);
        return () => clearTimeout(t);
    }, [query]);

    const pickContact = (c) => {
        setContact(c);
        setQuery('');
        setResults([]);
    };

    // ── Dictée (Web Speech API) ───────────────────────────────
    const toggleDictee = useCallback(() => {
        if (listening) { recRef.current?.stop(); return; }
        const rec = new SR();
        rec.lang = 'fr-FR';
        rec.continuous = true;
        rec.interimResults = false;
        rec.onresult = (e) => {
            const txt = Array.from(e.results).slice(e.resultIndex)
                .map(r => r[0].transcript).join(' ').trim();
            if (txt) setBrouillon(prev => (prev ? prev.replace(/\s+$/, '') + ' ' : '') + txt);
        };
        rec.onerror = (e) => {
            if (e.error === 'not-allowed') {
                setError('Accès au micro refusé — autorisez le micro dans votre navigateur.');
            }
            setListening(false);
        };
        rec.onend = () => setListening(false);
        recRef.current = rec;
        rec.start();
        setListening(true);
    }, [listening]);

    useEffect(() => () => recRef.current?.stop(), []);

    // ── Reformulation IA ──────────────────────────────────────
    const reformuler = async () => {
        if (!brouillon.trim()) { setError("Écrivez ou dictez d'abord un brouillon."); return; }
        setReformulating(true); setError('');
        try {
            const res = await fetch(`${API_BASE}/courriers_api.php?action=reformuler`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    brouillon, ton, type_courrier: typeCourrier, objet, reference,
                    contact: contact ? {
                        civilite: contact.civilite, nom: contact.nom, prenom: contact.prenom,
                        societe: contact.societe, type: contact.type,
                    } : null,
                }),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.message || 'Erreur serveur');
            setCorps(data.corps);
            setSavedMsg('');
        } catch (e) {
            setError(`La reformulation a échoué (${e.message}). Votre brouillon est conservé — réessayez.`);
        } finally {
            setReformulating(false);
        }
    };

    // ── Sauvegarde ────────────────────────────────────────────
    const sauvegarder = async () => {
        if (!contact) { setError('Choisissez un destinataire avant de sauvegarder.'); return; }
        if (!objet.trim()) { setError("Renseignez l'objet du courrier."); return; }
        if (!corps.trim()) { setError('Le courrier est vide.'); return; }
        if (courrierId && !window.confirm('Écraser la version déjà enregistrée de ce courrier ?')) return;
        setSaving(true); setError('');
        try {
            const res = await fetch(`${API_BASE}/courriers_api.php`, {
                method: courrierId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    id: courrierId, contact_id: contact.id, reference, objet,
                    type_courrier: typeCourrier, ton, brouillon, corps,
                }),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.message || 'Erreur serveur');
            setCourrierId(data.data.id);
            setDateCourrier(data.data.created_at);
            setSavedMsg(`Courrier sauvegardé dans l'historique de ${contactDisplayName(contact)}.`);
        } catch (e) {
            setError('Sauvegarde impossible : ' + e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* ── 1. Destinataire ── */}
            <div className="no-print bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <h3 className="text-sm font-bold text-[#1a1a1a] mb-3">1. Destinataire</h3>
                {contact ? (
                    <div className="flex items-start justify-between gap-3 bg-gray-50 rounded-xl p-3">
                        <div className="text-sm">
                            <p className="font-semibold text-[#1a1a1a]">{contactDisplayName(contact)}</p>
                            <p className="text-gray-500 text-xs mt-0.5">
                                {[contact.adresse, [contact.code_postal, contact.ville].filter(Boolean).join(' ')]
                                    .filter(Boolean).join(' — ')}
                            </p>
                        </div>
                        <button onClick={() => setContact(null)} title="Changer de destinataire"
                            className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400">
                            <X size={15} />
                        </button>
                    </div>
                ) : (
                    <div className="relative">
                        <div className="flex gap-2 flex-wrap">
                            <div className="relative flex-1 min-w-[220px]">
                                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text" value={query}
                                    onChange={e => setQuery(e.target.value)}
                                    placeholder="Rechercher un interlocuteur (nom, société, ville, téléphone…)"
                                    className={`${input} pl-9`}
                                />
                            </div>
                            <button onClick={() => setShowCreate(true)}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 whitespace-nowrap">
                                <Plus size={15} /> Nouvel interlocuteur
                            </button>
                        </div>
                        {(results.length > 0 || searching) && query.trim().length >= 2 && (
                            <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
                                {searching && results.length === 0 && (
                                    <p className="px-4 py-3 text-sm text-gray-400">Recherche…</p>
                                )}
                                {results.map(c => (
                                    <button key={c.id} onClick={() => pickContact(c)}
                                        className="w-full text-left px-4 py-2.5 hover:bg-amber-50 text-sm border-b border-gray-50 last:border-0">
                                        <span className="font-medium text-[#1a1a1a]">{contactDisplayName(c)}</span>
                                        <span className="text-gray-400 text-xs ml-2">
                                            {[c.ville, c.telephone].filter(Boolean).join(' · ')}
                                        </span>
                                    </button>
                                ))}
                                {!searching && results.length === 0 && (
                                    <p className="px-4 py-3 text-sm text-gray-400">
                                        Aucun résultat — créez l'interlocuteur avec le bouton ci-contre.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── 2. Informations courrier ── */}
            <div className="no-print bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <h3 className="text-sm font-bold text-[#1a1a1a] mb-3">2. Informations</h3>
                <div className="grid md:grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Référence dossier / chantier</label>
                        <input type="text" value={reference} onChange={e => setReference(e.target.value)} className={input} />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Objet *</label>
                        <input type="text" value={objet} onChange={e => setObjet(e.target.value)} className={input} />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Type de courrier</label>
                        <select value={typeCourrier} onChange={e => setTypeCourrier(e.target.value)} className={input}>
                            {TYPES_COURRIER.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Ton</label>
                        <select value={ton} onChange={e => setTon(e.target.value)} className={input}>
                            {TONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* ── 3. Brouillon + dictée + IA ── */}
            <div className="no-print bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-[#1a1a1a]">3. Votre brouillon</h3>
                    {SR && (
                        <button onClick={toggleDictee}
                            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                                listening
                                    ? 'bg-red-500 text-white animate-pulse'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}>
                            {listening ? <Square size={13} /> : <Mic size={13} />}
                            {listening ? 'Arrêter la dictée' : 'Dicter'}
                        </button>
                    )}
                </div>
                <textarea
                    value={brouillon}
                    onChange={e => setBrouillon(e.target.value)}
                    rows={5}
                    placeholder="Tapez ou dictez ce que vous voulez dire, même mal formulé — l'IA s'occupe de la rédaction…"
                    className={`${input} resize-y`}
                />
                <button
                    onClick={reformuler}
                    disabled={reformulating || !brouillon.trim()}
                    className="mt-3 flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#1a1a1a] text-white hover:bg-black disabled:opacity-40"
                >
                    {reformulating ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />}
                    {reformulating ? 'Reformulation en cours…' : "Reformuler avec l'IA"}
                </button>
            </div>

            {error && <p className="no-print text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>}

            {/* ── 4. Aperçu sur papier à en-tête ── */}
            {(corps || contact) && (
                <CourrierPreview
                    config={config}
                    contact={contact}
                    objet={objet}
                    reference={reference}
                    typeCourrier={typeCourrier}
                    corps={corps}
                    onCorpsChange={setCorps}
                    dateCourrier={dateCourrier}
                    onSave={sauvegarder}
                    saving={saving}
                    savedMsg={savedMsg}
                />
            )}

            {showCreate && (
                <CourrierContactForm
                    contact={null}
                    onClose={() => setShowCreate(false)}
                    onSaved={(c) => { setShowCreate(false); pickContact(c); }}
                />
            )}
        </div>
    );
};

export default CourrierEditor;
