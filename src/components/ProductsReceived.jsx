import React from 'react';
import { Plus, Search } from 'lucide-react';
import ReceivedCard from './ReceivedCard';

const ProductsReceived = ({ products, onMarkAsInstalled, onMarkAsDefective, onAddProduct, onEditProduct, onDeleteProduct }) => {
    return (
        <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 mb-4 md:mb-6">
            <div className="flex justify-between items-center mb-4 md:mb-6 flex-wrap gap-2.5" style={{ minWidth: "44px", minHeight: "44px" }}>
                <h3 className="text-lg font-semibold text-gray-800">Produits Reçus</h3>
                <div className="flex space-x-3">
                    <button onClick={onAddProduct} className="bg-blue-600 hover:bg-blue-700 text-white px-3 md:px-4 py-2 rounded-lg flex items-center text-sm">
                        <Plus className="mr-1 md:mr-2" size={18} /> <span className="hidden md:inline">Ajouter</span> <span className="inline md:hidden">+</span>
                    </button>
                </div>
            </div>
            {products.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <Search size={48} className="mx-auto mb-3 md:mb-4 opacity-50" />
                    <p>Aucun résultat trouvé</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {products.map((item) => (
                        <ReceivedCard
                            key={item.id}
                            item={item}
                            onMarkAsInstalled={onMarkAsInstalled}
                            onMarkAsDefective={onMarkAsDefective}
                            onEditProduct={onEditProduct}
                            onDeleteProduct={onDeleteProduct}
                            isManager={true}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default ProductsReceived;
