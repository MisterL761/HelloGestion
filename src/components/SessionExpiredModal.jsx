import React from 'react';
import { LogIn, Clock } from 'lucide-react';

const SessionExpiredModal = ({ onReconnect }) => (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
            {/* Header sombre */}
            <div className="bg-[#1a1a1a] px-6 py-5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FFB103]/20 flex items-center justify-center flex-shrink-0">
                    <Clock size={20} className="text-[#FFB103]" />
                </div>
                <div>
                    <p className="font-bold text-white text-sm">Session expirée</p>
                    <p className="text-white/50 text-xs mt-0.5">Hello Gestion</p>
                </div>
            </div>

            {/* Contenu */}
            <div className="px-6 py-5">
                <p className="text-gray-700 text-sm leading-relaxed">
                    Ta session a expiré après une période d'inactivité.
                    Reconnecte-toi pour continuer.
                </p>
            </div>

            {/* Bouton */}
            <div className="px-6 pb-6">
                <button
                    onClick={onReconnect}
                    className="w-full bg-[#FFB103] hover:bg-[#d49400] text-[#1a1a1a] font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                    <LogIn size={17} />
                    Se reconnecter
                </button>
            </div>
        </div>
    </div>
);

export default SessionExpiredModal;
