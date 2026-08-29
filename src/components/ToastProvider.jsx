import React, { createContext, useContext, useState, useCallback, useRef, useMemo } from 'react';
import { CheckCircle, XCircle, Info, X, AlertTriangle } from 'lucide-react';

const ToastContext = createContext(null);
const ConfirmContext = createContext(null);

export const useToast = () => useContext(ToastContext);
export const useConfirm = () => useContext(ConfirmContext);

let nextId = 0;

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const [confirmState, setConfirmState] = useState(null);
    const resolveRef = useRef(null);

    const addToast = useCallback((message, type) => {
        const id = ++nextId;
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
    }, []);

    // useMemo indispensable : sans lui, `toast` est un nouvel objet à chaque render,
    // ce qui casse la stabilité de référence attendue par les useCallback/useEffect
    // consommateurs (ex. un load() dépendant de `toast` boucle à l'infini sur une erreur).
    const toast = useMemo(() => ({
        success: (msg) => addToast(msg, 'success'),
        error:   (msg) => addToast(msg, 'error'),
        info:    (msg) => addToast(msg, 'info'),
        warn:    (msg) => addToast(msg, 'warn'),
    }), [addToast]);

    const confirm = useCallback((message) => {
        return new Promise(resolve => {
            resolveRef.current = resolve;
            setConfirmState({ message });
        });
    }, []);

    const handleAnswer = (result) => {
        setConfirmState(null);
        resolveRef.current?.(result);
    };

    const styles = {
        success: { bg: 'bg-green-600',  Icon: CheckCircle },
        error:   { bg: 'bg-red-600',    Icon: XCircle },
        info:    { bg: 'bg-blue-600',   Icon: Info },
        warn:    { bg: 'bg-orange-500', Icon: AlertTriangle },
    };

    return (
        <ToastContext.Provider value={toast}>
            <ConfirmContext.Provider value={confirm}>
                {children}

                {/* ── Toasts ── */}
                <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[100] flex flex-col-reverse gap-2 items-center pointer-events-none">
                    {toasts.map(t => {
                        const { bg, Icon } = styles[t.type] ?? styles.info;
                        return (
                            <div
                                key={t.id}
                                className={`flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl text-white text-sm font-semibold pointer-events-auto ${bg}`}
                                style={{ animation: 'toastIn 0.25s ease-out' }}
                            >
                                <Icon size={18} className="shrink-0" />
                                <span>{t.message}</span>
                                <button
                                    onClick={() => setToasts(prev => prev.filter(tt => tt.id !== t.id))}
                                    className="ml-2 opacity-60 hover:opacity-100 transition-opacity"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* ── Confirm dialog ── */}
                {confirmState && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center">
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => handleAnswer(false)} />
                        <div
                            className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm mx-4 w-full"
                            style={{ animation: 'toastIn 0.2s ease-out' }}
                        >
                            <p className="text-gray-800 font-semibold text-center mb-6 text-base leading-snug">
                                {confirmState.message}
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => handleAnswer(false)}
                                    className="py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={() => handleAnswer(true)}
                                    className="py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
                                >
                                    Confirmer
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </ConfirmContext.Provider>
        </ToastContext.Provider>
    );
};
