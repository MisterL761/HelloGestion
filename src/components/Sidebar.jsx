import React from 'react';
import {
    X,
    ChevronLeft,
    ChevronRight,
    Warehouse,
    CheckCheck,
    AlertCircle,
    ToolCase,
    Drill,
    ClipboardList,
    LogOut,
    LayoutDashboard,
    Briefcase,
    Settings,
    UserCircle,
    Users,
    Terminal,
    Book,
    Bot,
    GitMerge,
    ScanLine,
    History,
    BookMarked,
    TrendingUp,
    Calculator,
    FileBarChart,
    Handshake,
    CreditCard,
    Inbox,
    PencilRuler,
    Mail
} from 'lucide-react';

// Rôles autorisés à voir le Dashboard
const DASHBOARD_ROLES = ['admin', 'gerant', 'administration'];

// Rôles pouvant accéder à tous les dossiers
const DOSSIERS_ROLES = ['admin', 'gerant', 'administration'];

// Rôles pouvant voir les rapports
const REPORTS_ROLES = ['admin', 'gerant', 'administration'];

// Rôle pouvant voir les logs
const LOGS_ROLES = ['admin'];

// Labels lisibles des rôles
const ROLE_LABELS = {
    admin: 'Administrateur',
    gerant: 'Gérant',
    administration: 'Administration',
    chef_equipe: "Chef d'équipe",
    commercial: 'Commercial',
    poseur: 'Poseur',
    collaborateur: 'Collaborateur',
};

