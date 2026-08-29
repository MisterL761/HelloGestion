import React from 'react';
import { Warehouse, Briefcase, Users, UserCircle, BookOpen } from 'lucide-react';

const DOSSIERS_ROLES   = ['admin', 'gerant', 'administration'];
const RESOURCES_MODULES = ['annuaire', 'assistant', 'comparateur', 'generateur-arc', 'generateur-descriptifs', 'catalogue'];

const BottomNav = ({ activeModule, onNavigate, user }) => {
    const role = user?.role ?? '';
    const canSeeDossiers = DOSSIERS_ROLES.includes(role);
    const avatarUrl = user?.avatar_path ? `/hello-gestion/php/${user.avatar_path}` : null;
    const isSettings  = activeModule === 'settings';
    const isResources  = RESOURCES_MODULES.includes(activeModule);

    const items = [
        {
            id: 'stock',
            label: 'Stock',
            icon: Warehouse,
            active: activeModule === 'stock',
            onPress: () => onNavigate('received'),
        },
        {
            id: 'ressources',
            label: 'Ressources',
            icon: BookOpen,
            active: isResources,
            onPress: () => onNavigate('annuaire'),
        },
        {
            id: 'casier',
            label: 'Mon Casier',
            icon: Briefcase,
            active: activeModule === 'casier',
            onPress: () => onNavigate('casier'),
        },
        canSeeDossiers && {
            id: 'dossiers',
            label: 'Équipe',
            icon: Users,
            active: activeModule === 'dossiers',
            onPress: () => onNavigate('dossiers'),
        },
    ].filter(Boolean);

    return (
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-200">
            <div
                className="flex items-stretch"
                style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 10px)' }}
            >
                {items.map((item) => {
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.id}
                            onClick={item.onPress}
                            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-3 min-h-[60px] transition-colors ${
                                item.active
                                    ? 'text-[#FFB103]'
                                    : 'text-gray-400 active:text-gray-600'
                            }`}
                        >
                            <Icon size={21} strokeWidth={item.active ? 2.5 : 1.8} />
                            <span className="text-[9px] font-semibold tracking-wide leading-tight">
                                {item.label}
                            </span>
                        </button>
                    );
                })}

                {/* Bouton Profil avec avatar */}
                <button
                    onClick={() => onNavigate('settings')}
                    className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-3 min-h-[60px] transition-colors ${
                        isSettings ? 'text-[#FFB103]' : 'text-gray-400 active:text-gray-600'
                    }`}
                >
                    {avatarUrl ? (
                        <img
                            src={avatarUrl}
                            alt="avatar"
                            className={`w-6 h-6 rounded-full object-cover ${
                                isSettings ? 'ring-2 ring-[#FFB103]' : 'ring-1 ring-gray-300'
                            }`}
                        />
                    ) : (
                        <UserCircle size={21} strokeWidth={isSettings ? 2.5 : 1.8} />
                    )}
                    <span className="text-[9px] font-semibold tracking-wide leading-tight">
                        Paramètres
                    </span>
                </button>
            </div>
        </nav>
    );
};

export default BottomNav;
