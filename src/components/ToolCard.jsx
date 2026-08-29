import React, { useState } from 'react';
import {
    Wrench, Hammer, Scissors, Ruler, Wind,
    Settings2, Pencil, Trash2, X, Hash, Drill
} from 'lucide-react';
import SupplierLogo from './SupplierLogo';

// ── Icône selon le nom de l'outil ───────────────────────────
function getToolIcon(name = '') {
    const n = name.toLowerCase();
    if (n.includes('clef') || n.includes('clé'))          return Wrench;
    if (n.includes('marteau'))                             return Hammer;
    if (n.includes('scie') || n.includes('déligneuse') || n.includes('deligneuse')) return Scissors;
    if (n.includes('gabarit') || n.includes('règle') || n.includes('regle')) return Ruler;
    if (n.includes('aspirateur'))                          return Wind;
    if (n.includes('perceuse') || n.includes('visseuse') || n.includes('riveteuse')) return Settings2;
    return Wrench;
}

// ── Couleur selon la quantité ────────────────────────────────
function getQtyStyle(qty) {
    const q = Number(qty ?? 0);
    if (q === 0) return { bg: 'bg-red-50',   text: 'text-red-600',    border: 'border-red-100',   label: 'Épuisé' };
    if (q === 1) return { bg: 'bg-amber-50',  text: 'text-[#FFB103]',  border: 'border-amber-100', label: 'unité' };
    return       { bg: 'bg-green-50',  text: 'text-green-700', border: 'border-green-100', label: 'unités' };
}

const ToolCard = ({ item, onEditTool, onDeleteTool, isManager }) => {
    const [showDetail, setShowDetail] = useState(false);
    const Icon    = getToolIcon(item.name);
    const qStyle  = getQtyStyle(item.quantity);

    return (
        <>
            {/* ── Carte ──────────────────────────────────────── */}
            <div
                className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden cursor-pointer flex flex-col"
                onClick={() => setShowDetail(true)}
            >
                {/* Zone photo / icône */}
                <div className="bg-gray-50 px-5 pt-5 pb-4 flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#1a1a1a] flex items-center justify-center shadow-sm flex-shrink-0">
                        {item.photo
                            ? <img src={item.photo} alt={item.name} className="w-full h-full object-cover" />
                            : <Icon size={22} className="text-[#FFB103]" />
                        }
                    </div>
                    {/* Badge quantité */}
                    <div className={`flex flex-col items-center ${qStyle.bg} border ${qStyle.border} rounded-xl px-3 py-1.5 min-w-[52px]`}>
                        <span className={`text-2xl font-black leading-none ${qStyle.text}`}>{item.quantity ?? 0}</span>
                        <span className={`text-[10px] font-medium ${qStyle.text} opacity-70`}>{qStyle.label}</span>
                    </div>
                </div>

                {/* Infos */}
                <div className="px-4 py-3 flex-1">
                    <p className="font-bold text-gray-900 text-sm leading-snug line-clamp-2">{item.name}</p>
                    {item.supplier && (
                        <div className="mt-1.5">
                            <SupplierLogo supplier={item.supplier} className="h-4 w-auto object-contain opacity-60" />
                        </div>
                    )}
                </div>

                {/* Actions — visibles au hover */}
                {isManager && (
                    <div className="px-3 pb-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={e => { e.stopPropagation(); onEditTool(item); }}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-colors"
                        >
                            <Pencil size={13} /> Modifier
                        </button>
                        <button
                            onClick={e => { e.stopPropagation(); onDeleteTool(item.id); }}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-semibold transition-colors"
                        >
                            <Trash2 size={13} /> Supprimer
                        </button>
                    </div>
                )}
            </div>

            {/* ── Modal détail ────────────────────────────────── */}
            {showDetail && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowDetail(false)}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div
                        className="relative w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Handle mobile */}
                        <div className="flex justify-center pt-3 pb-1 sm:hidden">
                            <div className="w-10 h-1 bg-gray-300 rounded-full" />
                        </div>

                        {/* Header */}
                        <div className="flex items-start justify-between px-5 pt-4 pb-4 bg-[#1a1a1a]">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl overflow-hidden bg-[#FFB103]/20 flex items-center justify-center flex-shrink-0">
                                    {item.photo
                                        ? <img src={item.photo} alt={item.name} className="w-full h-full object-cover" />
                                        : <Icon size={20} className="text-[#FFB103]" />
                                    }
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-base leading-tight">{item.name}</h3>
                                    {item.supplier && (
                                        <p className="text-white/50 text-xs mt-0.5">{item.supplier}</p>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => setShowDetail(false)}
                                className="w-8 h-8 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Contenu */}
                        <div className="px-5 py-5 space-y-3">
                            <div className={`${qStyle.bg} border ${qStyle.border} rounded-2xl p-5 flex flex-col items-center`}>
                                <div className={`text-[10px] font-bold uppercase tracking-widest ${qStyle.text} opacity-60 mb-1 flex items-center gap-1`}>
                                    <Hash size={10} /> Quantité
                                </div>
                                <div className={`text-5xl font-black ${qStyle.text}`}>{item.quantity ?? 0}</div>
                                <div className={`text-sm ${qStyle.text} opacity-60 mt-1`}>{qStyle.label} disponible{Number(item.quantity) > 1 ? 's' : ''}</div>
                            </div>
                            {item.supplier && (
                                <div className="bg-gray-50 rounded-2xl p-4">
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2">Fournisseur</p>
                                    <SupplierLogo supplier={item.supplier} className="h-6 w-auto object-contain" />
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        {isManager && (
                            <div className="px-5 pb-6 grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => { onEditTool(item); setShowDetail(false); }}
                                    className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-2xl text-sm font-semibold transition-colors"
                                >
                                    <Pencil size={15} /> Modifier
                                </button>
                                <button
                                    onClick={() => { onDeleteTool(item.id); setShowDetail(false); }}
                                    className="flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 py-3 rounded-2xl text-sm font-semibold transition-colors"
                                >
                                    <Trash2 size={15} /> Supprimer
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default ToolCard;
