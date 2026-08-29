import React from 'react';

const SidebarBackdrop = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
            onClick={onClose}
        />
    );
};

export default SidebarBackdrop;