import React, { useState } from 'react';
import { Plus, AlertCircle } from 'lucide-react';
import DefectiveCard from './DefectiveCard';

const ProductsDefective = ({ defectiveProducts, onDeleteDefective, onAddDefectiveProduct, onEditDefectiveProduct }) => {
    const [selectedSupplier, setSelectedSupplier] = useState('all');

    const suppliers = [...new Set(defectiveProducts.map(item => item.supplier).filter(Boolean))].sort();

    const filteredProducts = selectedSupplier === 'all'
        ? defectiveProducts
        : defectiveProducts.filter(item => item.supplier === selectedSupplier);

    return (
        <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 mb-4 md:mb-6">
            <div className="flex justify-between items-center mb-4 md:mb-6 flex-wrap gap-2.5">
                <h3 className="text-lg font-semibold text-gray-800">Produits Défectueux</h3>
                <div className="flex items-center space-x-3">
                    {suppliers.length > 0 && (
                        <select
                            value={selectedSupplier}
                            onChange={(e) => setSelectedSupplier(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                        >
                            <option value="all">Tous les fournisseurs</option>
                            {suppliers.map(supplier => (
                                <option key={supplier} value={supplier}>{supplier}</option>
                            ))}
                        </select>
                    )}
                    <button onClick={onAddDefectiveProduct} className="bg-red-600 hover:bg-red-700 text-white px-3 md:px-4 py-2 rounded-lg flex items-center text-sm">
                        <Plus className="mr-1 md:mr-2" size={18} />
                        <span className="hidden md:inline">Ajouter Défectueux</span>
                        <span className="inline md:hidden">+</span>
                    </button>
                </div>
            </div>
            {filteredProducts.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <AlertCircle size={48} className="mx-auto mb-3 md:mb-4 opacity-50" />
                    <p>{selectedSupplier === 'all' ? 'Aucun produit défectueux pour le moment' : `Aucun produit défectueux pour le fournisseur "${selectedSupplier}"`}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {filteredProducts.map((item) => (
                        <DefectiveCard key={item.id} item={item} onEditDefectiveProduct={onEditDefectiveProduct} onDeleteDefective={onDeleteDefective} isManager={true} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default ProductsDefective;
