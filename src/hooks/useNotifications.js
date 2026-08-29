import { useState, useEffect } from 'react';

const API_BASE  = import.meta.env.VITE_API_BASE || '/hello-gestion/php';
const VAPID_KEY = 'BPj3AceJqjOJIS9cwtbWUQnQShL7T9yXg4XIIT9z3l_ZBT-LfXg1LetkJn-ecY95OkipK6bXQgVVHQhedz7xivM';

// Toutes les vérifications dans des try/catch pour éviter tout crash mobile
const checkSupported = () => {
    try {
        return typeof window !== 'undefined'
            && 'serviceWorker' in navigator
            && 'PushManager' in window
            && typeof Notification !== 'undefined';
    } catch { return false; }
};

const getPermission = () => {
    try { return Notification.permission || 'default'; }
    catch { return 'default'; }
};

function urlBase64ToUint8Array(b64) {
    try {
        const pad = '='.repeat((4 - b64.length % 4) % 4);
        const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
        return Uint8Array.from(raw, c => c.charCodeAt(0));
    } catch { return new Uint8Array(); }
}

export function useNotifications() {
    // Tout initialisé à des valeurs sûres, jamais calculé au render
    const [supported,  setSupported]  = useState(false);
    const [permission, setPermission] = useState('default');
    const [subscribed, setSubscribed] = useState(false);
    const [loading,    setLoading]    = useState(false);

    // Initialisation différée dans useEffect pour éviter les crash SSR/mobile
    useEffect(() => {
        const sup = checkSupported();
        setSupported(sup);
        if (!sup) return;
        setPermission(getPermission());

        fetch(`${API_BASE}/push_subscribe.php`, { credentials: 'include' })
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d?.success) setSubscribed(!!d.subscribed); })
            .catch(() => {});
    }, []);

    const subscribe = async () => {
        if (!supported || loading) return;
        setLoading(true);
        try {
            const perm = await Notification.requestPermission();
            setPermission(perm);
            if (perm !== 'granted') return;

            const reg = await navigator.serviceWorker.register(
                '/hello-gestion/sw.js', { scope: '/hello-gestion/' }
            );
            await navigator.serviceWorker.ready;

            const sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_KEY),
            });

            const key  = sub.getKey('p256dh');
            const auth = sub.getKey('auth');
            const toB64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf)))
                .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

            await fetch(`${API_BASE}/push_subscribe.php`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ endpoint: sub.endpoint, p256dh: toB64u(key), auth: toB64u(auth) }),
            });
            setSubscribed(true);
        } catch (err) {
            console.warn('Push subscribe:', err);
        } finally {
            setLoading(false);
        }
    };

    const unsubscribe = async () => {
        if (!supported || loading) return;
        setLoading(true);
        try {
            const reg = await navigator.serviceWorker.getRegistration('/hello-gestion/');
            if (reg) {
                const sub = await reg.pushManager.getSubscription();
                if (sub) {
                    await fetch(`${API_BASE}/push_subscribe.php`, {
                        method: 'DELETE',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ endpoint: sub.endpoint }),
                    });
                    await sub.unsubscribe();
                }
            }
            setSubscribed(false);
        } catch (err) {
            console.warn('Push unsubscribe:', err);
        } finally {
            setLoading(false); }
    };

    return { supported, permission, subscribed, loading, subscribe, unsubscribe };
}
