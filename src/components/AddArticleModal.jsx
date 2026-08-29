import React, { useState } from 'react';
import { X, Upload, FileText, Trash2 } from 'lucide-react';

const AddArticleModal = ({ isOpen, onClose, onAdd }) => {
    const [formData, setFormData] = useState({
        material: '',
        supplier: 'Wurth',
        category: '',
        stock: '',
        threshold: '',
        price: '',
        conditionnement: 'unite'
    });
    const [selectedFile, setSelectedFile] = useState(null);
    const [filePreview, setFilePreview] = useState(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
            if (!allowedTypes.includes(file.type)) {
                alert('Type de fichier non supporté. Utilisez JPG, PNG, GIF, WEBP ou PDF.');
                return;
            }

            if (file.size > 5 * 1024 * 1024) {
                alert('Le fichier est trop volumineux (max 5MB)');
                return;
            }

            setSelectedFile(file);

            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setFilePreview({ type: 'image', url: reader.result });
                };
                reader.readAsDataURL(file);
            } else if (file.type === 'application/pdf') {
                setFilePreview({ type: 'pdf', name: file.name });
            }
        }
    };

    const handleRemoveFile = () => {
        setSelectedFile(null);
        setFilePreview(null);
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (formData.material && formData.supplier && formData.category && formData.stock && formData.threshold) {
            // On envoie JUSTE les données à App.jsx
            // C'est App.jsx qui va faire la requête API
            onAdd({
                material: formData.material,
                supplier: formData.supplier,
                category: formData.category,
                stock: parseInt(formData.stock),
                threshold: parseInt(formData.threshold),
                price: formData.price ? parseFloat(formData.price) : null,
                conditionnement: formData.conditionnement,
                file: selectedFile // On passe le fichier s'il existe
            });

            // Réinitialiser le formulaire
            setFormData({ material: '', supplier: 'Wurth', category: '', stock: '', threshold: '', price: '', conditionnement: 'unite' });
            setSelectedFile(null);
            setFilePreview(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4 md:mb-6">
                    <h3 className="text-lg md:text-xl font-semibold text-gray-800">Ajouter un Article</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nom du Matériel *</label>
                            <input
                                type="text"
                                value={formData.material}
                                onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Fournisseur *</label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { value: 'Wurth', logo: '/hello-gestion/logos/wurth.webp' },
                                    { value: 'Reca', logo: '/hello-gestion/logos/reca.jpeg' },
                                    { value: 'yess', logo: '/hello-gestion/logos/yess.png' },
                                    { value: 'trenois', logo: '/hello-gestion/logos/trenois.jpg' },
                                    { value: 'pointp', logo: '/hello-gestion/logos/pointp.png' },
                                    { value: 'boschat', logo: '/hello-gestion/logos/boschat.jpeg' },
                                    { value: 'berner', logo: '/hello-gestion/logos/berner.jpg' },
                                    { value: 'somfy', logo: '/hello-gestion/logos/somfy.png' }
                                ].map((supplier) => (
                                    <button
                                        key={supplier.value}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, supplier: supplier.value })}
                                        className={`p-3 border-2 rounded-lg transition-all flex items-center justify-center ${
                                            formData.supplier === supplier.value
                                                ? 'border-blue-500 bg-blue-50 scale-105'
                                                : 'border-gray-300 hover:border-gray-400'
                                        }`}
                                        title={supplier.value}
                                    >
                                        <img
                                            src={supplier.logo}
                                            alt={supplier.value}
                                            className="h-10 w-auto object-contain"
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie *</label>
                            <input
                                type="text"
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Ex: Visserie, Fixation, Plâtrerie..."
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Conditionnement *</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, conditionnement: 'carton' })}
                                    className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${formData.conditionnement === 'carton' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'}`}
                                >
                                    <span className="text-lg">📦</span> Carton
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, conditionnement: 'unite' })}
                                    className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${formData.conditionnement === 'unite' ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'}`}
                                >
                                    <span className="text-lg">🔩</span> À l'unité
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Stock Actuel *</label>
                            <input
                                type="number"
                                min="0"
                                value={formData.stock}
                                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Seuil Minimum *</label>
                            <input
                                type="number"
                                min="0"
                                value={formData.threshold}
                                onChange={(e) => setFormData({ ...formData, threshold: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Prix (€)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Prix optionnel"
                            />
                        </div>

                        {/* Section Upload de fichier */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Photo ou PDF
                            </label>
                            {!filePreview ? (
                                <label className="w-full flex flex-col items-center px-4 py-6 bg-gray-50 text-gray-600 rounded-lg border-2 border-gray-300 border-dashed cursor-pointer hover:bg-gray-100 transition-colors">
                                    <Upload size={32} className="mb-2" />
                                    <span className="text-sm">Cliquez pour ajouter une photo ou un PDF</span>
                                    <span className="text-xs text-gray-500 mt-1">JPG, PNG, GIF, WEBP ou PDF (max 5MB)</span>
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,application/pdf"
                                        onChange={handleFileChange}
                                    />
                                </label>
                            ) : (
                                <div className="border-2 border-gray-300 rounded-lg p-3">
                                    {filePreview.type === 'image' ? (
                                        <div className="relative">
                                            <img
                                                src={filePreview.url}
                                                alt="Aperçu"
                                                className="w-full h-32 object-cover rounded"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleRemoveFile}
                                                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <FileText size={24} className="text-red-500" />
                                                <span className="text-sm text-gray-700">{filePreview.name}</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleRemoveFile}
                                                className="p-1 text-red-500 hover:bg-red-50 rounded"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex space-x-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            Ajouter
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddArticleModal;