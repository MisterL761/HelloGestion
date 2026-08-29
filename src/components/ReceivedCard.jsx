import React, { useState, useEffect } from 'react';
import { Upload, Info, X, Pencil, Trash2, AlertTriangle, Calendar, User, Package, Zap, MessageSquareWarning, Loader } from 'lucide-react';
import PhotoViewer from './PhotoViewer';
import StatusBadge from './StatusBadge';
import { getFileUrl } from '../utils/utilities';

const API_BASE = import.meta.env.VITE_API_BASE || '/hello-gestion/php';

const isNewItem = (item) => {
    const ref = item.date; // format DD/MM/YYYY
    if (!ref) return false;
    const [day, month, year] = ref.split('/');
    const d = new Date(`${year}-${month}-${day}`);
    return !isNaN(d.getTime()) && (Date.now() - d.getTime()) < 2 * 24 * 60 * 60 * 1000;
};

const NewBadge = () => (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-sm whitespace-nowrap">
        <Zap size={9} fill="currentColor" /> Nouvelle livraison
    </span>
);

const ReceivedCard = ({ item, onMarkAsInstalled, onMarkAsDefective, onEditProduct, onDeleteProduct, isManager }) => {
    const [showDetail, setShowDetail] = useState(false);
    const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
    const [photoIndex, setPhotoIndex] = useState(0);
    const [showDefectiveConfirm, setShowDefectiveConfirm] = useState(false);
    const [showInstalledConfirm, setShowInstalledConfirm] = useState(false);
    const [proDevis, setProDevis]     = useState(!!item.pro_devis);
    const [proDevisBy, setProDevisBy] = useState(item.pro_devis_by || null);
    const [note, setNote]             = useState(item.important_note || null);
    const [showNoteEditor, setShowNoteEditor] = useState(false);
    const [noteDraft, setNoteDraft]   = useState(item.important_note || '');
    const [savingNote, setSavingNote] = useState(false);

    const saveNote = async (override) => {
        const value = (override !== undefined ? override : noteDraft).trim();
        setSavingNote(true);
        try {
            const res  = await fetch(`${API_BASE}/received.php`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ id: item.id, important_note: value }),
            });
            const data = await res.json();
            if (data.success) {
                setNote(data.important_note || null);
                setNoteDraft(data.important_note || '');
                setShowNoteEditor(false);
            }
        } catch { /* on garde l'éditeur ouvert en cas d'erreur réseau */ }
        finally { setSavingNote(false); }
    };

    const openNoteEditor = (e) => {
        e?.stopPropagation();
        setNoteDraft(note || '');
        setShowNoteEditor(true);
    };

    const toggleProDevis = async (e) => {
        e.stopPropagation();
        const next = !proDevis;
        setProDevis(next);
        if (!next) setProDevisBy(null);
        try {
            const res  = await fetch(`${API_BASE}/received.php`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ id: item.id, pro_devis: next }),
            });
            const data = await res.json();
            if (data.pro_devis_by !== undefined) setProDevisBy(data.pro_devis_by);
        } catch {
            setProDevis(!next);
        }
    };

    const photos = item.photos_paths?.length ? item.photos_paths
        : item.photo_path ? [item.photo_path]
            : [];

    const isNew = isNewItem(item);
    const hasNote = !!note;
    // Priorité visuelle : note importante (rouge) > nouvelle livraison (ambre) > neutre
    const cardTone = hasNote
        ? 'bg-red-50 border-2 border-red-300'
        : isNew
            ? 'bg-amber-50 border-2 border-amber-300'
            : 'bg-white border border-gray-100';

    useEffect(() => {
        document.body.style.overflow = showDetail ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [showDetail]);

    return (
        <>
            {/* ══════════════════════════════════════════
                DESKTOP CARD — visible md+
            ══════════════════════════════════════════ */}
            <div className={`hidden md:flex flex-col rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200 ${cardTone}`}>

                {/* Photo + badge overlay */}
                <div className="relative w-full h-40 bg-gray-100 flex-shrink-0">
                    {photos.length > 0 ? (
                        <img
                            src={getFileUrl(photos[0], API_BASE)}
                            alt="photo"
                            className="w-full h-full object-cover cursor-pointer"
                            onClick={() => { setPhotoIndex(0); setPhotoViewerOpen(true); }}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <Package size={40} className="text-gray-300" />
                        </div>
                    )}

                    {/* Badge Nouveau */}
                    {isNew && (
                        <div className="absolute top-2 left-2">
                            <NewBadge />
                        </div>
                    )}

                    {/* Compteur photos si plusieurs */}
                    {photos.length > 1 && (
                        <div className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                            {photos.length} photos
                        </div>
                    )}
                </div>

                {/* Infos */}
                <div className="px-3.5 pt-3 pb-2 flex-1">
                    {hasNote && (
                        <div className="mb-2.5 flex items-start gap-1.5 bg-red-100 border border-red-200 rounded-xl px-2.5 py-2">
                            <MessageSquareWarning size={14} className="text-red-600 shrink-0 mt-0.5" />
                            <p className="text-[11px] font-semibold text-red-700 leading-snug break-words whitespace-pre-wrap">{note}</p>
                        </div>
                    )}
                    <div className="font-bold text-gray-900 text-sm leading-tight truncate">{item.client}</div>
                    {item.product && (
                        <div className="text-xs text-gray-500 truncate mt-0.5">{item.product}</div>
                    )}
                    <div className="mt-2">
                        <StatusBadge status={item.status} />
                    </div>
                    <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-400">
                        {item.date && (
                            <span className="flex items-center gap-1">
                                <Calendar size={10} /> {item.date}
                            </span>
                        )}
                        {item.supplier && (
                            <span className="flex items-center gap-1">
                                <User size={10} /> {item.supplier}
                            </span>
                        )}
                    </div>

                    {/* Case P9 */}
                    <div className="mt-3">
                        <label onClick={e => e.stopPropagation()} className="flex items-center gap-2 cursor-pointer select-none w-fit">
                            <div className={`w-4 h-4 rounded flex items-center justify-center border-2 transition-colors ${proDevis ? 'bg-[#FFB103] border-[#FFB103]' : 'border-gray-300 bg-white'}`}
                                onClick={toggleProDevis}>
                                {proDevis && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                            </div>
                            <img src="./logos/p9.png" alt="P9" className={`h-4 w-auto object-contain transition-opacity ${proDevis ? 'opacity-100' : 'opacity-40'}`} />
                        </label>
                        {proDevis && proDevisBy && (
                            <p className="text-[10px] text-gray-400 mt-0.5 ml-6">par {proDevisBy}</p>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="px-3.5 pb-3.5 pt-1 space-y-2">
                    <button
                        onClick={() => setShowInstalledConfirm(true)}
                        className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-xl text-xs font-bold transition-colors"
                    >
                        <Upload size={13} /> Marquer comme posé
                    </button>
                    <button
                        onClick={() => setShowDefectiveConfirm(true)}
                        className="w-full flex items-center justify-center gap-2 bg-orange-50 hover:bg-orange-100 text-orange-600 py-2.5 rounded-xl text-xs font-semibold transition-colors"
                    >
                        <AlertTriangle size={13} /> Défectueux
                    </button>
                    {isManager && (
                        <>
                            <button
                                onClick={openNoteEditor}
                                className={`w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${hasNote ? 'bg-red-100 hover:bg-red-200 text-red-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                            >
                                <MessageSquareWarning size={13} /> {hasNote ? 'Modifier la note' : 'Note importante'}
                            </button>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => onEditProduct(item)}
                                    className="flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl text-xs font-semibold transition-colors"
                                >
                                    <Pencil size={12} /> Modifier
                                </button>
                                <button
                                    onClick={() => onDeleteProduct(item.id)}
                                    className="flex items-center justify-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 py-2.5 rounded-xl text-xs font-semibold transition-colors"
                                >
                                    <Trash2 size={12} /> Supprimer
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* ══════════════════════════════════════════
                MOBILE CARD — visible < md
            ══════════════════════════════════════════ */}
            <div className={`md:hidden rounded-2xl shadow-sm overflow-hidden flex items-stretch ${cardTone}`}>

                <button
                    onClick={() => {
                        if (photos.length > 0) {
                            setPhotoIndex(0);
                            setPhotoViewerOpen(true);
                        }
                    }}
                    className="shrink-0 w-20 h-20 bg-gray-100 flex items-center justify-center overflow-hidden relative"
                >
                    {photos.length > 0 ? (
                        <img
                            src={getFileUrl(photos[0], API_BASE)}
                            alt="photo"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <Package size={28} className="text-gray-300" />
                    )}
                </button>

                <div className="flex-1 min-w-0 px-3 py-2.5 flex flex-col justify-center">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-gray-900 text-sm truncate">{item.client}</span>
                        {isNew && <NewBadge />}
                    </div>
                    {item.product && (
                        <div className="text-xs text-gray-500 truncate mt-0.5">{item.product}</div>
                    )}
                    <div className="mt-1">
                        <StatusBadge status={item.status} />
                    </div>
                    {hasNote && (
                        <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-red-600">
                            <MessageSquareWarning size={11} className="shrink-0" />
                            <span className="truncate">{note}</span>
                        </div>
                    )}
                </div>

                <div className="shrink-0 flex flex-col items-center justify-around px-2 py-2 gap-1">
                    <button
                        onClick={() => setShowInstalledConfirm(true)}
                        className="w-11 h-11 bg-green-500 active:bg-green-600 text-white rounded-2xl flex items-center justify-center shadow-sm transition-colors"
                        title="Marquer comme posé"
                    >
                        <Upload size={20} />
                    </button>
                    <button
                        onClick={() => setShowDetail(true)}
                        className="w-11 h-11 bg-gray-100 text-gray-500 rounded-2xl flex items-center justify-center transition-colors"
                        title="Voir les détails"
                    >
                        <Info size={18} />
                    </button>
                </div>
            </div>

            {/* ══════════════════════════════════════════
                MODAL DÉTAIL — mobile uniquement
            ══════════════════════════════════════════ */}
            {showDetail && (
                <div
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
                    onClick={() => setShowDetail(false)}
                >
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

                    <div
                        className="relative w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-center pt-3 pb-1 sm:hidden">
                            <div className="w-10 h-1 bg-gray-300 rounded-full" />
                        </div>

                        <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-gray-100 bg-gray-50">
                            <div className="flex-1 min-w-0 pr-3">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="font-bold text-gray-900 text-base leading-tight">{item.client}</h3>
                                    {isNew && <NewBadge />}
                                </div>
                                {item.product && (
                                    <p className="text-xs text-gray-500 mt-0.5 truncate">{item.product}</p>
                                )}
                                <div className="mt-1.5">
                                    <StatusBadge status={item.status} />
                                </div>
                            </div>
                            <button
                                onClick={() => setShowDetail(false)}
                                className="shrink-0 w-8 h-8 flex items-center justify-center bg-white rounded-xl text-gray-500 hover:text-gray-800 shadow-sm border border-gray-200"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {hasNote && (
                            <div className="mx-5 mt-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-2xl px-3.5 py-3">
                                <MessageSquareWarning size={18} className="text-red-600 shrink-0 mt-0.5" />
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold text-red-500 uppercase tracking-wide mb-0.5">Note importante</p>
                                    <p className="text-sm font-medium text-red-700 leading-snug whitespace-pre-wrap break-words">{note}</p>
                                </div>
                            </div>
                        )}

                        {photos.length > 0 && (
                            <div className="px-5 pt-4">
                                <div className="flex gap-2 overflow-x-auto pb-1">
                                    {photos.map((photo, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => { setPhotoIndex(idx); setPhotoViewerOpen(true); setShowDetail(false); }}
                                            className="shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-gray-200"
                                        >
                                            <img src={getFileUrl(photo, API_BASE)} alt={`photo ${idx + 1}`} className="w-full h-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="px-5 py-4 grid grid-cols-2 gap-3">
                            <div className="bg-gray-50 rounded-xl p-3">
                                <div className="flex items-center gap-1 text-[10px] text-gray-400 font-medium mb-1">
                                    <Calendar size={11} /> DATE RÉCEPTION
                                </div>
                                <div className="text-sm font-semibold text-gray-800">{item.date || '—'}</div>
                            </div>
                            {item.supplier && (
                                <div className="bg-gray-50 rounded-xl p-3">
                                    <div className="flex items-center gap-1 text-[10px] text-gray-400 font-medium mb-1">
                                        <User size={11} /> FOURNISSEUR
                                    </div>
                                    <div className="text-sm font-semibold text-gray-800">{item.supplier}</div>
                                </div>
                            )}
                        </div>

                        {/* Case P9 — modal mobile */}
                        <div className="px-5 pb-2">
                            <label className="flex items-center gap-3 cursor-pointer select-none w-fit">
                                <div className={`w-5 h-5 rounded-md flex items-center justify-center border-2 transition-colors ${proDevis ? 'bg-[#FFB103] border-[#FFB103]' : 'border-gray-300 bg-white'}`}
                                    onClick={toggleProDevis}>
                                    {proDevis && <svg width="11" height="9" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                                </div>
                                <img src="./logos/p9.png" alt="P9" className={`h-5 w-auto object-contain transition-opacity ${proDevis ? 'opacity-100' : 'opacity-40'}`} />
                            </label>
                            {proDevis && proDevisBy && (
                                <p className="text-xs text-gray-400 mt-1 ml-8">par {proDevisBy}</p>
                            )}
                        </div>

                        <div className="px-5 pb-6 pt-1 space-y-2">
                            <button
                                onClick={() => { setShowDetail(false); setShowInstalledConfirm(true); }}
                                className="w-full flex items-center justify-center gap-2 bg-green-500 text-white py-3.5 rounded-2xl text-sm font-bold hover:bg-green-600 transition-colors"
                            >
                                <Upload size={16} /> Marquer comme posé
                            </button>
                            <button
                                onClick={() => { setShowDetail(false); setShowDefectiveConfirm(true); }}
                                className="w-full flex items-center justify-center gap-2 bg-orange-50 text-orange-600 py-3 rounded-2xl text-sm font-semibold hover:bg-orange-100 transition-colors"
                            >
                                <AlertTriangle size={15} /> Défectueux
                            </button>
                            {isManager && (
                                <>
                                    <button
                                        onClick={() => { setShowDetail(false); openNoteEditor(); }}
                                        className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-colors ${hasNote ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                    >
                                        <MessageSquareWarning size={15} /> {hasNote ? 'Modifier la note' : 'Note importante'}
                                    </button>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => { onEditProduct(item); setShowDetail(false); }}
                                            className="flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-3 rounded-2xl text-sm font-semibold hover:bg-gray-200 transition-colors"
                                        >
                                            <Pencil size={15} /> Modifier
                                        </button>
                                        <button
                                            onClick={() => { onDeleteProduct(item.id); setShowDetail(false); }}
                                            className="flex items-center justify-center gap-2 bg-red-50 text-red-600 py-3 rounded-2xl text-sm font-semibold hover:bg-red-100 transition-colors"
                                        >
                                            <Trash2 size={15} /> Supprimer
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════
                MODALE CONFIRMATION POSÉ
            ══════════════════════════════════════════ */}
            {showInstalledConfirm && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center"
                    onClick={() => setShowInstalledConfirm(false)}
                >
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div
                        className="relative bg-white rounded-2xl shadow-2xl p-6 mx-4 w-full max-w-sm"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mx-auto mb-4">
                            <Upload size={24} className="text-green-600" />
                        </div>
                        <h3 className="text-center font-bold text-gray-900 text-base mb-2">
                            Marquer comme posé ?
                        </h3>
                        <p className="text-center text-sm text-gray-500 mb-6">
                            Voulez-vous vraiment marquer{' '}
                            <span className="font-semibold text-gray-800">{item.client}</span>{' '}
                            comme posé ?
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowInstalledConfirm(false)}
                                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={() => { onMarkAsInstalled(item.id); setShowInstalledConfirm(false); }}
                                className="flex-1 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-bold transition-colors"
                            >
                                Confirmer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════
                MODALE CONFIRMATION DÉFECTUEUX
            ══════════════════════════════════════════ */}
            {showDefectiveConfirm && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center"
                    onClick={() => setShowDefectiveConfirm(false)}
                >
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div
                        className="relative bg-white rounded-2xl shadow-2xl p-6 mx-4 w-full max-w-sm"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-orange-100 mx-auto mb-4">
                            <AlertTriangle size={24} className="text-orange-500" />
                        </div>
                        <h3 className="text-center font-bold text-gray-900 text-base mb-2">
                            Marquer comme défectueux ?
                        </h3>
                        <p className="text-center text-sm text-gray-500 mb-6">
                            Voulez-vous vraiment mettre{' '}
                            <span className="font-semibold text-gray-800">{item.client}</span>{' '}
                            en défectueux ?
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDefectiveConfirm(false)}
                                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={() => { onMarkAsDefective(item.id); setShowDefectiveConfirm(false); }}
                                className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold transition-colors"
                            >
                                Confirmer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════
                ÉDITEUR DE NOTE IMPORTANTE — manager
            ══════════════════════════════════════════ */}
            {showNoteEditor && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center"
                    onClick={() => !savingNote && setShowNoteEditor(false)}
                >
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div
                        className="relative bg-white rounded-2xl shadow-2xl p-6 mx-4 w-full max-w-sm"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                                <MessageSquareWarning size={20} className="text-red-600" />
                            </div>
                            <h3 className="font-bold text-gray-900 text-base">Note importante</h3>
                        </div>
                        <p className="text-xs text-gray-500 mb-3">
                            Cette note passe la fiche en rouge pour signaler une info essentielle sur le produit de{' '}
                            <span className="font-semibold text-gray-700">{item.client}</span>.
                        </p>
                        <textarea
                            value={noteDraft}
                            onChange={e => setNoteDraft(e.target.value)}
                            rows={4}
                            autoFocus
                            placeholder="Ex : Vitrage fêlé à la livraison, à contrôler avant pose…"
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                        />
                        <div className="flex gap-3 mt-4">
                            {note && (
                                <button
                                    onClick={() => saveNote('')}
                                    disabled={savingNote}
                                    className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50"
                                    title="Retirer la note"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                            <button
                                onClick={() => setShowNoteEditor(false)}
                                disabled={savingNote}
                                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={() => saveNote()}
                                disabled={savingNote || !noteDraft.trim()}
                                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors flex items-center justify-center disabled:opacity-50"
                            >
                                {savingNote ? <Loader className="animate-spin h-5 w-5" /> : 'Enregistrer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <PhotoViewer
                isOpen={photoViewerOpen}
                onClose={() => setPhotoViewerOpen(false)}
                photos={photos}
                initialIndex={photoIndex}
                apiBase={API_BASE}
            />
        </>
    );
};
export default ReceivedCard;
