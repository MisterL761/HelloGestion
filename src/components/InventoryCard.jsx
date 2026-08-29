import React, { useState, useEffect } from 'react';
import { Info, Eye, Pencil, Trash2, X, Package, Tag, Euro, BarChart2, Plus, Minus, Clock } from 'lucide-react';
import SupplierLogo from './SupplierLogo';
import FileViewer from './FileViewer';
import { getFileUrl } from '../utils/utilities';

const API_BASE = import.meta.env.VITE_API_BASE || '/hello-gestion/php';

const ruptureLabel = (dateStr) => {
    if (!dateStr) return null;
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
    if (diff === 0) return "Rupture depuis aujourd'hui";
    if (diff === 1) return 'Rupture depuis hier';
    return `Rupture depuis ${diff} jour${diff > 1 ? 's' : ''}`;
};

const InventoryCard = ({ item, onEdit, onDelete, onUpdateStock, isManager }) => {
    const [showEditQty, setShowEditQty] = useState(false);
    const [showDetail, setShowDetail] = useState(false);
    const [showFileViewer, setShowFileViewer] = useState(false);
    const [qty, setQty] = useState(Number(item.stock));
    const [flash, setFlash] = useState(null); // 'up' | 'down' | null

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { setQty(Number(item.stock)); }, [item.stock]);

    useEffect(() => {
        document.body.style.overflow = showDetail ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [showDetail]);

    const triggerFlash = (dir) => {
        setFlash(dir);
        setTimeout(() => setFlash(null), 600);
    };

    const applyDelta = (delta) => {
        const n = Math.max(0, qty + delta);
        setQty(n);
        onUpdateStock(item.id, n);
        triggerFlash(delta > 0 ? 'up' : 'down');
    };

    const handleDecrease = () => applyDelta(-1);
    const handleIncrease = () => applyDelta(+1);



    const isRupture = item.status === 'Rupture' || item.status?.includes('Rupture');
    const isFaible = item.status?.includes('Faible');

    const borderColor = isRupture ? 'border-red-500' : isFaible ? 'border-yellow-500' : 'border-green-500';
    const bgColor = isRupture ? 'bg-red-50' : isFaible ? 'bg-yellow-50' : 'bg-green-50';
    const badgeCls = isRupture ? 'bg-red-100 text-red-700 border-red-200'
        : isFaible ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
            : 'bg-green-100 text-green-700 border-green-200';
    const badgeLabel = isRupture ? 'Rupture' : isFaible ? 'Faible' : 'Dispo';
    const barColor = Number(item.stock) === 0 ? 'bg-red-500'
        : Number(item.stock) < Number(item.threshold) ? 'bg-yellow-500'
            : 'bg-green-500';
    const progressPct = Math.min(
        (Number(item.stock) / (Number(item.threshold) * 2 || 1)) * 100,
        100
    );

    return (
        <>
            {/* ──────────── CARD ──────────── */}
            <div className={`rounded-2xl border-l-4 ${borderColor} ${bgColor} shadow-sm overflow-hidden`}>

                {/* Ligne 1 : camion · nom · badge · info */}
                <div className="flex items-center gap-2 px-3 pt-3 pb-1.5">
                    <button
                        onClick={() => setShowEditQty(v => !v)}
                        className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${showEditQty ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-blue-600 border border-blue-200 shadow-sm'
                            }`}
                        title="Modifier la quantité"
                    >
                        <Pencil size={18} />
                    </button>

                    <span className="font-semibold text-gray-900 text-sm flex-1 min-w-0 leading-tight line-clamp-2">
                        {item.material}
                    </span>

                    <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeCls}`}>
                        {badgeLabel}
                    </span>

                    {/* Bouton info → ouvre popup */}
                    <button
                        onClick={() => setShowDetail(true)}
                        className="shrink-0 w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-white rounded-lg transition-colors"
                        title="Voir les détails"
                    >
                        <Info size={18} />
                    </button>
                </div>

                {/* Ligne 2 : fournisseur · conditionnement · stock */}
                <div className="flex items-center justify-between px-3 py-1">
                    <div className="flex items-center gap-2">
                        <SupplierLogo supplier={item.supplier} className="h-5 w-auto object-contain opacity-80" />
                        {item.conditionnement === 'carton'
                            ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-200">📦 Carton</span>
                            : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-orange-50 text-orange-700 border-orange-200">🔩 Unité</span>
                        }
                    </div>
                    <div className="text-right">
                        <span className="text-2xl font-bold text-gray-900">{qty}</span>
                        <span className="text-gray-400 text-xs ml-1">/ {item.threshold}</span>
                    </div>
                </div>

                {/* Barre de progression */}
                <div className="px-3 pb-3">
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div className={`h-2 rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${progressPct}%` }} />
                    </div>
                    {isRupture && item.rupture_date && (
                        <div className="flex items-center gap-1 mt-1.5 text-red-500">
                            <Clock size={11} />
                            <span className="text-[10px] font-semibold">{ruptureLabel(item.rupture_date)}</span>
                        </div>
                    )}
                </div>

                {/* Panel Modifier Qty */}
                {showEditQty && (
                    <div className="mx-3 mb-3 bg-white rounded-2xl border border-blue-200 px-4 py-3 shadow-inner space-y-2">
                        {/* Ligne principale : − qty + */}
                        <div className="flex items-center justify-between">
                            <button
                                onClick={handleDecrease}
                                className="w-14 h-14 bg-red-100 active:bg-red-200 text-red-700 rounded-2xl text-3xl font-bold flex items-center justify-center select-none"
                            >
                                <Minus size={24} />
                            </button>
                            <div className="text-center">
                                <div
                                    className={`text-3xl font-black transition-colors duration-300 ${
                                        flash === 'up'   ? 'text-green-600' :
                                        flash === 'down' ? 'text-red-600'   : 'text-gray-900'
                                    }`}
                                >
                                    {qty}
                                </div>
                                <div className="text-xs text-gray-400 mt-0.5">en stock</div>
                            </div>
                            <button
                                onClick={handleIncrease}
                                className="w-14 h-14 bg-green-100 active:bg-green-200 text-green-700 rounded-2xl text-3xl font-bold flex items-center justify-center select-none"
                            >
                                <Plus size={24} />
                            </button>
                        </div>

                        {/* Boutons rapides pour les cartons */}
                        {item.conditionnement === 'carton' && (
                            <div className="grid grid-cols-4 gap-1.5 pt-1 border-t border-blue-100">
                                {[-10, -5, +5, +10].map(d => (
                                    <button
                                        key={d}
                                        onClick={() => applyDelta(d)}
                                        className={`py-1.5 rounded-xl text-xs font-bold select-none transition-colors ${
                                            d < 0
                                                ? 'bg-red-50 text-red-600 active:bg-red-100'
                                                : 'bg-green-50 text-green-600 active:bg-green-100'
                                        }`}
                                    >
                                        {d > 0 ? `+${d}` : d}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ──────────── POPUP DÉTAILS ──────────── */}
            {showDetail && (
                <div
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
                    onClick={() => setShowDetail(false)}
                >
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

                    {/* Sheet */}
                    <div
                        className="relative w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Handle mobile */}
                        <div className="flex justify-center pt-3 pb-1 sm:hidden">
                            <div className="w-10 h-1 bg-gray-300 rounded-full" />
                        </div>

                        {/* Header */}
                        <div className={`flex items-start justify-between px-5 pt-4 pb-3 border-b border-gray-100 ${bgColor}`}>
                            <div className="flex-1 min-w-0 pr-3">
                                <h3 className="font-bold text-gray-900 text-base leading-tight">{item.material}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <SupplierLogo supplier={item.supplier} className="h-4 w-auto object-contain" />
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeCls}`}>{badgeLabel}</span>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowDetail(false)}
                                className="shrink-0 w-8 h-8 flex items-center justify-center bg-white rounded-xl text-gray-500 hover:text-gray-800 shadow-sm border border-gray-200"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Body : infos */}
                        <div className="px-5 py-4 space-y-3">
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                                        <BarChart2 size={13} /> Stock actuel
                                    </div>
                                    <span className="text-2xl font-black text-gray-900">
                                        {qty} <span className="text-sm font-normal text-gray-400">/ {item.threshold}</span>
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                                    <div className={`h-2.5 rounded-full ${barColor}`} style={{ width: `${progressPct}%` }} />
                                </div>
                                {isRupture && item.rupture_date && (
                                    <div className="flex items-center gap-1.5 mt-2 bg-red-50 text-red-600 rounded-lg px-2.5 py-1.5 border border-red-100">
                                        <Clock size={12} />
                                        <span className="text-xs font-semibold">{ruptureLabel(item.rupture_date)}</span>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-gray-50 rounded-xl p-3">
                                    <div className="flex items-center gap-1 text-[10px] text-gray-400 font-medium mb-1">
                                        <Tag size={11} /> CATÉGORIE
                                    </div>
                                    <div className="text-sm font-semibold text-gray-800">{item.category || '—'}</div>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-3">
                                    <div className="flex items-center gap-1 text-[10px] text-gray-400 font-medium mb-1">
                                        <Euro size={11} /> PRIX UNITAIRE
                                    </div>
                                    <div className="text-sm font-semibold text-gray-800">
                                        {item.price ? `${parseFloat(item.price).toFixed(2)} €` : 'N/A'}
                                    </div>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-3">
                                    <div className="flex items-center gap-1 text-[10px] text-gray-400 font-medium mb-1">
                                        <Package size={11} /> SEUIL ALERTE
                                    </div>
                                    <div className="text-sm font-semibold text-gray-800">{item.threshold}</div>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-3">
                                    <div className="flex items-center gap-1 text-[10px] text-gray-400 font-medium mb-1">
                                        <Package size={11} /> FOURNISSEUR
                                    </div>
                                    <div className="text-sm font-semibold text-gray-800">{item.supplier || '—'}</div>
                                </div>
                            </div>
                        </div>


                        {/* Footer : actions */}
                        <div className="px-5 pb-6 pt-1 space-y-2">
                            {item.file_path && (
                                <button
                                    onClick={() => { setShowFileViewer(true); setShowDetail(false); }}
                                    className="w-full flex items-center justify-center gap-2 bg-blue-50 text-blue-700 py-3 rounded-2xl text-sm font-semibold hover:bg-blue-100 transition-colors"
                                >
                                    <Eye size={16} /> Voir le fichier
                                </button>
                            )}
                            {isManager && (
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => { onEdit(item); setShowDetail(false); }}
                                    className="flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-3 rounded-2xl text-sm font-semibold hover:bg-gray-200 transition-colors"
                                >
                                    <Pencil size={15} /> Modifier
                                </button>
                                <button
                                    onClick={() => { onDelete(item.id); setShowDetail(false); }}
                                    className="flex items-center justify-center gap-2 bg-red-50 text-red-600 py-3 rounded-2xl text-sm font-semibold hover:bg-red-100 transition-colors"
                                >
                                    <Trash2 size={15} /> Supprimer
                                </button>
                            </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* File viewer */}
            <FileViewer
                isOpen={showFileViewer}
                onClose={() => setShowFileViewer(false)}
                fileUrl={getFileUrl(item.file_path, API_BASE)}
                fileName={item.file_name || item.material}
                fileType={item.file_type || 'image'}
            />
        </>
    );
};

export default InventoryCard;

