import React from 'react';

import {
    Book,
    Bot,
    GitMerge,
    ScanLine,
    BookMarked,
    TrendingUp,
    Calculator,
    PencilRuler,
    Mail
} from 'lucide-react';

const RESOURCE_TABS = [
    {
        id: 'annuaire',
        label: 'Annuaire',
        icon: Book,
        roles: null
    },

    {
        id: 'assistant',
        label: 'Assistant IA',
        icon: Bot,
        roles: null
    },

    {
        id: 'comparateur',
        label: 'Comparateur',
        icon: GitMerge,
        roles: null
    },

    {
        id: 'generateur-arc',
        label: 'Gén. ARC',
        icon: ScanLine,
        roles: null
    },

    {
        id: 'generateur-descriptifs',
        label: 'Descriptifs',
        icon: PencilRuler,
        roles: [
            'admin',
            'gerant',
            'administration',
            'chef_equipe',
            'commercial'
        ]
    },

    {
        id: 'generateur-courrier',
        label: 'Courriers',
        icon: Mail,
        roles: [
            'admin',
            'gerant',
            'administration',
            'chef_equipe',
            'commercial'
        ]
    },

    {
        id: 'catalogue',
        label: 'Catalogue',
        icon: BookMarked,
        roles: [
            'admin',
            'gerant',
            'administration',
            'chef_equipe',
            'commercial'
        ]
    },

    {
        id: 'calcul-chantier',
        label: 'Calcul Chantier',
        icon: Calculator,
        roles: [
            'admin',
            'gerant',
            'administration'
        ]
    },

    {
        id: 'chantiers',
        label: 'Chantiers',
        icon: TrendingUp,
        roles: [
            'admin',
            'gerant',
            'administration'
        ]
    }
];

const MobileResourcesNav = ({
    activeModule,
    onNavigate,
    user
}) => {
    const role = user?.role ?? '';

    const tabs = RESOURCE_TABS.filter(
        (tab) =>
            !tab.roles ||
            tab.roles.includes(role)
    );

    return (
        <div
            className="md:hidden -mx-4 px-4 mb-4 overflow-x-auto"
            style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
            }}
        >
            <div className="flex gap-2 w-max pb-1">
                {tabs.map(
                    ({
                        id,
                        label,
                        icon: Icon
                    }) => {
                        const active =
                            activeModule === id;

                        return (
                            <button
                                key={id}
                                type="button"
                                onClick={() =>
                                    onNavigate(id)
                                }
                                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                                    active
                                        ? 'bg-[#FFB103] text-[#1a1a1a] shadow-sm'
                                        : 'bg-white text-gray-500 border border-gray-200 hover:border-[#FFB103]/50 hover:text-amber-700'
                                }`}
                            >
                                <Icon
                                    size={13}
                                    strokeWidth={
                                        active
                                            ? 2.5
                                            : 2
                                    }
                                />

                                {label}
                            </button>
                        );
                    }
                )}
            </div>
        </div>
    );
};

export default MobileResourcesNav;
