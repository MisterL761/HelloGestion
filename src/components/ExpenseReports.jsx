import React, { useState, useEffect, useRef } from 'react';
import Skeleton from './Skeleton';
import {
    Plus, Trash2, CheckCircle, XCircle, Clock, Receipt,
    ChevronDown, ChevronUp, AlertCircle, Eye, Paperclip
} from 'lucide-react';
import { useToast, useConfirm } from './ToastProvider';

const API_BASE = import.meta.env.VITE_API_BASE || '/hello-gestion/php';

const CATEGORIES = [
    { value: 'transport',    label: 'Transport' },
    { value: 'repas',        label: 'Repas' },
    { value: 'hebergement',  label: 'Hébergement' },
    { value: 'materiel',     label: 'Matériel' },
    { value: 'autre',        label: 'Autre' },
];

const STATUS_CONFIG = {
    en_attente: { label: 'En attente',  icon: Clock,        color: 'bg-yellow-100 text-yellow-800' },
    validee:    { label: 'Validée',     icon: CheckCircle,  color: 'bg-green-100 text-green-800' },
    rejetee:    { label: 'Rejetée',     icon: XCircle,      color: 'bg-red-100 text-red-800' },
};

const StatusBadge = ({ status }) => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.en_attente;
    const Icon = cfg.icon;
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>
            <Icon size={12} /> {cfg.label}
        </span>
    );
};

// ── Formulaire d'ajout ─────────────────────────────────────

const AddExpenseForm = ({ onClose, onAdded }) => {
    const toast = useToast();
    const [form, setForm] = useState({ title: '', category: 'transport' });
    const [file, setFile]     = useState(null);
    const [loading, setLoading] = useState(false);
    const fileRef = useRef();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const fd = new FormData();
            fd.append('title', form.title);
            fd.append('category', form.category);
            if (file) fd.append('receipt', file);

            const res  = await fetch(`${API_BASE}/expense_reports.php`, { method: 'POST', body: fd, credentials: 'include' });
            const data = await res.json();
            if (data.success) { toast.success('Note de frais créée ✓'); onAdded(); onClose(); }
            else toast.error(data.message || 'Erreur');
        } catch { toast.error('Erreur réseau'); }
        finally { setLoading(false); }
    };

    const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFB103]';

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-5">Nouvelle note de frais</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Titre *</label>
                        <input className={inputCls} required value={form.title}
                            onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Déplacement client Paris…" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Catégorie *</label>
                        <select className={inputCls} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Pièce jointe</label>
                        <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden"
                            onChange={e => setFile(e.target.files[0] || null)} />
                        <button type="button" onClick={() => fileRef.current.click()}
                            className="w-full border-2 border-dashed border-gray-300 rounded-lg py-4 text-sm text-gray-500 hover:border-[#FFB103]/70 hover:text-amber-700 transition-colors flex items-center justify-center gap-2">
                            <Paperclip size={15} />
                            {file ? `✓ ${file.name}` : 'Ajouter une photo ou un PDF'}
                        </button>
                        {file && file.type.startsWith('image/') && (
                            <div className="mt-2 rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                                <img src={URL.createObjectURL(file)} alt="Aperçu" className="w-full max-h-52 object-contain" />
                            </div>
                        )}
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                            Annuler
                        </button>
                        <button type="submit" disabled={loading}
                            className="flex-1 py-2.5 bg-[#FFB103] text-[#1a1a1a] rounded-lg text-sm font-semibold hover:bg-[#d49400] disabled:opacity-50">
                            {loading ? 'Envoi…' : 'Soumettre'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ── Modal validation/rejet ─────────────────────────────────

const ValidationModal = ({ expense, action, onClose, onDone }) => {
    const toast = useToast();
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    const handleConfirm = async () => {
        setLoading(true);
        try {
            const res  = await fetch(`${API_BASE}/expense_reports.php`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ id: expense.id, action, rejection_reason: reason })
            });
            const data = await res.json();
            if (data.success) { toast.success(action === 'validate' ? 'Note validée ✓' : 'Note rejetée'); onDone(); onClose(); }
            else toast.error(data.message || 'Erreur');
        } catch { toast.error('Erreur réseau'); }
        finally { setLoading(false); }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-2">
                    {action === 'validate' ? 'Valider la note de frais' : 'Rejeter la note de frais'}
                </h3>
                <p className="text-sm text-gray-500 mb-4">«&nbsp;{expense.title}&nbsp;» · {CATEGORIES.find(c => c.value === expense.category)?.label || expense.category}</p>
                {action === 'reject' && (
                    <div className="mb-4">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Motif du rejet (optionnel)</label>
                        <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" rows={3}
                            value={reason} onChange={e => setReason(e.target.value)} placeholder="Indiquer la raison…" />
                    </div>
                )}
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                        Annuler
                    </button>
                    <button onClick={handleConfirm} disabled={loading}
                        className={`flex-1 py-2.5 text-white rounded-lg text-sm font-semibold disabled:opacity-50 ${
                            action === 'validate' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                        }`}>
                        {loading ? '…' : (action === 'validate' ? 'Valider' : 'Rejeter')}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Composant principal ────────────────────────────────────

