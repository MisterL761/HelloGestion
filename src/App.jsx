import React, { useState, useEffect } from 'react';

import Login from './components/Login';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

import ProductsReceived from './components/ProductsReceived';
import ProductsInstalled from './components/ProductsInstalled';
import ProductsDefective from './components/ProductsDefective';

import Inventory from './components/Inventory';
import Tools from './components/Tools';
import Orders from './components/Orders';

import Dashboard from './components/Dashboard';
import Affaires from './components/Affaires';

import ForcePasswordChangeModal from './components/ForcePasswordChangeModal';
import ResetPasswordPage from './components/ResetPasswordPage';

import Casier from './components/Casier';
import AdminDossiers from './components/AdminDossiers';
import Logs from './components/Logs';
import Settings from './components/Settings';

import Annuaire from './components/Annuaire';
import Assistant from './components/Assistant';
import ComparateurDevis from './components/ComparateurDevis';

import GenerateurARC from './components/GenerateurARC';
import GenerateurDescriptifs from './components/GenerateurDescriptifs';
import GenerateurCourrier from './components/GenerateurCourrier';
import GenerateurPrompts from './components/GenerateurPrompts';
import StockHistory from './components/StockHistory';
import Catalogue from './components/Catalogue';
import Chantiers from './components/Chantiers';
import CalculChantier from './components/CalculChantier';
import Rapports from './components/Rapports';

import SitesFacturation from './components/SitesFacturation';

import Fournisseurs from './components/Fournisseurs';
import FournisseurDetail from './components/FournisseurDetail';
import FournisseursConfig from './components/FournisseursConfig';

import AddProductModal from './components/AddProductModal';
import AddDefectiveProductModal from './components/AddDefectiveProductModal';
import EditDefectiveProductModal from './components/EditDefectiveProductModal';

import AddArticleModal from './components/AddArticleModal';
import AddToolModal from './components/AddToolModal';

import EditProductModal from './components/EditProductModal';
import EditArticleModal from './components/EditArticleModal';
import EditToolModal from './components/EditToolModal';

import SidebarBackdrop from './components/SidebarBackdrop';
import BottomNav from './components/BottomNav';
import MobileStockNav from './components/MobileStockNav';
import MobileResourcesNav from './components/MobileResourcesNav';

import SearchBar from './components/SearchBar';
import LoadingSpinner from './components/LoadingSpinner';
import Skeleton from './components/Skeleton';

import SessionExpiredModal from './components/SessionExpiredModal';

import BroadcastModal from './components/BroadcastModal';
import BroadcastBubble from './components/BroadcastBubble';

import { useDataFetching } from './hooks/useDataFetching';
import { useOnlineStatus } from './hooks/useOnlineStatus';

import {
    filterBySearch,
    exportToCSV
} from './utils/utilities';

import {
    useToast,
    useConfirm
} from './components/ToastProvider';

const API_BASE =
    import.meta.env.VITE_API_BASE ||
    '/hello-gestion/php';

// Rôles autorisés à voir le Dashboard
const DASHBOARD_ROLES = [
    'admin',
    'gerant',
    'administration'
];

// Première page selon le rôle
const getDefaultTab = (role) =>
    DASHBOARD_ROLES.includes(role) &&
    window.innerWidth >= 768
        ? 'dashboard'
        : 'received';

const getDefaultModule = (role) =>
    role === 'collaborateur'
        ? 'affaires'
        : 'stock';

