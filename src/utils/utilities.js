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

    // Base du site (/hello-gestion/ en prod, / sur le site dev) : les chemins
    // enregistrés en BDD avec /hello-gestion/ sont ramenés à cette base.
    const base = import.meta.env.BASE_URL;

    // Chemin absolu de prod, en corrigeant un éventuel double chemin corrompu
    if (path.startsWith('/hello-gestion/')) {
        return base + path
            .slice('/hello-gestion/'.length)
            .replace(/^php\/hello-stock\/php\//, 'php/');
    }

    // Ancien préfixe /hello-stock/ → base du site
    if (path.startsWith('/hello-stock/')) return base + path.slice('/hello-stock/'.length);

    // Ancien format sans slash (ex: stock/php/uploads/... ou hello-stock/php/uploads/...) → base du site
    if (path.startsWith('stock/')) return base + path.slice('stock/'.length);
    if (path.startsWith('hello-stock/php/')) return base + path.slice('hello-stock/php/'.length);

    // Chemin relatif (ex: uploads/img.jpg) → combiner avec la base API
    const cleanBase = apiBase
        ? apiBase.replace(/^https?:\/\/[^/]+/, '').replace(/\/$/, '')
        : base + 'php';
    const cleanPath = path.replace(/^\//, '');
    return `${cleanBase}/${cleanPath}`;
};
