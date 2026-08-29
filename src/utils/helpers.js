/**
 * Formate une date pour l'API
 * @param {string|Date} date - Date à formater
 * @returns {string} Date au format YYYY-MM-DD
 */
export const formatDateForAPI = (date) => {
    // Si déjà au bon format YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return date;
    }

    // Si format DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
        return date.split('/').reverse().join('-');
    }

    // Essayer de parser la date
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) {
            throw new Error("Format de date invalide");
        }
        return d.toISOString().split('T')[0];
    } catch (e) {
        console.error("Erreur de conversion de date:", e);
        return new Date().toISOString().split('T')[0]; // Fallback à la date du jour
    }
};

/**
 * Nettoie le nom d'un fournisseur pour la recherche de logo
 * @param {string} name - Nom du fournisseur
 * @returns {string} Nom nettoyé
 */
export const getCleanSupplierName = (name) => {
    if (!name) return 'default';

    let cleaned = name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '')
        .replace('trenoisedecamps', 'trenois')
        .replace('trenoisdecamps', 'trenois')
        .replace('boschatlaveix', 'boschat');

    // Mapping spécial: rekka → reca (pour le nom de fichier)
    if (cleaned === 'rekka') {
        cleaned = 'reca';
    }

    return cleaned;
};

/**
 * Génère les tentatives de chargement de logo
 * @param {string} supplier - Nom du fournisseur
 * @param {Array<string>} extensions - Extensions à essayer
 * @returns {Array<string>} Liste des chemins à essayer
 */
export const generateLogoAttempts = (supplier, extensions = ['webp', 'jpeg', 'jpg', 'png', 'svg']) => {
    const cleanName = getCleanSupplierName(supplier);
    const attempts = [];

    // Ajouter les tentatives avec le nom nettoyé
    extensions.forEach(ext => {
        attempts.push(`${cleanName}.${ext}`);
    });

    // Ajouter les tentatives avec le nom original (sans accents)
    const originalClean = supplier.toLowerCase().replace(/\s+/g, '');
    extensions.slice(0, -1).forEach(ext => { // Sans SVG pour le nom original
        attempts.push(`${originalClean}.${ext}`);
    });

    return attempts;
};

/**
 * Crée un objet URL pour un fichier
 * @param {File} file - Fichier à convertir
 * @returns {string} URL de l'objet
 */
export const createFileURL = (file) => {
    return URL.createObjectURL(file);
};

/**
 * Révoque un objet URL
 * @param {string} url - URL à révoquer
 */
export const revokeFileURL = (url) => {
    URL.revokeObjectURL(url);
};

/**
 * Formate un nombre en devise
 * @param {number} value - Valeur à formater
 * @param {string} currency - Code de la devise (défaut: EUR)
 * @returns {string} Valeur formatée
 */
export const formatCurrency = (value, currency = 'EUR') => {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: currency
    }).format(value);
};

/**
 * Formate une date pour l'affichage
 * @param {string|Date} date - Date à formater
 * @returns {string} Date formatée (DD/MM/YYYY)
 */
export const formatDateForDisplay = (date) => {
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) {
            return date;
        }
        return d.toLocaleDateString('fr-FR');
    } catch (e) {
        return date;
    }
};

/**
 * Vérifie si un stock est bas
 * @param {number} quantity - Quantité actuelle
 * @param {number} minQuantity - Quantité minimale
 * @returns {boolean} True si le stock est bas
 */
export const isLowStock = (quantity, minQuantity) => {
    return parseInt(quantity) <= parseInt(minQuantity);
};

/**
 * Calcule le statut d'un stock
 * @param {number} quantity - Quantité actuelle
 * @param {number} minQuantity - Quantité minimale
 * @returns {string} Status: 'low', 'medium', 'good'
 */
export const getStockStatus = (quantity, minQuantity) => {
    const qty = parseInt(quantity) || 0;
    const min = parseInt(minQuantity) || 0;

    if (qty === 0) return 'empty';
    if (qty <= min) return 'low';
    if (qty <= min * 1.5) return 'medium';
    return 'good';
};

/**
 * Tronque un texte à une longueur maximale
 * @param {string} text - Texte à tronquer
 * @param {number} maxLength - Longueur maximale
 * @returns {string} Texte tronqué
 */
export const truncateText = (text, maxLength = 50) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
};

/**
 * Valide un email
 * @param {string} email - Email à valider
 * @returns {boolean} True si l'email est valide
 */
export const isValidEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
};

/**
 * Génère un ID unique
 * @returns {string} ID unique
 */
export const generateUniqueId = () => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Debounce une fonction
 * @param {Function} func - Fonction à debouncer
 * @param {number} wait - Temps d'attente en ms
 * @returns {Function} Fonction debouncée
 */
export const debounce = (func, wait = 300) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};
