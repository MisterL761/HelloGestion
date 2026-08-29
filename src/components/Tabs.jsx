import React from 'react';
import { Warehouse, CheckCheck, AlertCircle, ToolCase, Drill, ClipboardList, LayoutDashboard } from 'lucide-react';

const DASHBOARD_ROLES = ['admin', 'gerant', 'administration'];

const TABS_MOBILE_BASE = [
    { id: 'received',  label: 'Reçus',       icon: Warehouse },
    { id: 'installed', label: 'Posés',        icon: CheckCheck },
    { id: 'defective', label: 'Défectueux',   icon: AlertCircle },
    { id: 'stock',     label: 'Consommable',  icon: ToolCase },
    { id: 'tools',     label: 'Outils',       icon: Drill },
    { id: 'orders',    label: 'Commandes',    icon: ClipboardList },
];

const Tabs = ({ activeTab, onTabChange, user }) => {
    const canSeeDashboard = user && DASHBOARD_ROLES.includes(user.role);

    const tabsDesktop = [
        ...(canSeeDashboard ? [{ id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard }] : []),
        ...TABS_MOBILE_BASE,
    ];

    return (
        <>
            {/* ── MOBILE : grille ── */}
            <div className="md:hidden grid grid-cols-3 gap-1.5 mb-4 bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100">
                {TABS_MOBILE_BASE.map(({ id, label, icon: Icon }) => {
                    const active = activeTab === id;
                    return (
                        <button
                            key={id}
                            onClick={() => onTabChange(id)}
                            className={`flex flex-col items-center justify-center gap-1.5 py-3 px-1 rounded-xl transition-all ${
                                active
                                    ? 'bg-[#FFB103] text-[#1a1a1a] shadow-md'
                                    : 'text-gray-400 hover:bg-gray-50 hover:text-gray-700'
                            }`}
                        >
                            <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                            <span className="text-[10px] font-bold leading-tight text-center tracking-wide">{label}</span>
                        </button>
                    );
                })}
            </div>

            {/* ── DESKTOP : tabs horizontaux ── */}
            <div className="hidden md:flex overflow-x-auto bg-gray-50 border-b border-gray-200 mb-4 md:mb-6 -mx-4 md:-mx-6 px-4 md:px-6">
                {tabsDesktop.map(({ id, label }) => (
                    <button
                        key={id}
                        onClick={() => onTabChange(id)}
                        className={`px-4 md:px-6 py-3 font-medium whitespace-nowrap transition-all ${
                            activeTab === id
                                ? 'text-[#FFB103] border-b-2 border-[#FFB103]'
                                : 'text-gray-600 hover:text-gray-900 border-b-2 border-transparent'
                        }`}
                    >
                        {label}
                    </button>
                ))}
            </div>
        </>
    );
};

export default Tabs;
