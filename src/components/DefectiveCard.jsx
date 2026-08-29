import React, { useState, useEffect } from 'react';
import { Info, X, Pencil, Trash2, Package, Calendar, User, FileText } from 'lucide-react';
import PhotoViewer from './PhotoViewer';
import { getFileUrl } from '../utils/utilities';

const API_BASE = import.meta.env.VITE_API_BASE || '/hello-gestion/php';

const DefectiveCard = ({ item, onEditDefectiveProduct, onDeleteDefective, isManager }) => {
    const [showDetail, setShowDetail]           = useState(false);
    const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
    const [photoIndex, setPhotoIndex]           = useState(0);
    const [pdfListOpen, setPdfListOpen]         = useState(false);

    const allFiles   = item.photos_paths?.length ? item.photos_paths : item.photo_path ? [item.photo_path] : [];
    const imageFiles = allFiles.filter(f => !f.toLowerCase().endsWith('.pdf'));
    const pdfFiles   = allFiles.filter(f => f.toLowerCase().endsWith('.pdf'));
    const thumbFile  = imageFiles[0] || null;

    useEffect(() => {
        document.body.style.overflow = showDetail ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [showDetail]);

    return (
        <>
            {/* ══════════════════════════════════════════
                DESKTOP CARD — visible md+
            ══════════════════════════════════════════ */}
            <div className="hidden md:flex flex-col rounded-2xl shadow-sm border border-red-100 overflow-hidden hover:shadow-md transition-shadow duration-200 bg-white">

                {/* Photo */}
                <div className="relative w-full h-40 bg-red-50 flex-shrink-0">
                    {thumbFile ? (
                        <img
                            src={getFileUrl(thumbFile, API_BASE)}
                            alt="photo"
                            className="w-full h-full object-cover cursor-pointer"
                            onClick={() => { setPhotoIndex(0); setPhotoViewerOpen(true); }}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <Package size={40} className="text-red-200" />
                        </div>
                    )}

                    {/* Badge défectueux */}
                    <div className="absolute top-2 left-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                            ⚠ Défectueux
                        </span>
                    </div>

                    {/* Compteur photos */}
                    {imageFiles.length > 1 && (
                        <div className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                            {imageFiles.length} photos
                        </div>
                    )}

                    {/* Indicateur PDF cliquable */}
                    {pdfFiles.length === 1 && (
                        <a
                            href={getFileUrl(pdfFiles[0], API_BASE)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="absolute bottom-2 left-2 bg-red-600 hover:bg-red-700 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-1 transition-colors cursor-pointer"
                        >
                            <FileText size={9} /> PDF
                        </a>
                    )}
                    {pdfFiles.length > 1 && (
                        <div className="absolute bottom-2 left-2">
                            <button
                                onClick={e => { e.stopPropagation(); setPdfListOpen(o => !o); }}
                                className="bg-red-600 hover:bg-red-700 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-1 transition-colors"
                            >
                                <FileText size={9} /> {pdfFiles.length} PDF
                            </button>
                            {pdfListOpen && (
                                <div className="absolute bottom-7 left-0 bg-white border border-gray-200 rounded-xl shadow-xl p-1.5 flex flex-col gap-0.5 z-20 min-w-[110px]">
                                    {pdfFiles.map((pdf, idx) => (
                                        <a
                                            key={idx}
                                            href={getFileUrl(pdf, API_BASE)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={e => e.stopPropagation()}
                                            className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-red-50 text-red-700 rounded-lg text-xs font-medium transition-colors"
                                        >
                                            <FileText size={11} /> PDF {idx + 1}
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Infos */}
                <div className="px-3.5 pt-3 pb-2 flex-1">
                    <div className="font-bold text-gray-900 text-sm leading-tight truncate">{item.client}</div>
                    {item.supplier && (
                        <div className="text-xs text-red-600 font-medium truncate mt-0.5">{item.supplier}</div>
                    )}
                    {item.description && (
                        <div className="text-xs text-gray-400 mt-1 line-clamp-2">{item.description}</div>
                    )}
                    <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-400">
                        {item.date && (
                            <span className="flex items-center gap-1">
                                <Calendar size={10} /> {item.date}
                            </span>
                        )}
                        {item.defectiveDate && (
                            <span className="flex items-center gap-1">
                                <Calendar size={10} /> Signalé : {item.defectiveDate}
                            </span>
                        )}
                    </div>
                </div>

                {/* Actions */}
                {isManager && (
                    <div className="px-3.5 pb-3.5 pt-1">
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => onEditDefectiveProduct(item)}
                                className="flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl text-xs font-semibold transition-colors"
                            >
                                <Pencil size={12} /> Modifier
                            </button>
                            <button
                                onClick={() => onDeleteDefective(item.id)}
                                className="flex items-center justify-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 py-2.5 rounded-xl text-xs font-semibold transition-colors"
                            >
                                <Trash2 size={12} /> Supprimer
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ══════════════════════════════════════════
                MOBILE CARD — visible < md
            ══════════════════════════════════════════ */}
            <div className="md:hidden bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden flex items-stretch">

                <button
                    onClick={() => { if (imageFiles.length) { setPhotoIndex(0); setPhotoViewerOpen(true); } }}
                    className="shrink-0 w-20 h-20 bg-red-50 flex items-center justify-center overflow-hidden"
                >
                    {thumbFile ? (
                        <img src={getFileUrl(thumbFile, API_BASE)} alt="photo" className="w-full h-full object-cover" />
                    ) : (
                        <Package size={28} className="text-red-200" />
                    )}
                </button>

                <div className="flex-1 min-w-0 px-3 py-2.5 flex flex-col justify-center">
                    <div className="font-semibold text-gray-900 text-sm truncate">{item.client}</div>
                    {item.supplier && (
                        <div className="text-xs text-red-600 font-medium truncate mt-0.5">{item.supplier}</div>
                    )}
                    {item.description && (
                        <div className="text-xs text-gray-400 truncate mt-0.5">{item.description}</div>
                    )}
                </div>

                <div className="shrink-0 flex items-center justify-center px-2">
                    <button
                        onClick={() => setShowDetail(true)}
                        className="w-11 h-11 bg-red-50 text-red-400 rounded-2xl flex items-center justify-center"
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
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowDetail(false)}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className="relative w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90dvh] flex flex-col" onClick={e => e.stopPropagation()}>

                        <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
                            <div className="w-10 h-1 bg-gray-300 rounded-full" />
                        </div>

                        <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-gray-100 bg-red-50 shrink-0">
                            <div className="flex-1 min-w-0 pr-3">
                                <h3 className="font-bold text-gray-900 text-base">{item.client}</h3>
                                {item.supplier && <p className="text-xs text-red-600 font-medium mt-0.5">{item.supplier}</p>}
                                <span className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                                    ⚠ Défectueux
                                </span>
                            </div>
                            <button onClick={() => setShowDetail(false)} className="shrink-0 w-8 h-8 flex items-center justify-center bg-white rounded-xl text-gray-500 shadow-sm border border-gray-200">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1">
                            {imageFiles.length > 0 && (
                                <div className="px-5 pt-4">
                                    <div className="flex gap-2 overflow-x-auto pb-1">
                                        {imageFiles.map((photo, idx) => (
                                            <button key={idx} onClick={() => { setPhotoIndex(idx); setPhotoViewerOpen(true); setShowDetail(false); }}
                                                className="shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-gray-200">
                                                <img src={getFileUrl(photo, API_BASE)} alt="" className="w-full h-full object-cover" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {pdfFiles.length > 0 && (
                                <div className="px-5 pt-3 flex flex-wrap gap-2">
                                    {pdfFiles.map((pdf, idx) => (
                                        <a key={idx} href={getFileUrl(pdf, API_BASE)} target="_blank" rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 bg-red-50 text-red-700 px-3 py-2 rounded-xl text-xs font-semibold border border-red-200">
                                            <FileText size={14} /> PDF {idx + 1}
                                        </a>
                                    ))}
                                </div>
                            )}

                            {item.description && (
                                <div className="px-5 pt-4">
                                    <div className="bg-orange-50 rounded-xl p-3 border border-orange-100">
                                        <div className="flex items-center gap-1 text-[10px] text-orange-400 font-medium mb-1.5"><FileText size={11} /> DESCRIPTION</div>
                                        <p className="text-sm text-gray-800 leading-relaxed">{item.description}</p>
                                    </div>
                                </div>
                            )}

                            <div className="px-5 py-4 grid grid-cols-2 gap-3">
                                {item.date && (
                                    <div className="bg-gray-50 rounded-xl p-3">
                                        <div className="flex items-center gap-1 text-[10px] text-gray-400 font-medium mb-1"><Calendar size={11} /> DATE RÉCEPTION</div>
                                        <div className="text-sm font-semibold text-gray-800">{item.date}</div>
                                    </div>
                                )}
                                {item.defectiveDate && (
                                    <div className="bg-gray-50 rounded-xl p-3">
                                        <div className="flex items-center gap-1 text-[10px] text-gray-400 font-medium mb-1"><Calendar size={11} /> DATE SIGNALEMENT</div>
                                        <div className="text-sm font-semibold text-gray-800">{item.defectiveDate}</div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {isManager && (
                            <div className="px-5 pb-6 pt-2 shrink-0 border-t border-gray-100">
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => { onEditDefectiveProduct(item); setShowDetail(false); }}
                                        className="flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-3 rounded-2xl text-sm font-semibold hover:bg-gray-200 transition-colors"
                                    >
                                        <Pencil size={15} /> Modifier
                                    </button>
                                    <button
                                        onClick={() => { onDeleteDefective(item.id); setShowDetail(false); }}
                                        className="flex items-center justify-center gap-2 bg-red-50 text-red-600 py-3 rounded-2xl text-sm font-semibold hover:bg-red-100 transition-colors"
                                    >
                                        <Trash2 size={15} /> Supprimer
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <PhotoViewer
                isOpen={photoViewerOpen}
                onClose={() => setPhotoViewerOpen(false)}
                photos={imageFiles}
                initialIndex={photoIndex}
                apiBase={API_BASE}
            />
        </>
    );
};

export default DefectiveCard;