const Sidebar = ({
    activeSidebar,
    onNavigate,
    isOpen,
    onClose,
    onLogout,
    user,
    isCollapsed,
    onToggleCollapse
}) => {
    const role = user?.role ?? '';

    const canSeeDashboard = DASHBOARD_ROLES.includes(role);
    const canSeeAllDossiers = DOSSIERS_ROLES.includes(role);
    const canSeeReports = REPORTS_ROLES.includes(role);
    const canSeeLogs = LOGS_ROLES.includes(role);

    // Mobile : drawer fixe qui slide depuis la gauche
    // Desktop : sidebar classique
    const sidebarClasses = [
        'bg-[#1a1a1a] border-r border-white/10 flex-shrink-0 flex flex-col transition-all duration-300',
        'fixed inset-y-0 left-0 z-40',
        'w-[85vw] max-w-[280px]',
        'md:relative md:inset-auto md:z-auto',
        isCollapsed ? 'md:w-20' : 'md:w-64',
        isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        'transform',
    ].join(' ');

    const NavItem = ({
        icon: Icon,
        label,
        id,
        active
    }) => (
        <li className="mb-1">
            <button
                onClick={() => {
                    onNavigate(id);
                    onClose();
                }}
                className={`flex items-center py-2.5 px-3 rounded-lg w-full transition-all ${
                    active
                        ? 'bg-[#FFB103]/20 text-[#FFB103] font-semibold'
                        : 'hover:bg-white/10 text-white/70'
                } ${isCollapsed ? 'justify-center' : ''}`}
                title={isCollapsed ? label : ''}
            >
                <Icon
                    size={20}
                    className={isCollapsed ? '' : 'mr-3'}
                />

                {!isCollapsed && (
                    <span className="text-sm font-medium">
                        {label}
                    </span>
                )}
            </button>
        </li>
    );

    const SectionLabel = ({ label }) =>
        !isCollapsed ? (
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 px-3 mb-2 mt-5 first:mt-0">
                {label}
            </p>
        ) : (
            <hr className="border-white/20 my-3" />
        );

    return (
        <div className={sidebarClasses}>
            {/* Bouton réduire / agrandir */}
            <button
                onClick={onToggleCollapse}
                className="hidden md:flex absolute -right-4 top-1/2 transform -translate-y-1/2 items-center justify-center w-8 h-8 rounded-full bg-white text-[#FFB103] hover:bg-gray-100 transition-all duration-300 shadow-lg z-50"
                title={isCollapsed ? "Agrandir le menu" : "Réduire le menu"}
            >
                {isCollapsed ? (
                    <ChevronRight size={18} />
                ) : (
                    <ChevronLeft size={18} />
                )}
            </button>

            {/* En-tête */}
            <div className="p-3 md:p-4 border-b border-white/10 flex justify-between items-center">
                {!isCollapsed ? (
                    <>
                        <div className="flex items-center gap-2.5 min-w-0">
                            <img
                                src={import.meta.env.BASE_URL + 'logoHelloGestion.ico'}
                                alt="Hello Gestion"
                                className="w-8 h-8 object-contain flex-shrink-0 rounded-md"
                            />

                            <h1 className="text-sm font-bold text-white truncate">
                                Hello Gestion
                            </h1>
                        </div>

                        <button
                            onClick={onClose}
                            className="md:hidden text-white/60 hover:text-white ml-2 flex-shrink-0"
                        >
                            <X size={20} />
                        </button>
                    </>
                ) : (
                    <img
                        src={import.meta.env.BASE_URL + 'logoHelloGestion.ico'}
                        alt="Hello Gestion"
                        className="w-8 h-8 object-contain mx-auto rounded-md"
                    />
                )}
            </div>

            {/* Navigation */}
            <nav className="p-3 md:p-4 flex-1 overflow-y-auto">
                <ul>
                    {/* Collaborateur : vue restreinte */}
                    {role === 'collaborateur' ? (
                        <>
                            <SectionLabel label="Affaires" />

                            <NavItem
                                icon={Handshake}
                                label="Mes Affaires"
                                id="affaires"
                                active={activeSidebar === 'affaires'}
                            />
                        </>
                    ) : (
                        <>
                            {/* ─── Gestion de Stock ─── */}
                            <SectionLabel label="Gestion de Stock" />

                            {canSeeDashboard && (
                                <NavItem
                                    icon={LayoutDashboard}
                                    label="Tableau de bord"
                                    id="dashboard"
                                    active={activeSidebar === 'dashboard'}
                                />
                            )}

                            <NavItem
                                icon={Warehouse}
                                label="Produits Reçus"
                                id="received"
                                active={activeSidebar === 'received'}
                            />

                            <NavItem
                                icon={CheckCheck}
                                label="Produits Posés"
                                id="installed"
                                active={activeSidebar === 'installed'}
                            />

                            <NavItem
                                icon={AlertCircle}
                                label="Défectueux"
                                id="defective"
                                active={activeSidebar === 'defective'}
                            />

                            <NavItem
                                icon={ToolCase}
                                label="Consommables"
                                id="inventory"
                                active={activeSidebar === 'inventory'}
                            />

                            <NavItem
                                icon={Drill}
                                label="Outils"
                                id="tools"
                                active={activeSidebar === 'tools'}
                            />

                            <NavItem
                                icon={ClipboardList}
                                label="Commandes"
                                id="orders"
                                active={activeSidebar === 'orders'}
                            />

                            {canSeeDashboard && (
                                <NavItem
                                    icon={History}
                                    label="Historique Stock"
                                    id="history"
                                    active={activeSidebar === 'history'}
                                />
                            )}

                            {/* ─── Commercial ─── */}
                            {['admin', 'gerant', 'administration'].includes(role) && (
                                <>
                                    <SectionLabel label="Commercial" />

                                    <NavItem
                                        icon={Handshake}
                                        label="Affaires"
                                        id="affaires"
                                        active={activeSidebar === 'affaires'}
                                    />
                                </>
                            )}

                            {/* ─── Ressources ─── */}
                            <SectionLabel label="Ressources" />

                            <NavItem
                                icon={Book}
                                label="Annuaire Fournisseurs"
                                id="annuaire"
                                active={activeSidebar === 'annuaire'}
                            />

                            {['admin', 'gerant', 'administration'].includes(role) && (
                                <NavItem
                                    icon={Inbox}
                                    label="Boîte Fournisseurs"
                                    id="boite-fournisseurs"
                                    active={activeSidebar === 'boite-fournisseurs'}
                                />
                            )}

                            <NavItem
                                icon={Bot}
                                label="Assistant IA"
                                id="assistant"
                                active={activeSidebar === 'assistant'}
                            />

                            <NavItem
                                icon={GitMerge}
                                label="Comparateur"
                                id="comparateur"
                                active={activeSidebar === 'comparateur'}
                            />

                            <NavItem
                                icon={ScanLine}
                                label="Générateur ARC"
                                id="generateur-arc"
                                active={activeSidebar === 'generateur-arc'}
                            />

                            {['admin', 'gerant', 'administration', 'chef_equipe', 'commercial'].includes(role) && (
                                <NavItem
                                    icon={PencilRuler}
                                    label="Générateur descriptifs"
                                    id="generateur-descriptifs"
                                    active={activeSidebar === 'generateur-descriptifs'}
                                />
                            )}

                            {['admin', 'gerant', 'administration', 'chef_equipe', 'commercial'].includes(role) && (
                                <NavItem
                                    icon={Mail}
                                    label="Générateur courrier"
                                    id="generateur-courrier"
                                    active={activeSidebar === 'generateur-courrier'}
                                />
                            )}

                            {role !== 'poseur' && (
                                <NavItem
                                    icon={BookMarked}
                                    label="Catalogue"
                                    id="catalogue"
                                    active={activeSidebar === 'catalogue'}
                                />
                            )}

                            {['admin', 'gerant', 'administration'].includes(role) && (
                                <NavItem
                                    icon={Calculator}
                                    label="Calcul Chantier"
                                    id="calcul-chantier"
                                    active={activeSidebar === 'calcul-chantier'}
                                />
                            )}

                            {['admin', 'gerant', 'administration'].includes(role) && (
                                <NavItem
                                    icon={TrendingUp}
                                    label="Rentabilité Chantiers"
                                    id="chantiers"
                                    active={activeSidebar === 'chantiers'}
                                />
                            )}

                            {/* ─── Facturation ─── */}
                            {['admin', 'gerant', 'administration'].includes(role) && (
                                <>
                                    <SectionLabel label="Facturation" />

                                    <NavItem
                                        icon={CreditCard}
                                        label="Sites de facturation"
                                        id="sites-facturation"
                                        active={activeSidebar === 'sites-facturation'}
                                    />
                                </>
                            )}

                            {/* ─── Mon Espace ─── */}
                            <SectionLabel label="Mon Espace" />

                            {canSeeReports && (
                                <NavItem
                                    icon={FileBarChart}
                                    label="Rapports"
                                    id="rapports"
                                    active={activeSidebar === 'rapports'}
                                />
                            )}

                            <NavItem
                                icon={Briefcase}
                                label="Mon Casier"
                                id="casier"
                                active={activeSidebar === 'casier'}
                            />

                            {canSeeAllDossiers && (
                                <NavItem
                                    icon={Users}
                                    label="Gestion Employés"
                                    id="dossiers"
                                    active={activeSidebar === 'dossiers'}
                                />
                            )}

                            {canSeeLogs && (
                                <NavItem
                                    icon={Terminal}
                                    label="Journal (Logs)"
                                    id="logs"
                                    active={activeSidebar === 'logs'}
                                />
                            )}

                            <NavItem
                                icon={Settings}
                                label="Paramètres"
                                id="settings"
                                active={activeSidebar === 'settings'}
                            />
                        </>
                    )}
                </ul>
            </nav>

            {/* Pied de page utilisateur */}
            <div className="p-3 md:p-4 border-t border-white/20">
                {!isCollapsed ? (
                    <div className="flex items-center gap-3">
                        {user?.avatar_path ? (
                            <img
                                src={`/hello-gestion/php/${user.avatar_path}`}
                                alt="avatar"
                                className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                            />
                        ) : (
                            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                                <UserCircle
                                    size={20}
                                    className="text-white"
                                />
                            </div>
                        )}

                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                                {user?.name || 'Utilisateur'}
                            </p>

                            <p className="text-xs text-white/60">
                                {ROLE_LABELS[role] || role}
                            </p>
                        </div>

                        <button
                            onClick={onLogout}
                            className="p-2 rounded-full hover:bg-white/10 text-white flex-shrink-0"
                            style={{
                                minWidth: "36px",
                                minHeight: "36px"
                            }}
                            title="Déconnexion"
                        >
                            <LogOut size={16} />
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={onLogout}
                        className="p-2.5 rounded-full hover:bg-white/10 text-white mx-auto block"
                        style={{
                            minWidth: "44px",
                            minHeight: "44px"
                        }}
                        title="Déconnexion"
                    >
                        <LogOut size={18} />
                    </button>
                )}
            </div>
        </div>
    );
};

export default Sidebar;