const ExpenseReports = ({ user, targetUserId = null }) => {
    const toast    = useToast();
    const confirm  = useConfirm();
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading]   = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [expanded, setExpanded] = useState(null);
    const [validation, setValidation] = useState(null); // { expense, action }

    const canValidate = ['admin', 'gerant'].includes(user?.role);

    const fetchExpenses = async () => {
        setLoading(true);
        try {
            const url = `${API_BASE}/expense_reports.php${targetUserId ? `?user_id=${targetUserId}` : ''}`;
            const res  = await fetch(url, { credentials: 'include' });
            const data = await res.json();
            if (data.success) setExpenses(data.data);
        } catch { toast.error('Erreur de chargement'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchExpenses(); }, [targetUserId]);

    const handleDelete = async (id) => {
        if (!await confirm('Supprimer cette note de frais ?')) return;
        try {
            const res  = await fetch(`${API_BASE}/expense_reports.php?id=${id}`, { method: 'DELETE', credentials: 'include' });
            const data = await res.json();
            if (data.success) { setExpenses(prev => prev.filter(e => e.id !== id)); toast.success('Note supprimée'); }
            else toast.error(data.message || 'Erreur');
        } catch { toast.error('Erreur réseau'); }
    };

    const countPending   = expenses.filter(e => e.status === 'en_attente').length;
    const countValidated = expenses.filter(e => e.status === 'validee').length;

    if (loading) return (
        <div className="space-y-4">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <Skeleton.ExpenseList count={5} />
            </div>
        </div>
    );

    return (
        <div className="space-y-5">
            {/* ── KPI cards ── */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-yellow-50 rounded-2xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
                        <Clock size={18} className="text-yellow-600" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">En attente</p>
                        <p className="text-xl font-black text-gray-900">{countPending}</p>
                    </div>
                </div>
                <div className="bg-green-50 rounded-2xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                        <CheckCircle size={18} className="text-green-600" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Validées</p>
                        <p className="text-xl font-black text-gray-900">{countValidated}</p>
                    </div>
                </div>
            </div>

            {/* ── Header + bouton ajout ── */}
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">
                    {expenses.length} note{expenses.length !== 1 ? 's' : ''} de frais
                </h3>
                <button onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 bg-[#FFB103] text-[#1a1a1a] px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#d49400] transition-colors">
                    <Plus size={16} /> Nouvelle note
                </button>
            </div>

            {/* ── Liste ── */}
            {expenses.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                    <Receipt size={40} className="mx-auto mb-3 opacity-40" />
                    <p className="text-sm">Aucune note de frais</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {expenses.map(exp => (
                        <div key={exp.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="flex items-center gap-3 p-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-semibold text-gray-800 truncate">{exp.title}</span>
                                        <StatusBadge status={exp.status} />
                                    </div>
                                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                                        <span>{CATEGORIES.find(c => c.value === exp.category)?.label || exp.category}</span>
                                        {canValidate && exp.user_name && <><span>·</span><span>{exp.user_name}</span></>}
                                        {exp.receipt_path && <><span>·</span><Paperclip size={11} /></>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    {canValidate && exp.status === 'en_attente' && (
                                        <>
                                            <button onClick={() => setValidation({ expense: exp, action: 'validate' })}
                                                className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg" title="Valider">
                                                <CheckCircle size={16} />
                                            </button>
                                            <button onClick={() => setValidation({ expense: exp, action: 'reject' })}
                                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Rejeter">
                                                <XCircle size={16} />
                                            </button>
                                        </>
                                    )}
                                    {(exp.receipt_path || exp.rejection_reason || exp.validated_by_name) && (
                                        <button onClick={() => setExpanded(expanded === exp.id ? null : exp.id)}
                                            className="p-1.5 text-gray-400 hover:bg-gray-50 rounded-lg">
                                            {expanded === exp.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </button>
                                    )}
                                    {exp.status !== 'validee' && (
                                        <button onClick={() => handleDelete(exp.id)}
                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {expanded === exp.id && (
                                <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 space-y-2">
                                    {exp.rejection_reason && (
                                        <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 rounded-lg p-2">
                                            <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                                            <span>Motif rejet : {exp.rejection_reason}</span>
                                        </div>
                                    )}
                                    {exp.receipt_path && (
                                        /\.(jpg|jpeg|png|gif|webp)$/i.test(exp.receipt_path) ? (
                                            <a href={`/hello-gestion/php/${exp.receipt_path}`} target="_blank" rel="noopener noreferrer">
                                                <img src={`/hello-gestion/php/${exp.receipt_path}`} alt="Justificatif"
                                                    className="w-full max-h-48 object-contain rounded-lg border border-gray-200 bg-gray-50 mt-1" />
                                            </a>
                                        ) : (
                                            <a href={`/hello-gestion/php/${exp.receipt_path}`} target="_blank" rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 text-sm text-amber-700 hover:text-amber-800 font-medium">
                                                <Eye size={14} /> Voir le justificatif
                                            </a>
                                        )
                                    )}
                                    {exp.validated_by_name && (
                                        <p className="text-xs text-gray-400">
                                            {exp.status === 'validee' ? 'Validé' : 'Traité'} par {exp.validated_by_name}
                                            {exp.validated_at ? ` le ${new Date(exp.validated_at).toLocaleDateString('fr-FR')}` : ''}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {showForm && <AddExpenseForm onClose={() => setShowForm(false)} onAdded={fetchExpenses} />}
            {validation && (
                <ValidationModal
                    expense={validation.expense}
                    action={validation.action}
                    onClose={() => setValidation(null)}
                    onDone={fetchExpenses}
                />
            )}
        </div>
    );
};

export default ExpenseReports;
