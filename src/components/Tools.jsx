import React, { useState, useMemo } from 'react';
import { Plus, Wrench, Pencil, Trash2 } from 'lucide-react';
import PhotoViewer from './PhotoViewer';

// Badge quantité coloré
const QtyBadge = ({ qty }) => {
    const q = Number(qty ?? 0);
    if (q === 0) return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-600 border border-red-100">
            0 <span className="font-normal opacity-70">épuisé</span>
        </span>
    );
    if (q === 1) return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-[#B8860B] border border-amber-100">
            1 <span className="font-normal opacity-70">unité</span>
        </span>
    );
    return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-100">
            {q} <span className="font-normal opacity-70">unités</span>
        </span>
    );
};

const Tools = ({ toolsItems, onAddTool, onEditTool, onDeleteTool, user }) => {
    const [activeSupplier, setActiveSupplier] = useState('Tous');
    const [viewerPhoto, setViewerPhoto] = useState(null);

    const isManager = ['admin', 'gerant', 'administration', 'chef_equipe'].includes(user?.role);
    const totalQty  = toolsItems.reduce((s, t) => s + Number(t.quantity ?? 0), 0);

    // Liste des fournisseurs uniques (triés)
    const suppliers = useMemo(() =>
        ['Tous', ...[...new Set(toolsItems.map(t => t.supplier).filter(Boolean))].sort()],
    [toolsItems]);

    // Filtrage
    const filtered = useMemo(() =>
        activeSupplier === 'Tous'
            ? toolsItems
            : toolsItems.filter(t => t.supplier === activeSupplier),
    [toolsItems, activeSupplier]);

    return (
        <>
        <div className="space-y-5">

            {/* ── En-tête ──────────────────────────────────── */}
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
                        <Wrench size={20} className="text-[#FFB103]" />
                        Outils
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {toolsItems.length} outil{toolsItems.length > 1 ? 's' : ''} · {totalQty} unité{totalQty > 1 ? 's' : ''} au total
                    </p>
                </div>
                {isManager && (
                    <button
                        onClick={onAddTool}
                        className="bg-[#FFB103] hover:bg-[#d49400] text-[#1a1a1a] px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold transition-colors shadow-sm"
                    >
                        <Plus size={17} /> Ajouter Outil
                    </button>
                )}
            </div>

            {/* ── Filtres fournisseurs ─────────────────────── */}
            {suppliers.length > 2 && (
                <div className="flex items-center gap-2 flex-wrap">
                    {suppliers.map(s => {
                        const count = s === 'Tous' ? toolsItems.length : toolsItems.filter(t => t.supplier === s).length;
                        const active = activeSupplier === s;
                        return (
                            <button
                                key={s}
                                onClick={() => setActiveSupplier(s)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                                    active
                                        ? 'bg-[#FFB103] text-[#1a1a1a] border-[#FFB103] shadow-sm'
                                        : 'bg-white text-gray-600 border-gray-200 hover:border-[#FFB103] hover:text-[#1a1a1a]'
                                }`}
                            >
                                {s}
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                    active ? 'bg-[#1a1a1a]/15' : 'bg-gray-100'
                                }`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* ── Empty state ──────────────────────────────── */}
            {toolsItems.length === 0 && (
                <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                    <div className="w-14 h-14 bg-[#1a1a1a] rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Wrench size={26} className="text-[#FFB103]" />
                    </div>
                    <p className="font-bold text-gray-800">Aucun outil enregistré</p>
                    <p className="text-sm text-gray-400 mt-1">Ajoute ton premier outil pour commencer le suivi.</p>
                    {isManager && (
                        <button
                            onClick={onAddTool}
                            className="mt-4 bg-[#FFB103] hover:bg-[#d49400] text-[#1a1a1a] px-5 py-2.5 rounded-xl text-sm font-bold inline-flex items-center gap-2 transition-colors"
                        >
                            <Plus size={16} /> Ajouter un outil
                        </button>
                    )}
                </div>
            )}

            {/* ── Tableau liste ────────────────────────────── */}
            {toolsItems.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

                    {/* En-tête colonnes */}
                    <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                        <div className="col-span-5">Nom</div>
                        <div className="col-span-4">Fournisseur</div>
                        <div className="col-span-2">Quantité</div>
                        <div className="col-span-1" />
                    </div>

                    {/* Lignes filtrées */}
                    <div className="divide-y divide-gray-50">
                        {filtered.length === 0 ? (
                            <div className="py-10 text-center text-gray-400 text-sm">
                                Aucun outil pour ce fournisseur
                            </div>
                        ) : filtered.map((item) => (
                            <div
                                key={item.id}
                                className="group flex md:grid md:grid-cols-12 items-center gap-3 md:gap-4 px-4 md:px-5 py-3.5 hover:bg-gray-50/70 transition-colors"
                            >
                                {/* Nom */}
                                <div className="flex items-center gap-3 flex-1 md:col-span-5 min-w-0">
                                    <div
                                        className={`w-14 h-14 rounded-xl overflow-hidden bg-[#1a1a1a] flex items-center justify-center flex-shrink-0 ${item.photo ? 'cursor-zoom-in' : ''}`}
                                        onClick={item.photo ? (e) => { e.stopPropagation(); setViewerPhoto(item.photo); } : undefined}
                                    >
                                        {item.photo
                                            ? <img src={item.photo} alt={item.name} className="w-full h-full object-cover" />
                                            : <Wrench size={20} className="text-[#FFB103]" />
                                        }
                                    </div>
                                    <span className="font-semibold text-gray-900 text-sm truncate">{item.name}</span>
                                </div>

                                {/* Fournisseur */}
                                <div className="hidden md:flex col-span-4 items-center">
                                    <span className="text-sm text-gray-600">{item.supplier || '—'}</span>
                                </div>

                                {/* Quantité */}
                                <div className="md:col-span-2 flex-shrink-0">
                                    <QtyBadge qty={item.quantity} />
                                </div>

                                {/* Actions */}
                                {isManager && (
                                    <div className="md:col-span-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                                        <button
                                            onClick={() => onEditTool(item)}
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-[#1a1a1a] hover:bg-gray-100 transition-colors"
                                            title="Modifier"
                                        >
                                            <Pencil size={14} />
                                        </button>
                                        <button
                                            onClick={() => onDeleteTool(item.id)}
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                            title="Supprimer"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>

        <PhotoViewer
            isOpen={!!viewerPhoto}
            onClose={() => setViewerPhoto(null)}
            photos={viewerPhoto ? [viewerPhoto] : []}
        />

        </>
    );
};

export default Tools;

