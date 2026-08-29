import React from 'react';
import { Search, X, Menu } from 'lucide-react';

const Header = ({ searchTerm, onSearchChange, onMenuToggle, pageTitle }) => {
    return (
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
            {/* Hamburger — mobile uniquement */}
            <button
                onClick={onMenuToggle}
                className="md:hidden flex-shrink-0 p-2 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors"
                style={{ minWidth: '40px', minHeight: '40px' }}
                title="Menu"
            >
                <Menu size={22} />
            </button>

            {/* Titre de page */}
            {pageTitle && (
                <div className="hidden sm:flex items-center gap-2.5 flex-shrink-0">
                    <h2 className="text-sm font-bold text-gray-800 whitespace-nowrap">{pageTitle}</h2>
                    <div className="w-px h-4 bg-gray-200" />
                </div>
            )}

            {/* Barre de recherche */}
            <div className="flex-1 relative max-w-md mx-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                <input
                    type="text"
                    placeholder="Rechercher…"
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFB103] focus:border-transparent bg-gray-50 focus:bg-white transition-colors"
                />
                {searchTerm && (
                    <button
                        onClick={() => onSearchChange('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        <X size={15} />
                    </button>
                )}
            </div>
        </header>
    );
};

export default Header;
