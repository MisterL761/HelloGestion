// Configuration API
export const API_BASE = import.meta.env.VITE_API_BASE || '/hello-gestion/php';

// Fournisseurs disponibles
export const SUPPLIERS = [
    { value: 'Wurth', logo: './logos/wurth.webp' },
    { value: 'Rekka', logo: './logos/reca.jpeg' },
    { value: 'yess', logo: './logos/yess.png' },
    { value: 'trenois', logo: './logos/trenois.jpg' },
    { value: 'pointp', logo: './logos/pointp.png' },
    { value: 'boschat', logo: './logos/boschat.jpeg' },
    { value: 'berner', logo: './logos/berner.png' }
];

// Mapping des onglets vers les sections de la sidebar
export const TAB_TO_SIDEBAR_MAPPING = {
    'received': 'produits-recus',
    'installed': 'produits-poses',
    'defective': 'produits-defectueux',
    'stock': 'inventaire',
    'tools': 'outils',
    'orders': 'commandes'
};

// Mapping inverse: sidebar vers onglets
export const SIDEBAR_TO_TAB_MAPPING = {
    'produits-recus': 'received',
    'produits-poses': 'installed',
    'produits-defectueux': 'defective',
    'inventaire': 'stock',
    'outils': 'tools',
    'commandes': 'orders'
};

// Champs de recherche par type de données
export const SEARCH_FIELDS = {
    productsReceived: ['product', 'supplier', 'client', 'date', 'status', 'id'],
    installedProducts: ['product', 'supplier', 'date', 'installedDate', 'id'],
    defectiveProducts: ['product', 'supplier', 'client', 'date', 'defectiveDate', 'id'],
    inventoryItems: ['material', 'supplier', 'category', 'status', 'id'],
    toolsItems: ['name', 'supplier', 'id']
};

// Types d'export disponibles
export const EXPORT_TYPES = {
    'produits-recus': 'produits_recus',
    'produits-poses': 'produits_poses',
    'produits-defectueux': 'produits_defectueux',
    'inventaire': 'inventaire'
};

// Extensions d'images supportées
export const IMAGE_EXTENSIONS = ['webp', 'jpeg', 'jpg', 'png', 'svg'];

// Taille minimale pour les boutons tactiles (accessibilité)
export const MIN_TOUCH_SIZE = { minWidth: "44px", minHeight: "44px" };
