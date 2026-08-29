import React from 'react';
import { Upload } from 'lucide-react';
import InstalledCard from './InstalledCard';

const ProductsInstalled = ({ installedProducts, onDeleteInstalled }) => {
    return (
        <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 mb-4 md:mb-6">
            <div className="flex justify-between items-center mb-4 md:mb-6 flex-wrap gap-2.5"
                style={{ minWidth: "44px", minHeight: "44px" }}>
                <h3 className="text-lg font-semibold text-gray-800">Produits Posés</h3>
            </div>
            {installedProducts.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <Upload size={48} className="mx-auto mb-3 md:mb-4 opacity-50" />
                    <p>Aucun produit posé pour le moment</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {installedProducts.map((item) => (
                        <InstalledCard key={item.id} item={item} onDeleteInstalled={onDeleteInstalled} isManager={true} />
                    ))}
                </div>
            )}
        </div>
    );
}
export default ProductsInstalled;
