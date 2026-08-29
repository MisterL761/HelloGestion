import React, { useState, useEffect, useCallback } from 'react';
import { Megaphone, X, ChevronLeft, ChevronRight } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || '/hello-gestion/php';

const ROLE_LABELS = {
    admin:          'Administrateur',
    gerant:         'Gérant',
    administration: 'Administration',
    chef_equipe:    "Chef d'équipe",
};

const ROLE_COLORS = {
    admin:          'bg-amber-100 text-amber-700',
    gerant:         'bg-blue-100 text-blue-700',
    administration: 'bg-indigo-100 text-indigo-700',
    chef_equipe:    'bg-green-100 text-green-700',
};

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function BroadcastModal() {
    const [messages, setMessages] = useState([]);
    const [index, setIndex]       = useState(0);
    const [visible, setVisible]   = useState(false);
    const [closing, setClosing]   = useState(false);

    // Charge les messages non lus au montage
    useEffect(() => {
        fetch(`${API_BASE}/broadcast.php?action=unread`, { credentials: 'include' })
            .then(r => r.json())
            .then(data => {
                if (data.success && data.messages?.length > 0) {
                    setMessages(data.messages);
                    setIndex(0);
                    setVisible(true);
                }
            })
            .catch(() => {});
    }, []);

    const markRead = useCallback((msgId) => {
        fetch(`${API_BASE}/broadcast.php`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'read', message_id: msgId }),
        }).catch(() => {});
    }, []);

    const closeCurrentAndAdvance = () => {
        const current = messages[index];
        if (current) markRead(current.id);

        if (index < messages.length - 1) {
            // Il reste d'autres messages → passer au suivant
            setIndex(i => i + 1);
        } else {
            // Dernier message → fermer la modale
            setClosing(true);
            setTimeout(() => { setVisible(false); setClosing(false); }, 300);
        }
    };

    if (!visible) return null;

    const msg   = messages[index];
    const total = messages.length;

    return (
        <div className={`fixed inset-0 z-[9999] flex items-center justify-center px-4 transition-all duration-300 ${closing ? 'opacity-0' : 'opacity-100'}`}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

            {/* Carte */}
            <div className={`relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${closing ? 'scale-95' : 'scale-100'}`}>

                {/* Bandeau violet du haut */}
                <div className="bg-gradient-to-r from-[#1a1a1a] to-[#333333] px-6 py-5 text-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-xl">
                            <Megaphone size={22} className="text-white" />
                        </div>
                        <div>
                            <p className="font-bold text-lg leading-tight">Message de l'équipe</p>
                            {total > 1 && (
                                <p className="text-white/70 text-xs mt-0.5">{index + 1} / {total} messages non lus</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Contenu */}
                <div className="px-6 py-5">
                    {/* Expéditeur */}
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-[#FFB103] font-bold text-sm">
                            {msg.sender_name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div>
                            <p className="font-semibold text-gray-800 text-sm leading-tight">{msg.sender_name}</p>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ROLE_COLORS[msg.sender_role] || 'bg-gray-100 text-gray-600'}`}>
                                {ROLE_LABELS[msg.sender_role] || msg.sender_role}
                            </span>
                        </div>
                        <span className="ml-auto text-[11px] text-gray-400">{formatDate(msg.created_at)}</span>
                    </div>

                    {/* Message */}
                    <div className="bg-gray-50 rounded-xl px-4 py-4 border border-gray-100">
                        <p className="text-gray-800 text-base leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 pb-6 flex items-center justify-between gap-3">
                    {/* Indicateurs si plusieurs messages */}
                    {total > 1 ? (
                        <div className="flex gap-1.5">
                            {messages.map((_, i) => (
                                <div
                                    key={i}
                                    className={`h-1.5 rounded-full transition-all duration-300 ${
                                        i === index ? 'w-5 bg-[#FFB103]' : 'w-1.5 bg-gray-200'
                                    }`}
                                />
                            ))}
                        </div>
                    ) : <div />}

                    <button
                        onClick={closeCurrentAndAdvance}
                        className="flex items-center gap-2 px-5 py-2.5 bg-[#FFB103] hover:bg-[#d49400] text-white font-semibold rounded-xl text-sm transition-colors shadow-lg shadow-amber-200"
                    >
                        {index < total - 1 ? (
                            <>Suivant <ChevronRight size={16} /></>
                        ) : (
                            <>J'ai lu <X size={16} /></>

                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
