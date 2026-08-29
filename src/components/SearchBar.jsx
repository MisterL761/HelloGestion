import React from 'react';
import { Search } from 'lucide-react';

const SearchBar = ({ searchTerm, onSearchChange, onClear }) => {
    if (!searchTerm) return null;

    return (
        <div className="mb-3 md:mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center">
                <Search className="mr-2 text-blue-600" size={18} />
                <span className="text-sm text-blue-800">
                    Résultats pour : <strong>{searchTerm}</strong>
                </span>
            </div>
            <button
                onClick={onClear}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
                Effacer
            </button>
        </div>
    );
};

export default SearchBar;