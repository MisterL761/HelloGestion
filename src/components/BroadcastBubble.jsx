import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Megaphone, X, Send, Clock, Trash2, ChevronDown } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || '/hello-gestion/php';

const ROLE_LABELS = {
    admin:          'Administrateur',
    gerant:         'Gérant',
    administration: 'Administration',
    chef_equipe:    "Chef d'équipe",
    commercial:     'Commercial',
    poseur:         'Poseur',
};

const ROLE_COLORS = {
    admin:          'bg-amber-100 text-amber-700',
    gerant:         'bg-blue-100 text-blue-700',
    administration: 'bg-indigo-100 text-indigo-700',
    chef_equipe:    'bg-green-100 text-green-700',
    commercial:     'bg-orange-100 text-orange-700',
    poseur:         'bg-gray-100 text-gray-500',
};

function timeAgo(dateStr) {
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60)   return 'À l\'instant';
    if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`;
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

export default function BroadcastBubble({ user }) {
    const canSend = ['admin', 'gerant', 'administration'].includes(user?.role);

    const [open, setOpen]               = useState(false);
    const [messages, setMessages]       = useState([]);
    const [unreadIds, setUnreadIds]     = useState(new Set());
    const [newMsg, setNewMsg]           = useState('');
    const [sending, setSending]         = useState(false);
    const [showCompose, setShowCompose] = useState(false);
    const panelRef  = useRef(null);
    const textaRef  = useRef(null);

    // Charger les messages non lus (badge)
    const fetchUnread = useCallback(() => {
        fetch(`${API_BASE}/broadcast.php?action=unread`, { credentials: 'include' })
            .then(r => r.json())
            .then(d => {
                if (d.success) setUnreadIds(new Set((d.messages || []).map(m => m.id)));
            })
            .catch(() => {});
    }, []);

    // Charger tous les messages (panel ouvert)
    const fetchAll = useCallback(() => {
        fetch(`${API_BASE}/broadcast.php?action=all`, { credentials: 'include' })
            .then(r => r.json())
            .then(d => { if (d.success) setMessages(d.messages || []); })
            .catch(() => {});
    }, []);

    useEffect(() => {
        fetchUnread();
        const t = setInterval(fetchUnread, 60_000);
        return () => clearInterval(t);
    }, [fetchUnread]);

    useEffect(() => {
        if (open) {
            fetchAll();
            // Marquer tous comme lus
            unreadIds.forEach(id => {
                fetch(`${API_BASE}/broadcast.php`, {
                    method: 'POST', credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'read', message_id: id }),
                }).catch(() => {});
            });
            setUnreadIds(new Set());
        }
    }, [open]);

    // Fermer en cliquant dehors
    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const handleSend = async () => {
        if (!newMsg.trim()) return;
        setSending(true);
        try {
            const res  = await fetch(`${API_BASE}/broadcast.php`, {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'send', message: newMsg }),
            });
            const data = await res.json();
            if (data.success) {
                setNewMsg('');
                setShowCompose(false);
                fetchAll();
            }
        } catch { /* ignore */ }
        finally { setSending(false); }
    };

    const handleDelete = async (id) => {
        await fetch(`${API_BASE}/broadcast.php?id=${id}`, { method: 'DELETE', credentials: 'include' }).catch(() => {});
        setMessages(prev => prev.filter(m => m.id !== id));
    };

    const unreadCount = unreadIds.size;

    return (
        <div ref={panelRef} className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 flex flex-col items-end gap-3">

            {/* ── Panel ────────────────────────────────────── */}
            {open && (
                <div className="w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden"
                    style={{ maxHeight: '70vh' }}>

                    {/* Header panel */}
                    <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#1a1a1a] to-[#333333]">
                        <div className="flex items-center gap-2 text-white">
                            <Megaphone size={16} />
                            <span className="font-bold text-sm">Annonces équipe</span>
                        </div>
                        <div className="flex items-center gap-2">
                            {canSend && (
                                <button
                                    onClick={() => { setShowCompose(v => !v); setTimeout(() => textaRef.current?.focus(), 50); }}
                                    className="text-white/80 hover:text-white text-xs font-semibold bg-white/20 hover:bg-white/30 px-2.5 py-1 rounded-lg transition-colors"
                                >
                                    + Nouvelle
                                </button>
                            )}
                            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white transition-colors">
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Zone de composition */}
                    {canSend && showCompose && (
                        <div className="px-4 py-3 border-b border-gray-100 bg-amber-50">
                            <textarea
                                ref={textaRef}
                                value={newMsg}
                                onChange={e => setNewMsg(e.target.value)}
                                rows={3}
                                placeholder="Réunion demain à 8h30…"
                                className="w-full text-sm border border-amber-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#FFB103] bg-white"
                                onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSend(); }}
                            />
                            <div className="flex items-center justify-between mt-2">
                                <span className="text-[10px] text-gray-400">Ctrl+Entrée pour envoyer</span>
                                <button
                                    onClick={handleSend}
                                    disabled={sending || !newMsg.trim()}
                                    className="flex items-center gap-1.5 bg-[#FFB103] text-[#1a1a1a] px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-[#d49400] disabled:opacity-40 transition-colors"
                                >
                                    <Send size={12} />
                                    {sending ? 'Envoi…' : 'Envoyer'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Liste des messages */}
                    <div className="overflow-y-auto flex-1">
                        {messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-2">
                                <Megaphone size={28} className="opacity-30" />
                                <p className="text-sm">Aucune annonce pour l'instant</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {messages.map(m => (
                                    <div key={m.id} className="px-4 py-3 hover:bg-gray-50 transition-colors group">
                                        <div className="flex items-start gap-2.5">
                                            {/* Avatar initiale */}
                                            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-[#FFB103] font-bold text-xs shrink-0 mt-0.5">
                                                {m.sender_name?.charAt(0)?.toUpperCase() || '?'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                                    <span className="text-xs font-bold text-gray-800">{m.sender_name}</span>
                                                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${ROLE_COLORS[m.sender_role] || 'bg-gray-100 text-gray-500'}`}>
                                                        {ROLE_LABELS[m.sender_role] || m.sender_role}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{m.message}</p>
                                                <div className="flex items-center justify-between mt-1.5">
                                                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                                        <Clock size={9} /> {timeAgo(m.created_at)}
                                                    </span>
                                                    {m.read_count !== undefined && (
                                                        <span className="text-[10px] text-gray-400">{m.read_count} lu{m.read_count > 1 ? 's' : ''}</span>
                                                    )}
                                                </div>
                                            </div>
                                            {/* Bouton supprimer (managers uniquement) */}
                                            {canSend && (
                                                <button
                                                    onClick={() => handleDelete(m.id)}
                                                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-all shrink-0"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Bouton flottant ──────────────────────────── */}
            <button
                onClick={() => setOpen(v => !v)}
                className="relative w-14 h-14 bg-[#FFB103] hover:bg-[#d49400] text-[#1a1a1a] rounded-full shadow-xl shadow-amber-300 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
            >
                <Megaphone size={22} />

                {/* Badge non lus */}
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-md animate-bounce">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>
        </div>
    );
}
