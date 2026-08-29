import React, { useState, useEffect } from 'react';
import { X, Plus, Loader } from 'lucide-react';
import { compressImage } from '../utils/compressImage';

const API_BASE = import.meta.env.VITE_API_BASE || '/hello-gestion/php';

const formatDateForAPI = (date) => {
    if (!date) return new Date().toISOString().split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) return date.split('/').reverse().join('-');
    try {
        return new Date(date).toISOString().split('T')[0];
    } catch {
        return new Date().toISOString().split('T')[0];
    }
};

const EditProductModal = ({ isOpen, onClose, product, onSave }) => {
    const [formData, setFormData] = useState({
        client: '',
        date: '',
        newPhotos: []
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [processingImages, setProcessingImages] = useState(false);

    useEffect(() => {
        if (product) {
            setFormData({
                client: product.client || '',
                date: product.date ? formatDateForAPI(product.date) : new Date().toISOString().split('T')[0],
                newPhotos: []
            });
        }
    }, [product]);

    const handlePhotoChange = async (e) => {
        setProcessingImages(true);
        const files = Array.from(e.target.files);
        const compressedFiles = await Promise.all(files.map(file => compressImage(file)));
        setFormData(prev => ({ ...prev, newPhotos: [...prev.newPhotos, ...compressedFiles] }));
        setProcessingImages(false);
    };

    const removeNewPhoto = (index) => {
        const newPhotos = formData.newPhotos.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, newPhotos }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.client || isSubmitting) return;

        setIsSubmitting(true);
        const apiDate = formatDateForAPI(formData.date);

        try {
            if (formData.newPhotos.length > 0) {
                const formDataToSend = new FormData();
                formDataToSend.append('id', product.id);
                formDataToSend.append('client', formData.client);
                formDataToSend.append('date', apiDate);
                formDataToSend.append('action', 'update_with_photos');

                // Ajouter les nouvelles photos
                formDataToSend.append('photo', formData.newPhotos[0]);
                if (formData.newPhotos.length > 1) {
                    for (let i = 1; i < formData.newPhotos.length; i++) {
                        formDataToSend.append('additional_photos[]', formData.newPhotos[i]);
                    }
                }

                const response = await fetch(`${API_BASE}/received.php`, {
                    method: 'POST',
                    body: formDataToSend,
                    credentials: 'include'
                });

                const data = await response.json();
                if (data.success) {
                    onSave({
                        id: product.id,
                        client: formData.client,
                        date: apiDate,
                        product: product.product,
                        supplier: product.supplier,
                        status: product.status,
                        photos_paths: data.photos_paths || []
                    });
                } else {
                    alert(`Erreur: ${data.message || "Échec de la modification"}`);
                }
            } else {
                onSave({
                    id: product.id,
                    client: formData.client,
                    date: apiDate,
                    product: product.product || 'Commande',
                    supplier: product.supplier || 'Dépôt'
                });
            }
        } catch (err) {
            alert(`Erreur lors de la modification: ${err.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen || !product) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4 md:mb-6">
                    <h3 className="text-lg md:text-xl font-semibold text-gray-800">Modifier la Réception</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
                            <input
                                type="text"
                                value={formData.client}
                                onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Nom du client"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                            <input
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Photos existantes */}
                        {product.photos_paths && product.photos_paths.length > 0 && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Photos actuelles</label>
                                <div className="grid grid-cols-3 gap-2.5 mb-3" style={{ minWidth: "44px", minHeight: "44px" }}>
                                    {product.photos_paths.slice(0, 6).map((photo, index) => (
                                        <img
                                            key={index}
                                            src={`${API_BASE}/${photo}`}
                                            alt={`Photo ${index + 1}`}
                                            className="w-full h-16 object-cover rounded border cursor-pointer hover:scale-105 transition-transform"
                                            onClick={() => window.open(`${API_BASE}/${photo}`, '_blank')}
                                        />
                                    ))}
                                    {product.photos_paths.length > 6 && (
                                        <div className="w-full h-16 bg-gray-100 rounded border flex items-center justify-center text-xs text-gray-500">
                                            +{product.photos_paths.length - 6}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ajouter de nouvelles photos</label>
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handlePhotoChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            {processingImages && <p className="text-xs text-blue-600 mt-1">Traitement des images...</p>}
                        </div>

                        {/* Prévisualisation des nouvelles photos */}x
                        {formData.newPhotos.length > 0 && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Nouvelles photos ({formData.newPhotos.length})</label>
                                <div className="grid grid-cols-2 gap-2.5 max-h-32 overflow-y-auto">
                                    {formData.newPhotos.map((photo, index) => (
                                        <div key={index} className="relative">
                                            <img
                                                src={URL.createObjectURL(photo)}
                                                alt={`Aperçu ${index + 1}`}
                                                className="w-full h-16 object-cover rounded border"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeNewPhoto(index)}
                                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="flex space-x-3 mt-6">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                            Annuler
                        </button>
                        <button type="submit" disabled={isSubmitting || processingImages} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex justify-center items-center">
                            {isSubmitting ? <Loader className="animate-spin h-5 w-5" /> : 'Enregistrer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditProductModal;