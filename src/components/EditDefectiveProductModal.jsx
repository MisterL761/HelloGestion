import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { compressImage } from '../utils/compressImage';

const API_BASE = import.meta.env.VITE_API_BASE || '/hello-gestion/php';

const formatDateForAPI = (date) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return date;
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
        return date.split('/').reverse().join('-');
    }
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) {
            throw new Error("Format de date invalide");
        }
        return d.toISOString().split('T')[0];
    } catch (e) {
        console.error("Erreur de conversion de date:", e);
        return new Date().toISOString().split('T')[0];
    }
};

const EditDefectiveProductModal = ({ isOpen, onClose, onEdit, product }) => {
    const [formData, setFormData] = useState({
        supplier: '',
        client: '',
        description: '',
        photos: [],
        date: new Date().toISOString().split('T')[0]
    });
    const [existingPhotos, setExistingPhotos] = useState([]);
    const [photosToDelete, setPhotosToDelete] = useState([]);

    useEffect(() => {
        if (product && isOpen) {
            console.log('📝 Produit à éditer:', product);

            // Convertir la date du format français (DD/MM/YYYY) au format ISO (YYYY-MM-DD)
            let formattedDate = new Date().toISOString().split('T')[0];
            if (product.date) {
                formattedDate = formatDateForAPI(product.date);
            }

            // eslint-disable-next-line react-hooks/set-state-in-effect
            setFormData({
                supplier: product.supplier || '',
                client: product.client || '',
                description: product.description || '',
                photos: [],
                date: formattedDate
            });

            // Gérer les photos existantes
            if (product.photos_paths && product.photos_paths.length > 0) {
                setExistingPhotos(product.photos_paths);
            } else if (product.photo_path) {
                setExistingPhotos([product.photo_path]);
            } else {
                setExistingPhotos([]);
            }
            setPhotosToDelete([]);
        }
    }, [product, isOpen]);

    const handlePhotoChange = (e) => {
        const files = Array.from(e.target.files);
        setFormData({ ...formData, photos: [...formData.photos, ...files] });
    };

    const removeNewPhoto = (index) => {
        const newPhotos = formData.photos.filter((_, i) => i !== index);
        setFormData({ ...formData, photos: newPhotos });
    };

    const removeExistingPhoto = (photoPath) => {
        setExistingPhotos(existingPhotos.filter(p => p !== photoPath));
        setPhotosToDelete([...photosToDelete, photoPath]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log('🔍 Modification du produit:', product);

        if (!product || !product.id) {
            alert('Erreur: ID du produit manquant');
            console.error('❌ Produit ou ID manquant:', product);
            return;
        }

        if (!formData.client || !formData.supplier) {
            alert('Veuillez remplir les champs obligatoires (Client et Fournisseur)');
            return;
        }

        const apiDate = formatDateForAPI(formData.date);

        try {
            const formDataToSend = new FormData();
            formDataToSend.append('id', product.id);
            formDataToSend.append('supplier', formData.supplier);
            formDataToSend.append('client', formData.client);
            formDataToSend.append('description', formData.description);
            formDataToSend.append('date', apiDate);
            formDataToSend.append('action', 'edit_defective');

            // Ajouter les photos à supprimer
            if (photosToDelete.length > 0) {
                formDataToSend.append('photos_to_delete', JSON.stringify(photosToDelete));
            }

            // Ajouter les nouvelles photos (compressées)
            if (formData.photos.length > 0) {
                const compressed = await Promise.all(formData.photos.map(f => compressImage(f)));
                compressed.forEach(photo => formDataToSend.append('new_photos[]', photo));
            }

            console.log('🚀 Envoi de la requête de modification pour ID:', product.id);

            const response = await fetch(`${API_BASE}/defective.php`, {
                method: 'POST',
                body: formDataToSend,
                credentials: 'include'
            });

            const data = await response.json();
            console.log('📦 Réponse:', data);

            if (data.success) {
                console.log('✅ Modification réussie !');
                onEdit({
                    ...product,
                    supplier: formData.supplier,
                    client: formData.client,
                    description: formData.description,
                    date: new Date(apiDate).toLocaleDateString('fr-FR'),
                    photo_path: data.photo_path || existingPhotos[0] || null,
                    photos_paths: data.photos_paths || existingPhotos
                });
                onClose();
            } else {
                alert(`Erreur du serveur: ${data.message || 'Erreur inconnue'}`);
            }
        } catch (err) {
            console.error('❌ Erreur:', err);
            alert(`Erreur lors de la modification: ${err.message}`);
        }
    };

    if (!isOpen || !product) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4 md:mb-6">
                    <h3 className="text-lg md:text-xl font-semibold text-gray-800">Modifier le Produit Défectueux</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Fournisseur *</label>
                            <input
                                type="text"
                                value={formData.supplier}
                                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Nom du fournisseur"
                                required
                            />
                        </div>

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
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Description du problème"
                                rows="3"
                            />
                        </div>

                        {/* Photos existantes */}
                        {existingPhotos.length > 0 && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Photos actuelles</label>
                                <div className="grid grid-cols-2 gap-2.5">
                                    {existingPhotos.map((photo, index) => {
                                        const isPDF = photo.toLowerCase().endsWith('.pdf');
                                        return (
                                            <div key={index} className="relative">
                                                {isPDF ? (
                                                    <div className="w-full h-16 bg-red-100 rounded border border-red-300 flex items-center justify-center">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                        </svg>
                                                    </div>
                                                ) : (
                                                    <img
                                                        src={`${API_BASE}/${photo}`}
                                                        alt={`Photo ${index + 1}`}
                                                        className="w-full h-16 object-cover rounded border"
                                                    />
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => removeExistingPhoto(photo)}
                                                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                                                    title="Supprimer cette photo"
                                                >

                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ajouter des photos/documents</label>
                            <input
                                type="file"
                                accept="image/*,application/pdf"
                                multiple
                                onChange={handlePhotoChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">Vous pouvez ajouter plusieurs photos ou documents PDF</p>
                        </div>

                        {/* Nouvelles photos à ajouter */}
                        {formData.photos.length > 0 && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Nouvelles photos ({formData.photos.length})</label>
                                <div className="grid grid-cols-2 gap-2.5 max-h-32 overflow-y-auto">
                                    {formData.photos.map((file, index) => {
                                        const isPDF = file.type === 'application/pdf';
                                        return (
                                            <div key={index} className="relative">
                                                {isPDF ? (
                                                    <div className="w-full h-16 bg-green-100 rounded border border-green-300 flex items-center justify-center">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                        </svg>
                                                    </div>
                                                ) : (
                                                    <img
                                                        src={URL.createObjectURL(file)}
                                                        alt={`Nouvelle ${index + 1}`}
                                                        className="w-full h-16 object-cover rounded border border-green-300"
                                                    />
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => removeNewPhoto(index)}
                                                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                                                >
                                                    ×
                                                </button>
                                                <p className="text-xs text-gray-500 mt-1 truncate" title={file.name}>
                                                    {isPDF && '📄 '}{file.name}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date de Réception</label>
                            <input
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                    <div className="flex space-x-3 mt-6">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                            Annuler
                        </button>
                        <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            Enregistrer
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditDefectiveProductModal;