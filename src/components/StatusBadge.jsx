import React from 'react';

const StatusBadge = ({ status }) => {
    const getStatusColor = (status) => {
        switch (status) {
            case 'Reçu':
            case 'Disponible':
                return 'bg-green-100 text-green-800';
            case 'En attente':
            case 'Faible Stock':
                return 'bg-yellow-100 text-yellow-800';
            case 'Rupture':
            case 'Défectueux':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <span className={`px-1.5 lg:px-2 xl:px-3 py-0.5 lg:py-1 inline-flex text-[10px] lg:text-xs xl:text-sm leading-4 lg:leading-5 font-semibold rounded-full ${getStatusColor(status)}`}>
            {status}
        </span>
    );
};

export default StatusBadge;
