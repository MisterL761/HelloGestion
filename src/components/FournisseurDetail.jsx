import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Paperclip, ChevronDown, ChevronUp, Check, Pencil, Wand2, Undo2, Send, X } from 'lucide-react';
import { useToast, useConfirm } from './ToastProvider';
import { API_BASE } from '../utils/constants';

const API = `${API_BASE}/supplier_emails_api.php`;
const post = (action, body) => fetch(`${API}?action=${action}`, {
    method: 'POST', credentials: 'include',
    headers: body instanceof FormData ? undefined : { 'Content-Type': 'application/json' },
    body: body instanceof FormData ? body : JSON.stringify(body),
}).then(r => r.json());

const STATUS_BADGE = {
    pending:               { label: 'En attente de réponse',      cls: 'bg-orange-100 text-orange-700' },
    awaiting_modification: { label: 'En attente de modification', cls: 'bg-purple-100 text-purple-700' },
    replied_unclassified:  { label: 'Répondu — à classer',        cls: 'bg-gray-100 text-gray-600' },
    approved:              { label: 'Validé',                     cls: 'bg-green-100 text-green-700' },
};

export default function FournisseurDetail({ supplier, onBack }) {
    const toast = useToast();
    const confirm = useConfirm();
    const [tab, setTab] = useState('encours');
    const [emails, setEmails] = useState([]);
    const [openId, setOpenId] = useState(null);        // mail déplié (corps)
    const [detail, setDetail] = useState(null);        // email_detail du mail ouvert
    const [openReplies, setOpenReplies] = useState({}); // accordéons réponses
    const [approving, setApproving] = useState(null);  // id en cours de "bon pour accord" (affiche champ précision)
    const [precision, setPrecision] = useState('');
    const [modifyFor, setModifyFor] = useState(null);  // mail cible de la modale modification
    const [modifyText, setModifyText] = useState('');
    const [originalText, setOriginalText] = useState(null); // pour ↩ après reformulation
    const [files, setFiles] = useState([]);
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        const res = await fetch(`${API}?action=list_emails&supplier_id=${supplier.id}&tab=${tab}`, { credentials: 'include' }).then(r => r.json());
        if (res.success) setEmails(res.data); else toast.error(res.message || 'Erreur');
    }, [supplier.id, tab, toast]);
    useEffect(() => { load(); }, [load]);

    const openEmail = async (e) => {
        if (openId === e.id) { setOpenId(null); setDetail(null); return; }
        setOpenId(e.id); setDetail(null);
        const res = await fetch(`${API}?action=email_detail&id=${e.id}`, { credentials: 'include' }).then(r => r.json());
        if (res.success) setDetail(res.data);
        else toast.error(res.message || 'Impossible de charger le mail');
        if (!e.is_read) {
            post('mark_read', { id: e.id });
            setEmails(prev => prev.map(m => m.id === e.id ? { ...m, is_read: true } : m));
        }
    };

    const sendApprove = async (id) => {
        if (!(await confirm(`Envoyer le bon pour accord à ${supplier.name} ?`))) return;
        setBusy(true);
        try {
            const res = await post('reply_approve', { id, precision });
            if (res.success) { toast.success('Bon pour accord envoyé ✓'); setApproving(null); setPrecision(''); load(); }
            else toast.error(res.message || "Échec de l'envoi");
        } catch { toast.error('Erreur réseau'); }
        finally { setBusy(false); }
    };

    const sendModify = async () => {
        if (!modifyText.trim()) { toast.error('Écrivez les points à modifier'); return; }
        setBusy(true);
        try {
            const fd = new FormData();
            fd.append('id', modifyFor.id); fd.append('body', modifyText);
            files.forEach(f => fd.append('attachments[]', f));
            const res = await post('reply_modify', fd);
            if (res.success) { toast.success('Demande de modification envoyée ✓'); setModifyFor(null); setModifyText(''); setFiles([]); setOriginalText(null); load(); }
            else toast.error(res.message || "Échec — votre brouillon est conservé");
        } catch { toast.error('Erreur réseau'); }
        finally { setBusy(false); }
    };

    const reformulate = async () => {
        setBusy(true);
        try {
            const res = await post('reformulate', { text: modifyText });
            if (res.success) { setOriginalText(modifyText); setModifyText(res.data.text); toast.success('Texte reformulé — vous pouvez le retoucher'); }
            else toast.error(res.message || 'Reformulation indisponible');
        } catch { toast.error('Erreur réseau'); }
        finally { setBusy(false); }
    };

    const classify = async (id, decision) => {
        const res = await post('classify', { id, decision });
        if (res.success) { toast.success('Classé ✓'); load(); }
        else toast.error(res.message || 'Classement impossible');
    };

    return (
        <div className="p-4 md:p-6">
            <div className="flex items-center gap-3 mb-4">
                <button onClick={onBack} className="p-2 rounded-lg border hover:bg-gray-50"><ArrowLeft size={17}/></button>
                <h2 className="text-xl font-bold">{supplier.name}</h2>
            </div>
            <div className="flex gap-2 mb-4">
                {[['encours', 'En cours'], ['passees', 'Commandes passées']].map(([k, label]) => (
                    <button key={k} onClick={() => setTab(k)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium ${tab === k ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        {label}
                    </button>
                ))}
            </div>

            <div className="space-y-2">
                {emails.map(e => {
                    const badge = STATUS_BADGE[e.status] || STATUS_BADGE.pending;
                    return (
                        <div key={e.id} className={`rounded-xl border bg-white ${e.is_overdue ? 'border-l-4 border-l-red-500' : ''}`}>
                            <button onClick={() => openEmail(e)} className="w-full text-left p-3 flex items-center gap-3">
                                <div className="flex-1 min-w-0">
                                    <p className={`truncate ${!e.is_read ? 'font-bold' : 'font-medium'}`}>{e.subject || '(sans objet)'}</p>
                                    <p className="text-xs text-gray-500">
                                        {new Date(e.received_at + 'Z').toLocaleString('fr-FR')}
                                        {e.is_overdue && <span className="text-red-600 font-semibold"> · Sans réponse depuis {e.days_waiting} jours</span>}
                                    </p>
                                </div>
                                {e.attachments_count > 0 && <span className="flex items-center text-gray-400 text-xs gap-0.5"><Paperclip size={13}/>{e.attachments_count}</span>}
                                <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${badge.cls}`}>{badge.label}</span>
                            </button>

                            {openId === e.id && detail && (
                                <div className="border-t p-3">
                                    <iframe sandbox="" srcDoc={detail.body_html} title="mail" className="w-full h-72 rounded border bg-white"/>
                                    {detail.attachments?.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {detail.attachments.map(a => (
                                                <a key={a.id} href={`${API}?action=download_attachment&id=${a.id}`}
                                                   className="flex items-center gap-1 text-xs px-2 py-1 rounded border hover:bg-gray-50">
                                                    <Paperclip size={12}/>{a.filename}
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                    {tab === 'encours' && (e.status === 'pending' || e.status === 'replied_unclassified') && (
                                        <div className="flex flex-wrap items-center gap-2 mt-3">
                                            <button onClick={() => sendApprove(e.id)} disabled={busy}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700 disabled:opacity-50">
                                                <Check size={15}/> Bon pour accord
                                            </button>
                                            <button onClick={() => setApproving(approving === e.id ? null : e.id)}
                                                className="text-sm text-green-700 underline">+ Ajouter une précision</button>
                                            <button onClick={() => { setModifyFor(e); setModifyText(''); setOriginalText(null); }}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 text-white text-sm hover:bg-purple-700">
                                                <Pencil size={15}/> Demande de modification
                                            </button>
                                        </div>
                                    )}
                                    {approving === e.id && (
                                        <div className="flex gap-2 mt-2">
                                            <input value={precision} onChange={ev => setPrecision(ev.target.value)}
                                                placeholder="Précision ajoutée au bon pour accord…"
                                                className="flex-1 border rounded-lg px-3 py-1.5 text-sm"/>
                                        </div>
                                    )}
                                </div>
                            )}

                            {e.status === 'replied_unclassified' && (
                                <div className="border-t p-2 flex items-center gap-2 text-xs text-gray-500">
                                    Réponse détectée depuis Outlook — classer :
                                    <button onClick={() => classify(e.id, 'approved')} className="px-2 py-0.5 rounded bg-green-100 text-green-700 hover:bg-green-200">✅ Bon pour accord</button>
                                    <button onClick={() => classify(e.id, 'awaiting_modification')} className="px-2 py-0.5 rounded bg-purple-100 text-purple-700 hover:bg-purple-200">✏️ À modifier</button>
                                </div>
                            )}

                            {e.replies?.length > 0 && (
                                <div className="border-t">
                                    <button onClick={() => setOpenReplies(o => ({ ...o, [e.id]: !o[e.id] }))}
                                        className="w-full flex items-center gap-1 p-2 text-xs text-gray-500 hover:bg-gray-50">
                                        {openReplies[e.id] ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
                                        Voir la réponse ({e.replies.length})
                                    </button>
                                    {openReplies[e.id] && e.replies.map(r => (
                                        <div key={r.id} className="px-4 pb-3">
                                            <p className="text-xs text-gray-400 mb-1">Réponse du {new Date(r.received_at + 'Z').toLocaleString('fr-FR')}</p>
                                            <iframe sandbox="" srcDoc={r.body_html} title="réponse" className="w-full h-40 rounded border bg-gray-50"/>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
                {emails.length === 0 && <p className="text-sm text-gray-400">Aucun mail {tab === 'encours' ? 'en cours' : 'validé'} pour ce fournisseur.</p>}
            </div>

            {modifyFor && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-bold">Demande de modification — {modifyFor.subject}</h3>
                            <button onClick={() => setModifyFor(null)}><X size={18}/></button>
                        </div>
                        <textarea value={modifyText} onChange={ev => setModifyText(ev.target.value)} rows={7}
                            placeholder="Points à modifier sur cet ARC (dimensions, coloris, prix, délai…)"
                            className="w-full border rounded-lg p-2 text-sm"/>
                        <input type="file" multiple onChange={ev => setFiles([...ev.target.files])} className="text-xs my-2"/>
                        <div className="flex items-center gap-2 justify-end">
                            {originalText !== null && (
                                <button onClick={() => { setModifyText(originalText); setOriginalText(null); }}
                                    className="flex items-center gap-1 text-sm text-gray-500 underline"><Undo2 size={14}/> Revenir à mon texte</button>
                            )}
                            <button onClick={reformulate} disabled={busy || !modifyText.trim()}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-50 disabled:opacity-50">
                                <Wand2 size={15}/> Reformuler
                            </button>
                            <button onClick={sendModify} disabled={busy}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 text-white text-sm hover:bg-purple-700 disabled:opacity-50">
                                <Send size={15}/> Envoyer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
