import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { getFileUrl } from '../utils/utilities';

const PhotoViewer = ({ isOpen, onClose, photos, initialIndex = 0, apiBase }) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);

    useEffect(() => {
        setCurrentIndex(initialIndex);
    }, [isOpen, initialIndex, photos]);

    const goToNext = () => {
        setCurrentIndex((prev) => (prev + 1) % photos.length);
    };

    const goToPrevious = () => {
        setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
    };

    useEffect(() => {
        const handleKeyPress = (e) => {
            if (!isOpen) return;
            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    goToPrevious();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    goToNext();
                    break;
                case 'Escape':
                    e.preventDefault();
                    onClose();
                    break;
            }
        };
        document.addEventListener('keydown', handleKeyPress);
        return () => document.removeEventListener('keydown', handleKeyPress);
    }, [isOpen, currentIndex, photos.length, goToNext, goToPrevious, onClose]);

    const goToIndex = (index) => {
        setCurrentIndex(index);
    };

    const handleTouchStart = (e) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const handleTouchMove = (e) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const handleTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > 50;
        const isRightSwipe = distance < -50;
        if (isLeftSwipe && photos.length > 1) goToNext();
        if (isRightSwipe && photos.length > 1) goToPrevious();
    };

    if (!isOpen || !photos || photos.length === 0) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50">
            <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
                <div className="text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded">
                    {currentIndex + 1} / {photos.length}
                </div>
                <button onClick={onClose} className="text-white hover:text-gray-300 bg-black bg-opacity-50 p-2.5 rounded-full" style={{ minWidth: "44px", minHeight: "44px" }}>
                    <X size={24} />
                </button>
            </div>

            <div className="relative w-full h-full flex items-center justify-center">
                {photos.length > 1 && (
                    <button onClick={goToPrevious} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 bg-black bg-opacity-50 p-3 rounded-full hidden md:block z-10" style={{ marginLeft: '1rem' }}>
                        <ChevronLeft size={32} />
                    </button>
                )}

                <div className="max-w-full max-h-full p-4 md:p-16" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                    <img src={getFileUrl(photos[currentIndex], apiBase)} alt={`Photo ${currentIndex + 1}`} className="max-w-full max-h-[90vh] object-contain mx-auto" />
                </div>

                {photos.length > 1 && (
                    <button onClick={goToNext} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 bg-black bg-opacity-50 p-3 rounded-full hidden md:block z-10" style={{ marginRight: '1rem' }}>
                        <ChevronRight size={32} />
                    </button>
                )}
            </div>

            {photos.length > 1 && (
                <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-2 z-10 px-4 overflow-x-auto">
                    {photos.map((photo, index) => (
                        <button key={index} onClick={() => goToIndex(index)} className={`flex-shrink-0 h-16 w-16 overflow-hidden rounded border-2 transition-all ${index === currentIndex ? 'border-white' : 'border-gray-500 opacity-60 hover:opacity-100'}`}>
                            <img src={getFileUrl(photo, apiBase)} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PhotoViewer;