import React, { useState } from 'react';
import { Plus, Download, AlertTriangle, Search, Box, CheckCircle, XCircle } from 'lucide-react';
import StatsCard from './StatsCard';
import InventoryItemRow from './InventoryItemRow';
import InventoryCard from './InventoryCard';

const API_BASE = import.meta.env.VITE_API_BASE || '/hello-gestion/php';

const SUPPLIERS = ['Wurth', 'Reca', 'yess', 'trenois', 'pointp', 'boschat', 'berner', 'somfy'];

const Inventory = ({ inventoryItems, stats, onAddArticle, onExport, onEditArticle, onDeleteArticle, onUpdateStock, onBulkEdit, user }) => {
    const [supplierFilter, setSupplierFilter] = useState(() => sessionStorage.getItem('inv_supplierFilter') || '');
    const [categoryFilter, setCategoryFilter] = useState(() => sessionStorage.getItem('inv_categoryFilter') || '');
    const [conditionnementFilter, setConditionnementFilter] = useState(() => sessionStorage.getItem('inv_conditionnementFilter') || '');
    const [statusFilter, setStatusFilter] = useState(() => sessionStorage.getItem('inv_statusFilter') || '');

    const handleSupplierFilter = (value) => {
        setSupplierFilter(value);
        sessionStorage.setItem('inv_supplierFilter', value);
    };
    const handleCategoryFilter = (value) => {
        setCategoryFilter(value);
        sessionStorage.setItem('inv_categoryFilter', value);
    };
    const handleConditionnementFilter = (value) => {
        setConditionnementFilter(value);
        sessionStorage.setItem('inv_conditionnementFilter', value);
    };
    const handleStatusFilter = (value) => {
        const next = statusFilter === value ? '' : value;
        setStatusFilter(next);
        sessionStorage.setItem('inv_statusFilter', next);
    };

    // Extraire les catégories uniques depuis les articles
    const uniqueCategories = [...new Set(inventoryItems.map(item => item.category).filter(Boolean))].sort();

    const filteredItems = inventoryItems.filter(item => {
        const matchSupplier = supplierFilter ? item.supplier === supplierFilter : true;
        const matchCategory = categoryFilter
            ? item.category.toLowerCase().includes(categoryFilter.toLowerCase())
            : true;
        const matchConditionnement = conditionnementFilter ? item.conditionnement === conditionnementFilter : true;
        const matchStatus = statusFilter ? item.status === statusFilter : true;
        return matchSupplier && matchCategory && matchConditionnement && matchStatus;
    });

    const handlePrint = () => {
        const itemsToPrint = filteredItems;

        const printWindow = window.open('', '', 'width=800,height=600');
        printWindow.document.write(`
      <html>
        <head>
          <title>Inventaire - ${supplierFilter || 'Tous les fournisseurs'}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { text-align: center; color: #1f2937; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background-color: #f3f4f6; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9fafb; }
            .status { padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: bold; }
            .Disponible { background: #d1fae5; color: #065f46; }
            .Faible { background: #fef3c7; color: #92400e; }
            .Rupture { background: #fee2e2; color: #991b1b; }
            @media print {
              body { margin: 10mm; }
              @page { margin: 10mm; }
            }
          </style>
        </head>
        <body>
          <h1>Inventaire - ${supplierFilter || 'Tous les fournisseurs'}</h1>
          <p><strong>Date :</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
          <p><strong>Total articles :</strong> ${itemsToPrint.length}</p>
          <table>
            <thead>
              <tr>
                <th>Matériel</th>
                <th>Fournisseur</th>
                <th>Catégorie</th>
                <th>Stock</th>
                <th>Seuil</th>
                <th>Prix (€)</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              ${itemsToPrint.map(item => `
                <tr>
                  <td>${item.material}</td>
                  <td>${item.supplier}</td>
                  <td>${item.category}</td>
                  <td>${item.stock}</td>
                  <td>${item.threshold}</td>
                  <td>${item.price ? parseFloat(item.price).toFixed(2) + '€' : 'N/A'}</td>
                  <td><span class="status ${item.status === 'Disponible' ? 'Disponible' : item.status.includes('Faible') ? 'Faible' : 'Rupture'}">${item.status}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
    };

    return (
        <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 xl:p-8">
            <div className="flex justify-between items-center mb-4 md:mb-6 xl:mb-8 flex-wrap gap-2.5" style={{ minWidth: "44px", minHeight: "44px" }}>
                <h3 className="text-lg md:text-xl xl:text-2xl font-semibold text-gray-800">Inventaire</h3>
                <div className="flex space-x-3">
                    <button
                        onClick={onAddArticle}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 md:px-4 xl:px-6 py-2 xl:py-2.5 rounded-lg flex items-center text-sm xl:text-base"
                    >
                        <Plus className="mr-1 md:mr-2" size={18} />
                        <span className="hidden md:inline">Ajouter Article</span>
                        <span className="inline md:hidden">+</span>
                    </button>
                    <button
                        onClick={handlePrint}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 md:px-4 xl:px-6 py-2 xl:py-2.5 rounded-lg flex items-center text-sm xl:text-base"
                        title="Imprimer la liste"
                    >
                        <Download className="mr-1 md:mr-2" size={18} />
                        <span className="hidden md:inline">Imprimer</span>
                        <span className="inline md:hidden">Print</span>
                    </button>
                </div>
            </div>

            {/* Filtres */}
            <div className="mb-3 md:mb-4 xl:mb-6 flex flex-col gap-3">
                {/* Fournisseur + Catégorie */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm xl:text-base font-medium text-gray-700 mb-2">Filtrer par fournisseur</label>
                        <select
                            value={supplierFilter}
                            onChange={(e) => handleSupplierFilter(e.target.value)}
                            className="w-full px-3 py-2 xl:py-2.5 text-sm xl:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        >
                            <option value="">Tous les fournisseurs</option>
                            {SUPPLIERS.map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm xl:text-base font-medium text-gray-700 mb-2">Filtrer par catégorie</label>
                        <select
                            value={categoryFilter}
                            onChange={(e) => handleCategoryFilter(e.target.value)}
                            className="w-full px-3 py-2 xl:py-2.5 text-sm xl:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        >
                            <option value="">Toutes les catégories</option>
                            {uniqueCategories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Filtre conditionnement — pills rapides */}
                <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs xl:text-sm font-medium text-gray-500">Conditionnement :</span>
                {[
                    { value: '',       label: 'Tous',       cls: 'bg-gray-100 text-gray-600 border-gray-200' },
                    { value: 'carton', label: '📦 Carton',  cls: 'bg-blue-50 text-blue-700 border-blue-200' },
                    { value: 'unite',  label: '🔩 Unité',   cls: 'bg-orange-50 text-orange-700 border-orange-200' },
                ].map(opt => (
                    <button
                        key={opt.value}
                        onClick={() => handleConditionnementFilter(opt.value)}
                        className={`px-3 py-1.5 rounded-full border text-xs xl:text-sm font-semibold transition-all ${
                            conditionnementFilter === opt.value
                                ? opt.cls + ' shadow-sm scale-105'
                                : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                        }`}
                    >
                        {opt.label}
                    </button>
                ))}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-3 md:gap-4 xl:gap-6 mb-4 md:mb-6 xl:mb-8">
                <StatsCard title="Articles en Stock" value={stats.total} icon={Box} color="blue" onClick={() => handleStatusFilter('')} active={statusFilter === ''} />
                <StatsCard title="Disponible" value={stats.available} icon={CheckCircle} color="green" onClick={() => handleStatusFilter('Disponible')} active={statusFilter === 'Disponible'} />
                <StatsCard title="Faible Stock" value={stats.lowStock} icon={AlertTriangle} color="yellow" onClick={() => handleStatusFilter('Faible Stock')} active={statusFilter === 'Faible Stock'} />
                <StatsCard title="Rupture" value={stats.outOfStock} icon={XCircle} color="red" onClick={() => handleStatusFilter('Rupture')} active={statusFilter === 'Rupture'} />
            </div>

            {filteredItems.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <Search size={48} className="mx-auto mb-3 md:mb-4 opacity-50" />
                    <p>Aucun résultat trouvé</p>
                </div>
            ) : (
                <>
                    {/* ── Vue MOBILE : cards poseur (cachée sur md+) ── */}
                    <div className="md:hidden space-y-3">
                        {filteredItems.map((item) => (
                            <InventoryCard
                                key={item.id}
                                item={item}
                                onEdit={onEditArticle}
                                onDelete={onDeleteArticle}
                                onUpdateStock={onUpdateStock}
                                isManager={true}
                            />
                        ))}
                    </div>

                    {/* ── Vue DESKTOP : table (cachée sur mobile) ── */}
                    <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Matériel</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Fournisseur</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Catégorie</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-40">Stock</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Seuil</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Prix</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {filteredItems.map((item) => (
                                    <InventoryItemRow
                                        key={item.id}
                                        item={item}
                                        onEdit={onEditArticle}
                                        onDelete={onDeleteArticle}
                                        onUpdateStock={onUpdateStock}
                                        isManager={true}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
};

export default Inventory;