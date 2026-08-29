import React from 'react';
import {
    Warehouse, CheckCheck, AlertCircle, ToolCase, Drill, ClipboardList
} from 'lucide-react';

const STOCK_TABS = [
    { id: 'received',  label: 'Reçus',        icon: Warehouse },
    { id: 'installed', label: 'Posés',         icon: CheckCheck },
    { id: 'defective', label: 'Défectueux',    icon: AlertCircle },
    { id: 'stock',     label: 'Consommables',  icon: ToolCase },
    { id: 'tools',     label: 'Outils',        icon: Drill },
    { id: 'orders',    label: 'Commandes',     icon: ClipboardList },
];

/**
 * Barre de navigation horizontale scrollable pour le module Stock.
 * Visible uniquement sur mobile (md:hidden).
 */
const MobileStockNav = ({ activeTab, onTabChange }) => {
    return (
        <div className="md:hidden -mx-4 px-4 mb-4 overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <div className="flex gap-2 w-max pb-1">
                {STOCK_TABS.map(({ id, label, icon: Icon }) => {
                    const active = activeTab === id;
                    return (
                        <button
                            key={id}
                            onClick={() => onTabChange(id)}
                            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                                active
                                    ? 'bg-[#FFB103] text-[#1a1a1a] shadow-sm'
                                    : 'bg-white text-gray-500 border border-gray-200 hover:border-[#FFB103]/50 hover:text-amber-700'
                            }`}
                        >
                            <Icon size={13} strokeWidth={active ? 2.5 : 2} />
                            {label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default MobileStockNav;
