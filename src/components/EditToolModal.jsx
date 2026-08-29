import React, { useState, useEffect, useRef } from 'react';
import { X, ImagePlus, Trash2 } from 'lucide-react';
import { compressImage } from '../utils/compressImage';

const EditToolModal = ({ isOpen, onClose, tool, onSave }) => {
    const [formData, setFormData] = useState({ name: '', supplier: '', quantity: '' });
    const [photoFile,    setPhotoFile]    = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [removePhoto,  setRemovePhoto]  = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (tool) {
            setFormData({ name: tool.name || '', supplier: tool.supplier || '', quantity: tool.quantity || '' });
            setPhotoFile(null);
            setPhotoPreview(null);
            setRemovePhoto(false);
        }
    }, [tool]);

    const handlePhotoChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const compressed = await compressImage(file);
        setPhotoFile(compressed);
        if (photoPreview && !tool?.photo) URL.revokeObjectURL(photoPreview);
        setPhotoPreview(URL.createObjectURL(compressed));
        setRemovePhoto(false);
    };

    const handleRemovePhoto = () => {
        setPhotoFile(null);
        if (photoPreview && !tool?.photo) URL.revokeObjectURL(photoPreview);
        setPhotoPreview(null);
        setRemovePhoto(true);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const currentPhoto = photoPreview || (!removePhoto ? tool?.photo : null);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.name || !formData.quantity) return;

        const fd = new FormData();
        fd.append('id',       tool.id);
        fd.append('name',     formData.name.trim());
        fd.append('supplier', formData.supplier.trim());
        fd.append('quantity', formData.quantity);
        if (photoFile)   fd.append('photo', photoFile);
        if (removePhoto) fd.append('remove_photo', '1');

        onSave(fd);
    };

    const handleClose = () => {
        if (photoPreview && !tool?.photo) URL.revokeObjectURL(photoPreview);
        onClose();
    };

    if (!isOpen || !tool) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold text-gray-800">Modifier l'Outil</h3>
                    <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">

                        {/* Photo */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Photo</label>
                            {currentPhoto ? (
                                <div className="relative w-full h-40 rounded-xl overflow-hidden bg-gray-100">
                                    <img src={currentPhoto} alt="Aperçu" className="w-full h-full object-cover" />
                                    <div className="absolute top-2 right-2 flex gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="w-7 h-7 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white transition-colors"
                                            title="Changer la photo"
                                        >
                                            <ImagePlus size={13} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleRemovePhoto}
                                            className="w-7 h-7 bg-red-500/80 hover:bg-red-600 rounded-full flex items-center justify-center text-white transition-colors"
                                            title="Supprimer la photo"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full h-28 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-[#FFB103] hover:text-[#FFB103] transition-colors"
                                >
                                    <ImagePlus size={24} />
                                    <span className="text-sm font-medium">Ajouter une photo</span>
                                </button>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handlePhotoChange}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'Outil *</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFB103]"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Fournisseur</label>
                            <input
                                type="text"
                                value={formData.supplier}
                                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFB103]"
                                placeholder="Nom du fournisseur"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Quantité *</label>
                            <input
                                type="number"
                                min="0"
                                value={formData.quantity}
                                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFB103]"
                                required
                            />
                        </div>
                    </div>

                    <div className="flex space-x-3 mt-6">
                        <button type="button" onClick={handleClose} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                            Annuler
                        </button>
                        <button type="submit" className="flex-1 px-4 py-2 bg-[#FFB103] hover:bg-[#d49400] text-[#1a1a1a] rounded-lg font-semibold">
                            Enregistrer
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditToolModal;
