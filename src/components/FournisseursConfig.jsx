import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Settings2, Plus, Trash2 } from 'lucide-react';
import { useToast, useConfirm } from './ToastProvider';
import { API_BASE } from '../utils/constants';

const API = `${API_BASE}/supplier_emails_api.php`;

const inputCls = 'border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

const post = (action, payload) => fetch(`${API}?action=${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
}).then(r => r.json());

export default function FournisseursConfig({ onBack }) {
    const toast = useToast();
    const confirm = useConfirm();

    const [suppliers, setSuppliers] = useState([]);
    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(true);

    // Édition du nom par fournisseur
    const [nameEdits, setNameEdits] = useState({});
    const [savingSupplierId, setSavingSupplierId] = useState(null);
    const [deletingSupplierId, setDeletingSupplierId] = useState(null);

    // Ajout d'un fournisseur
    const [newSupplierName, setNewSupplierName] = useState('');
    const [addingSupplier, setAddingSupplier] = useState(false);

    // Ajout d'une règle par fournisseur
    const [newRule, setNewRule] = useState({}); // { [supplierId]: { sender_pattern, subject_keywords } }
    const [addingRuleFor, setAddingRuleFor] = useState(null);
    const [deletingRuleId, setDeletingRuleId] = useState(null);

    // Messages types
    const [templateDrafts, setTemplateDrafts] = useState({ approval: '', modification_prefix: '' });
    const [savingTemplate, setSavingTemplate] = useState(null);

    const load = useCallback(async () => {
        try {
            const res = await fetch(`${API}?action=list_config`, { credentials: 'include' }).then(r => r.json());
            if (res.success) {
                setSuppliers(res.data.suppliers || []);
                setRules(res.data.rules || []);
                setTemplateDrafts(res.data.templates || { approval: '', modification_prefix: '' });
                const edits = {};
                (res.data.suppliers || []).forEach(s => { edits[s.id] = s.name; });
                setNameEdits(edits);
            } else {
                toast.error(res.message || 'Erreur de chargement');
            }
        } catch { toast.error('Erreur de chargement'); }
        finally { setLoading(false); }
    }, [toast]);

    useEffect(() => { load(); }, [load]);

    const setNewRuleField = (supplierId, field, value) => {
        setNewRule(prev => ({
            ...prev,
            [supplierId]: { ...(prev[supplierId] || { sender_pattern: '', subject_keywords: '' }), [field]: value },
        }));
    };

    const handleSaveSupplier = async (id) => {
        const name = (nameEdits[id] || '').trim();
        if (!name) { toast.error('Le nom est requis'); return; }
        setSavingSupplierId(id);
        try {
            const res = await post('save_supplier', { id, name });
            if (res.success) { toast.success('Fournisseur enregistré'); await load(); }
            else toast.error(res.message || 'Erreur');
        } catch { toast.error('Erreur réseau'); }
        finally { setSavingSupplierId(null); }
    };

    const handleAddSupplier = async (e) => {
        e.preventDefault();
        const name = newSupplierName.trim();
        if (!name) { toast.error('Le nom est requis'); return; }
        setAddingSupplier(true);
        try {
            const res = await post('save_supplier', { name });
            if (res.success) { toast.success('Fournisseur ajouté'); setNewSupplierName(''); await load(); }
            else toast.error(res.message || 'Erreur');
        } catch { toast.error('Erreur réseau'); }
        finally { setAddingSupplier(false); }
    };

    const handleDeleteSupplier = async (supplier) => {
        const ok = await confirm(`Désactiver ${supplier.name} ? Ses mails déjà reçus resteront consultables.`);
        if (!ok) return;
        setDeletingSupplierId(supplier.id);
        try {
            const res = await post('delete_supplier', { id: supplier.id });
            if (res.success) { toast.success('Fournisseur désactivé'); await load(); }
            else toast.error(res.message || 'Erreur');
        } catch { toast.error('Erreur réseau'); }
        finally { setDeletingSupplierId(null); }
    };

    const handleAddRule = async (supplierId) => {
        const draft = newRule[supplierId] || { sender_pattern: '', subject_keywords: '' };
        const sender = (draft.sender_pattern || '').trim();
        const keywords = (draft.subject_keywords || '').trim();
        if (!sender && !keywords) { toast.error('Renseigner au moins une adresse ou des mots-clés'); return; }
        setAddingRuleFor(supplierId);
        try {
            const res = await post('save_rule', { supplier_id: supplierId, sender_pattern: sender, subject_keywords: keywords });
            if (res.success) {
                toast.success('Règle ajoutée');
                setNewRule(prev => ({ ...prev, [supplierId]: { sender_pattern: '', subject_keywords: '' } }));
                await load();
            } else toast.error(res.message || 'Erreur');
        } catch { toast.error('Erreur réseau'); }
        finally { setAddingRuleFor(null); }
    };

    const handleDeleteRule = async (rule) => {
        const ok = await confirm('Supprimer cette règle ?');
        if (!ok) return;
        setDeletingRuleId(rule.id);
        try {
            const res = await post('delete_rule', { id: rule.id });
            if (res.success) { toast.success('Règle supprimée'); await load(); }
            else toast.error(res.message || 'Erreur');
        } catch { toast.error('Erreur réseau'); }
        finally { setDeletingRuleId(null); }
    };

    const handleSaveTemplate = async (key) => {
        setSavingTemplate(key);
        try {
            const res = await post('save_template', { template_key: key, body: templateDrafts[key] || '' });
            if (res.success) { toast.success('Message type enregistré'); await load(); }
            else toast.error(res.message || 'Erreur');
        } catch { toast.error('Erreur réseau'); }
        finally { setSavingTemplate(null); }
    };

    if (loading) return <div className="p-6 text-gray-400">Chargement…</div>;

    const rulesBySupplier = rules.reduce((acc, r) => {
        (acc[r.supplier_id] = acc[r.supplier_id] || []).push(r);
        return acc;
    }, {});

    return (
        <div className="p-4 md:p-6 max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <button onClick={onBack} className="p-2 rounded-lg border hover:bg-gray-50"><ArrowLeft size={17}/></button>
                <h2 className="text-xl font-bold flex items-center gap-2"><Settings2 size={22}/> Configuration — Boîte Fournisseurs</h2>
            </div>

            <div className="space-y-4 mb-8">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Fournisseurs actifs</h3>

                {suppliers.length === 0 && (
                    <p className="text-sm text-gray-400">Aucun fournisseur configuré.</p>
                )}

                {suppliers.map(s => {
                    const supplierRules = rulesBySupplier[s.id] || [];
                    const draft = newRule[s.id] || { sender_pattern: '', subject_keywords: '' };
                    return (
                        <div key={s.id} className="p-4 rounded-xl border bg-white space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                                <input
                                    value={nameEdits[s.id] ?? s.name}
                                    onChange={e => setNameEdits(prev => ({ ...prev, [s.id]: e.target.value }))}
                                    className={`${inputCls} flex-1 min-w-[160px]`}
                                />
                                <button onClick={() => handleSaveSupplier(s.id)} disabled={savingSupplierId === s.id}
                                    className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50">
                                    Enregistrer
                                </button>
                                <button onClick={() => handleDeleteSupplier(s)} disabled={deletingSupplierId === s.id}
                                    className="px-3 py-1.5 rounded-lg border text-red-600 text-sm hover:bg-red-50 disabled:opacity-50">
                                    Désactiver
                                </button>
                            </div>

                            <div className="pl-1 space-y-2">
                                {supplierRules.length === 0 && (
                                    <p className="text-xs text-gray-400">Aucune règle de détection.</p>
                                )}
                                {supplierRules.map(r => (
                                    <div key={r.id} className="flex items-center gap-2 text-sm bg-gray-50 rounded-lg px-3 py-1.5">
                                        <span className="flex-1 truncate">
                                            {r.sender_pattern && <span className="text-gray-700">{r.sender_pattern}</span>}
                                            {r.sender_pattern && r.subject_keywords && <span className="text-gray-300"> · </span>}
                                            {r.subject_keywords && <span className="text-gray-500">{r.subject_keywords}</span>}
                                        </span>
                                        <button onClick={() => handleDeleteRule(r)} disabled={deletingRuleId === r.id}
                                            className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50" title="Supprimer la règle">
                                            <Trash2 size={14}/>
                                        </button>
                                    </div>
                                ))}

                                <div className="flex flex-wrap items-center gap-2 pt-1">
                                    <input
                                        value={draft.sender_pattern}
                                        onChange={e => setNewRuleField(s.id, 'sender_pattern', e.target.value)}
                                        placeholder="commandes@somfy.fr ou @somfy.fr"
                                        className={`${inputCls} flex-1 min-w-[180px]`}
                                    />
                                    <input
                                        value={draft.subject_keywords}
                                        onChange={e => setNewRuleField(s.id, 'subject_keywords', e.target.value)}
                                        placeholder="commande, ARC (optionnel)"
                                        className={`${inputCls} flex-1 min-w-[180px]`}
                                    />
                                    <button onClick={() => handleAddRule(s.id)} disabled={addingRuleFor === s.id}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50">
                                        <Plus size={14}/> Ajouter
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="p-4 rounded-xl border bg-white mb-8">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Ajouter un fournisseur</h3>
                <form onSubmit={handleAddSupplier} className="flex flex-wrap gap-2">
                    <input
                        value={newSupplierName}
                        onChange={e => setNewSupplierName(e.target.value)}
                        placeholder="Nom du fournisseur"
                        className={`${inputCls} flex-1 min-w-[180px]`}
                    />
                    <button type="submit" disabled={addingSupplier}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50">
                        <Plus size={14}/> Ajouter
                    </button>
                </form>
            </div>

            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Messages types</h3>

                <div className="p-4 rounded-xl border bg-white space-y-2">
                    <label className="text-sm font-medium text-gray-700">Message « Bon pour accord »</label>
                    <textarea
                        rows={4}
                        value={templateDrafts.approval}
                        onChange={e => setTemplateDrafts(prev => ({ ...prev, approval: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button onClick={() => handleSaveTemplate('approval')} disabled={savingTemplate === 'approval'}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50">
                        Enregistrer le message « Bon pour accord »
                    </button>
                </div>

                <div className="p-4 rounded-xl border bg-white space-y-2">
                    <label className="text-sm font-medium text-gray-700">Début « Demande de modification »</label>
                    <textarea
                        rows={4}
                        value={templateDrafts.modification_prefix}
                        onChange={e => setTemplateDrafts(prev => ({ ...prev, modification_prefix: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button onClick={() => handleSaveTemplate('modification_prefix')} disabled={savingTemplate === 'modification_prefix'}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50">
                        Enregistrer le début de « Demande de modification »
                    </button>
                </div>
            </div>
        </div>
    );
}
