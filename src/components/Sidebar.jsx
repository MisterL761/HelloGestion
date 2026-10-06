import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

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
    Mail,
    Brain,
    Bell,
    Trash2,
} from 'lucide-react';


// ============================================================
// RÔLES
// ============================================================

const DASHBOARD_ROLES = [
    'admin',
    'gerant',
    'administration'
];

const DOSSIERS_ROLES = [
    'admin',
    'gerant',
    'administration'
];

const REPORTS_ROLES = [
    'admin',
    'gerant',
    'administration'
];

const LOGS_ROLES = [
    'admin'
];

const ROLE_LABELS = {
    admin: 'Administrateur',
    gerant: 'Gérant',
    administration: 'Administration',
    chef_equipe: "Chef d'équipe",
    commercial: 'Commercial',
    poseur: 'Poseur',
    collaborateur: 'Collaborateur',
};


// ============================================================
// SIDEBAR
// ============================================================

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

    const canSeeDashboard =
        DASHBOARD_ROLES.includes(role);

    const canSeeAllDossiers =
        DOSSIERS_ROLES.includes(role);

    const canSeeReports =
        REPORTS_ROLES.includes(role);

    const canSeeLogs =
        LOGS_ROLES.includes(role);


    // ========================================================
    // NOTIFICATIONS
    // ========================================================

    const [notifications, setNotifications] =
        useState([]);

    const [unreadCount, setUnreadCount] =
        useState(0);

    const [showNotifications, setShowNotifications] =
        useState(false);

    const [showClearHistoryModal, setShowClearHistoryModal] =
        useState(false);


    // ========================================================
    // RÉCUPÉRER LES NOTIFICATIONS
    // ========================================================

    const fetchNotifications = async () => {

        try {

            const [stockResponse, rightsResponse] =
                await Promise.all([
                    fetch(
                        '/hello-gestion/php/user_notifications.php?action=list&_=' + Date.now(),
                        {
                            method: 'GET',
                            credentials: 'include'
                        }
                    ),
                    fetch(
                        '/hello-gestion/php/generator_permissions.php?action=notifications&_=' + Date.now(),
                        {
                            method: 'GET',
                            credentials: 'include'
                        }
                    )
                ]);

            let stockNotifications = [];
            let rightsNotifications = [];

            if (stockResponse.ok) {
                const stockData = await stockResponse.json();

                if (stockData.success && Array.isArray(stockData.notifications)) {
                    stockNotifications = stockData.notifications.map(
                        notification => ({
                            ...notification,
                            notification_type: 'stock'
                        })
                    );
                }
            }

            if (rightsResponse.ok) {
                const rightsData = await rightsResponse.json();

                if (rightsData.success && Array.isArray(rightsData.notifications)) {
                    rightsNotifications = rightsData.notifications.map(
                        notification => ({
                            ...notification,
                            notification_type: 'generator_permission',
                            claimed_by: null,
                            claimed_by_name: null,
                            inventory_id: null
                        })
                    );
                }
            }

            const mergedNotifications = [
                ...stockNotifications,
                ...rightsNotifications
            ].sort(
                (a, b) =>
                    new Date(b.created_at).getTime() -
                    new Date(a.created_at).getTime()
            );

            setNotifications(mergedNotifications);

            setUnreadCount(
                mergedNotifications.filter(
                    notification => Number(notification.is_read) === 0
                ).length
            );

        } catch (error) {

            console.error(
                'Erreur récupération notifications :',
                error
            );
        }
    };


    // ========================================================
    // CHARGEMENT INITIAL + ACTUALISATION
    // ========================================================

    useEffect(() => {

        fetchNotifications();

        const interval = setInterval(() => {
            fetchNotifications();
        }, 1000);

        return () => {
            clearInterval(interval);
        };

    }, [user?.id]);


    // ========================================================
    // MARQUER UNE NOTIFICATION COMME LUE
    // ========================================================

    const markNotificationAsRead =
        async (notification) => {

            try {

                if (notification.notification_type === 'generator_permission') {

                    await fetch(
                        '/hello-gestion/php/generator_permissions.php',
                        {
                            method: 'POST',
                            headers: {
                                'Content-Type':
                                    'application/json'
                            },
                            credentials: 'include',
                            body: JSON.stringify({
                                action: 'mark_notification_read',
                                id: notification.id
                            })
                        }
                    );

                } else {

                    await fetch(
                        '/hello-gestion/php/user_notifications.php',
                        {
                            method: 'POST',
                            headers: {
                                'Content-Type':
                                    'application/json'
                            },
                            credentials: 'include',
                            body: JSON.stringify({
                                action: 'mark_read',
                                id: notification.id
                            })
                        }
                    );
                }

                await fetchNotifications();

            } catch (error) {

                console.error(
                    'Erreur marquage notification :',
                    error
                );
            }
        };


    // ========================================================
    // MARQUER TOUTES LES NOTIFICATIONS COMME LUES
    // ========================================================

    const markAllNotificationsAsRead =
        async () => {

            try {

                await Promise.all([
                    fetch(
                        '/hello-gestion/php/user_notifications.php',
                        {
                            method: 'POST',
                            headers: {
                                'Content-Type':
                                    'application/json'
                            },
                            credentials: 'include',
                            body: JSON.stringify({
                                action: 'mark_all_read'
                            })
                        }
                    ),
                    fetch(
                        '/hello-gestion/php/generator_permissions.php',
                        {
                            method: 'POST',
                            headers: {
                                'Content-Type':
                                    'application/json'
                            },
                            credentials: 'include',
                            body: JSON.stringify({
                                action: 'mark_all_notifications_read'
                            })
                        }
                    )
                ]);

                await fetchNotifications();

            } catch (error) {

                console.error(
                    'Erreur marquage notifications :',
                    error
                );
            }
        };


    // ========================================================
    // VIDER L'HISTORIQUE DES NOTIFICATIONS
    // ========================================================

    const clearNotificationHistory =
        async () => {

            try {

                const [stockResponse, rightsResponse] =
                    await Promise.all([
                        fetch(
                            '/hello-gestion/php/user_notifications.php',
                            {
                                method: 'POST',
                                headers: {
                                    'Content-Type':
                                        'application/json'
                                },
                                credentials: 'include',
                                body: JSON.stringify({
                                    action: 'clear_history'
                                })
                            }
                        ),
                        fetch(
                            '/hello-gestion/php/generator_permissions.php',
                            {
                                method: 'POST',
                                headers: {
                                    'Content-Type':
                                        'application/json'
                                },
                                credentials: 'include',
                                body: JSON.stringify({
                                    action: 'clear_notifications'
                                })
                            }
                        )
                    ]);

                const stockData = await stockResponse.json().catch(() => ({}));
                const rightsData = await rightsResponse.json().catch(() => ({}));

                if (
                    !stockResponse.ok ||
                    !stockData.success ||
                    !rightsResponse.ok ||
                    !rightsData.success
                ) {
                    alert(
                        'Impossible de vider complètement l’historique des notifications.'
                    );
                    return;
                }

                setNotifications([]);
                setUnreadCount(0);
                setShowClearHistoryModal(false);

            } catch (error) {

                console.error(
                    'Erreur suppression historique notifications :',
                    error
                );

                alert(
                    'Impossible de vider l’historique des notifications.'
                );
            }
        };


    // ========================================================
    // CLIC SUR UNE NOTIFICATION
    // ========================================================

    const [claimingNotificationId, setClaimingNotificationId] =
        useState(null);

    const handleClaimNotification =
        async (notification) => {

            if (notification.notification_type === 'generator_permission') {
                return;
            }

            if (notification.claimed_by) {
                return;
            }

            try {

                setClaimingNotificationId(notification.id);

                const response = await fetch(
                    '/hello-gestion/php/user_notifications.php',
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        credentials: 'include',
                        body: JSON.stringify({
                            action: 'claim',
                            id: notification.id
                        })
                    }
                );

                const data = await response.json();

                if (!response.ok || !data.success) {
                    alert(
                        data.message ||
                        'Cette commande a déjà été prise en charge.'
                    );
                }

                await fetchNotifications();

            } catch (error) {

                console.error(
                    'Erreur prise en charge notification :',
                    error
                );

                alert(
                    'Impossible de prendre en charge cette commande.'
                );

            } finally {

                setClaimingNotificationId(null);
            }
        };


    const handleNotificationClick =
        async (notification) => {

            if (
                notification.is_read === 0
            ) {

                await markNotificationAsRead(
                    notification
                );
            }

            setShowNotifications(false);

            if (notification.notification_type !== 'generator_permission') {
                onNavigate('inventory');
            }

            onClose();
        };


    // ========================================================
    // FORMAT DATE
    // ========================================================

    const formatNotificationDate =
        (dateString) => {

            if (!dateString) {
                return '';
            }

            const date =
                new Date(
                    dateString.replace(' ', 'T')
                );

            if (Number.isNaN(date.getTime())) {
                return '';
            }

            const now =
                new Date();

            const diff =
                now.getTime() -
                date.getTime();

            const minutes =
                Math.floor(
                    diff / 60000
                );

            if (minutes < 1) {
                return "À l'instant";
            }

            if (minutes < 60) {
                return `Il y a ${minutes} min`;
            }

            const hours =
                Math.floor(
                    minutes / 60
                );

            if (hours < 24) {
                return `Il y a ${hours} h`;
            }

            const days =
                Math.floor(
                    hours / 24
                );

            if (days === 1) {
                return 'Hier';
            }

            if (days < 7) {
                return `Il y a ${days} jours`;
            }

            return date.toLocaleDateString(
                'fr-FR',
                {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                }
            );
        };


    // ========================================================
    // SIDEBAR
    //
    // IMPORTANT :
    // z-[9990] sur desktop également.
    // Cela permet à la sidebar et à son panneau de notifications
    // de rester au-dessus du contenu des différentes pages.
    // ========================================================

    const sidebarClasses = [
        'bg-[#1a1a1a] border-r border-white/10 flex-shrink-0 flex flex-col transition-all duration-300',

        // Très haut niveau d'empilement
        'fixed inset-y-0 left-0 z-[9990]',

        'w-[85vw] max-w-[280px]',

        // IMPORTANT : on conserve un z-index élevé sur desktop
        'md:relative md:inset-auto md:z-[9990]',

        isCollapsed
            ? 'md:w-20'
            : 'md:w-64',

        isOpen
            ? 'translate-x-0'
            : '-translate-x-full md:translate-x-0',

        'transform',
    ].join(' ');


    // ========================================================
    // NAV ITEM
    // ========================================================

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
                } ${
                    isCollapsed
                        ? 'justify-center'
                        : ''
                }`}

                title={
                    isCollapsed
                        ? label
                        : ''
                }
            >

                <Icon
                    size={20}
                    className={
                        isCollapsed
                            ? ''
                            : 'mr-3'
                    }
                />

                {!isCollapsed && (

                    <span className="text-sm font-medium">
                        {label}
                    </span>

                )}

            </button>

        </li>
    );


    // ========================================================
    // SECTION LABEL
    // ========================================================

    const SectionLabel = ({
        label
    }) =>

        !isCollapsed ? (

            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 px-3 mb-2 mt-5 first:mt-0">
                {label}
            </p>

        ) : (

            <hr className="border-white/20 my-3" />

        );


    // ========================================================
    // RENDER
    // ========================================================

    return (

        <div className={sidebarClasses}>

            {/* ==================================================
                BOUTON RÉDUIRE / AGRANDIR
            ================================================== */}

            <button
                onClick={onToggleCollapse}

                className="hidden md:flex absolute -right-4 top-1/2 transform -translate-y-1/2 items-center justify-center w-8 h-8 rounded-full bg-white text-[#FFB103] hover:bg-gray-100 transition-all duration-300 shadow-lg z-[99999]"

                title={
                    isCollapsed
                        ? "Agrandir le menu"
                        : "Réduire le menu"
                }
            >

                {isCollapsed ? (

                    <ChevronRight size={18} />

                ) : (

                    <ChevronLeft size={18} />

                )}

            </button>


            {/* ==================================================
                EN-TÊTE
            ================================================== */}

            <div className="relative z-[99999] p-3 md:p-4 border-b border-white/10 flex justify-between items-center">

                {!isCollapsed ? (

                    <>

                        <div className="flex items-center gap-2.5 min-w-0">

                            <img
                                src={
                                    import.meta.env.BASE_URL +
                                    'logoHelloGestion.ico'
                                }

                                alt="Hello Gestion"

                                className="w-8 h-8 object-contain flex-shrink-0 rounded-md"
                            />

                            <h1 className="text-sm font-bold text-white truncate">
                                Hello Gestion
                            </h1>

                        </div>


                        {/* ==================================================
                            CLOCHETTE
                        ================================================== */}

                        <div className="relative ml-auto mr-2">

                            <button
                                onClick={() =>
                                    setShowNotifications(
                                        !showNotifications
                                    )
                                }

                                className="relative p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all"

                                title="Notifications"
                            >

                                <Bell size={20} />


                                {unreadCount > 0 && (

                                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">

                                        {unreadCount > 99
                                            ? '99+'
                                            : unreadCount}

                                    </span>

                                )}

                            </button>


                            {/* ==================================================
                                PANNEAU NOTIFICATIONS
                                TOUJOURS AU-DESSUS DU CONTENU
                            ================================================== */}

                            {showNotifications && (

                                <div className="absolute left-0 top-12 w-[360px] max-w-[calc(100vw-20px)] bg-[#242424] border border-white/10 rounded-xl shadow-2xl z-[999999] overflow-hidden">

                                    {/* Header */}

                                    <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">

                                        <div>

                                            <p className="text-sm font-semibold text-white">
                                                Notifications
                                            </p>

                                            <p className="text-[11px] text-white/40">

                                                {unreadCount > 0
                                                    ? `${unreadCount} non lue${
                                                        unreadCount > 1
                                                            ? 's'
                                                            : ''
                                                    }`
                                                    : 'Aucune notification non lue'
                                                }

                                            </p>

                                        </div>


                                        <div className="flex items-center gap-3">

                                            {unreadCount > 0 && (

                                                <button
                                                    onClick={
                                                        markAllNotificationsAsRead
                                                    }

                                                    className="text-[11px] text-[#FFB103] hover:underline"
                                                >

                                                    Tout lire

                                                </button>

                                            )}

                                            {notifications.length > 0 && (

                                                <button
                                                    type="button"
                                                    onClick={() => setShowClearHistoryModal(true)}
                                                    className="flex items-center gap-1.5 text-[11px] text-red-400 hover:text-red-300 hover:underline transition-colors"
                                                >
                                                    <Trash2 size={13} />
                                                    Vider l’historique
                                                </button>

                                            )}

                                        </div>

                                    </div>


                                    {/* Liste */}

                                    <div className="max-h-[400px] overflow-y-auto">

                                        {notifications.length === 0 ? (

                                            <div className="px-4 py-8 text-center">

                                                <Bell
                                                    size={28}
                                                    className="mx-auto mb-2 text-white/20"
                                                />

                                                <p className="text-sm text-white/50">
                                                    Aucune notification
                                                </p>

                                            </div>

                                        ) : (

                                            notifications.map(
                                                (notification) => (

                                                    <div
                                                        key={notification.id}
                                                        onClick={() =>
                                                            handleNotificationClick(
                                                                notification
                                                            )
                                                        }
                                                        className={`w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-all cursor-pointer ${
                                                            notification.is_read === 0
                                                                ? 'bg-[#FFB103]/5'
                                                                : ''
                                                        }`}
                                                    >

                                                        <div className="flex gap-3">

                                                            <div className="flex-shrink-0 mt-0.5">

                                                                <div
                                                                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                                                        notification.is_read === 0
                                                                            ? 'bg-red-500/20 text-red-400'
                                                                            : 'bg-white/10 text-white/40'
                                                                    }`}
                                                                >

                                                                    <AlertCircle
                                                                        size={17}
                                                                    />

                                                                </div>

                                                            </div>

                                                            <div className="min-w-0 flex-1">

                                                                <div className="flex items-start justify-between gap-2">

                                                                    <p
                                                                        className={`text-xs ${
                                                                            notification.is_read === 0
                                                                                ? 'font-semibold text-white'
                                                                                : 'font-medium text-white/60'
                                                                        }`}
                                                                    >
                                                                        {notification.title}
                                                                    </p>

                                                                    {notification.is_read === 0 && (
                                                                        <span className="w-2 h-2 rounded-full bg-[#FFB103] flex-shrink-0 mt-1" />
                                                                    )}

                                                                </div>

                                                                <p className="text-xs text-white/60 mt-1 leading-relaxed">
                                                                    {notification.message}
                                                                </p>

                                                                {notification.notification_type === 'generator_permission' ? null : notification.claimed_by ? (

                                                                    <div className="mt-2 px-2.5 py-2 rounded-lg bg-white/5 border border-white/10">
                                                                        <p className="text-[11px] text-white/70">
                                                                            ✓ Commande prise en charge par{' '}
                                                                            <span className="font-semibold text-white">
                                                                                {notification.claimed_by_name || `Utilisateur #${notification.claimed_by}`}
                                                                            </span>
                                                                        </p>
                                                                    </div>

                                                                ) : (

                                                                    <button
                                                                        type="button"
                                                                        onClick={(event) => {
                                                                            event.stopPropagation();
                                                                            handleClaimNotification(notification);
                                                                        }}
                                                                        disabled={
                                                                            claimingNotificationId === notification.id
                                                                        }
                                                                        className="mt-2 px-3 py-1.5 rounded-lg bg-[#FFB103] text-black text-[11px] font-semibold hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                                                    >
                                                                        {claimingNotificationId === notification.id
                                                                            ? 'Prise en charge...'
                                                                            : 'Prendre en charge'}
                                                                    </button>

                                                                )}

                                                                <p className="text-[10px] text-white/30 mt-1.5">
                                                                    {formatNotificationDate(
                                                                        notification.created_at
                                                                    )}
                                                                </p>

                                                            </div>

                                                        </div>

                                                    </div>

                                                )
                                            )

                                        )}

                                    </div>

                                </div>

                            )}

                        </div>


                        {/* Bouton fermer mobile */}

                        <button
                            onClick={onClose}
                            className="md:hidden text-white/60 hover:text-white ml-2 flex-shrink-0"
                        >

                            <X size={20} />

                        </button>

                    </>

                ) : (

                    <div className="relative mx-auto">

                        <button
                            onClick={() =>
                                setShowNotifications(
                                    !showNotifications
                                )
                            }

                            className="relative"

                            title="Notifications"
                        >

                            <div className="w-8 h-8 rounded-md overflow-hidden">

                                <img
                                    src={
                                        import.meta.env.BASE_URL +
                                        'logoHelloGestion.ico'
                                    }

                                    alt="Hello Gestion"

                                    className="w-8 h-8 object-contain"
                                />

                            </div>


                            {unreadCount > 0 && (

                                <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">

                                    {unreadCount > 99
                                        ? '99+'
                                        : unreadCount}

                                </span>

                            )}

                        </button>


                        {/* ==================================================
                            NOTIFICATIONS SIDEBAR RÉDUITE
                        ================================================== */}

                        {showNotifications && (

                            <div className="absolute left-12 top-0 w-[360px] max-w-[calc(100vw-20px)] bg-[#242424] border border-white/10 rounded-xl shadow-2xl z-[999999] overflow-hidden">

                                <div className="px-4 py-3 border-b border-white/10">

                                    <div className="flex items-center justify-between">

                                        <p className="text-sm font-semibold text-white">
                                            Notifications
                                        </p>

                                        <div className="flex items-center gap-3">

                                            {unreadCount > 0 && (

                                                <button
                                                    onClick={
                                                        markAllNotificationsAsRead
                                                    }

                                                    className="text-[11px] text-[#FFB103] hover:underline"
                                                >

                                                    Tout lire

                                                </button>

                                            )}

                                            {notifications.length > 0 && (

                                                <button
                                                    type="button"
                                                    onClick={() => setShowClearHistoryModal(true)}
                                                    className="flex items-center gap-1.5 text-[11px] text-red-400 hover:text-red-300 hover:underline transition-colors"
                                                >
                                                    <Trash2 size={13} />
                                                    Vider l’historique
                                                </button>

                                            )}

                                        </div>

                                    </div>

                                </div>


                                <div className="max-h-[400px] overflow-y-auto">

                                    {notifications.length === 0 ? (

                                        <div className="px-4 py-8 text-center">

                                            <Bell
                                                size={28}
                                                className="mx-auto mb-2 text-white/20"
                                            />

                                            <p className="text-sm text-white/50">
                                                Aucune notification
                                            </p>

                                        </div>

                                    ) : (

                                        notifications.map(
                                            (notification) => (

                                                <div
                                                    key={notification.id}
                                                    onClick={() =>
                                                        handleNotificationClick(
                                                            notification
                                                        )
                                                    }
                                                    className={`w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/5 cursor-pointer ${
                                                        notification.is_read === 0
                                                            ? 'bg-[#FFB103]/5'
                                                            : ''
                                                    }`}
                                                >

                                                    <p className="text-xs font-semibold text-white">
                                                        {notification.title}
                                                    </p>

                                                    <p className="text-xs text-white/60 mt-1">
                                                        {notification.message}
                                                    </p>

                                                    {notification.notification_type === 'generator_permission' ? null : notification.claimed_by ? (

                                                        <p className="text-[11px] text-white/70 mt-2">
                                                            ✓ Prise en charge par{' '}
                                                            <span className="font-semibold text-white">
                                                                {notification.claimed_by_name || `Utilisateur #${notification.claimed_by}`}
                                                            </span>
                                                        </p>

                                                    ) : (

                                                        <button
                                                            type="button"
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                handleClaimNotification(notification);
                                                            }}
                                                            disabled={
                                                                claimingNotificationId === notification.id
                                                            }
                                                            className="mt-2 px-3 py-1.5 rounded-lg bg-[#FFB103] text-black text-[11px] font-semibold hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                                        >
                                                            {claimingNotificationId === notification.id
                                                                ? 'Prise en charge...'
                                                                : 'Prendre en charge'}
                                                        </button>

                                                    )}

                                                    <p className="text-[10px] text-white/30 mt-1">
                                                        {formatNotificationDate(
                                                            notification.created_at
                                                        )}
                                                    </p>

                                                </div>

                                            )
                                        )

                                    )}

                                </div>

                            </div>

                        )}

                    </div>

                )}

            </div>


            {/* ==================================================
                NAVIGATION
            ================================================== */}

            <nav className="p-3 md:p-4 flex-1 overflow-y-auto">

                <ul>

                    {/* ==================================================
                        COLLABORATEUR
                    ================================================== */}

                    {role === 'collaborateur' ? (

                        <>

                            <SectionLabel label="Affaires" />

                            <NavItem
                                icon={Handshake}
                                label="Mes Affaires"
                                id="affaires"
                                active={
                                    activeSidebar ===
                                    'affaires'
                                }
                            />

                        </>

                    ) : (

                        <>

                            {/* ==================================================
                                GESTION DE STOCK
                            ================================================== */}

                            <SectionLabel
                                label="Gestion de Stock"
                            />


                            {canSeeDashboard && (

                                <NavItem
                                    icon={LayoutDashboard}
                                    label="Tableau de bord"
                                    id="dashboard"
                                    active={
                                        activeSidebar ===
                                        'dashboard'
                                    }
                                />

                            )}


                            <NavItem
                                icon={Warehouse}
                                label="Produits Reçus"
                                id="received"
                                active={
                                    activeSidebar ===
                                    'received'
                                }
                            />


                            <NavItem
                                icon={CheckCheck}
                                label="Produits Posés"
                                id="installed"
                                active={
                                    activeSidebar ===
                                    'installed'
                                }
                            />


                            <NavItem
                                icon={AlertCircle}
                                label="Défectueux"
                                id="defective"
                                active={
                                    activeSidebar ===
                                    'defective'
                                }
                            />


                            <NavItem
                                icon={ToolCase}
                                label="Consommables"
                                id="inventory"
                                active={
                                    activeSidebar ===
                                    'inventory'
                                }
                            />


                            <NavItem
                                icon={Drill}
                                label="Outils"
                                id="tools"
                                active={
                                    activeSidebar ===
                                    'tools'
                                }
                            />


                            <NavItem
                                icon={ClipboardList}
                                label="Commandes"
                                id="orders"
                                active={
                                    activeSidebar ===
                                    'orders'
                                }
                            />


                            {canSeeDashboard && (

                                <NavItem
                                    icon={History}
                                    label="Historique Stock"
                                    id="history"
                                    active={
                                        activeSidebar ===
                                        'history'
                                    }
                                />

                            )}


                            {/* ==================================================
                                COMMERCIAL
                            ================================================== */}

                            {[
                                'admin',
                                'gerant',
                                'administration'
                            ].includes(role) && (

                                <>

                                    <SectionLabel
                                        label="Commercial"
                                    />

                                    <NavItem
                                        icon={Handshake}
                                        label="Affaires"
                                        id="affaires"
                                        active={
                                            activeSidebar ===
                                            'affaires'
                                        }
                                    />

                                </>

                            )}


                            {/* ==================================================
                                RESSOURCES
                            ================================================== */}

                            <SectionLabel
                                label="Ressources"
                            />


                            <NavItem
                                icon={Book}
                                label="Annuaire Fournisseurs"
                                id="annuaire"
                                active={
                                    activeSidebar ===
                                    'annuaire'
                                }
                            />


                            {[
                                'admin',
                                'gerant',
                                'administration'
                            ].includes(role) && (

                                <NavItem
                                    icon={Inbox}
                                    label="Boîte Fournisseurs"
                                    id="boite-fournisseurs"
                                    active={
                                        activeSidebar ===
                                        'boite-fournisseurs'
                                    }
                                />

                            )}


                            <NavItem
                                icon={Bot}
                                label="Assistant IA"
                                id="assistant"
                                active={
                                    activeSidebar ===
                                    'assistant'
                                }
                            />


                            <NavItem
                                icon={GitMerge}
                                label="Comparateur"
                                id="comparateur"
                                active={
                                    activeSidebar ===
                                    'comparateur'
                                }
                            />


                            <NavItem
                                icon={ScanLine}
                                label="Générateur ARC"
                                id="generateur-arc"
                                active={
                                    activeSidebar ===
                                    'generateur-arc'
                                }
                            />


                            {[
                                'admin',
                                'gerant',
                                'administration',
                                'chef_equipe',
                                'commercial'
                            ].includes(role) && (

                                <NavItem
                                    icon={PencilRuler}
                                    label="Générateur descriptifs"
                                    id="generateur-descriptifs"
                                    active={
                                        activeSidebar ===
                                        'generateur-descriptifs'
                                    }
                                />

                            )}


                            {[
                                'admin',
                                'gerant',
                                'administration',
                                'chef_equipe',
                                'commercial'
                            ].includes(role) && (

                                <NavItem
                                    icon={Mail}
                                    label="Générateur courrier"
                                    id="generateur-courrier"
                                    active={
                                        activeSidebar ===
                                        'generateur-courrier'
                                    }
                                />

                            )}


                            {/* Générateur de prompts */}

                            <NavItem
                                icon={Brain}
                                label="Générateur de prompts"
                                id="generateur-prompts"
                                active={
                                    activeSidebar ===
                                    'generateur-prompts'
                                }
                            />


                            {role !== 'poseur' && (

                                <NavItem
                                    icon={BookMarked}
                                    label="Catalogue"
                                    id="catalogue"
                                    active={
                                        activeSidebar ===
                                        'catalogue'
                                    }
                                />

                            )}


                            {[
                                'admin',
                                'gerant',
                                'administration'
                            ].includes(role) && (

                                <NavItem
                                    icon={Calculator}
                                    label="Calcul Chantier"
                                    id="calcul-chantier"
                                    active={
                                        activeSidebar ===
                                        'calcul-chantier'
                                    }
                                />

                            )}


                            {[
                                'admin',
                                'gerant',
                                'administration'
                            ].includes(role) && (

                                <NavItem
                                    icon={TrendingUp}
                                    label="Rentabilité Chantiers"
                                    id="chantiers"
                                    active={
                                        activeSidebar ===
                                        'chantiers'
                                    }
                                />

                            )}


                            {/* ==================================================
                                FACTURATION
                            ================================================== */}

                            {[
                                'admin',
                                'gerant',
                                'administration'
                            ].includes(role) && (

                                <>

                                    <SectionLabel
                                        label="Facturation"
                                    />

                                    <NavItem
                                        icon={CreditCard}
                                        label="Sites de facturation"
                                        id="sites-facturation"
                                        active={
                                            activeSidebar ===
                                            'sites-facturation'
                                        }
                                    />

                                </>

                            )}


                            {/* ==================================================
                                MON ESPACE
                            ================================================== */}

                            <SectionLabel
                                label="Mon Espace"
                            />


                            {canSeeReports && (

                                <NavItem
                                    icon={FileBarChart}
                                    label="Rapports"
                                    id="rapports"
                                    active={
                                        activeSidebar ===
                                        'rapports'
                                    }
                                />

                            )}


                            <NavItem
                                icon={Briefcase}
                                label="Mon Casier"
                                id="casier"
                                active={
                                    activeSidebar ===
                                    'casier'
                                }
                            />


                            {canSeeAllDossiers && (

                                <NavItem
                                    icon={Users}
                                    label="Gestion Employés"
                                    id="dossiers"
                                    active={
                                        activeSidebar ===
                                        'dossiers'
                                    }
                                />

                            )}


                            {canSeeLogs && (

                                <NavItem
                                    icon={Terminal}
                                    label="Journal (Logs)"
                                    id="logs"
                                    active={
                                        activeSidebar ===
                                        'logs'
                                    }
                                />

                            )}


                            <NavItem
                                icon={Settings}
                                label="Paramètres"
                                id="settings"
                                active={
                                    activeSidebar ===
                                    'settings'
                                }
                            />

                        </>

                    )}

                </ul>

            </nav>


            {/* ==================================================
                PIED DE PAGE UTILISATEUR
            ================================================== */}

            <div className="p-3 md:p-4 border-t border-white/20">

                {!isCollapsed ? (

                    <div className="flex items-center gap-3">

                        {user?.avatar_path ? (

                            <img
                                src={
                                    `/hello-gestion/php/${user.avatar_path}`
                                }

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

                                {user?.name ||
                                    'Utilisateur'}

                            </p>

                            <p className="text-xs text-white/60">

                                {ROLE_LABELS[role] ||
                                    role}

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



            {/* ==================================================
                MODALE DE CONFIRMATION - VIDER L'HISTORIQUE
            ================================================== */}

            {showClearHistoryModal && createPortal(
                <div
                    className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/55 backdrop-blur-[4px]"
                    onClick={() => setShowClearHistoryModal(false)}
                    role="presentation"
                >
                    <div
                        className="w-full max-w-[430px] rounded-2xl bg-[#242424] border border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.65)] overflow-hidden"
                        onClick={(event) => event.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="clear-history-title"
                    >
                        <div className="h-1 bg-[#FFB103]" />

                        <div className="px-6 pt-6 pb-5">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                                    <Trash2 size={22} className="text-red-400" />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <h3 id="clear-history-title" className="text-[17px] font-semibold text-white">
                                        Vider l'historique ?
                                    </h3>

                                    <p className="text-[13px] leading-5 text-white/55 mt-2">
                                        Toutes vos notifications vont être supprimées de votre historique. Cette action est irréversible.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setShowClearHistoryModal(false)}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all flex-shrink-0"
                                    title="Fermer"
                                    aria-label="Fermer"
                                >
                                    <X size={17} />
                                </button>
                            </div>
                        </div>

                        <div className="border-t border-white/10 px-6 py-4 flex items-center justify-end gap-3 bg-black/10">
                            <button
                                type="button"
                                onClick={() => setShowClearHistoryModal(false)}
                                className="px-4 py-2.5 rounded-lg text-[12px] font-medium text-white/60 hover:text-white hover:bg-white/10 transition-all"
                            >
                                Annuler
                            </button>

                            <button
                                type="button"
                                onClick={clearNotificationHistory}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-500 hover:bg-red-400 text-white text-[12px] font-semibold shadow-lg shadow-red-500/20 transition-all"
                            >
                                <Trash2 size={14} />
                                Vider l'historique
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};


export default Sidebar;