import { useState, useEffect, useCallback } from 'react';

export const useDataFetching = (API_BASE, isAuthenticated) => {
    const [productsReceived, setProductsReceived] = useState([]);
    const [installedProducts, setInstalledProducts] = useState([]);
    const [defectiveProducts, setDefectiveProducts] = useState([]);
    const [inventoryItems, setInventoryItems] = useState([]);
    const [toolsItems, setToolsItems] = useState([]);
    const [stats, setStats] = useState({
        total: 0,
        available: 0,
        lowStock: 0,
        outOfStock: 0
    });
    const [loading, setLoading] = useState(false);

    const refetch = useCallback(async () => {
        if (!isAuthenticated) return;
        setLoading(true);
        try {
            const [receivedRes, installedRes, defectiveRes, inventoryRes, toolsRes, statsRes] = await Promise.all([
                fetch(`${API_BASE}/received.php`, { credentials: 'include' }),
                fetch(`${API_BASE}/installed.php`, { credentials: 'include' }),
                fetch(`${API_BASE}/defective.php`, { credentials: 'include' }),
                fetch(`${API_BASE}/inventory.php`, { credentials: 'include' }),
                fetch(`${API_BASE}/tools_api.php`, { credentials: 'include' }),
                fetch(`${API_BASE}/stats.php`, { credentials: 'include' })
            ]);

            // Détection 401 → session expirée
            if ([receivedRes, installedRes, defectiveRes, inventoryRes, toolsRes, statsRes]
                .some(r => r.status === 401)) {
                window.dispatchEvent(new CustomEvent('session-expired'));
                return;
            }

            const [received, installed, defective, inventory, tools, statistics] = await Promise.all([
                receivedRes.json(),
                installedRes.json(),
                defectiveRes.json(),
                inventoryRes.json(),
                toolsRes.json(),
                statsRes.json()
            ]);

            setProductsReceived(Array.isArray(received) ? received : []);
            setInstalledProducts(Array.isArray(installed) ? installed : []);
            setDefectiveProducts(Array.isArray(defective) ? defective : []);
            setInventoryItems(Array.isArray(inventory) ? inventory : []);
            setToolsItems(Array.isArray(tools) ? tools : []);

            if (statistics && !statistics.error) {
                setStats({
                    total: statistics.total_items ?? statistics.total ?? 0,
                    available: statistics.available_items ?? statistics.available ?? 0,
                    lowStock: statistics.low_stock_items ?? statistics.lowStock ?? 0,
                    outOfStock: statistics.out_of_stock_items ?? statistics.outOfStock ?? 0
                });
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    }, [API_BASE, isAuthenticated]);

    useEffect(() => {
        if (isAuthenticated) {
            refetch();
        }
    }, [isAuthenticated, refetch]);

    const addInventoryItem = useCallback((newItem) => {
        setInventoryItems(prev => {
            const updated = [...prev, newItem].sort((a, b) => a.material.localeCompare(b.material, 'fr'));
            const total = updated.length;
            const available = updated.filter(i => i.status === 'Disponible').length;
            const lowStock = updated.filter(i => i.status?.includes('Faible')).length;
            const outOfStock = updated.filter(i => i.status?.includes('Rupture')).length;
            setStats({ total, available, lowStock, outOfStock });
            return updated;
        });
    }, []);

    const removeInventoryItem = useCallback((id) => {
        setInventoryItems(prev => {
            const updated = prev.filter(item => String(item.id) !== String(id));
            const total = updated.length;
            const available = updated.filter(i => i.status === 'Disponible').length;
            const lowStock = updated.filter(i => i.status?.includes('Faible')).length;
            const outOfStock = updated.filter(i => i.status?.includes('Rupture')).length;
            setStats({ total, available, lowStock, outOfStock });
            return updated;
        });
    }, []);

    const updateInventoryItem = useCallback((id, updates) => {
        setInventoryItems(prev => {
            const updated = prev.map(item => {
                if (String(item.id) !== String(id)) return item;
                const stock = Number(updates.stock ?? item.stock);
                const threshold = Number(updates.threshold ?? item.threshold);
                let status;
                if (stock === 0) status = 'Rupture';
                else if (stock < threshold) status = 'Faible Stock';
                else status = 'Disponible';
                return { ...item, ...updates, stock, threshold, status };
            });
            const total = updated.length;
            const available = updated.filter(i => i.status === 'Disponible').length;
            const lowStock = updated.filter(i => i.status?.includes('Faible')).length;
            const outOfStock = updated.filter(i => i.status?.includes('Rupture')).length;
            setStats({ total, available, lowStock, outOfStock });
            return updated;
        });
    }, []);

    const updateInventoryItemStock = useCallback((id, quantity) => {
        setInventoryItems(prev => {
            const updated = prev.map(item => {
                if (String(item.id) !== String(id)) return item;
                const stock = Number(quantity);
                const threshold = Number(item.threshold);
                let status;
                if (stock === 0) status = 'Rupture';
                else if (stock < threshold) status = 'Faible Stock';
                else status = 'Disponible';
                return { ...item, stock, status };
            });
            const total = updated.length;
            const available = updated.filter(i => i.status === 'Disponible').length;
            const lowStock = updated.filter(i => i.status?.includes('Faible')).length;
            const outOfStock = updated.filter(i => i.status?.includes('Rupture')).length;
            setStats({ total, available, lowStock, outOfStock });
            return updated;
        });
    }, []);

    return {
        productsReceived,
        installedProducts,
        defectiveProducts,
        inventoryItems,
        toolsItems,
        stats,
        loading,
        refetch,
        updateInventoryItemStock,
        updateInventoryItem,
        addInventoryItem,
        removeInventoryItem
    };
};
