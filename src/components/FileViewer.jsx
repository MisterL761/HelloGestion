import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { X, Download, AlertCircle } from 'lucide-react';

const FileViewer = ({ isOpen, onClose, fileUrl, fileName, fileType }) => {
    const [imgError, setImgError] = useState(false);

    // Reset erreur quand on change de fichier
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { setImgError(false); }, [fileUrl]);

    // Fermer avec Escape
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = fileName || 'fichier';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const modal = (
        <div
            className="fixed inset-0 bg-black/75 flex items-center justify-center z-[9999] p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                style={{ width: '90vw', maxWidth: '1100px', maxHeight: '90vh' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
                    <h3 className="text-sm font-semibold text-gray-800 truncate flex-1 mr-4">
                        {fileName || 'Fichier'}
                    </h3>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={handleDownload}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Télécharger"
                        >
                            <Download size={18} />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Fermer"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Contenu */}
                <div className="flex-1 overflow-auto bg-gray-50 flex items-center justify-center p-4 min-h-0">
                    {fileType === 'image' && !imgError && (
                        <img
                            src={fileUrl}
                            alt={fileName}
                            className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-md"
                            onError={() => setImgError(true)}
                        />
                    )}
                    {fileType === 'image' && imgError && (
                        <div className="text-center">
                            <AlertCircle size={36} className="mx-auto mb-3 text-red-400" />
                            <p className="text-red-500 text-sm font-semibold mb-1">Image introuvable sur le serveur</p>
                            <p className="text-gray-400 text-xs mb-4 break-all max-w-sm">{fileUrl}</p>
                            <button onClick={handleDownload} className="px-4 py-2 bg-[#FFB103] text-[#1a1a1a] rounded-xl text-sm font-medium">
                                Télécharger quand même
                            </button>
                        </div>
                    )}
                    {fileType === 'pdf' && (
                        <iframe
                            src={fileUrl}
                            className="w-full rounded-xl shadow-md"
                            style={{ height: '75vh' }}
                            title={fileName}
                        />
                    )}
                    {fileType !== 'image' && fileType !== 'pdf' && (
                        <div className="text-center">
                            <AlertCircle size={36} className="mx-auto mb-3 text-gray-400" />
                            <p className="text-gray-500 text-sm mb-4">Type de fichier non supporté pour l'aperçu</p>
                            <button onClick={handleDownload} className="px-4 py-2 bg-[#FFB103] text-[#1a1a1a] rounded-xl hover:bg-[#d49400] text-sm font-medium">
                                Télécharger le fichier
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return ReactDOM.createPortal(modal, document.body);
};

export default FileViewer;
