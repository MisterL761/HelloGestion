import React from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';

export default function NotificationBell() {
    const { supported, permission, subscribed, loading, subscribe, unsubscribe } = useNotifications();

    if (!supported) return null;

    const handleClick = () => subscribed ? unsubscribe() : subscribe();

    return (
        <button
            onClick={handleClick}
            disabled={loading}
            title={subscribed ? 'Désactiver les notifications' : 'Activer les notifications push'}
            className={`relative p-2 rounded-xl transition-colors ${
                subscribed
                    ? 'bg-amber-100 text-[#FFB103] hover:bg-amber-200'
                    : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
            }`}
        >
            {loading ? (
                <Loader2 size={18} className="animate-spin" />
            ) : subscribed ? (
                <>
                    <Bell size={18} />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-green-500 rounded-full border border-white" />
                </>
            ) : (
                <BellOff size={18} />
            )}
        </button>
    );
}
