import React, { useState } from 'react';

const SupplierLogo = ({ supplier, className = "h-8 w-auto object-contain" }) => {
    const [currentAttempt, setCurrentAttempt] = useState(0);
    const [hasError, setHasError] = useState(false);

    const getCleanName = (name) => {
        if (!name) return 'default';

        let cleaned = name
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '')
            .replace('trenoisedecamps', 'trenois')
            .replace('trenoisdecamps', 'trenois')
            .replace('boschatlaveix', 'boschat')
            .replace('rekka', 'reca')
            .replace('réca', 'reca');

        return cleaned;
    };

    const cleanName = getCleanName(supplier);
    const attempts = [
        `${cleanName}.webp`,
        `${cleanName}.jpeg`,
        `${cleanName}.jpg`,
        `${cleanName}.png`,
        `${cleanName}.svg`,
        `${supplier.toLowerCase().replace(/\s+/g, '')}.webp`,
        `${supplier.toLowerCase().replace(/\s+/g, '')}.jpeg`,
        `${supplier.toLowerCase().replace(/\s+/g, '')}.jpg`,
        `${supplier.toLowerCase().replace(/\s+/g, '')}.png`
    ];

    const currentSrc = `./logos/${attempts[currentAttempt]}`;

    const handleError = () => {
        if (currentAttempt < attempts.length - 1) {
            setCurrentAttempt(currentAttempt + 1);
        } else {
            setHasError(true);
        }
    };

    if (hasError) {
        return <span className="text-xs font-medium text-gray-600">{supplier}</span>;
    }

    return (
        <img
            src={currentSrc}
            alt={supplier}
            title={supplier}
            className={className}
            onError={handleError}
        />
    );
};

export default SupplierLogo;