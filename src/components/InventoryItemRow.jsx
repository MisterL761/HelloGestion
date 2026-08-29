import { useState } from 'react';
import { Edit, Trash2, Eye, TrendingUp, Clock } from 'lucide-react';
import FileViewer from './FileViewer';
import SupplierLogo from './SupplierLogo';
import { getFileUrl } from '../utils/utilities';

const API_BASE = import.meta.env.VITE_API_BASE || '/hello-gestion/php';

const statusBorder = (status) => {
    if (!status) return '';
    if (status.includes('Rupture')) return 'border-l-4 border-red-400 bg-red-50/40';
    if (status.includes('Faible'))  return 'border-l-4 border-yellow-400 bg-yellow-50/40';
    return '';
};

const ruptureLabel = (dateStr) => {
    if (!dateStr) return null;
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
    if (diff === 0) return "aujourd'hui";
    if (diff === 1) return 'hier';
    return `depuis ${diff} j`;
};

const InventoryItemRow = ({ item, onEdit, onDelete, onUpdateStock, isManager }) => {
    const [showFileViewer, setShowFileViewer] = useState(false);
    const [showPriceHistory, setShowPriceHistory] = useState(false);
    const [priceHistory, setPriceHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const fetchPriceHistory = async () => {
        setLoadingHistory(true);
        try {
            const res = await fetch(`${API_BASE}/price_history.php?inventory_id=${item.id}`, { credentials: 'include' });
            const data = await res.json();
            if (Array.isArray(data)) setPriceHistory(data);
        } catch (e) { console.error(e); }
        finally { setLoadingHistory(false); }
    };

    const pct = Math.min((item.stock / Math.max(item.threshold * 2, 1)) * 100, 100);
    const barColor = item.stock === 0 ? 'bg-red-500' : item.stock < item.threshold ? 'bg-yellow-500' : 'bg-green-500';

    return (
        <>
            <tr className={`hover:bg-gray-50 transition-colors ${statusBorder(item.status)}`}>
                {/* Matériel */}
                <td className="px-4 py-3 max-w-[220px]">
                    <p className="text-sm font-semibold text-gray-900 truncate">{item.material}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {item.conditionnement === 'carton'
                            ? <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">📦 Carton</span>
                            : <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">🔩 Unité</span>
                        }
                        {Number(item.stock) === 0 && item.rupture_date && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                                <Clock size={9} /> {ruptureLabel(item.rupture_date)}
                            </span>
                        )}
                    </div>
                </td>

                {/* Fournisseur */}
                <td className="px-4 py-3">
                    <SupplierLogo supplier={item.supplier} className="h-7 w-auto object-contain" />
                </td>

                {/* Catégorie */}
                <td className="px-4 py-3">
                    <span className="text-sm text-gray-600 font-medium">{item.category || '—'}</span>
                </td>

                {/* Stock + barre */}
                <td className="px-4 py-3 w-40">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold text-gray-900">{item.stock}</span>
                        <span className="text-xs text-gray-400">/ {item.threshold}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
                    </div>
                </td>

                {/* Seuil */}
                <td className="px-4 py-3">
                    <span className="text-sm text-gray-600">{item.threshold}</span>
                </td>

                {/* Prix */}
                <td className="px-4 py-3">
                    <button
                        onClick={() => { setShowPriceHistory(true); fetchPriceHistory(); }}
                        className="text-sm font-semibold text-gray-900 hover:text-amber-700 transition-colors flex items-center gap-1 group"
                        title="Voir l'historique des prix"
                    >
                        {item.price ? `${parseFloat(item.price).toFixed(2)} €` : '—'}
                        <TrendingUp size={11} className="opacity-0 group-hover:opacity-50 transition-opacity" />
                    </button>
                </td>

                {/* Actions */}
                <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                        {item.file_path && (
                            <button onClick={() => setShowFileViewer(true)}
                                className="p-1.5 rounded-lg text-blue-500 hover:text-white hover:bg-blue-500 border border-blue-200 hover:border-blue-500 transition-colors"
                                title="Voir le fichier">
                                <Eye size={15} />
                            </button>
                        )}
                        <button onClick={() => onEdit(item)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-[#FFB103] border border-gray-200 hover:border-[#FFB103] transition-colors"
                            title="Modifier">
                            <Edit size={15} />
                        </button>
                        <button onClick={() => onDelete(item.id)}
                            className="p-1.5 rounded-lg text-red-400 hover:text-white hover:bg-red-500 border border-red-200 hover:border-red-500 transition-colors"
                            title="Supprimer">
                            <Trash2 size={15} />
                        </button>
                    </div>
                </td>
            </tr>

            <FileViewer
                isOpen={showFileViewer}
                onClose={() => setShowFileViewer(false)}
                fileUrl={getFileUrl(item.file_path, API_BASE)}
                fileName={item.file_name || item.material}
                fileType={item.file_type || 'image'}
            />

            {/* Price History Modal */}
            {showPriceHistory && (
                <tr>
                    <td colSpan={7} className="p-0">
                        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowPriceHistory(false)}>
                            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h3 className="font-semibold text-gray-900 text-sm">{item.material}</h3>
                                        <p className="text-xs text-gray-400">Historique des prix</p>
                                    </div>
                                    <button onClick={() => setShowPriceHistory(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                                </div>
                                {loadingHistory ? (
                                    <div className="flex justify-center py-6">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#FFB103]" />
                                    </div>
                                ) : priceHistory.length === 0 ? (
                                    <div className="text-center py-6 text-gray-400 text-sm">
                                        <TrendingUp size={28} className="mx-auto mb-2 opacity-30" />
                                        <p>Aucun changement de prix enregistré</p>
                                        <p className="text-xs mt-1 text-gray-300">Prix actuel : {item.price ? `${parseFloat(item.price).toFixed(2)} €` : '—'}</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-60 overflow-y-auto">
                                        {priceHistory.map(h => (
                                            <div key={h.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                                                <div>
                                                    <p className="text-xs text-gray-500">{new Date(h.changed_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                                                    <p className="text-xs text-gray-400">{h.user_name}</p>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm font-medium">
                                                    <span className="text-gray-400 line-through text-xs">{parseFloat(h.old_price).toFixed(2)} €</span>
                                                    <span>→</span>
                                                    <span className={parseFloat(h.new_price) > parseFloat(h.old_price) ? 'text-red-600' : 'text-green-600'}>
                                                        {parseFloat(h.new_price).toFixed(2)} €
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
};

export default InventoryItemRow;