function App() {
    const toast = useToast();
    const confirm = useConfirm();

    const [isAuthenticated, setIsAuthenticated] =
        useState(false);

    const [user, setUser] =
        useState(null);

    const [hasCheckedAuth, setHasCheckedAuth] =
        useState(false);

    const [sessionExpired, setSessionExpired] =
        useState(false);

    const isOnline =
        useOnlineStatus();

    // Module courant
    const [activeModule, setActiveModule] =
        useState('stock');

    const [dossierInitialUser, setDossierInitialUser] =
        useState(null);

    // Onglet actif dans le module stock
    const [activeTab, setActiveTab] =
        useState('received');

    const [activeSidebar, setActiveSidebar] =
        useState('received');

    const [searchTerm, setSearchTerm] =
        useState('');

    const [isSidebarOpen, setIsSidebarOpen] =
        useState(false);

    const [isSidebarCollapsed, setIsSidebarCollapsed] =
        useState(false);

    const [showProductModal, setShowProductModal] =
        useState(false);

    const [showDefectiveProductModal, setShowDefectiveProductModal] =
        useState(false);

    const [showArticleModal, setShowArticleModal] =
        useState(false);

    const [showToolModal, setShowToolModal] =
        useState(false);

    const [editProductModalOpen, setEditProductModalOpen] =
        useState(false);

    const [editDefectiveModalOpen, setEditDefectiveModalOpen] =
        useState(false);

    const [editArticleModalOpen, setEditArticleModalOpen] =
        useState(false);

    const [editToolModalOpen, setEditToolModalOpen] =
        useState(false);

    const [showSettings, setShowSettings] =
        useState(false);

    const [viewAsRole, setViewAsRole] =
        useState(null);

    const [fournisseurView, setFournisseurView] =
        useState({
            screen: 'list',
            supplier: null
        });

    // Utilisateur effectif
    const displayUser =
        viewAsRole
            ? {
                ...user,
                role: viewAsRole
            }
            : user;

    const [currentProduct, setCurrentProduct] =
        useState(null);

    const [productToEdit, setProductToEdit] =
        useState(null);

    const [currentArticle, setCurrentArticle] =
        useState(null);

    const [currentTool, setCurrentTool] =
        useState(null);

    const {
        productsReceived,
        installedProducts,
        defectiveProducts,
        inventoryItems,
        toolsItems,
        stats,
        loading,
        refetch,
        updateInventoryItemStock,
        updateInventoryItem,
        addInventoryItem,
        removeInventoryItem
    } = useDataFetching(
        API_BASE,
        isAuthenticated
    );

    // ─────────────────────────────────────────
    // Vérification session
    // ─────────────────────────────────────────

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const response = await fetch(
                    `${API_BASE}/auth.php?action=check`,
                    {
                        credentials: 'include'
                    }
                );

                const data =
                    await response.json();

                if (
                    data.success &&
                    data.data?.user
                ) {
                    const u =
                        data.data.user;

                    setIsAuthenticated(true);
                    setUser(u);

                    const defaultTab =
                        getDefaultTab(u.role);

                    setActiveTab(defaultTab);

                    setActiveSidebar(
                        u.role === 'collaborateur'
                            ? 'affaires'
                            : defaultTab
                    );

                    setActiveModule(
                        getDefaultModule(u.role)
                    );
                } else {
                    setIsAuthenticated(false);
                    setUser(null);
                }
            } catch {
                setIsAuthenticated(false);
                setUser(null);
            } finally {
                setHasCheckedAuth(true);
            }
        };

        checkAuth();
    }, []);

    // ─────────────────────────────────────────
    // Détection expiration session
    // ─────────────────────────────────────────

    useEffect(() => {
        const handleExpired = () => {
            if (isAuthenticated) {
                setSessionExpired(true);
            }
        };

        window.addEventListener(
            'session-expired',
            handleExpired
        );

        const interval =
            setInterval(async () => {
                if (!isAuthenticated) {
                    return;
                }

                try {
                    const res =
                        await fetch(
                            `${API_BASE}/auth.php?action=check`,
                            {
                                credentials: 'include'
                            }
                        );

                    const data =
                        await res.json();

                    if (!data.success) {
                        setSessionExpired(true);
                    }
                } catch {
                    // Réseau indisponible
                }
            }, 120000);

        return () => {
            window.removeEventListener(
                'session-expired',
                handleExpired
            );

            clearInterval(interval);
        };
    }, [isAuthenticated]);

    // ─────────────────────────────────────────
    // Login
    // ─────────────────────────────────────────

    const handleLoginSuccess =
        (userData) => {
            setIsAuthenticated(true);
            setUser(userData);
            setHasCheckedAuth(true);

            const defaultTab =
                getDefaultTab(
                    userData.role
                );

            setActiveTab(defaultTab);

            setActiveSidebar(
                userData.role === 'collaborateur'
                    ? 'affaires'
                    : defaultTab
            );

            setActiveModule(
                getDefaultModule(
                    userData.role
                )
            );
        };

    // ─────────────────────────────────────────
    // Logout
    // ─────────────────────────────────────────

    const handleLogout =
        async () => {
            try {
                await fetch(
                    `${API_BASE}/auth.php?action=logout`,
                    {
                        method: 'POST',
                        credentials: 'include'
                    }
                );
            } catch {
                // ignore
            }

            setIsAuthenticated(false);
            setSessionExpired(false);
            setUser(null);
        };

    const handleReconnect =
        () => {
            setSessionExpired(false);
            setIsAuthenticated(false);
            setUser(null);
        };

    // ─────────────────────────────────────────
    // Mise à jour profil
    // ─────────────────────────────────────────

    const handleUserUpdate =
        (updates) => {
            setUser(
                prev => ({
                    ...prev,
                    ...updates
                })
            );
        };

    // ─────────────────────────────────────────
    // Navigation
    // ─────────────────────────────────────────

    const handleNavigation =
        (section) => {
            // Collaborateur
            if (
                displayUser?.role ===
                'collaborateur' &&
                section !== 'affaires'
            ) {
                return;
            }

            if (section === 'casier') {
                setActiveModule('casier');
                setActiveSidebar('casier');

            } else if (section === 'dossiers') {
                setActiveModule('dossiers');
                setActiveSidebar('dossiers');
                setDossierInitialUser(null);

            } else if (section === 'logs') {
                setActiveModule('logs');
                setActiveSidebar('logs');

            } else if (section === 'annuaire') {
                setActiveModule('annuaire');
                setActiveSidebar('annuaire');

            } else if (
                section === 'boite-fournisseurs'
            ) {
                setActiveModule(
                    'boite-fournisseurs'
                );
                setActiveSidebar(
                    'boite-fournisseurs'
                );

            } else if (section === 'assistant') {
                setActiveModule('assistant');
                setActiveSidebar('assistant');

            } else if (section === 'comparateur') {
                setActiveModule('comparateur');
                setActiveSidebar('comparateur');

            } else if (
                section === 'generateur-arc'
            ) {
                setActiveModule(
                    'generateur-arc'
                );
                setActiveSidebar(
                    'generateur-arc'
                );

            } else if (
                section ===
                'generateur-descriptifs'
            ) {
                setActiveModule(
                    'generateur-descriptifs'
                );
                setActiveSidebar(
                    'generateur-descriptifs'
                );

            } else if (
                section ===
                'generateur-courrier'
            ) {
                setActiveModule(
                    'generateur-courrier'
                );
                setActiveSidebar(
                    'generateur-courrier'
                );

            } else if (section === 'history') {
                setActiveModule('history');
                setActiveSidebar('history');

            } else if (section === 'catalogue') {
                setActiveModule('catalogue');
                setActiveSidebar('catalogue');

            } else if (section === 'chantiers') {
                setActiveModule('chantiers');
                setActiveSidebar('chantiers');

            } else if (
                section ===
                'calcul-chantier'
            ) {
                setActiveModule(
                    'calcul-chantier'
                );

                setActiveSidebar(
                    'calcul-chantier'
                );

            } else if (section === 'rapports') {
                setActiveModule('rapports');
                setActiveSidebar('rapports');

            } else if (
                section ===
                'sites-facturation'
            ) {
                setActiveModule(
                    'sites-facturation'
                );

                setActiveSidebar(
                    'sites-facturation'
                );

            } else if (section === 'affaires') {
                setActiveModule('affaires');
                setActiveSidebar('affaires');

            } else if (section === 'settings') {
                setShowSettings(true);

            } else {
                setActiveModule('stock');
                setActiveSidebar(section);

                const mapping = {
                    received: 'received',
                    installed: 'installed',
                    defective: 'defective',
                    inventory: 'stock',
                    tools: 'tools',
                    orders: 'orders',
                    dashboard: 'dashboard'
                };

                setActiveTab(
                    mapping[section] ||
                    section
                );
            }

            if (
                window.innerWidth < 768
            ) {
                setIsSidebarOpen(false);
            }
        };

    // ─────────────────────────────────────────
    // Changement onglet
    // ─────────────────────────────────────────

    const handleTabChange =
        (tab) => {
            if (
                displayUser?.role ===
                'collaborateur'
            ) {
                return;
            }

            if (
                tab === 'dashboard' &&
                !DASHBOARD_ROLES.includes(
                    displayUser?.role
                )
            ) {
                return;
            }

            setActiveTab(tab);

            const mapping = {
                received: 'received',
                installed: 'installed',
                defective: 'defective',
                stock: 'inventory',
                tools: 'tools',
                orders: 'orders',
                dashboard: 'dashboard'
            };

            setActiveSidebar(
                mapping[tab] ||
                tab
            );

            setActiveModule('stock');
        };

    // ─────────────────────────────────────────
    // Produits reçus
    // ─────────────────────────────────────────

    const handleAddProduct =
        async () => {
            await refetch();
            setShowProductModal(false);
        };

    const handleMarkAsInstalled =
        async (productId) => {
            try {
                const res =
                    await fetch(
                        `${API_BASE}/installed.php`,
                        {
                            method: 'POST',
                            headers: {
                                'Content-Type':
                                    'application/json'
                            },
                            body: JSON.stringify({
                                id: productId
                            }),
                            credentials:
                                'include'
                        }
                    );

                const data =
                    await res.json();

                if (data.success) {
                    await refetch();

                    toast.success(
                        'Produit marqué comme posé ✓'
                    );
                } else {
                    toast.error(
                        data.message ||
                        'Impossible de marquer comme posé'
                    );
                }
            } catch {
                toast.error(
                    "Erreur technique lors de l'opération"
                );
            }
        };

    const handleMarkAsDefective =
        async (productId) => {
            try {
                const res =
                    await fetch(
                        `${API_BASE}/defective.php`,
                        {
                            method: 'POST',
                            headers: {
                                'Content-Type':
                                    'application/json'
                            },
                            body: JSON.stringify({
                                id: productId,
                                action: 'transfer'
                            }),
                            credentials:
                                'include'
                        }
                    );

                const data =
                    await res.json();

                if (data.success) {
                    await refetch();

                    toast.success(
                        'Produit marqué comme défectueux ✓'
                    );
                }
            } catch {
                toast.error(
                    'Erreur lors du marquage en défectueux'
                );
            }
        };

    const handleEditProduct =
        (product) => {
            setCurrentProduct(product);
            setEditProductModalOpen(true);
        };

    const handleSaveEditedProduct =
        async (updatedProduct) => {
            try {
                const res =
                    await fetch(
                        `${API_BASE}/received.php`,
                        {
                            method: 'PUT',
                            headers: {
                                'Content-Type':
                                    'application/json'
                            },
                            body: JSON.stringify(
                                updatedProduct
                            ),
                            credentials:
                                'include'
                        }
                    );

                const data =
                    await res.json();

                if (data.success) {
                    await refetch();

                    setEditProductModalOpen(
                        false
                    );

                    setCurrentProduct(null);

                    toast.success(
                        'Produit modifié ✓'
                    );
                } else {
                    toast.error(
                        data.message ||
                        'Erreur inconnue'
                    );
                }
            } catch {
                toast.error(
                    'Erreur lors de la modification'
                );
            }
        };

    const handleDeleteProduct =
        async (productId) => {
            if (
                !await confirm(
                    'Supprimer ce produit ?'
                )
            ) {
                return;
            }

            try {
                const res =
                    await fetch(
                        `${API_BASE}/received.php?id=${productId}`,
                        {
                            method: 'DELETE',
                            credentials:
                                'include'
                        }
                    );

                const data =
                    await res.json();

                if (data.success) {
                    await refetch();

                    toast.success(
                        'Produit supprimé'
                    );
                } else {
                    toast.error(
                        data.message ||
                        'Erreur lors de la suppression'
                    );
                }
            } catch {
                toast.error(
                    'Erreur suppression'
                );
            }
        };

    // ─────────────────────────────────────────
    // Produits défectueux
    // ─────────────────────────────────────────

    const handleAddDefectiveProduct =
        async () => {
            await refetch();

            setShowDefectiveProductModal(
                false
            );
        };

    const handleEditDefectiveProduct =
        (product) => {
            setProductToEdit(product);
            setEditDefectiveModalOpen(true);
        };

    const handleUpdateDefectiveProduct =
        async () => {
            await refetch();

            setEditDefectiveModalOpen(false);
            setProductToEdit(null);
        };

    const handleDeleteDefective =
        async (id) => {
            if (
                !await confirm(
                    'Supprimer ce produit défectueux ?'
                )
            ) {
                return;
            }

            try {
                const res =
                    await fetch(
                        `${API_BASE}/defective.php?id=${id}`,
                        {
                            method: 'DELETE',
                            credentials:
                                'include'
                        }
                    );

                const data =
                    await res.json();

                if (data.success) {
                    await refetch();

                    toast.success(
                        'Produit défectueux supprimé'
                    );
                }
            } catch {
                toast.error(
                    'Erreur lors de la suppression'
                );
            }
        };

    // ─────────────────────────────────────────
    // Produits posés
    // ─────────────────────────────────────────

    const handleDeleteInstalled =
        async (id) => {
            if (
                !await confirm(
                    'Supprimer ce produit posé ?'
                )
            ) {
                return;
            }

            try {
                const res =
                    await fetch(
                        `${API_BASE}/installed.php?id=${id}`,
                        {
                            method: 'DELETE',
                            credentials:
                                'include'
                        }
                    );

                const data =
                    await res.json();

                if (data.success) {
                    await refetch();

                    toast.success(
                        'Produit posé supprimé'
                    );
                }
            } catch {
                toast.error(
                    'Erreur lors de la suppression'
                );
            }
        };

    // ─────────────────────────────────────────
    // Inventaire
    // ─────────────────────────────────────────

    const handleAddArticle =
        async (articleData) => {
            try {
                const fd =
                    new FormData();

                fd.append(
                    'material',
                    articleData.material
                );

                fd.append(
                    'supplier',
                    articleData.supplier
                );

                fd.append(
                    'category',
                    articleData.category
                );

                fd.append(
                    'stock',
                    articleData.stock
                );

                fd.append(
                    'threshold',
                    articleData.threshold
                );

                fd.append(
                    'conditionnement',
                    articleData.conditionnement ||
                    'unite'
                );

                if (articleData.price) {
                    fd.append(
                        'price',
                        articleData.price
                    );
                }

                if (articleData.file) {
                    fd.append(
                        'file',
                        articleData.file
                    );
                }

                const res =
                    await fetch(
                        `${API_BASE}/inventory.php`,
                        {
                            method: 'POST',
                            body: fd,
                            credentials:
                                'include'
                        }
                    );

                const data =
                    await res.json();

                if (data.success) {
                    const stock =
                        Number(
                            articleData.stock
                        );

                    const threshold =
                        Number(
                            articleData.threshold
                        );

                    addInventoryItem({
                        id: data.id,
                        material:
                            articleData.material,
                        supplier:
                            articleData.supplier,
                        category:
                            articleData.category,
                        stock,
                        threshold,
                        price:
                            articleData.price ||
                            null,
                        conditionnement:
                            articleData.conditionnement ||
                            'unite',
                        status:
                            stock === 0
                                ? 'Rupture'
                                : stock <
                                  threshold
                                    ? 'Faible Stock'
                                    : 'Disponible',
                        file_path: null,
                        file_name: null,
                        file_type: null
                    });

                    setShowArticleModal(
                        false
                    );
                } else {
                    toast.error(
                        data.message ||
                        "Erreur lors de l'ajout"
                    );
                }
            } catch {
                toast.error(
                    "Erreur lors de l'ajout"
                );
            }
        };

    const handleEditArticle =
        (article) => {
            setCurrentArticle(article);
            setEditArticleModalOpen(true);
        };

    const handleSaveEditedArticle =
        (formData) => {
            if (
                currentArticle?.id &&
                formData
            ) {
                updateInventoryItem(
                    currentArticle.id,
                    {
                        material:
                            formData.material,
                        supplier:
                            formData.supplier,
                        category:
                            formData.category,
                        stock:
                            parseInt(
                                formData.stock
                            ),
                        threshold:
                            parseInt(
                                formData.threshold
                            ),
                        price:
                            formData.price
                                ? parseFloat(
                                    formData.price
                                )
                                : null,
                        conditionnement:
                            formData.conditionnement ||
                            'unite'
                    }
                );
            }

            setEditArticleModalOpen(false);
            setCurrentArticle(null);
        };

    const handleDeleteArticle =
        async (id) => {
            if (
                !await confirm(
                    'Supprimer cet article ?'
                )
            ) {
                return;
            }

            try {
                const res =
                    await fetch(
                        `${API_BASE}/inventory.php?id=${id}`,
                        {
                            method: 'DELETE',
                            credentials:
                                'include'
                        }
                    );

                const data =
                    await res.json();

                if (data.success) {
                    removeInventoryItem(id);

                    toast.success(
                        'Article supprimé'
                    );
                } else {
                    toast.error(
                        data.message ||
                        'Erreur lors de la suppression'
                    );
                }
            } catch {
                toast.error(
                    'Erreur lors de la suppression'
                );
            }
        };

    const handleUpdateStock =
        async (id, quantity) => {
            try {
                const res =
                    await fetch(
                        `${API_BASE}/inventory.php`,
                        {
                            method: 'PUT',
                            headers: {
                                'Content-Type':
                                    'application/json'
                            },
                            body: JSON.stringify({
                                id,
                                stock: quantity
                            }),
                            credentials:
                                'include'
                        }
                    );

                const data =
                    await res.json();

                if (data.success) {
                    updateInventoryItemStock(
                        id,
                        quantity
                    );
                } else {
                    toast.error(
                        data.message ||
                        'Erreur mise à jour stock'
                    );
                }
            } catch {
                toast.error(
                    'Erreur mise à jour stock'
                );
            }
        };

    const handleBulkEdit =
        async (ids, updates) => {
            try {
                const res =
                    await fetch(
                        `${API_BASE}/bulk_update.php`,
                        {
                            method: 'POST',
                            headers: {
                                'Content-Type':
                                    'application/json'
                            },
                            body: JSON.stringify({
                                ids,
                                updates
                            }),
                            credentials:
                                'include'
                        }
                    );

                const data =
                    await res.json();

                if (data.success) {
                    await refetch();

                    toast.success(
                        'Modifications enregistrées ✓'
                    );
                } else {
                    toast.error(
                        data.message ||
                        'Erreur lors de la modification'
                    );
                }
            } catch {
                toast.error(
                    'Erreur lors de la modification'
                );
            }
        };

    // ─────────────────────────────────────────
    // Outils
    // ─────────────────────────────────────────

    const handleAddTool =
        async (formData) => {
            try {
                const res =
                    await fetch(
                        `${API_BASE}/tools_api.php`,
                        {
                            method: 'POST',
                            body: formData,
                            credentials:
                                'include'
                        }
                    );

                const data =
                    await res.json();

                if (data.success) {
                    await refetch();

                    setShowToolModal(
                        false
                    );

                    toast.success(
                        'Outil ajouté ✓'
                    );
                } else {
                    toast.error(
                        data.message ||
                        "Erreur lors de l'ajout"
                    );
                }
            } catch {
                toast.error(
                    "Erreur lors de l'ajout"
                );
            }
        };

    const handleEditTool =
        (tool) => {
            setCurrentTool(tool);
            setEditToolModalOpen(true);
        };

    const handleSaveEditedTool =
        async (formData) => {
            try {
                const res =
                    await fetch(
                        `${API_BASE}/tools_api.php?_method=PUT`,
                        {
                            method: 'POST',
                            body: formData,
                            credentials:
                                'include'
                        }
                    );

                const data =
                    await res.json();

                if (data.success) {
                    await refetch();

                    setEditToolModalOpen(
                        false
                    );

                    setCurrentTool(null);

                    toast.success(
                        'Outil modifié ✓'
                    );
                } else {
                    toast.error(
                        data.message ||
                        'Erreur lors de la modification'
                    );
                }
            } catch {
                toast.error(
                    'Erreur lors de la modification'
                );
            }
        };

    const handleDeleteTool =
        async (id) => {
            if (
                !await confirm(
                    'Supprimer cet outil ?'
                )
            ) {
                return;
            }

            try {
                const res =
                    await fetch(
                        `${API_BASE}/tools_api.php?id=${id}`,
                        {
                            method: 'DELETE',
                            credentials:
                                'include'
                        }
                    );

                const data =
                    await res.json();

                if (data.success) {
                    await refetch();

                    toast.success(
                        'Outil supprimé'
                    );
                } else {
                    toast.error(
                        data.message ||
                        'Erreur lors de la suppression'
                    );
                }
            } catch {
                toast.error(
                    'Erreur lors de la suppression'
                );
            }
        };

    // ─────────────────────────────────────────
    // Export
    // ─────────────────────────────────────────

    const handleExport =
        (type) => {
            const dataMap = {
                'produits-recus': [
                    productsReceived,
                    'produits_recus'
                ],

                'produits-poses': [
                    installedProducts,
                    'produits_poses'
                ],

                'produits-defectueux': [
                    defectiveProducts,
                    'produits_defectueux'
                ],

                inventaire: [
                    inventoryItems,
                    'inventaire'
                ]
            };

            if (dataMap[type]) {
                const [
                    data,
                    filename
                ] = dataMap[type];

                exportToCSV(
                    data,
                    filename
                );
            }
        };

    // ─────────────────────────────────────────
    // Filtres recherche
    // ─────────────────────────────────────────

    const filteredProductsReceived =
        filterBySearch(
            productsReceived,
            searchTerm,
            [
                'product',
                'supplier',
                'client',
                'date',
                'status',
                'id'
            ]
        );

    const filteredInstalledProducts =
        filterBySearch(
            installedProducts,
            searchTerm,
            [
                'product',
                'supplier',
                'date',
                'installedDate',
                'id'
            ]
        );

    const filteredDefectiveProducts =
        filterBySearch(
            defectiveProducts,
            searchTerm,
            [
                'product',
                'supplier',
                'client',
                'description',
                'date',
                'defectiveDate',
                'id'
            ]
        );

    const filteredInventoryItems =
        filterBySearch(
            inventoryItems,
            searchTerm,
            [
                'material',
                'supplier',
                'category',
                'status',
                'id'
            ]
        );

    const filteredToolsItems =
        filterBySearch(
            toolsItems,
            searchTerm,
            [
                'name',
                'supplier',
                'id'
            ]
        );

    // ─────────────────────────────────────────
    // Body scroll lock
    // ─────────────────────────────────────────

    useEffect(() => {
        if (isSidebarOpen) {
            document.body.style.overflow =
                'hidden';
        } else {
            document.body.style.overflow =
                '';
        }

        return () => {
            document.body.style.overflow =
                '';
        };
    }, [isSidebarOpen]);

    // ─────────────────────────────────────────
    // Resize
    // ─────────────────────────────────────────

    useEffect(() => {
        const handleResize =
            () => {
                if (
                    window.innerWidth >=
                    768
                ) {
                    setIsSidebarOpen(
                        false
                    );
                }
            };

        window.addEventListener(
            'resize',
            handleResize
        );

        return () =>
            window.removeEventListener(
                'resize',
                handleResize
            );
    }, []);

    // ─────────────────────────────────────────
    // Mobile dashboard
    // ─────────────────────────────────────────

    useEffect(() => {
        if (
            window.innerWidth < 768 &&
            activeTab === 'dashboard'
        ) {
            setActiveTab('received');
            setActiveSidebar('received');
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ─────────────────────────────────────────
    // Loader initial
    // ─────────────────────────────────────────

    if (!hasCheckedAuth) {
        return <Skeleton.Page />;
    }

    // Reset password
    const resetToken =
        new URLSearchParams(
            window.location.search
        ).get('reset_token');

    if (resetToken) {
        return (
            <ResetPasswordPage
                token={resetToken}
                onDone={() =>
                    window.history.replaceState(
                        {},
                        '',
                        window.location.pathname
                    )
                }
            />
        );
    }

    if (!isAuthenticated) {
        return (
            <Login
                onLoginSuccess={
                    handleLoginSuccess
                }
            />
        );
    }

    if (sessionExpired) {
        return (
            <SessionExpiredModal
                onReconnect={
                    handleReconnect
                }
            />
        );
    }

    // Changement mot de passe obligatoire
    if (
        displayUser?.force_password_change
    ) {
        return (
            <ForcePasswordChangeModal
                onSuccess={() =>
                    setUser(
                        p => ({
                            ...p,
                            force_password_change:
                                false
                        })
                    )
                }
            />
        );
    }

    // ─────────────────────────────────────────
    // Titres
    // ─────────────────────────────────────────

    const pageTitles = {
        dashboard:          'Tableau de bord',
        received:           'Produits Reçus',
        installed:          'Produits Posés',
        defective:          'Défectueux',
        inventory:          'Consommables',
        tools:              'Outils',
        orders:             'Commandes',
        history:            'Historique Stock',
        annuaire:           'Annuaire Fournisseurs',
        'boite-fournisseurs': 'Boîte Fournisseurs',
        assistant:          'Assistant IA',
        comparateur:        'Comparateur Devis',
        'generateur-arc':   'Générateur ARC',
        'generateur-descriptifs': 'Générateur de descriptifs',
        'generateur-courrier': 'Générateur de courrier',
        'generateur-prompts': 'Générateur de prompts',
        catalogue:          'Catalogue',
        'calcul-chantier':  'Calcul Chantier',
        chantiers:          'Rentabilité Chantiers',
        rapports:           'Rapports',
        'sites-facturation': 'Sites de facturation',
        casier:             'Mon Casier',
        dossiers:           'Gestion Employés',
        logs:               'Journal (Logs)',
        settings:           'Paramètres',
    };

    const currentPageTitle =
        pageTitles[
            activeSidebar
        ] || '';

    return (
        <div className="flex h-screen overflow-hidden bg-gray-100">

            {/* Bannière hors ligne */}
            {!isOnline && (
                <div className="fixed top-0 inset-x-0 z-[9998] flex items-center justify-center gap-2 bg-red-600 text-white text-sm font-semibold py-2 px-4 shadow-lg">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse flex-shrink-0" />

                    Pas de connexion internet — vérifie ton réseau
                </div>
            )}

            {/* Pop-up message équipe */}
            {displayUser?.role !== 'collaborateur' && (
                <BroadcastModal />
            )}

            <SidebarBackdrop
                isOpen={isSidebarOpen}
                onClose={() =>
                    setIsSidebarOpen(false)
                }
            />

            <Sidebar
                activeSidebar={
                    activeSidebar
                }
                onNavigate={
                    handleNavigation
                }
                isOpen={
                    isSidebarOpen
                }
                onClose={() =>
                    setIsSidebarOpen(
                        false
                    )
                }
                onLogout={
                    handleLogout
                }
                user={
                    displayUser
                }
                isCollapsed={
                    isSidebarCollapsed
                }
                onToggleCollapse={() =>
                    setIsSidebarCollapsed(
                        !isSidebarCollapsed
                    )
                }
            />

            <div className="flex-1 flex flex-col overflow-hidden">

                <Header
                    searchTerm={
                        searchTerm
                    }
                    onSearchChange={
                        setSearchTerm
                    }
                    onMenuToggle={() =>
                        setIsSidebarOpen(
                            !isSidebarOpen
                        )
                    }
                    pageTitle={
                        currentPageTitle
                    }
                />

                <main className="flex-1 overflow-y-auto p-4 md:p-6 xl:p-8 bg-gray-50 pb-20 md:pb-6 xl:pb-8">

                    {/* Bannière prévisualisation rôle */}
                    {viewAsRole && (
                        <div className="mb-4 flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl px-4 py-3 text-sm font-medium">

                            <span className="text-base">
                                👁
                            </span>

                            <span className="flex-1">
                                Prévisualisation — tu vois l'app comme un{' '}
                                <strong>
                                    {{
                                        admin: 'Administrateur',
                                        gerant: 'Gérant',
                                        administration: 'Administration',
                                        chef_equipe: "Chef d'équipe",
                                        commercial: 'Commercial',
                                        poseur: 'Poseur'
                                    }[
                                        viewAsRole
                                    ]}
                                </strong>
                            </span>

                            <button
                                onClick={() =>
                                    setViewAsRole(
                                        null
                                    )
                                }
                                className="shrink-0 text-xs font-semibold bg-amber-200 hover:bg-amber-300 text-amber-900 px-3 py-1 rounded-lg transition-colors"
                            >
                                Quitter la prévisualisation
                            </button>
                        </div>
                    )}

                    <div className="max-w-[1920px] mx-auto">

                        {/* ─────────────────────────
                            MODULE STOCK
                           ───────────────────────── */}
                        {activeModule === 'stock' &&
                            displayUser?.role !==
                            'collaborateur' && (
                                <>
                                    <MobileStockNav
                                        activeTab={
                                            activeTab
                                        }
                                        onTabChange={
                                            handleTabChange
                                        }
                                    />

                                    {loading && (
                                        <LoadingSpinner />
                                    )}

                                    <SearchBar
                                        searchTerm={
                                            searchTerm
                                        }
                                        onSearchChange={
                                            setSearchTerm
                                        }
                                        onClear={() =>
                                            setSearchTerm(
                                                ''
                                            )
                                        }
                                    />

                                    {!loading &&
                                        activeTab ===
                                        'dashboard' &&
                                        DASHBOARD_ROLES.includes(
                                            displayUser?.role
                                        ) && (
                                            <div className="hidden md:block">
                                                <Dashboard
                                                    inventoryItems={
                                                        inventoryItems
                                                    }
                                                    user={
                                                        displayUser
                                                    }
                                                    onViewUserCommission={(
                                                        u
                                                    ) => {
                                                        setDossierInitialUser(
                                                            u
                                                        );

                                                        setActiveModule(
                                                            'dossiers'
                                                        );

                                                        setActiveSidebar(
                                                            'dossiers'
                                                        );
                                                    }}
                                                    onNavigate={
                                                        handleNavigation
                                                    }
                                                />
                                            </div>
                                        )}

                                    {!loading &&
                                        activeTab ===
                                        'received' && (
                                            <ProductsReceived
                                                products={
                                                    filteredProductsReceived
                                                }
                                                onMarkAsInstalled={
                                                    handleMarkAsInstalled
                                                }
                                                onMarkAsDefective={
                                                    handleMarkAsDefective
                                                }
                                                onAddProduct={() =>
                                                    setShowProductModal(
                                                        true
                                                    )
                                                }
                                                onExport={
                                                    handleExport
                                                }
                                                onEditProduct={
                                                    handleEditProduct
                                                }
                                                onDeleteProduct={
                                                    handleDeleteProduct
                                                }
                                                user={
                                                    displayUser
                                                }
                                            />
                                        )}

                                    {!loading &&
                                        activeTab ===
                                        'installed' && (
                                            <ProductsInstalled
                                                installedProducts={
                                                    filteredInstalledProducts
                                                }
                                                onExport={
                                                    handleExport
                                                }
                                                onDeleteInstalled={
                                                    handleDeleteInstalled
                                                }
                                                user={
                                                    displayUser
                                                }
                                            />
                                        )}

                                    {!loading &&
                                        activeTab ===
                                        'defective' && (
                                            <ProductsDefective
                                                defectiveProducts={
                                                    filteredDefectiveProducts
                                                }
                                                onExport={
                                                    handleExport
                                                }
                                                onDeleteDefective={
                                                    handleDeleteDefective
                                                }
                                                onAddDefectiveProduct={() =>
                                                    setShowDefectiveProductModal(
                                                        true
                                                    )
                                                }
                                                onEditDefectiveProduct={
                                                    handleEditDefectiveProduct
                                                }
                                                user={
                                                    displayUser
                                                }
                                            />
                                        )}

                                    {!loading &&
                                        activeTab ===
                                        'stock' && (
                                            <Inventory
                                                inventoryItems={
                                                    filteredInventoryItems
                                                }
                                                stats={
                                                    stats
                                                }
                                                onAddArticle={() =>
                                                    setShowArticleModal(
                                                        true
                                                    )
                                                }
                                                onExport={
                                                    handleExport
                                                }
                                                onEditArticle={
                                                    handleEditArticle
                                                }
                                                onDeleteArticle={
                                                    handleDeleteArticle
                                                }
                                                onUpdateStock={
                                                    handleUpdateStock
                                                }
                                                onBulkEdit={
                                                    handleBulkEdit
                                                }
                                                user={
                                                    displayUser
                                                }
                                            />
                                        )}

                                    {!loading &&
                                        activeTab ===
                                        'tools' && (
                                            <Tools
                                                toolsItems={
                                                    filteredToolsItems
                                                }
                                                onAddTool={() =>
                                                    setShowToolModal(
                                                        true
                                                    )
                                                }
                                                onEditTool={
                                                    handleEditTool
                                                }
                                                onDeleteTool={
                                                    handleDeleteTool
                                                }
                                                user={
                                                    displayUser
                                                }
                                            />
                                        )}

                                    {!loading &&
                                        activeTab ===
                                        'orders' && (
                                            <Orders
                                                inventoryItems={
                                                    filteredInventoryItems
                                                }
                                                user={
                                                    displayUser
                                                }
                                            />
                                        )}
                                </>
                            )}

                        {/* ─────────────────────────
                            MODULE AFFAIRES
                           ───────────────────────── */}
                        {activeModule ===
                            'affaires' && (
                                <Affaires
                                    user={
                                        displayUser
                                    }
                                />
                            )}

                        {/* ─────────────────────────
                            MODULE RAPPORTS
                           ───────────────────────── */}
                        {activeModule ===
                            'rapports' &&
                            displayUser?.role !==
                            'collaborateur' && (
                                <Rapports
                                    inventoryItems={
                                        inventoryItems
                                    }
                                    user={
                                        displayUser
                                    }
                                />
                            )}

                        {/* ─────────────────────────
                            MODULE CASIER
                           ───────────────────────── */}
                        {activeModule ===
                            'casier' &&
                            displayUser?.role !==
                            'collaborateur' && (
                                <Casier
                                    user={
                                        displayUser
                                    }
                                />
                            )}

                        {/* ─────────────────────────
                            MODULE DOSSIERS
                           ───────────────────────── */}
                        {activeModule ===
                            'dossiers' &&
                            displayUser?.role !==
                            'collaborateur' && (
                                <AdminDossiers
                                    currentUser={
                                        displayUser
                                    }
                                    initialUser={
                                        dossierInitialUser
                                    }
                                />
                            )}

                        {/* ─────────────────────────
                            MODULE LOGS
                           ───────────────────────── */}
                        {activeModule ===
                            'logs' &&
                            displayUser?.role !==
                            'collaborateur' && (
                                <Logs />
                            )}

                        {/* ─────────────────────────
                            MODULES RESSOURCES
                           ───────────────────────── */}

                        {[
                            'annuaire',
                            'assistant',
                            'comparateur',
                            'generateur-arc',
                            'generateur-descriptifs',
                            'generateur-courrier',

                            'catalogue',
                            'chantiers',
                            'calcul-chantier'
                        ].includes(
                            activeModule
                        ) &&
                            displayUser?.role !==
                            'collaborateur' && (
                                <MobileResourcesNav
                                    activeModule={
                                        activeModule
                                    }
                                    onNavigate={
                                        handleNavigation
                                    }
                                    user={
                                        displayUser
                                    }
                                />
                            )}

                        {activeModule ===
                            'annuaire' && (
                                <Annuaire
                                    user={
                                        displayUser
                                    }
                                />
                            )}

                        {activeModule ===
                            'assistant' && (
                                <Assistant
                                    user={
                                        displayUser
                                    }
                                />
                            )}

                        {activeModule ===
                            'comparateur' && (
                                <ComparateurDevis />
                            )}

                        {activeModule ===
                            'generateur-arc' && (
                                <GenerateurARC />
                            )}

                        {activeModule ===
                            'generateur-descriptifs' &&
                            [
                                'admin',
                                'gerant',
                                'administration',
                                'chef_equipe',
                                'commercial'
                            ].includes(
                                displayUser?.role
                            ) && (
                                <GenerateurDescriptifs />
                            )}

                        {activeModule ===
                            'generateur-courrier' &&
                            [
                                'admin',
                                'gerant',
                                'administration',
                                'chef_equipe',
                                'commercial'
                            ].includes(
                                displayUser?.role
                            ) && (
                                <GenerateurCourrier
                                    user={
                                        displayUser
                                    }
                                />
                            )}

                        {activeModule ===
                            'catalogue' && (
                                <Catalogue
                                    user={
                                        displayUser
                                    }
                                />
                            )}

                        {activeModule ===
                            'chantiers' && (
                                <Chantiers
                                    user={
                                        displayUser
                                    }
                                />
                            )}

                        {activeModule ===
                            'calcul-chantier' && (
                                <CalculChantier />
                            )}

                        {/* Historique */}
                        {activeModule ===
                            'history' && (
                                <StockHistory />
                            )}

                        {/* Sites facturation */}
                        {activeModule ===
                            'sites-facturation' &&
                            [
                                'admin',
                                'gerant',
                                'administration'
                            ].includes(
                                displayUser?.role
                            ) && (
                                <SitesFacturation
                                    user={
                                        displayUser
                                    }
                                />
                            )}

                        {/* Boîte fournisseurs */}
                        {activeModule ===
                            'boite-fournisseurs' &&
                            [
                                'admin',
                                'gerant',
                                'administration'
                            ].includes(
                                displayUser?.role
                            ) && (
                                fournisseurView.screen ===
                                'config'
                                    ? (
                                        <FournisseursConfig
                                            onBack={() =>
                                                setFournisseurView(
                                                    {
                                                        screen:
                                                            'list',
                                                        supplier:
                                                            null
                                                    }
                                                )
                                            }
                                        />
                                    )
                                    : fournisseurView.screen ===
                                      'detail'
                                        ? (
                                            <FournisseurDetail
                                                supplier={
                                                    fournisseurView.supplier
                                                }
                                                onBack={() =>
                                                    setFournisseurView(
                                                        {
                                                            screen:
                                                                'list',
                                                            supplier:
                                                                null
                                                        }
                                                    )
                                                }
                                            />
                                        )
                                        : (
                                            <Fournisseurs
                                                user={
                                                    displayUser
                                                }
                                                onOpenSupplier={(
                                                    s
                                                ) =>
                                                    setFournisseurView(
                                                        {
                                                            screen:
                                                                'detail',
                                                            supplier:
                                                                s
                                                        }
                                                    )
                                                }
                                                onOpenConfig={() =>
                                                    setFournisseurView(
                                                        {
                                                            screen:
                                                                'config',
                                                            supplier:
                                                                null
                                                        }
                                                    )
                                                }
                                            />
                                        )
                            )}
                    </div>
                </main>
            </div>

            {/* ─────────────────────────
                Bottom Nav mobile
               ───────────────────────── */}

            <BottomNav
                activeModule={
                    activeModule
                }
                activeSidebar={
                    activeSidebar
                }
                onNavigate={
                    handleNavigation
                }
                onMenuToggle={() =>
                    setIsSidebarOpen(
                        !isSidebarOpen
                    )
                }
                user={user}
            />

            {/* ─────────────────────────
                Modals stock
               ───────────────────────── */}

            <AddProductModal
                isOpen={
                    showProductModal
                }
                onClose={() =>
                    setShowProductModal(
                        false
                    )
                }
                onAdd={
                    handleAddProduct
                }
            />

            <AddDefectiveProductModal
                isOpen={
                    showDefectiveProductModal
                }
                onClose={() =>
                    setShowDefectiveProductModal(
                        false
                    )
                }
                onAdd={
                    handleAddDefectiveProduct
                }
            />

            <EditDefectiveProductModal
                isOpen={
                    editDefectiveModalOpen
                }
                onClose={() => {
                    setEditDefectiveModalOpen(
                        false
                    );

                    setProductToEdit(
                        null
                    );
                }}
                onEdit={
                    handleUpdateDefectiveProduct
                }
                product={
                    productToEdit
                }
            />

            <AddArticleModal
                isOpen={
                    showArticleModal
                }
                onClose={() =>
                    setShowArticleModal(
                        false
                    )
                }
                onAdd={
                    handleAddArticle
                }
            />

            <AddToolModal
                isOpen={
                    showToolModal
                }
                onClose={() =>
                    setShowToolModal(
                        false
                    )
                }
                onAdd={
                    handleAddTool
                }
            />

            <EditProductModal
                isOpen={
                    editProductModalOpen
                }
                onClose={() => {
                    setEditProductModalOpen(
                        false
                    );

                    setCurrentProduct(
                        null
                    );
                }}
                product={
                    currentProduct
                }
                onSave={
                    handleSaveEditedProduct
                }
            />

            <EditArticleModal
                isOpen={
                    editArticleModalOpen
                }
                onClose={() => {
                    setEditArticleModalOpen(
                        false
                    );

                    setCurrentArticle(
                        null
                    );
                }}
                article={
                    currentArticle
                }
                onSave={
                    handleSaveEditedArticle
                }
            />

            <EditToolModal
                isOpen={
                    editToolModalOpen
                }
                onClose={() => {
                    setEditToolModalOpen(
                        false
                    );

                    setCurrentTool(
                        null
                    );
                }}
                tool={
                    currentTool
                }
                onSave={
                    handleSaveEditedTool
                }
            />

            <Settings
                isOpen={
                    showSettings
                }
                onClose={() =>
                    setShowSettings(
                        false
                    )
                }
                user={user}
                onUserUpdate={
                    handleUserUpdate
                }
                viewAsRole={
                    viewAsRole
                }
                onViewAsRole={(role) => {
                    setViewAsRole(role);
                    setShowSettings(
                        false
                    );
                }}
            />

            {/* Bulle annonces */}
            {displayUser?.role !==
                'collaborateur' && (
                <BroadcastBubble
                    user={
                        displayUser
                    }
                />
            )}
        </div>
    );
}

export default App;
