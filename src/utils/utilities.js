export const filterBySearch = (items, searchTerm, fields) => {
    if (!searchTerm) return items;
    const lowerSearch = searchTerm.toLowerCase();
    return items.filter(item => {
        return fields.some(field => {
            const value = item[field];
            if (value === null || value === undefined) return false;
            return value.toString().toLowerCase().includes(lowerSearch);
        });
    });
};

export const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => {
            const val = row[header];
            return typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val;
        }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

export const getFileUrl = (path, apiBase) => {
    if (!path) return '';

    // Image base64 stockée en BDD → utiliser directement
    if (path.startsWith('data:')) return path;

    // URL absolue HTTP/HTTPS → utiliser telle quelle
    if (path.startsWith('http://') || path.startsWith('https://')) return path;

    // Chemin absolu déjà correct, mais vérifier double chemin corrompu
    if (path.startsWith('/hello-gestion/')) {
        return path.replace(/\/hello-gestion\/php\/hello-stock\/php\//g, '/hello-gestion/php/');
    }

    // Ancien préfixe /hello-stock/ → /hello-gestion/
    if (path.startsWith('/hello-stock/')) return path.replace('/hello-stock/', '/hello-gestion/');

    // Ancien format sans slash (ex: stock/php/uploads/... ou hello-stock/php/uploads/...) → /hello-gestion/php/uploads/...
    if (path.startsWith('stock/')) return '/hello-gestion/' + path.slice('stock/'.length);
    if (path.startsWith('hello-stock/php/')) return '/hello-gestion/' + path.slice('hello-stock/php/'.length);

    // Chemin relatif (ex: uploads/img.jpg) → combiner avec la base API
    const cleanBase = apiBase
        ? apiBase.replace(/^https?:\/\/[^/]+/, '').replace(/\/$/, '')
        : '/hello-gestion/php';
    const cleanPath = path.replace(/^\//, '');
    return `${cleanBase}/${cleanPath}`;
};
