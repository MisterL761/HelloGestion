import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { FileText, Download, Calendar } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || '/hello-gestion/php';

const MonthlyReport = forwardRef(({ inventoryItems = [], onReportSaved }, ref) => {
    const [loading, setLoading] = useState(false);

    const generateReport = async () => {
        setLoading(true);
        try {
            let logoDataUrl = '';
            try {
                const logoRes = await fetch(import.meta.env.BASE_URL + 'logoHelloGestion.ico');
                const blob = await logoRes.blob();
                logoDataUrl = await new Promise(resolve => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(blob);
                });
            } catch { /* logo optionnel */ }

            const now = new Date();
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const monthNames = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
            const monthLabel = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;

            const isThisMonth = (dateStr) => {
                if (!dateStr) return false;
                return new Date(dateStr) >= monthStart;
            };

            const [movementsRes, installedRes, receivedRes, toolsRes] = await Promise.allSettled([
                fetch(`${API_BASE}/stock_history.php?limit=500`, { credentials: 'include' }).then(r => r.json()),
                fetch(`${API_BASE}/installed.php`, { credentials: 'include' }).then(r => r.json()),
                fetch(`${API_BASE}/received.php`, { credentials: 'include' }).then(r => r.json()),
                fetch(`${API_BASE}/tools_api.php`, { credentials: 'include' }).then(r => r.json()),
            ]);

            const allMovements  = (movementsRes.status  === 'fulfilled' && Array.isArray(movementsRes.value))  ? movementsRes.value  : [];
            const monthMovements = allMovements.filter(m => isThisMonth(m.moved_at));
            const allInstalled  = (installedRes.status  === 'fulfilled' && Array.isArray(installedRes.value))  ? installedRes.value  : [];
            const monthInstalled = allInstalled.filter(p => isThisMonth(p.installedDate) || isThisMonth(p.date));
            const allReceived   = (receivedRes.status   === 'fulfilled' && Array.isArray(receivedRes.value))   ? receivedRes.value   : [];
            const monthReceived  = allReceived.filter(p => isThisMonth(p.date));
            const rawTools = toolsRes.status === 'fulfilled' ? toolsRes.value : [];
            const allTools = Array.isArray(rawTools) ? rawTools : (rawTools?.data || []);

            const outOfStock = inventoryItems.filter(i => parseInt(i.stock) === 0);
            const lowStock   = inventoryItems.filter(i => parseInt(i.stock) > 0 && parseInt(i.stock) < parseInt(i.threshold));
            const totalValue = inventoryItems.reduce((sum, i) => sum + (parseFloat(i.price || 0) * parseInt(i.stock || 0)), 0);

            const consumedMap = {};
            monthMovements.filter(m => m.delta < 0).forEach(m => {
                if (!consumedMap[m.material]) consumedMap[m.material] = { material: m.material, supplier: m.supplier, total: 0 };
                consumedMap[m.material].total += Math.abs(parseInt(m.delta));
            });
            const topConsumed = Object.values(consumedMap).sort((a, b) => b.total - a.total).slice(0, 10);

            const restockedMap = {};
            monthMovements.filter(m => m.delta > 0).forEach(m => {
                if (!restockedMap[m.material]) restockedMap[m.material] = { material: m.material, supplier: m.supplier, total: 0 };
                restockedMap[m.material].total += parseInt(m.delta);
            });
            const topRestocked = Object.values(restockedMap).sort((a, b) => b.total - a.total).slice(0, 5);

            const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';

            const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Rapport mensuel — ${monthLabel}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; color: #1f2937; background: white; padding: 30px; font-size: 12px; line-height: 1.5; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; padding-bottom: 18px; border-bottom: 3px solid #FFB103; }
    .brand { font-size: 20px; font-weight: 900; color: #FFB103; }
    .brand span { display: block; font-size: 11px; font-weight: 400; color: #6b7280; margin-top: 2px; }
    .report-meta { text-align: right; font-size: 11px; color: #6b7280; }
    .report-meta strong { display: block; font-size: 15px; color: #111827; font-weight: 800; margin-bottom: 3px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 26px; }
    .kpi { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px 12px; text-align: center; }
    .kpi-value { font-size: 22px; font-weight: 900; color: #FFB103; }
    .kpi-label { font-size: 9px; color: #6b7280; margin-top: 3px; text-transform: uppercase; letter-spacing: 0.06em; }
    .kpi.red .kpi-value { color: #dc2626; }
    .kpi.yellow .kpi-value { color: #d97706; }
    .kpi.green .kpi-value { color: #16a34a; }
    .kpi.blue .kpi-value { color: #2563eb; }
    .section { margin-bottom: 22px; page-break-inside: avoid; }
    .section-title { font-size: 12px; font-weight: 800; color: #111827; padding: 7px 12px; background: #f3f4f6; border-left: 4px solid #FFB103; margin-bottom: 8px; border-radius: 0 6px 6px 0; display: flex; justify-content: space-between; align-items: center; }
    .section-title .count { font-size: 10px; font-weight: 600; color: #6b7280; background: white; border: 1px solid #e5e7eb; padding: 1px 8px; border-radius: 20px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { background: #f9fafb; padding: 7px 10px; text-align: left; font-weight: 700; color: #6b7280; font-size: 9px; text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 2px solid #e5e7eb; }
    td { padding: 7px 10px; border-bottom: 1px solid #f3f4f6; }
    tr:last-child td { border-bottom: none; }
    .badge { display: inline-block; padding: 1px 7px; border-radius: 20px; font-size: 9px; font-weight: 800; }
    .badge-red { background: #fee2e2; color: #991b1b; }
    .badge-yellow { background: #fef3c7; color: #92400e; }
    .badge-green { background: #d1fae5; color: #065f46; }
    .badge-blue { background: #dbeafe; color: #1d4ed8; }
    .empty { text-align: center; color: #9ca3af; font-style: italic; padding: 14px; font-size: 11px; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 22px; }
    .footer { margin-top: 28px; padding-top: 14px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 10px; color: #9ca3af; }
    @media print { body { padding: 12mm; } @page { margin: 8mm; size: A4; } .no-break { page-break-inside: avoid; } }
  </style>
</head>
<body>
  <div class="header">
    <div style="display:flex;align-items:center;gap:12px;">
      ${logoDataUrl ? `<img src="${logoDataUrl}" style="width:48px;height:48px;object-fit:contain;border-radius:8px;flex-shrink:0;" />` : ''}
      <div><div class="brand">Hello Gestion<span>Hello Fermetures</span></div></div>
    </div>
    <div class="report-meta">
      <strong>Rapport mensuel</strong>
      ${monthLabel} · Généré le ${fmtDate(now.toISOString())} à ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
    </div>
  </div>
  <div class="kpi-grid">
    <div class="kpi blue"><div class="kpi-value">${monthInstalled.length}</div><div class="kpi-label">Produits posés ce mois</div></div>
    <div class="kpi blue"><div class="kpi-value">${monthReceived.length}</div><div class="kpi-label">Produits reçus ce mois</div></div>
    <div class="kpi green"><div class="kpi-value">${totalValue.toFixed(0)} €</div><div class="kpi-label">Valeur stock consommables</div></div>
    <div class="kpi red"><div class="kpi-value">${outOfStock.length}</div><div class="kpi-label">Ruptures consommables</div></div>
  </div>
  <div class="section no-break">
    <div class="section-title">Produits posés ce mois <span class="count">${monthInstalled.length}</span></div>
    ${monthInstalled.length === 0 ? '<p class="empty">Aucun produit posé enregistré ce mois</p>' : `
    <table>
      <thead><tr><th>Produit</th><th>Fournisseur</th><th>Client</th><th>Date de pose</th><th>Statut</th></tr></thead>
      <tbody>
        ${monthInstalled.slice(0, 30).map(p => `<tr>
          <td>${p.product || p.material || '—'}</td>
          <td>${p.supplier || '—'}</td>
          <td>${p.client || '—'}</td>
          <td>${fmtDate(p.installedDate || p.date)}</td>
          <td><span class="badge badge-green">Posé</span></td>
        </tr>`).join('')}
        ${monthInstalled.length > 30 ? `<tr><td colspan="5" style="text-align:center;color:#9ca3af;font-style:italic;padding:10px">… et ${monthInstalled.length - 30} autres produits posés</td></tr>` : ''}
      </tbody>
    </table>`}
  </div>
  <div class="section no-break">
    <div class="section-title">Produits reçus ce mois <span class="count">${monthReceived.length}</span></div>
    ${monthReceived.length === 0 ? '<p class="empty">Aucun produit reçu enregistré ce mois</p>' : `
    <table>
      <thead><tr><th>Produit</th><th>Fournisseur</th><th>Client</th><th>Date réception</th><th>Statut</th></tr></thead>
      <tbody>
        ${monthReceived.slice(0, 30).map(p => `<tr>
          <td>${p.product || '—'}</td>
          <td>${p.supplier || '—'}</td>
          <td>${p.client || '—'}</td>
          <td>${fmtDate(p.date)}</td>
          <td><span class="badge badge-blue">${p.status || 'Reçu'}</span></td>
        </tr>`).join('')}
        ${monthReceived.length > 30 ? `<tr><td colspan="5" style="text-align:center;color:#9ca3af;font-style:italic;padding:10px">… et ${monthReceived.length - 30} autres produits reçus</td></tr>` : ''}
      </tbody>
    </table>`}
  </div>
  <div class="section no-break">
    <div class="section-title">Consommables — Top consommation ce mois <span class="count">${topConsumed.length} articles</span></div>
    ${topConsumed.length === 0 ? '<p class="empty">Aucune consommation enregistrée ce mois</p>' : `
    <table>
      <thead><tr><th>#</th><th>Article</th><th>Fournisseur</th><th>Qté consommée</th><th>Stock actuel</th></tr></thead>
      <tbody>
        ${topConsumed.map((c, i) => {
            const inv = inventoryItems.find(it => it.material === c.material);
            return `<tr>
              <td><strong>${i + 1}</strong></td>
              <td>${c.material}</td>
              <td>${c.supplier || '—'}</td>
              <td><strong style="color:#dc2626">−${c.total}</strong></td>
              <td>${inv ? inv.stock : '?'}</td>
            </tr>`;
        }).join('')}
      </tbody>
    </table>`}
  </div>
  ${topRestocked.length > 0 ? `
  <div class="section no-break">
    <div class="section-title">Consommables — Réapprovisionnements ce mois <span class="count">${topRestocked.length} articles</span></div>
    <table>
      <thead><tr><th>Article</th><th>Fournisseur</th><th>Qté ajoutée</th></tr></thead>
      <tbody>
        ${topRestocked.map(c => `<tr>
          <td>${c.material}</td>
          <td>${c.supplier || '—'}</td>
          <td><strong style="color:#16a34a">+${c.total}</strong></td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>` : ''}
  <div class="two-col no-break">
    <div>
      <div class="section-title" style="margin-bottom:8px">Ruptures de stock <span class="count">${outOfStock.length}</span></div>
      ${outOfStock.length === 0 ? '<p class="empty">Aucune rupture ✓</p>' : `
      <table>
        <thead><tr><th>Article</th><th>Fournisseur</th><th>Seuil</th></tr></thead>
        <tbody>
          ${outOfStock.slice(0, 10).map(i => `<tr>
            <td>${i.material}</td>
            <td>${i.supplier || '—'}</td>
            <td>${i.threshold}</td>
          </tr>`).join('')}
          ${outOfStock.length > 10 ? `<tr><td colspan="3" class="empty">… et ${outOfStock.length - 10} autres</td></tr>` : ''}
        </tbody>
      </table>`}
    </div>
    <div>
      <div class="section-title" style="margin-bottom:8px">Stock faible <span class="count">${lowStock.length}</span></div>
      ${lowStock.length === 0 ? '<p class="empty">Aucun stock faible ✓</p>' : `
      <table>
        <thead><tr><th>Article</th><th>Stock</th><th>Seuil</th></tr></thead>
        <tbody>
          ${lowStock.slice(0, 10).map(i => `<tr>
            <td>${i.material}</td>
            <td><span class="badge badge-yellow">${i.stock}</span></td>
            <td>${i.threshold}</td>
          </tr>`).join('')}
          ${lowStock.length > 10 ? `<tr><td colspan="3" class="empty">… et ${lowStock.length - 10} autres</td></tr>` : ''}
        </tbody>
      </table>`}
    </div>
  </div>
  <div class="section no-break">
    <div class="section-title">Inventaire des outils <span class="count">${allTools.length} outils</span></div>
    ${allTools.length === 0 ? '<p class="empty">Aucun outil enregistré</p>' : `
    <table>
      <thead><tr><th>Outil</th><th>Fournisseur</th><th>Quantité</th></tr></thead>
      <tbody>
        ${allTools.slice(0, 30).map(t => `<tr>
          <td>${t.name || '—'}</td>
          <td>${t.supplier || '—'}</td>
          <td>${t.quantity ?? '—'}</td>
        </tr>`).join('')}
        ${allTools.length > 30 ? `<tr><td colspan="3" class="empty">… et ${allTools.length - 30} autres outils</td></tr>` : ''}
      </tbody>
    </table>`}
  </div>
  <div class="footer">
    Hello Gestion — Rapport généré automatiquement · ${fmtDate(now.toISOString())} · Confidentiel
  </div>
</body>
</html>`;

            // Impression via iframe (évite le blocage des popups)
            const iframe = document.createElement('iframe');
            iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;';
            document.body.appendChild(iframe);
            const iDoc = iframe.contentWindow.document;
            iDoc.open();
            iDoc.write(html);
            iDoc.close();
            setTimeout(() => {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
                setTimeout(() => document.body.removeChild(iframe), 2000);
            }, 600);

            // Auto-save en base
            try {
                const stats = {
                    monthInstalled:   monthInstalled.length,
                    monthReceived:    monthReceived.length,
                    outOfStock:       outOfStock.length,
                    lowStock:         lowStock.length,
                    totalValue:       Math.round(totalValue),
                    topConsumedCount: topConsumed.length,
                    toolsCount:       allTools.length,
                };
                await fetch(`${API_BASE}/reports.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        title: `Rapport mensuel — ${monthLabel}`,
                        type:  'monthly',
                        month: now.getMonth() + 1,
                        year:  now.getFullYear(),
                        stats,
                    }),
                });
                if (typeof onReportSaved === 'function') onReportSaved();
            } catch { /* non bloquant */ }
        } finally {
            setLoading(false);
        }
    };

    useImperativeHandle(ref, () => ({ generate: generateReport }));

    const now = new Date();
    const monthNames = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

    return (
        <div className="bg-gradient-to-br from-amber-50 to-white border border-amber-100 rounded-2xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FFB103] flex items-center justify-center flex-shrink-0">
                    <FileText size={18} className="text-white" />
                </div>
                <div>
                    <p className="font-semibold text-gray-900 text-sm">Rapport mensuel complet</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <Calendar size={11} />
                        {monthNames[now.getMonth()]} {now.getFullYear()} · Posé, Reçu, Consommables, Outils
                    </p>
                </div>
            </div>
            <button
                onClick={generateReport}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-[#FFB103] text-[#1a1a1a] rounded-xl text-sm font-semibold hover:bg-[#d49400] transition-colors disabled:opacity-50 flex-shrink-0"
            >
                {loading
                    ? <div className="w-4 h-4 border-2 border-[#1a1a1a]/30 border-t-[#1a1a1a] rounded-full animate-spin" />
                    : <Download size={15} />
                }
                {loading ? 'Génération…' : 'Générer PDF'}
            </button>
        </div>
    );
});

MonthlyReport.displayName = 'MonthlyReport';

export default MonthlyReport;
