import React, { useEffect, useMemo, useState } from 'react';
import {
    Search,
    ShoppingCart,
    ExternalLink,
    AlertCircle,
    Pencil,
    Link2,
    RefreshCw,
    X,
    Check,
    Trash2,
    AlertTriangle,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || '/hello-gestion/php';

/**
 * Logos présents dans public/logos/
 */
const SUPPLIER_LOGOS = {
    Proferm: '/hello-gestion/logos/proferm.webp',
    Cetal: '/hello-gestion/logos/logo-cetal.webp',
    Somfy: '/hello-gestion/logos/somfy.png',
    Euradif: '/hello-gestion/logos/euradif.svg',
    SDA: '/hello-gestion/logos/sda.png',
    Hormann: '/hello-gestion/logos/hormann.jpg',
    'Hörmann': '/hello-gestion/logos/hormann.jpg',
    Filtersun: '/hello-gestion/logos/filtersun.png',
    Volpro: '/hello-gestion/logos/volpro.svg',
    Voltech: '/hello-gestion/logos/voltech.png',
    Marquise: '/hello-gestion/logos/expert-marquise-logo.webp',
    Marquises: '/hello-gestion/logos/expert-marquise-logo.webp',
    'Serge Ferrari': '/hello-gestion/logos/serge-ferrari.webp',
    Lahfer: '/hello-gestion/logos/lahfer-logo.jpg',
    'Moos Logia': '/hello-gestion/logos/moos-logo.jpg',
    'Volots Thiebaut': '/hello-gestion/logos/volots-thiebaut-logo.jpg',
    'Volots-Thiebaut': '/hello-gestion/logos/volots-thiebaut-logo.jpg',
};

const getOrderUrl = supplier =>
    supplier.order_url ||
    supplier.orderUrl ||
    supplier.url_commande ||
    '';

const getInitials = name => {
    if (!name) return '?';

    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(part => part[0])
        .join('')
        .toUpperCase();
};

const isValidUrl = value => {
    try {
        const url = new URL(value);
        return url.protocol === 'https:' || url.protocol === 'http:';
    } catch {
        return false;
    }
};

export default function CommandesFournisseurs() {
    const [suppliers, setSuppliers] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [editingSupplier, setEditingSupplier] = useState(null);
    const [linkValue, setLinkValue] = useState('');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    const [deletingSupplier, setDeletingSupplier] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');

    /**
     * Chargement des fournisseurs depuis l'annuaire
     */
    const loadSuppliers = async () => {
        try {
            setLoading(true);
            setError('');

            const response = await fetch(`${API_BASE}/annuaire.php`, {
                credentials: 'include',
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message || 'Impossible de charger les fournisseurs.'
                );
            }

            setSuppliers(data.suppliers || []);
        } catch (err) {
            setError(err.message || 'Erreur lors du chargement.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSuppliers();
    }, []);

    /**
     * Recherche de fournisseurs
     */
    const filteredSuppliers = useMemo(() => {
        return suppliers.filter(supplier =>
            supplier.name?.toLowerCase().includes(search.toLowerCase())
        );
    }, [suppliers, search]);

    /**
     * Ouverture de la fenêtre de modification du lien
     */
    const openLinkEditor = supplier => {
        setEditingSupplier(supplier);
        setLinkValue(getOrderUrl(supplier));
        setMessage('');
    };

    /**
     * Fermeture de la fenêtre de modification
     */
    const closeLinkEditor = () => {
        setEditingSupplier(null);
        setLinkValue('');
        setMessage('');
    };

    /**
     * Enregistrement du lien de commande
     */
    const saveOrderLink = async () => {
        if (!editingSupplier) return;

        const trimmedUrl = linkValue.trim();

        if (trimmedUrl && !isValidUrl(trimmedUrl)) {
            setMessage(
                'Veuillez saisir une URL valide commençant par http:// ou https://.'
            );
            return;
        }

        try {
            setSaving(true);
            setMessage('');

            const response = await fetch(`${API_BASE}/annuaire.php`, {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type: 'supplier_url',
                    id: editingSupplier.id,
                    order_url: trimmedUrl,
                }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message || 'Impossible d’enregistrer le lien.'
                );
            }

            setSuppliers(previous =>
                previous.map(supplier =>
                    supplier.id === editingSupplier.id
                        ? { ...supplier, order_url: trimmedUrl }
                        : supplier
                )
            );

            closeLinkEditor();
        } catch (err) {
            setMessage(err.message || 'Erreur lors de l’enregistrement.');
        } finally {
            setSaving(false);
        }
    };

    /**
     * Ouverture de la confirmation de suppression
     */
    const openDeleteConfirmation = supplier => {
        setDeletingSupplier(supplier);
        setDeleteError('');
    };

    /**
     * Fermeture de la confirmation
     */
    const closeDeleteConfirmation = () => {
        if (deleting) return;

        setDeletingSupplier(null);
        setDeleteError('');
    };

    /**
     * Suppression du fournisseur
     */
    const deleteSupplier = async () => {
        if (!deletingSupplier) return;

        try {
            setDeleting(true);
            setDeleteError('');

            const response = await fetch(`${API_BASE}/annuaire.php`, {
                method: 'DELETE',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type: 'supplier',
                    id: deletingSupplier.id,
                }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message || 'Impossible de supprimer ce fournisseur.'
                );
            }

            setSuppliers(previous =>
                previous.filter(
                    supplier => supplier.id !== deletingSupplier.id
                )
            );

            setDeletingSupplier(null);
        } catch (err) {
            setDeleteError(
                err.message || 'Une erreur est survenue pendant la suppression.'
            );
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="space-y-6 pb-8">

            {/* En-tête */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100">
                        <ShoppingCart
                            size={24}
                            className="text-amber-700"
                        />
                    </div>

                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            Commandes fournisseurs
                        </h1>

                        <p className="mt-1 text-sm text-gray-500">
                            Retrouvez rapidement vos sites de commande.
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={loadSuppliers}
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                >
                    <RefreshCw
                        size={16}
                        className={loading ? 'animate-spin' : ''}
                    />
                    Actualiser
                </button>
            </div>

            {/* Recherche */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full sm:max-w-md">
                    <Search
                        size={18}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />

                    <input
                        type="search"
                        value={search}
                        onChange={event => setSearch(event.target.value)}
                        placeholder="Rechercher un fournisseur..."
                        className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                    />
                </div>

                <div className="text-sm text-gray-500">
                    <span className="font-semibold text-gray-800">
                        {filteredSuppliers.length}
                    </span>{' '}
                    fournisseur{filteredSuppliers.length > 1 ? 's' : ''}
                </div>
            </div>

            {/* Chargement */}
            {loading && (
                <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center">
                    <RefreshCw
                        size={24}
                        className="mx-auto mb-3 animate-spin text-amber-500"
                    />

                    <p className="text-sm text-gray-500">
                        Chargement des fournisseurs...
                    </p>
                </div>
            )}

            {/* Erreur */}
            {!loading && error && (
                <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
                    <AlertCircle
                        size={20}
                        className="mt-0.5 shrink-0"
                    />
                    <p className="text-sm">{error}</p>
                </div>
            )}

            {/* Aucun résultat */}
            {!loading && !error && filteredSuppliers.length === 0 && (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
                    <Search
                        size={28}
                        className="mx-auto mb-3 text-gray-300"
                    />

                    <h2 className="font-semibold text-gray-700">
                        Aucun fournisseur trouvé
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                        Essayez avec un autre nom.
                    </p>
                </div>
            )}

            {/* Cartes fournisseurs */}
            {!loading && !error && filteredSuppliers.length > 0 && (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {filteredSuppliers.map(supplier => {
                        const orderUrl = getOrderUrl(supplier);
                        const validUrl = isValidUrl(orderUrl);
                        const logo = SUPPLIER_LOGOS[supplier.name];

                        return (
                            <article
                                key={supplier.id}
                                className="group flex min-h-[230px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-amber-200 hover:shadow-lg"
                            >
                                <div className="h-1.5 bg-gradient-to-r from-amber-400 to-amber-200" />

                                <div className="flex flex-1 flex-col p-5">
                                    {/* Logo et nom */}
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-[76px] w-[110px] shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-gray-100 bg-white p-2">
                                            {logo ? (
                                                <img
                                                    src={logo}
                                                    alt={`Logo ${supplier.name}`}
                                                    className="h-full w-full object-contain"
                                                    onError={event => {
                                                        event.currentTarget.style.display =
                                                            'none';
                                                    }}
                                                />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center rounded-xl bg-amber-50 text-xl font-bold tracking-wide text-amber-700">
                                                    {getInitials(supplier.name)}
                                                </div>
                                            )}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <h2 className="truncate text-lg font-bold text-gray-900">
                                                {supplier.name}
                                            </h2>

                                            <span
                                                className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                                                    validUrl
                                                        ? 'bg-green-50 text-green-700'
                                                        : 'bg-gray-100 text-gray-500'
                                                }`}
                                            >
                                                <span
                                                    className={`h-1.5 w-1.5 rounded-full ${
                                                        validUrl
                                                            ? 'bg-green-500'
                                                            : 'bg-gray-400'
                                                    }`}
                                                />

                                                {validUrl
                                                    ? 'Lien disponible'
                                                    : 'Lien à compléter'}
                                            </span>
                                        </div>
                                    </div>

                                    <p className="mt-4 text-sm leading-5 text-gray-500">
                                        {validUrl
                                            ? 'Accédez au site de commande de ce fournisseur.'
                                            : 'Ajoutez le lien du site pour accéder rapidement aux commandes.'}
                                    </p>

                                    {/* Boutons */}
                                    <div className="mt-auto flex gap-2 pt-5">
                                        {validUrl ? (
                                            <a
                                                href={orderUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-400 px-3 py-3 text-sm font-semibold text-gray-900 transition hover:bg-amber-500"
                                            >
                                                <ShoppingCart size={16} />
                                                Commander
                                                <ExternalLink size={14} />
                                            </a>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    openLinkEditor(supplier)
                                                }
                                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gray-900 px-3 py-3 text-sm font-semibold text-white transition hover:bg-gray-700"
                                            >
                                                <Link2 size={16} />
                                                Ajouter un lien
                                            </button>
                                        )}

                                        <button
                                            type="button"
                                            onClick={() =>
                                                openLinkEditor(supplier)
                                            }
                                            title="Modifier le lien"
                                            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700"
                                        >
                                            <Pencil size={16} />
                                        </button>

                                        {/* Bouton supprimer */}
                                        <button
                                            type="button"
                                            onClick={() =>
                                                openDeleteConfirmation(supplier)
                                            }
                                            title="Supprimer le fournisseur"
                                            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-red-100 text-red-500 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            {/* Modal modification du lien */}
            {editingSupplier && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                        <div className="mb-5 flex items-start justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">
                                    {getOrderUrl(editingSupplier)
                                        ? 'Modifier le lien'
                                        : 'Ajouter un lien'}
                                </h2>

                                <p className="mt-1 text-sm text-gray-500">
                                    Fournisseur : {editingSupplier.name}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={closeLinkEditor}
                                className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                                aria-label="Fermer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <label className="mb-2 block text-sm font-medium text-gray-700">
                            URL du site de commande
                        </label>

                        <input
                            type="url"
                            value={linkValue}
                            onChange={event =>
                                setLinkValue(event.target.value)
                            }
                            placeholder="https://www.exemple.com"
                            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                        />

                        {message && (
                            <p className="mt-3 text-sm text-red-600">
                                {message}
                            </p>
                        )}

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={closeLinkEditor}
                                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
                            >
                                Annuler
                            </button>

                            <button
                                type="button"
                                onClick={saveOrderLink}
                                disabled={saving}
                                className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-gray-900 transition hover:bg-amber-500 disabled:opacity-50"
                            >
                                <Check size={16} />
                                {saving ? 'Enregistrement...' : 'Enregistrer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal confirmation de suppression */}
            {deletingSupplier && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-950/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-2xl">
                        <div className="flex justify-end px-5 pt-5">
                            <button
                                type="button"
                                onClick={closeDeleteConfirmation}
                                disabled={deleting}
                                aria-label="Fermer"
                                className="rounded-xl p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                            >
                                <X size={19} />
                            </button>
                        </div>

                        <div className="px-7 pb-7 text-center">
                            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
                                <AlertTriangle
                                    size={30}
                                    className="text-red-600"
                                />
                            </div>

                            <h2 className="text-xl font-bold text-gray-900">
                                Supprimer ce fournisseur ?
                            </h2>

                            <p className="mt-3 text-sm leading-6 text-gray-500">
                                Tu es sur le point de supprimer
                                {' '}
                                <span className="font-semibold text-gray-900">
                                    {deletingSupplier.name}
                                </span>
                                {' '}
                                de la liste des commandes fournisseurs.
                                Cette action est définitive.
                            </p>

                            {deleteError && (
                                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-left text-sm text-red-700">
                                    {deleteError}
                                </div>
                            )}

                            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row">
                                <button
                                    type="button"
                                    onClick={closeDeleteConfirmation}
                                    disabled={deleting}
                                    className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Annuler
                                </button>

                                <button
                                    type="button"
                                    onClick={deleteSupplier}
                                    disabled={deleting}
                                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <Trash2 size={16} />
                                    {deleting
                                        ? 'Suppression...'
                                        : 'Supprimer définitivement'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}