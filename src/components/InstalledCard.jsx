import React, { useState, useEffect } from 'react';
import { Info, X, Trash2, Package, Calendar, User, Clock } from 'lucide-react';
import PhotoViewer from './PhotoViewer';
import { getFileUrl } from '../utils/utilities';

const API_BASE = import.meta.env.VITE_API_BASE || '/hello-gestion/php';

const formatDateTime = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    }).format(date);
};

const InstalledCard = ({ item, onDeleteInstalled, isManager }) => {
    const [showDetail, setShowDetail]           = useState(false);
    const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
    const [photoIndex, setPhotoIndex]           = useState(0);

    const photos = item.photos_paths?.length ? item.photos_paths
                 : item.photo_path            ? [item.photo_path]
                 : [];

    useEffect(() => {
        document.body.style.overflow = showDetail ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [showDetail]);

    return (
        <>
            {/* ──────────── CARD ──────────── */}
            <div className="bg-white rounded-2xl shadow-sm border border-green-100 overflow-hidden flex items-stretch">

                {/* Vignette photo */}
                <button
                    onClick={() => { if (photos.length) { setPhotoIndex(0); setPhotoViewerOpen(true); } }}
                    className="shrink-0 w-20 h-20 bg-gray-100 flex items-center justify-center overflow-hidden"
                >
                    {photos.length > 0 ? (
                        <img src={getFileUrl(photos[0], API_BASE)} alt="photo" className="w-full h-full object-cover" />
                    ) : (
                        <Package size={28} className="text-gray-300" />
                    )}
                </button>

                {/* Contenu central */}
                <div className="flex-1 min-w-0 px-3 py-2.5 flex flex-col justify-center">
                    <div className="font-semibold text-gray-900 text-sm truncate">{item.client || 'N/A'}</div>
                    {item.product && (
                        <div className="text-xs text-gray-500 truncate mt-0.5">{item.product}</div>
                    )}
                    <div className="flex items-center gap-1 mt-1.5">
                        <Clock size={11} className="text-green-600 shrink-0" />
                        <span className="text-[11px] text-green-700 font-medium">{formatDateTime(item.installed_date)}</span>
                    </div>
                </div>

                {/* Bouton info */}
                <div className="shrink-0 flex items-center justify-center px-2">
                    <button
                        onClick={() => setShowDetail(true)}
                        className="w-11 h-11 bg-gray-100 text-gray-500 rounded-2xl flex items-center justify-center"
                        title="Voir les détails"
                    >
                        <Info size={18} />
                    </button>
                </div>
            </div>

            {/* ──────────── POPUP ──────────── */}
            {showDetail && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowDetail(false)}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className="relative w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>

                        {/* Handle */}
                        <div className="flex justify-center pt-3 pb-1 sm:hidden">
                            <div className="w-10 h-1 bg-gray-300 rounded-full" />
                        </div>

                        {/* Header */}
                        <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-gray-100 bg-green-50">
                            <div className="flex-1 min-w-0 pr-3">
                                <h3 className="font-bold text-gray-900 text-base">{item.client || 'N/A'}</h3>
                                {item.product && <p className="text-xs text-gray-500 mt-0.5">{item.product}</p>}
                                <span className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">
                                    ✓ Posé
                                </span>
                            </div>
                            <button onClick={() => setShowDetail(false)} className="shrink-0 w-8 h-8 flex items-center justify-center bg-white rounded-xl text-gray-500 shadow-sm border border-gray-200">
                                <X size={16} />
                            </button>
                        </div>

                        {/* Photos */}
                        {photos.length > 0 && (
                            <div className="px-5 pt-4">
                                <div className="flex gap-2 overflow-x-auto pb-1">
                                    {photos.map((photo, idx) => (
                                        <button key={idx} onClick={() => { setPhotoIndex(idx); setPhotoViewerOpen(true); setShowDetail(false); }}
                                            className="shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-gray-200">
                                            <img src={getFileUrl(photo, API_BASE)} alt="" className="w-full h-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Infos */}
                        <div className="px-5 py-4 grid grid-cols-2 gap-3">
                            <div className="bg-gray-50 rounded-xl p-3 col-span-2">
                                <div className="flex items-center gap-1 text-[10px] text-gray-400 font-medium mb-1"><Calendar size={11} /> DATE DE POSE</div>
                                <div className="text-sm font-semibold text-gray-800">{formatDateTime(item.installed_date)}</div>
                            </div>
                            {item.supplier && (
                                <div className="bg-gray-50 rounded-xl p-3">
                                    <div className="flex items-center gap-1 text-[10px] text-gray-400 font-medium mb-1"><User size={11} /> FOURNISSEUR</div>
                                    <div className="text-sm font-semibold text-gray-800">{item.supplier}</div>
                                </div>
                            )}
                            {item.date && (
                                <div className="bg-gray-50 rounded-xl p-3">
                                    <div className="flex items-center gap-1 text-[10px] text-gray-400 font-medium mb-1"><Calendar size={11} /> DATE RÉCEPTION</div>
                                    <div className="text-sm font-semibold text-gray-800">{item.date}</div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        {isManager && (
                        <div className="px-5 pb-6 pt-1">
                            <button
                                onClick={() => { onDeleteInstalled(item.id); setShowDetail(false); }}
                                className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 py-3 rounded-2xl text-sm font-semibold hover:bg-red-100 transition-colors"
                            >
                                <Trash2 size={15} /> Supprimer
                            </button>
                        </div>
                        )}
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

export default InstalledCard;
