import React, { useState, useEffect, useCallback } from 'react';
import Skeleton from './Skeleton';
import {
    Phone, Plus, Trash2, ChevronDown, ChevronUp,
    Search, Pencil, Check, X, Book, Mail, Printer
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || '/hello-gestion/php';

const Annuaire = ({ user }) => {
    const isAdmin = user?.role === 'admin';

    const [suppliers, setSuppliers]         = useState([]);
    const [loading, setLoading]             = useState(true);
    const [error, setError]                 = useState(null);
    const [searchTerm, setSearchTerm]       = useState('');
    const [expandedId, setExpandedId]       = useState(null);
    const [revealedNumbers, setRevealedNumbers] = useState({});

    // Add supplier form
    const [showAddSupplier, setShowAddSupplier] = useState(false);
    const [newSupplierName, setNewSupplierName] = useState('');
    const [addSupplierLoading, setAddSupplierLoading] = useState(false);

    // Add phone form (per supplier)
    const [addPhoneFor, setAddPhoneFor]     = useState(null);
    const [newPhoneLabel, setNewPhoneLabel] = useState('');
    const [newPhoneNumber, setNewPhoneNumber] = useState('');
    const [newPhoneEmail, setNewPhoneEmail] = useState('');
    const [newPhoneFax, setNewPhoneFax]   = useState('');
    const [addPhoneLoading, setAddPhoneLoading] = useState(false);

    // Edit supplier inline
    const [editSupplierId, setEditSupplierId]     = useState(null);
    const [editSupplierName, setEditSupplierName] = useState('');

    // Edit phone inline
    const [editPhoneId, setEditPhoneId]       = useState(null);
    const [editPhoneLabel, setEditPhoneLabel] = useState('');
    const [editPhoneNumber, setEditPhoneNumber] = useState('');
    const [editPhoneEmail, setEditPhoneEmail] = useState('');
    const [editPhoneFax, setEditPhoneFax] = useState('');

    const fetchSuppliers = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE}/annuaire.php`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                setSuppliers(data.suppliers || []);
            } else {
                setError('Impossible de charger l\'annuaire.');
            }
        } catch {
            setError('Erreur réseau.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

    const filteredSuppliers = suppliers.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const toggleExpand = (id) => {
        setExpandedId(prev => prev === id ? null : id);
        setAddPhoneFor(null);
        setEditPhoneId(null);
    };

    const revealNumber = (phoneId) => {
        setRevealedNumbers(prev => ({ ...prev, [phoneId]: true }));
    };

    // ── Add supplier ──────────────────────────────────────

    const handleAddSupplier = async (e) => {
        e.preventDefault();
        if (!newSupplierName.trim()) return;
        setAddSupplierLoading(true);
        try {
            const res = await fetch(`${API_BASE}/annuaire.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ action: 'add_supplier', name: newSupplierName.trim() }),
            });
            const data = await res.json();
            if (data.success) {
                setSuppliers(prev => [...prev, data.supplier].sort((a, b) => a.name.localeCompare(b.name)));
                setNewSupplierName('');
                setShowAddSupplier(false);
            }
        } finally {
            setAddSupplierLoading(false);
        }
    };

    // ── Delete supplier ───────────────────────────────────

    const handleDeleteSupplier = async (id) => {
        if (!window.confirm('Supprimer ce fournisseur et tous ses numéros ?')) return;
        try {
            await fetch(`${API_BASE}/annuaire.php`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ type: 'supplier', id }),
            });
            setSuppliers(prev => prev.filter(s => s.id !== id));
            if (expandedId === id) setExpandedId(null);
        } catch { /* ignore */ }
    };

    // ── Edit supplier ─────────────────────────────────────

    const startEditSupplier = (supplier) => {
        setEditSupplierId(supplier.id);
        setEditSupplierName(supplier.name);
    };

    const handleSaveSupplier = async (id) => {
        if (!editSupplierName.trim()) return;
        try {
            const res = await fetch(`${API_BASE}/annuaire.php`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ type: 'supplier', id, name: editSupplierName.trim() }),
            });
            const data = await res.json();
            if (data.success) {
                setSuppliers(prev =>
                    prev.map(s => s.id === id ? { ...s, name: editSupplierName.trim() } : s)
                        .sort((a, b) => a.name.localeCompare(b.name))
                );
                setEditSupplierId(null);
            }
        } catch { /* ignore */ }
    };

    // ── Add phone ─────────────────────────────────────────

    const handleAddPhone = async (e, supplierId) => {
        e.preventDefault();
        if (!newPhoneNumber.trim()) return;
        setAddPhoneLoading(true);
        try {
            const res = await fetch(`${API_BASE}/annuaire.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    action: 'add_phone',
                    supplier_id: supplierId,
                    number: newPhoneNumber.trim(),
                    label: newPhoneLabel.trim(),
                    email: newPhoneEmail.trim(),
                    fax: newPhoneFax.trim(),
                }),
            });
            const data = await res.json();
            if (data.success) {
                setSuppliers(prev => prev.map(s =>
                    s.id === supplierId
                        ? { ...s, phones: [...s.phones, data.phone] }
                        : s
                ));
                setNewPhoneLabel('');
                setNewPhoneNumber('');
                setNewPhoneEmail('');
                setNewPhoneFax('');
                setAddPhoneFor(null);
            }
        } finally {
            setAddPhoneLoading(false);
        }
    };

    // ── Delete phone ──────────────────────────────────────

    const handleDeletePhone = async (supplierId, phoneId) => {
        if (!window.confirm('Supprimer ce numéro ?')) return;
        try {
            await fetch(`${API_BASE}/annuaire.php`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ type: 'phone', id: phoneId }),
            });
            setSuppliers(prev => prev.map(s =>
                s.id === supplierId
                    ? { ...s, phones: s.phones.filter(p => p.id !== phoneId) }
                    : s
            ));
        } catch { /* ignore */ }
    };

    // ── Edit phone ────────────────────────────────────────

    const startEditPhone = (phone) => {
        setEditPhoneId(phone.id);
        setEditPhoneLabel(phone.label);
        setEditPhoneNumber(phone.numero);
        setEditPhoneEmail(phone.email || '');
        setEditPhoneFax(phone.fax || '');
    };

    const handleSavePhone = async (supplierId, phoneId) => {
        if (!editPhoneNumber.trim()) return;
        try {
            const res = await fetch(`${API_BASE}/annuaire.php`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    type: 'phone',
                    id: phoneId,
                    number: editPhoneNumber.trim(),
                    label: editPhoneLabel.trim(),
                    email: editPhoneEmail.trim(),
                    fax: editPhoneFax.trim(),
                }),
            });
            const data = await res.json();
            if (data.success) {
                setSuppliers(prev => prev.map(s =>
                    s.id === supplierId
                        ? {
                            ...s,
                            phones: s.phones.map(p =>
                                p.id === phoneId
                                    ? { ...p, numero: editPhoneNumber.trim(), label: editPhoneLabel.trim(), email: editPhoneEmail.trim(), fax: editPhoneFax.trim() }
                                    : p
                            )
                          }
                        : s
                ));
                setEditPhoneId(null);
                setRevealedNumbers(prev => ({ ...prev, [phoneId]: false }));
            }
        } catch { /* ignore */ }
    };

    // ── Render ────────────────────────────────────────────

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-3 animate-pulse">
                    <div className="h-10 w-10 rounded-xl bg-gray-200" />
                    <div className="h-5 w-48 bg-gray-200 rounded" />
                </div>
                <Skeleton.CardList count={5} avatar />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4">
                {error}
            </div>
        );
    }

    return (
        <div className="space-y-4 md:space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#FFB103] flex items-center justify-center">
                        <Book size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Annuaire Fournisseurs</h1>
                        <p className="text-sm text-gray-500">{suppliers.length} fournisseur{suppliers.length !== 1 ? 's' : ''}</p>
                    </div>
                </div>
                <button
                    onClick={() => { setShowAddSupplier(true); setNewSupplierName(''); }}
                    className="flex items-center gap-2 bg-[#FFB103] text-[#1a1a1a] rounded-xl px-4 py-2 text-sm font-medium hover:bg-[#d49400] transition-colors"
                >
                    <Plus size={16} />
                    Ajouter un fournisseur
                </button>
            </div>

            {/* Add supplier form */}
            {showAddSupplier && (
                <div className="bg-white rounded-2xl shadow-sm p-4 md:p-6 border border-amber-100">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Nouveau fournisseur</h3>
                    <form onSubmit={handleAddSupplier} className="flex gap-2">
                        <input
                            type="text"
                            value={newSupplierName}
                            onChange={e => setNewSupplierName(e.target.value)}
                            placeholder="Nom du fournisseur"
                            className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFB103] focus:border-transparent"
                            autoFocus
                        />
                        <button
                            type="submit"
                            disabled={addSupplierLoading || !newSupplierName.trim()}
                            className="bg-[#FFB103] text-[#1a1a1a] rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50 hover:bg-[#d49400] transition-colors"
                        >
                            {addSupplierLoading ? '...' : 'Ajouter'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowAddSupplier(false)}
                            className="border border-gray-200 text-gray-500 rounded-xl px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
                        >
                            Annuler
                        </button>
                    </form>
                </div>
            )}

            {/* Search */}
            <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Rechercher un fournisseur..."
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FFB103] focus:border-transparent shadow-sm"
                />
                {searchTerm && (
                    <button
                        onClick={() => setSearchTerm('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        <X size={14} />
                    </button>
                )}
            </div>

            {/* Supplier list */}
            {filteredSuppliers.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">
                    {searchTerm ? 'Aucun fournisseur ne correspond à la recherche.' : 'Aucun fournisseur dans l\'annuaire.'}
                </div>
            ) : (
                <div className="space-y-2">
                    {filteredSuppliers.map(supplier => (
                        <div key={supplier.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                            {/* Supplier header row */}
                            <div
                                className="flex items-center gap-3 px-4 md:px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors select-none"
                                onClick={() => toggleExpand(supplier.id)}
                            >
                                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                                    <Book size={16} className="text-[#FFB103]" />
                                </div>

                                {/* Supplier name (or edit field) */}
                                {isAdmin && editSupplierId === supplier.id ? (
                                    <div
                                        className="flex-1 flex items-center gap-2"
                                        onClick={e => e.stopPropagation()}
                                    >
                                        <input
                                            type="text"
                                            value={editSupplierName}
                                            onChange={e => setEditSupplierName(e.target.value)}
                                            className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFB103]"
                                            autoFocus
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') handleSaveSupplier(supplier.id);
                                                if (e.key === 'Escape') setEditSupplierId(null);
                                            }}
                                        />
                                        <button
                                            onClick={() => handleSaveSupplier(supplier.id)}
                                            className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors"
                                        >
                                            <Check size={16} />
                                        </button>
                                        <button
                                            onClick={() => setEditSupplierId(null)}
                                            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-gray-900 truncate">{supplier.name}</p>
                                        <p className="text-xs text-gray-400">
                                            {(() => {
                                                const emailCount = supplier.phones.filter(p => p.email).length;
                                                return `${supplier.phones.length} contact${supplier.phones.length !== 1 ? 's' : ''}${emailCount > 0 ? ` · ${emailCount} email${emailCount !== 1 ? 's' : ''}` : ''}`;
                                            })()}
                                        </p>
                                    </div>
                                )}

                                {/* Admin actions */}
                                {isAdmin && editSupplierId !== supplier.id && (
                                    <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                                        <button
                                            onClick={() => startEditSupplier(supplier)}
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-[#FFB103] hover:bg-amber-50 transition-colors"
                                            title="Modifier"
                                        >
                                            <Pencil size={15} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteSupplier(supplier.id)}
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                            title="Supprimer"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                )}

                                {/* Chevron */}
                                <div className="text-gray-400 flex-shrink-0">
                                    {expandedId === supplier.id
                                        ? <ChevronUp size={18} />
                                        : <ChevronDown size={18} />
                                    }
                                </div>
                            </div>

                            {/* Expanded: phones */}
                            {expandedId === supplier.id && (
                                <div className="border-t border-gray-100 px-4 md:px-6 py-3 space-y-2">
                                    {supplier.phones.length === 0 && (
                                        <p className="text-sm text-gray-400 py-2 text-center">Aucun numéro enregistré.</p>
                                    )}

                                    {supplier.phones.map(phone => (
                                        <div key={phone.id} className="flex items-center gap-3 py-2 rounded-xl px-3 hover:bg-gray-50 transition-colors group">
                                            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                                                <Phone size={14} className="text-[#FFB103]" />
                                            </div>

                                            {editPhoneId === phone.id ? (
                                                <div className="flex-1 flex flex-col sm:flex-row gap-2">
                                                    <input
                                                        type="text"
                                                        value={editPhoneLabel}
                                                        onChange={e => setEditPhoneLabel(e.target.value)}
                                                        placeholder="Libellé (ex: Commercial)"
                                                        className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFB103]"
                                                    />
                                                    <input
                                                        type="tel"
                                                        value={editPhoneNumber}
                                                        onChange={e => setEditPhoneNumber(e.target.value)}
                                                        placeholder="Numéro"
                                                        className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFB103]"
                                                        autoFocus
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') handleSavePhone(supplier.id, phone.id);
                                                            if (e.key === 'Escape') setEditPhoneId(null);
                                                        }}
                                                    />
                                                    <input
                                                        type="email"
                                                        value={editPhoneEmail}
                                                        onChange={e => setEditPhoneEmail(e.target.value)}
                                                        placeholder="Email (optionnel)"
                                                        className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFB103]"
                                                    />
                                                    <input
                                                        type="tel"
                                                        value={editPhoneFax}
                                                        onChange={e => setEditPhoneFax(e.target.value)}
                                                        placeholder="Fixe (optionnel)"
                                                        className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFB103]"
                                                    />
                                                    <div className="flex gap-1">
                                                        <button
                                                            onClick={() => handleSavePhone(supplier.id, phone.id)}
                                                            className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors"
                                                        >
                                                            <Check size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => setEditPhoneId(null)}
                                                            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex-1 min-w-0">
                                                        {phone.label && (
                                                            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">
                                                                {phone.label}
                                                            </p>
                                                        )}
                                                        <a
                                                            href={`tel:${phone.numero}`}
                                                            className="text-sm font-semibold text-[#FFB103] hover:underline"
                                                            onClick={e => e.stopPropagation()}
                                                        >
                                                            {phone.numero}
                                                        </a>
                                                        {phone.email && (
                                                            <a
                                                                href={`mailto:${phone.email}`}
                                                                className="flex items-center gap-1 text-xs text-gray-500 hover:text-[#FFB103] mt-0.5"
                                                                onClick={e => e.stopPropagation()}
                                                            >
                                                                <Mail size={11} />
                                                                {phone.email}
                                                            </a>
                                                        )}
                                                        {phone.fax && (
                                                            <a
                                                                href={`tel:${phone.fax}`}
                                                                className="flex items-center gap-1 text-xs text-gray-500 hover:text-[#FFB103] mt-0.5 transition-colors"
                                                                onClick={e => e.stopPropagation()}
                                                            >
                                                                <Printer size={11} />
                                                                Fixe : {phone.fax}
                                                            </a>
                                                        )}
                                                    </div>

                                                    {(
                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() => startEditPhone(phone)}
                                                                className="p-1.5 rounded-lg text-gray-400 hover:text-[#FFB103] hover:bg-amber-50 transition-colors"
                                                                title="Modifier"
                                                            >
                                                                <Pencil size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeletePhone(supplier.id, phone.id)}
                                                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                                                title="Supprimer"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    ))}

                                    {/* Add phone */}
                                    {(
                                        addPhoneFor === supplier.id ? (
                                            <form
                                                onSubmit={e => handleAddPhone(e, supplier.id)}
                                                className="mt-2 flex flex-col sm:flex-row gap-2 pt-2 border-t border-gray-100"
                                            >
                                                <input
                                                    type="text"
                                                    value={newPhoneLabel}
                                                    onChange={e => setNewPhoneLabel(e.target.value)}
                                                    placeholder="Libellé (ex: Commercial, SAV…)"
                                                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFB103]"
                                                />
                                                <input
                                                    type="tel"
                                                    value={newPhoneNumber}
                                                    onChange={e => setNewPhoneNumber(e.target.value)}
                                                    placeholder="Numéro de téléphone"
                                                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFB103]"
                                                    autoFocus
                                                    required
                                                />
                                                <input
                                                    type="email"
                                                    value={newPhoneEmail}
                                                    onChange={e => setNewPhoneEmail(e.target.value)}
                                                    placeholder="Email (optionnel)"
                                                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFB103]"
                                                />
                                                <input
                                                    type="tel"
                                                    value={newPhoneFax}
                                                    onChange={e => setNewPhoneFax(e.target.value)}
                                                    placeholder="Fixe (optionnel)"
                                                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFB103]"
                                                />
                                                <div className="flex gap-2">
                                                    <button
                                                        type="submit"
                                                        disabled={addPhoneLoading || !newPhoneNumber.trim()}
                                                        className="flex-1 sm:flex-none bg-[#FFB103] text-[#1a1a1a] rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50 hover:bg-[#d49400] transition-colors"
                                                    >
                                                        {addPhoneLoading ? '...' : 'Ajouter'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => { setAddPhoneFor(null); setNewPhoneLabel(''); setNewPhoneNumber(''); setNewPhoneEmail(''); setNewPhoneFax(''); }}
                                                        className="border border-gray-200 text-gray-500 rounded-xl px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            </form>
                                        ) : (
                                            <button
                                                onClick={() => { setAddPhoneFor(supplier.id); setNewPhoneLabel(''); setNewPhoneNumber(''); setNewPhoneEmail(''); }}
                                                className="mt-2 w-full flex items-center justify-center gap-2 text-sm bg-amber-50 text-[#FFB103] hover:bg-amber-100 font-semibold py-2.5 px-4 rounded-xl transition-colors border border-amber-100"
                                            >
                                                <Plus size={15} />
                                                Ajouter un numéro
                                            </button>
                                        )
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Annuaire;
