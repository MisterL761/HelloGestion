import React from 'react';
import Skeleton from './Skeleton';

const LoadingSpinner = ({ message = "Chargement des données..." }) => {
    return (
        <div className="space-y-3 p-2">
            <Skeleton.Table rows={7} cols={['w-2/5', 'w-1/5', 'w-1/5', 'w-1/8']} />
        </div>
    );
};

export default LoadingSpinner;
