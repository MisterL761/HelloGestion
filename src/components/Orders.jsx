import React, { useState, useEffect } from 'react';
import { ShoppingCart, CheckCircle, AlertTriangle, Package, ChevronDown, ChevronUp } from 'lucide-react';
import SupplierLogo from './SupplierLogo';
import StatusBadge from './StatusBadge';

const API_BASE = import.meta.env.VITE_API_BASE || '/hello-gestion/php';

const SUPPLIERS = ['Reca', 'Wurth', 'yess', 'trenois', 'pointp', 'boschat', 'berner'];

const Orders = ({ inventoryItems, user }) => {
    const [orderedItems, setOrderedItems]         = useState(new Set());
    const [orderedQuantities, setOrderedQuantities] = useState({});
    const [collapsed, setCollapsed]               = useState({});

    const itemsToOrder = inventoryItems.filter(i => i.status === 'Faible Stock' || i.status === 'Rupture');

    const bySupplier = SUPPLIERS.reduce((acc, s) => {
        acc[s] = itemsToOrder.filter(i => i.supplier === s);
        return acc;
    }, {});

    const activeSuppliers = SUPPLIERS.filter(s => bySupplier[s].length > 0);

    const loadExistingOrders = async () => {
        try {
            const res  = await fetch(`${API_BASE}/orders.php`, { credentials: 'include' });
            const data = await res.json();
            if (Array.isArray(data)) {
                const set = new Set();
                const qty = {};
                data.forEach(o => { if (o.is_ordered) { set.add(o.inventory_id); qty[o.inventory_id] = o.ordered_quantity; } });
                setOrderedItems(set);
                setOrderedQuantities(qty);
            }
        } catch { /* ignore */ }
    };

    useEffect(() => { loadExistingOrders(); }, [inventoryItems]);

    const handleToggle = async (inventoryId, suggestedQty) => {
        const isOrdered = orderedItems.has(inventoryId);
        try {
            const res  = await fetch(`${API_BASE}/orders.php`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ inventory_id: inventoryId, is_ordered: !isOrdered, ordered_quantity: suggestedQty }),
            });
            const data = await res.json();
            if (data.success) {
                setOrderedItems(prev => {
                    const s = new Set(prev);
                    isOrdered ? s.delete(inventoryId) : s.add(inventoryId);
                    return s;
                });
                setOrderedQuantities(prev => {
                    const q = { ...prev };
                    if (isOrdered) delete q[inventoryId]; else q[inventoryId] = suggestedQty;
                    return q;
                });
            }
        } catch { alert('Erreur lors de la mise à jour'); }
    };

    const toggleCollapse = (s) => setCollapsed(prev => ({ ...prev, [s]: !prev[s] }));

    const totalOrdered  = orderedItems.size;
    const totalRestant  = itemsToOrder.length - totalOrdered;
    const pctDone       = itemsToOrder.length ? Math.round((totalOrdered / itemsToOrder.length) * 100) : 0;

    return (
        <div className="space-y-5">

            {/* ── Header KPIs ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-[#FFB103] flex items-center justify-center">
                        <ShoppingCart size={18} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-gray-900">Prochaines commandes</h2>
                        <p className="text-xs text-gray-400">Articles en rupture ou stock faible</p>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                        <p className="text-2xl font-black text-gray-900">{itemsToOrder.length}</p>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold mt-0.5">À commander</p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-3 text-center">
                        <p className="text-2xl font-black text-green-600">{totalOrdered}</p>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold mt-0.5">Commandés</p>
                    </div>
                    <div className="bg-orange-50 rounded-xl p-3 text-center">
                        <p className="text-2xl font-black text-orange-500">{totalRestant}</p>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold mt-0.5">Restants</p>
                    </div>
                </div>

                {/* Barre de progression globale */}
                <div>
                    <div className="flex justify-between items-center mb-1.5">
                        <span className="text-xs font-semibold text-gray-500">Progression des commandes</span>
                        <span className="text-xs font-bold text-[#FFB103]">{pctDone}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                        <div
                            className="h-2.5 rounded-full bg-[#FFB103] transition-all duration-500"
                            style={{ width: `${pctDone}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* ── État vide ── */}
            {itemsToOrder.length === 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 py-16 text-center">
                    <CheckCircle size={48} className="mx-auto mb-3 text-green-400" />
                    <p className="text-base font-bold text-gray-800">Tout est en ordre !</p>
                    <p className="text-sm text-gray-400 mt-1">Aucun article à commander pour le moment</p>
                </div>
            )}

            {/* ── Sections par fournisseur ── */}
            {activeSuppliers.map(supplier => {
                const items      = bySupplier[supplier];
                const nbOrdered  = items.filter(i => orderedItems.has(i.id)).length;
                const isCollapsed = collapsed[supplier];
                const pct        = Math.round((nbOrdered / items.length) * 100);
                const allDone    = nbOrdered === items.length;

                return (
                    <div key={supplier} className={`bg-white rounded-2xl shadow-sm border transition-all ${allDone ? 'border-green-200' : 'border-gray-100'}`}>

                        {/* Header fournisseur */}
                        <button
                            onClick={() => toggleCollapse(supplier)}
                            className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 rounded-2xl transition-colors"
                        >
                            <div className="w-20 shrink-0 flex items-center justify-start">
                                <SupplierLogo supplier={supplier} className="h-5 w-auto object-contain" />
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className="text-xs font-semibold text-gray-500">{nbOrdered}/{items.length} commandés</span>
                                    {allDone && (
                                        <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                            Complet ✓
                                        </span>
                                    )}
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-1.5">
                                    <div
                                        className={`h-1.5 rounded-full transition-all duration-300 ${allDone ? 'bg-green-500' : 'bg-[#FFB103]'}`}
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                                    allDone ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                }`}>
                                    {items.length} art.
                                </span>
                                {isCollapsed
                                    ? <ChevronDown size={16} className="text-gray-400" />
                                    : <ChevronUp size={16} className="text-gray-400" />
                                }
                            </div>
                        </button>

                        {/* Articles */}
                        {!isCollapsed && (
                            <div className="border-t border-gray-100 divide-y divide-gray-50">
                                {items.map(item => {
                                    const suggestedQty = item.status === 'Rupture'
                                        ? item.threshold * 2
                                        : item.threshold - item.stock + 10;
                                    const isOrdered = orderedItems.has(item.id);
                                    const orderedQty = orderedQuantities[item.id] || suggestedQty;

                                    return (
                                        <div
                                            key={item.id}
                                            className={`flex items-center gap-3 px-5 py-3.5 transition-colors ${isOrdered ? 'bg-green-50/50' : 'hover:bg-gray-50'}`}
                                        >
                                            {/* Checkbox */}
                                            <button
                                                onClick={() => handleToggle(item.id, suggestedQty)}
                                                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                                                    isOrdered
                                                        ? 'bg-green-500 border-green-500'
                                                        : 'border-gray-300 hover:border-[#FFB103]'
                                                }`}
                                            >
                                                {isOrdered && <CheckCircle size={12} className="text-white" />}
                                            </button>

                                            {/* Nom + catégorie */}
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-semibold truncate ${isOrdered ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                                                    {item.material}
                                                </p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[10px] text-gray-400">{item.category}</span>
                                                    {isOrdered && (
                                                        <span className="text-[10px] font-bold text-green-600">
                                                            ✓ {orderedQty} unités commandées
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Stock / Seuil */}
                                            <div className="hidden sm:flex items-center gap-4 shrink-0">
                                                <div className="text-center">
                                                    <p className="text-xs font-bold text-gray-900">{item.stock}</p>
                                                    <p className="text-[10px] text-gray-400">Stock</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-xs font-bold text-gray-500">{item.threshold}</p>
                                                    <p className="text-[10px] text-gray-400">Seuil</p>
                                                </div>
                                            </div>

                                            {/* Badge statut */}
                                            <div className="shrink-0">
                                                <StatusBadge status={item.status} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default Orders;
