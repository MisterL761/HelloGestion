import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ClipboardCheck, Plus, Search, Upload, Pencil, Trash2, X, CalendarCheck, CheckCircle2,
    RotateCcw, AlertTriangle, Truck, Receipt, FileSpreadsheet, ChevronDown, ChevronRight, BellRing,
} from 'lucide-react';
import { useToast, useConfirm } from './ToastProvider';
import {
    aujourdhui, fmtDate, fmtEuro, arrondi, dateLivraison, grouperCommandes, calculerBC, calculerFactures,
    lireClasseur, convertirClasseur, STATUTS, STATUTS_BC, STATUTS_PAIEMENT,
} from '../utils/suiviCommandes';

const API_BASE = import.meta.env.VITE_API_BASE || import.meta.env.BASE_URL + 'php';
const API = `${API_BASE}/suivi_commandes_api.php`;

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFB103] focus:border-transparent bg-white';
const labelCls = 'block text-xs font-semibold text-gray-600 mb-1';
const btnPrimaire = 'flex items-center gap-2 px-4 py-2 bg-[#FFB103] text-[#1a1a1a] rounded-xl text-sm font-bold hover:bg-[#d49400] transition-colors disabled:opacity-50';
const btnSecondaire = 'flex items-center gap-2 px-3 py-2 border border-gray-200 bg-white rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors';

const ONGLETS = [
    { id: 'commandes', label: 'Commandes en cours', icon: Truck },
    { id: 'termines', label: 'Chantiers terminés', icon: CheckCircle2 },
    { id: 'bc', label: 'BC & compta', icon: FileSpreadsheet },
    { id: 'factures', label: 'Factures', icon: Receipt },
];

/* =========================================================
   PETITS COMPOSANTS
========================================================= */

function Badge({ cls, children }) {
    return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-bold whitespace-nowrap ${cls}`}>{children}</span>;
}

function StatutCommande({ statut }) {
    if (!statut) return null;
    const s = STATUTS[statut] || { label: statut, cls: 'bg-gray-100 text-gray-700 border-gray-200' };
    return <Badge cls={s.cls}>{s.label}</Badge>;
}

function Compteur({ label, valeur, actif, onClick, couleur = 'text-gray-900' }) {
    return (
        <button type="button" onClick={onClick}
            className={`text-left bg-white rounded-xl border px-4 py-3 transition-all hover:shadow-sm ${actif ? 'border-[#FFB103] ring-2 ring-[#FFB103]/40' : 'border-gray-100'}`}>
            <div className={`text-2xl font-black ${couleur}`}>{valeur}</div>
            <div className="text-xs font-semibold text-gray-500 mt-0.5">{label}</div>
        </button>
    );
}

function Modale({ titre, onClose, children, large }) {
    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto" onMouseDown={e => e.target === e.currentTarget && onClose()}>
            <div className={`bg-white rounded-2xl shadow-xl w-full ${large ? 'max-w-3xl' : 'max-w-lg'} my-8`}>
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <h2 className="text-base font-bold text-gray-900">{titre}</h2>
                    <button type="button" onClick={onClose} aria-label="Fermer" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"><X size={18} /></button>
                </div>
                {children}
            </div>
        </div>
    );
}

function Champ({ label, children, className = '' }) {
    return <div className={className}><label className={labelCls}>{label}</label>{children}</div>;
}

const Select = ({ value, onChange, options, vide = '—' }) => (
    <select className={inputCls} value={value || ''} onChange={e => onChange(e.target.value)}>
        <option value="">{vide}</option>
        {[...new Set([...(value && !options.includes(value) ? [value] : []), ...options])].map(o => <option key={o} value={o}>{o}</option>)}
    </select>
);

/* =========================================================
   FORMULAIRES
========================================================= */

const LIGNE_VIDE = {
    num_commande: '', client: '', fournisseur: '', date_commande: '', date_arc: '', relance: '', etat: 'En cours',
    num_bc: '', montant_ht: '', montant_ttc: '', type_marchandise: '', motorisation: '', duree_pose: '', unite: 'Jour(s)',
    semaine_livraison: '', date_livraison_prevue: '', commentaire: '',
};

function LigneForm({ initial, parametres, onSave, onDelete, onClose }) {
    const [l, setL] = useState({ ...LIGNE_VIDE, ...initial });
    const set = (k, v) => setL(p => ({ ...p, [k]: v }));
    const types = String(l.type_marchandise || '').split('/').map(t => t.trim()).filter(Boolean);
    const basculerType = (t) => set('type_marchandise', (types.includes(t) ? types.filter(x => x !== t) : [...types, t]).join(' / '));
    const livraison = dateLivraison(l);

    return (
        <Modale titre={l.id ? 'Modifier la ligne fournisseur' : 'Nouvelle ligne fournisseur'} onClose={onClose} large>
            <form onSubmit={e => { e.preventDefault(); onSave(l); }} className="p-5 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Champ label="N° commande client *"><input className={inputCls} required value={l.num_commande} onChange={e => set('num_commande', e.target.value)} /></Champ>
                    <Champ label="Client" className="md:col-span-2"><input className={inputCls} value={l.client} onChange={e => set('client', e.target.value)} /></Champ>
                    <Champ label="Fournisseur *">
                        <input className={inputCls} required list="sc-fournisseurs" value={l.fournisseur} onChange={e => set('fournisseur', e.target.value)} />
                        <datalist id="sc-fournisseurs">{parametres.fournisseurs.map(f => <option key={f} value={f} />)}</datalist>
                    </Champ>
                    <Champ label="Date commande passée"><input type="date" className={inputCls} value={l.date_commande || ''} onChange={e => set('date_commande', e.target.value)} /></Champ>
                    <Champ label="État commande fournisseur"><Select value={l.etat} onChange={v => set('etat', v)} options={parametres.etats} /></Champ>
                </div>

                <div className="rounded-xl bg-gray-50 p-4 space-y-3">
                    <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">ARC / bon de commande fournisseur</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <Champ label="Date réception ARC"><input type="date" className={inputCls} value={l.date_arc || ''} onChange={e => set('date_arc', e.target.value)} /></Champ>
                        <Champ label="N° BC fournisseur"><input className={inputCls} value={l.num_bc} onChange={e => set('num_bc', e.target.value)} /></Champ>
                        <Champ label="Montant BC HT (€)">
                            <input type="number" step="0.01" className={inputCls} value={l.montant_ht ?? ''}
                                onChange={e => setL(p => ({ ...p, montant_ht: e.target.value, montant_ttc: e.target.value === '' ? '' : arrondi(+e.target.value * 1.2) }))} />
                        </Champ>
                        <Champ label="Montant BC TTC (€)"><input type="number" step="0.01" className={inputCls} value={l.montant_ttc ?? ''} onChange={e => set('montant_ttc', e.target.value)} /></Champ>
                    </div>
                    <Champ label="Relance fournisseur"><input className={inputCls} placeholder="ex. À RELANCER, relancé le 12/11…" value={l.relance} onChange={e => set('relance', e.target.value)} /></Champ>
                </div>

                <Champ label="Type de marchandise (plusieurs choix possibles)">
                    <div className="flex flex-wrap gap-1.5">
                        {[...new Set([...parametres.produits, ...types])].map(t => (
                            <button key={t} type="button" onClick={() => basculerType(t)}
                                className={`px-2.5 py-1 rounded-full border text-xs font-semibold ${types.includes(t) ? 'bg-[#FFB103] border-[#FFB103] text-[#1a1a1a]' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                                {t}
                            </button>
                        ))}
                    </div>
                </Champ>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Champ label="Motorisation"><Select value={l.motorisation} onChange={v => set('motorisation', v)} options={parametres.motorisation} /></Champ>
                    <Champ label="Durée de pose"><input type="number" step="0.5" min="0" className={inputCls} value={l.duree_pose ?? ''} onChange={e => set('duree_pose', e.target.value)} /></Champ>
                    <Champ label="Unité"><Select value={l.unite} onChange={v => set('unite', v)} options={parametres.unites} /></Champ>
                </div>

                <div className="rounded-xl bg-gray-50 p-4">
                    <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3">Livraison</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                        <Champ label="Semaine prévue (S45 ou S1/2027)"><input className={inputCls} placeholder="S45" value={l.semaine_livraison} onChange={e => set('semaine_livraison', e.target.value.toUpperCase())} /></Champ>
                        <Champ label="Ou date exacte (prioritaire)"><input type="date" className={inputCls} value={l.date_livraison_prevue || ''} onChange={e => set('date_livraison_prevue', e.target.value)} /></Champ>
                        <div className="text-sm pb-2">
                            <span className="text-gray-500">Livraison calculée : </span>
                            <strong className="text-gray-900">{livraison ? fmtDate(livraison) : '—'}</strong>
                        </div>
                    </div>
                </div>

                <Champ label="Commentaire">
                    <textarea className={inputCls + ' min-h-[70px]'} value={l.commentaire} onChange={e => set('commentaire', e.target.value)} />
                    <p className="text-[11px] text-gray-400 mt-1">Écrivez « Fourniture seule » si la commande ne demande pas de pose.</p>
                </Champ>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    {l.id ? <button type="button" onClick={() => onDelete(l)} className="flex items-center gap-1.5 text-sm font-semibold text-red-600 hover:text-red-700"><Trash2 size={15} /> Supprimer la ligne</button> : <span />}
                    <div className="flex gap-2">
                        <button type="button" onClick={onClose} className={btnSecondaire}>Annuler</button>
                        <button type="submit" className={btnPrimaire}>Enregistrer</button>
                    </div>
                </div>
            </form>
        </Modale>
    );
}

function PoseForm({ commande, onSave, onClose }) {
    const [date, setDate] = useState(commande.datePose || '');
    const premiere = commande.lignes.find(l => l.date_pose);
    const [statut, setStatut] = useState(premiere?.statut_pose === 'PRÉPLANIFIÉ' ? 'PRÉPLANIFIÉ' : 'PLANIFIÉ');
    const tropTot = date && commande.derniereLivraison && date < commande.derniereLivraison;

    return (
        <Modale titre={`Date de pose — ${commande.client || commande.num}`} onClose={onClose}>
            <div className="p-5 space-y-4">
                <p className="text-sm text-gray-600">La date s'applique aux {commande.lignes.length} ligne(s) de la commande {commande.num}.</p>
                <Champ label="Date de pose prévue"><input type="date" className={inputCls} value={date} onChange={e => setDate(e.target.value)} /></Champ>
                {commande.derniereLivraison && (
                    <p className={`text-xs ${tropTot ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                        {tropTot && <AlertTriangle size={13} className="inline mr-1" />}
                        Dernière livraison prévue : {fmtDate(commande.derniereLivraison)}
                    </p>
                )}
                <div className="grid grid-cols-2 gap-2">
                    {['PLANIFIÉ', 'PRÉPLANIFIÉ'].map(s => (
                        <button key={s} type="button" onClick={() => setStatut(s)}
                            className={`p-3 rounded-xl border text-left ${statut === s ? 'border-[#FFB103] bg-amber-50' : 'border-gray-200'}`}>
                            <div className="text-sm font-bold">{STATUTS[s].label}</div>
                            <div className="text-xs text-gray-500">{s === 'PLANIFIÉ' ? 'Date confirmée au client' : 'Date provisoire'}</div>
                        </button>
                    ))}
                </div>
                <div className="flex flex-wrap justify-between gap-2 pt-2">
                    {commande.datePose ? <button type="button" onClick={() => onSave('', '')} className="text-sm font-semibold text-red-600">Retirer la date</button> : <span />}
                    <div className="flex gap-2">
                        <button type="button" onClick={onClose} className={btnSecondaire}>Annuler</button>
                        <button type="button" disabled={!date} onClick={() => onSave(date, statut)} className={btnPrimaire}>Valider</button>
                    </div>
                </div>
            </div>
        </Modale>
    );
}

function BCForm({ initial, parametres, onSave, onDelete, onClose }) {
    const [b, setB] = useState({ client: '', num_bc: '', date_bc: '', fournisseur: '', montant_ht: '', montant_ttc: '', commentaire: '', ...initial });
    const set = (k, v) => setB(p => ({ ...p, [k]: v }));
    return (
        <Modale titre={b.id ? `BC ${b.num_bc}` : 'Nouveau BC'} onClose={onClose}>
            <form onSubmit={e => { e.preventDefault(); onSave(b); }} className="p-5 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                    <Champ label="N° BC *"><input className={inputCls} required value={b.num_bc} onChange={e => set('num_bc', e.target.value)} /></Champ>
                    <Champ label="Date BC"><input type="date" className={inputCls} value={b.date_bc || ''} onChange={e => set('date_bc', e.target.value)} /></Champ>
                    <Champ label="Client"><input className={inputCls} value={b.client} onChange={e => set('client', e.target.value)} /></Champ>
                    <Champ label="Fournisseur">
                        <input className={inputCls} list="sc-fournisseurs-bc" value={b.fournisseur} onChange={e => set('fournisseur', e.target.value)} />
                        <datalist id="sc-fournisseurs-bc">{parametres.fournisseurs.map(f => <option key={f} value={f} />)}</datalist>
                    </Champ>
                    <Champ label="Montant BC HT (€)">
                        <input type="number" step="0.01" className={inputCls} value={b.montant_ht ?? ''}
                            onChange={e => setB(p => ({ ...p, montant_ht: e.target.value, montant_ttc: e.target.value === '' ? '' : arrondi(+e.target.value * 1.2) }))} />
                    </Champ>
                    <Champ label="Montant BC TTC (€)"><input type="number" step="0.01" className={inputCls} value={b.montant_ttc ?? ''} onChange={e => set('montant_ttc', e.target.value)} /></Champ>
                </div>
                {initial.montantSuivi != null && arrondi(b.montant_ht) !== initial.montantSuivi && (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-orange-50 border border-orange-200 px-3 py-2 text-xs text-orange-800">
                        <span><AlertTriangle size={12} className="inline mr-1" />Le suivi des commandes indique {fmtEuro(initial.montantSuivi)} HT pour ce BC.</span>
                        <button type="button" className="font-bold underline"
                            onClick={() => setB(p => ({ ...p, montant_ht: initial.montantSuivi, montant_ttc: arrondi(initial.montantSuivi * 1.2) }))}>
                            Reprendre le montant du suivi
                        </button>
                    </div>
                )}
                <Champ label="Commentaire"><textarea className={inputCls} value={b.commentaire} onChange={e => set('commentaire', e.target.value)} /></Champ>
                <div className="flex justify-between gap-2 pt-2">
                    {b.id ? <button type="button" onClick={() => onDelete(b)} className="flex items-center gap-1.5 text-sm font-semibold text-red-600"><Trash2 size={15} /> Supprimer</button> : <span />}
                    <div className="flex gap-2">
                        <button type="button" onClick={onClose} className={btnSecondaire}>Annuler</button>
                        <button type="submit" className={btnPrimaire}>Enregistrer</button>
                    </div>
                </div>
            </form>
        </Modale>
    );
}

function FactureForm({ initial, bcs, onSave, onDelete, onClose }) {
    const [f, setF] = useState({ num_facture: '', num_bc: '', date_facture: '', montant_ht: '', montant_ttc: '', date_paiement: '', commentaire: '', ...initial });
    const set = (k, v) => setF(p => ({ ...p, [k]: v }));
    const bc = bcs.find(b => b.num_bc.trim().toLowerCase() === f.num_bc.trim().toLowerCase());
    return (
        <Modale titre={f.id ? `Facture ${f.num_facture}` : 'Nouvelle facture'} onClose={onClose}>
            <form onSubmit={e => { e.preventDefault(); onSave(f); }} className="p-5 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                    <Champ label="N° facture"><input className={inputCls} value={f.num_facture} onChange={e => set('num_facture', e.target.value)} /></Champ>
                    <Champ label="N° BC *">
                        <input className={inputCls} required list="sc-liste-bc" value={f.num_bc} onChange={e => set('num_bc', e.target.value)} />
                        <datalist id="sc-liste-bc">{bcs.map(b => <option key={b.id} value={b.num_bc}>{`${b.client} — ${b.fournisseur}`}</option>)}</datalist>
                    </Champ>
                </div>
                <div className={`rounded-lg px-3 py-2 text-xs ${bc ? 'bg-gray-50 text-gray-600' : f.num_bc ? 'bg-red-50 text-red-600' : 'hidden'}`}>
                    {bc ? <>{bc.client} · {bc.fournisseur} · BC {fmtEuro(bc.montant_ht)} HT, déjà facturé {fmtEuro(bc.factureHT)}</> : 'Ce n° de BC n\'existe pas dans l\'onglet BC & compta.'}
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <Champ label="Date facture"><input type="date" className={inputCls} value={f.date_facture || ''} onChange={e => set('date_facture', e.target.value)} /></Champ>
                    <Champ label="Date de paiement"><input type="date" className={inputCls} value={f.date_paiement || ''} onChange={e => set('date_paiement', e.target.value)} /></Champ>
                    <Champ label="Montant HT (€)">
                        <input type="number" step="0.01" className={inputCls} value={f.montant_ht ?? ''}
                            onChange={e => setF(p => ({ ...p, montant_ht: e.target.value, montant_ttc: e.target.value === '' ? '' : arrondi(+e.target.value * 1.2) }))} />
                    </Champ>
                    <Champ label="Montant TTC (€)"><input type="number" step="0.01" className={inputCls} value={f.montant_ttc ?? ''} onChange={e => set('montant_ttc', e.target.value)} /></Champ>
                </div>
                <Champ label="Commentaire"><textarea className={inputCls} value={f.commentaire} onChange={e => set('commentaire', e.target.value)} /></Champ>
                <div className="flex justify-between gap-2 pt-2">
                    {f.id ? <button type="button" onClick={() => onDelete(f)} className="flex items-center gap-1.5 text-sm font-semibold text-red-600"><Trash2 size={15} /> Supprimer</button> : <span />}
                    <div className="flex gap-2">
                        <button type="button" onClick={onClose} className={btnSecondaire}>Annuler</button>
                        <button type="submit" className={btnPrimaire}>Enregistrer</button>
                    </div>
                </div>
            </form>
        </Modale>
    );
}

/* =========================================================
   CARTE COMMANDE CLIENT
========================================================= */

function CarteCommande({ c, ouverte, onToggle, onEditLigne, onAjouterLigne, onPose, onTerminer, archive }) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 cursor-pointer hover:bg-gray-50/60" onClick={onToggle}>
                {ouverte ? <ChevronDown size={18} className="text-gray-400" /> : <ChevronRight size={18} className="text-gray-400" />}
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-gray-900">{c.client || 'Sans nom'}</span>
                        <span className="text-xs text-gray-400">n° {c.num || '—'}</span>
                        {archive ? (c.lignes[0]?.statut_archive && <StatutCommande statut={c.lignes[0].statut_archive} />) : <StatutCommande statut={c.statut} />}
                        {!archive && c.aRelancer && (
                            <Badge cls="bg-red-50 text-red-700 border-red-200"><BellRing size={11} /> À relancer{c.joursSansArc !== null ? ` · sans ARC depuis ${c.joursSansArc} j` : ''}</Badge>
                        )}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5 truncate">{c.fournisseurs.join(' · ')}</div>
                </div>
                <div className="flex gap-5 text-xs">
                    <div><div className="text-gray-400">Dernière livraison</div><div className="font-bold text-gray-800">{fmtDate(c.derniereLivraison) || '—'}</div></div>
                    <div><div className="text-gray-400">Pose</div><div className="font-bold text-gray-800">{fmtDate(c.datePose) || '—'}</div></div>
                </div>
            </div>

            {ouverte && (
                <div className="border-t border-gray-100">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[820px] text-sm">
                            <thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500">
                                <tr>
                                    {['Fournisseur', 'Commandé', 'ARC', 'N° BC', 'HT', 'Marchandise', 'Livraison', 'Pose', 'État', ''].map(h => <th key={h} className="px-3 py-2 text-left font-semibold whitespace-nowrap">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {c.lignes.map(l => (
                                    <tr key={l.id} className={`border-t border-gray-50 hover:bg-amber-50/40 cursor-pointer ${l.etat === 'Annulée' ? 'opacity-50 line-through' : ''}`} onClick={() => onEditLigne(l)}>
                                        <td className="px-3 py-2 font-semibold text-gray-800">{l.fournisseur}</td>
                                        <td className="px-3 py-2 whitespace-nowrap">{fmtDate(l.date_commande)}</td>
                                        <td className="px-3 py-2 whitespace-nowrap">
                                            {l.date_arc ? fmtDate(l.date_arc) : <span className="text-red-600 font-semibold">{l.relance || 'Pas d\'ARC'}</span>}
                                        </td>
                                        <td className="px-3 py-2 font-mono text-xs">{l.num_bc}</td>
                                        <td className="px-3 py-2 whitespace-nowrap">{fmtEuro(l.montant_ht)}</td>
                                        <td className="px-3 py-2">{l.type_marchandise}{l.motorisation && l.motorisation !== 'Non concerné' ? <span className="text-gray-400"> · {l.motorisation}</span> : ''}</td>
                                        <td className="px-3 py-2 whitespace-nowrap">{l.livraison ? <>{fmtDate(l.livraison)} <span className="text-gray-400 text-xs">{l.semaine_livraison}</span></> : '—'}</td>
                                        <td className="px-3 py-2 whitespace-nowrap">{l.duree_pose ? `${String(l.duree_pose).replace('.', ',')} ${l.unite || ''}` : ''}</td>
                                        <td className="px-3 py-2">{l.etat}</td>
                                        <td className="px-3 py-2 text-gray-400"><Pencil size={14} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {c.lignes.some(l => l.commentaire) && (
                        <div className="px-4 py-2 text-xs text-gray-600 bg-gray-50/60 border-t border-gray-100">
                            {[...new Set(c.lignes.map(l => l.commentaire).filter(Boolean))].map(t => <div key={t}>💬 {t}</div>)}
                        </div>
                    )}
                    <div className="flex flex-wrap gap-2 px-4 py-3 border-t border-gray-100">
                        {!archive && <button type="button" onClick={onAjouterLigne} className={btnSecondaire}><Plus size={15} /> Ajouter un fournisseur</button>}
                        {!archive && <button type="button" onClick={onPose} className={btnSecondaire}><CalendarCheck size={15} /> {c.datePose ? 'Modifier la date de pose' : 'Fixer la date de pose'}</button>}
                        <button type="button" onClick={onTerminer} className={archive ? btnSecondaire : 'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-green-700 bg-green-50 hover:bg-green-100'}>
                            {archive ? <><RotateCcw size={15} /> Remettre en cours</> : <><CheckCircle2 size={15} /> Chantier terminé</>}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

/* =========================================================
   PAGE
========================================================= */

export default function SuiviCommandes() {
    const toast = useToast();
    const confirm = useConfirm();
    const fichierRef = useRef(null);

    const [data, setData] = useState(null);
    const [erreur, setErreur] = useState('');
    const [onglet, setOnglet] = useState('commandes');
    const [recherche, setRecherche] = useState('');
    const [filtre, setFiltre] = useState('');
    const [ouvertes, setOuvertes] = useState({});
    const [modale, setModale] = useState(null);
    const [import_, setImport] = useState(false);

    const appliquer = (d) => {
        if (!d?.success) throw new Error(d?.message || 'Erreur');
        setData(d);
        return d;
    };

    const appeler = async (body) => {
        const res = await fetch(API, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        return appliquer(await res.json());
    };

    useEffect(() => {
        fetch(API, { credentials: 'include' })
            .then(r => r.json())
            .then(appliquer)
            .catch(e => setErreur(e.message || 'Chargement impossible'));
    }, []);

    const today = aujourdhui();
    const commandes = useMemo(() => data ? grouperCommandes(data.commandes.filter(l => !l.termine), today) : [], [data, today]);
    const termines = useMemo(() => data ? grouperCommandes(data.commandes.filter(l => l.termine), today) : [], [data, today]);
    const bcs = useMemo(() => data ? calculerBC(data.bc, data.factures, data.commandes) : [], [data]);
    const factures = useMemo(() => calculerFactures(data?.factures || [], bcs), [data, bcs]);

    const q = recherche.trim().toLowerCase();
    const correspond = (...vals) => !q || vals.some(v => String(v ?? '').toLowerCase().includes(q));

    const changerOnglet = (id) => { setOnglet(id); setFiltre(''); };

    /* ---------- Actions ---------- */

    const executer = async (fn, succes) => {
        try {
            const d = await fn();
            if (succes) toast.success(typeof succes === 'function' ? succes(d) : succes);
            setModale(null);
        } catch (e) {
            toast.error(e.message || 'Erreur');
        }
    };

    const enregistrerLigne = (ligne) => executer(
        () => appeler({ action: 'commande_save', ligne }),
        d => d.bc_ajoutes ? `Enregistré ✓ — BC ajouté dans « BC & compta »` : 'Enregistré ✓',
    );

    const supprimerLigne = async (ligne) => {
        if (!await confirm(`Supprimer la ligne ${ligne.fournisseur} de la commande ${ligne.num_commande} ?`)) return;
        executer(() => appeler({ action: 'commande_delete', id: ligne.id }), 'Ligne supprimée');
    };

    const terminer = async (c, archive) => {
        const msg = archive
            ? `Remettre la commande de ${c.client} dans les commandes en cours ?`
            : `Chantier ${c.client} terminé ? Ses ${c.lignes.length} ligne(s) passent dans « Chantiers terminés ».`;
        if (!await confirm(msg)) return;
        executer(() => appeler({ action: 'terminer', num_commande: c.num, termine: !archive, statut_archive: c.statut }), archive ? 'Commande remise en cours' : 'Chantier archivé ✓');
    };

    const importer = async (e) => {
        const files = [...e.target.files];
        e.target.value = '';
        if (!files.length) return;
        setImport(true);
        try {
            const corps = { action: 'import' };
            const resume = [];
            for (const f of files) {
                const { type, data: d } = convertirClasseur(await lireClasseur(f));
                corps[type] = d;
                resume.push(type === 'suivi'
                    ? `« ${f.name} » : ${d.commandes.filter(l => !l.termine).length} lignes en cours, ${d.commandes.filter(l => l.termine).length} lignes terminées`
                    : `« ${f.name} » : ${d.bc.length} BC, ${d.factures.length} factures`);
            }
            const remplace = [corps.suivi && 'les commandes', corps.compta && 'les BC et factures'].filter(Boolean).join(' et ');
            if (!await confirm(`${resume.join('\n')}\n\nCes données vont remplacer ${remplace} du site. Les fichiers Excel ne sont pas modifiés. Continuer ?`)) return;
            await executer(() => appeler(corps), d => `Import terminé ✓${d.bc_ajoutes ? ` — ${d.bc_ajoutes} BC du suivi ajouté(s) en compta` : ''}`);
        } catch (err) {
            toast.error(err.message || 'Import impossible');
        } finally {
            setImport(false);
        }
    };

    /* ---------- Rendu ---------- */

    if (erreur) return <div className="p-8 text-red-600">{erreur}</div>;
    if (!data) return <div className="p-8 text-gray-400">Chargement…</div>;

    const p = data.parametres;
    const vide = !data.commandes.length && !data.bc.length;

    const compteursCommandes = [
        ['À PLANIFIER', 'À planifier', 'text-amber-600'],
        ['EN ATTENTE LIVRAISON', 'En attente livraison', 'text-orange-600'],
        ['PLANIFIÉ', 'Planifiées', 'text-green-600'],
        ['PRÉPLANIFIÉ', 'Préplanifiées', 'text-teal-600'],
        ['relance', 'À relancer', 'text-red-600'],
    ];
    const filtreCommande = (c) => !filtre || (filtre === 'relance' ? c.aRelancer : c.statut === filtre);
    const rechercheCommande = (c) => correspond(c.num, c.client, ...c.lignes.flatMap(l => [l.fournisseur, l.num_bc, l.type_marchandise, l.commentaire]));
    // Planifiées : triées par date de pose, comme l'onglet « Planifié » d'Excel
    const listeCommandes = commandes.filter(c => filtreCommande(c) && rechercheCommande(c))
        .sort((a, b) => ['PLANIFIÉ', 'PRÉPLANIFIÉ'].includes(filtre) ? a.datePose.localeCompare(b.datePose) : a.ordre - b.ordre);
    const listeTermines = termines.filter(rechercheCommande).sort((a, b) => b.ordre - a.ordre);

    const listeBC = bcs.filter(b => (!filtre || (filtre === 'ecart' ? b.montantSuivi !== null : b.statut === filtre)) && correspond(b.client, b.num_bc, b.fournisseur, b.commentaire));
    const listeFactures = factures.filter(f => (!filtre || f.statut === filtre) && correspond(f.num_facture, f.num_bc, f.client, f.fournisseur, f.commentaire));

    return (
        <div className="p-4 md:p-7 bg-[#f6f7f9] min-h-full">
            <div className="max-w-[1400px] mx-auto space-y-5">

                {/* En-tête */}
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 flex items-center gap-3">
                            <span className="bg-[#FFB103] p-2 rounded-xl"><ClipboardCheck size={22} className="text-[#1a1a1a]" /></span>
                            Suivi commandes & factures
                        </h1>
                        <p className="text-sm text-gray-500 mt-2">Commandes fournisseurs, livraisons, planning de pose et rapprochement des factures.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <input ref={fichierRef} type="file" accept=".xlsx,.xlsm" multiple className="hidden" onChange={importer} />
                        <button type="button" disabled={import_} onClick={() => fichierRef.current?.click()} className={btnSecondaire}>
                            <Upload size={15} /> {import_ ? 'Import…' : 'Importer les fichiers Excel'}
                        </button>
                        {onglet === 'commandes' && <button type="button" onClick={() => setModale({ type: 'ligne', ligne: { date_commande: today } })} className={btnPrimaire}><Plus size={16} /> Nouvelle commande</button>}
                        {onglet === 'bc' && <button type="button" onClick={() => setModale({ type: 'bc', bc: {} })} className={btnPrimaire}><Plus size={16} /> Nouveau BC</button>}
                        {onglet === 'factures' && <button type="button" onClick={() => setModale({ type: 'facture', facture: {} })} className={btnPrimaire}><Plus size={16} /> Nouvelle facture</button>}
                    </div>
                </div>

                {vide && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-900">
                        <strong>Aucune donnée pour l'instant.</strong> Cliquez sur « Importer les fichiers Excel » et sélectionnez
                        « Suivi_commandes_fournisseurs » et « ARC + Factures fournisseurs » (les deux en même temps ou l'un après l'autre).
                        Les fichiers sont seulement lus : ils ne sont jamais modifiés.
                    </div>
                )}

                {/* Onglets + recherche */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-1.5 bg-white p-1 rounded-xl border border-gray-100">
                        {ONGLETS.map(({ id, label, icon: Icon }) => {
                            const nb = { commandes: commandes.length, termines: termines.length, bc: bcs.length, factures: factures.length }[id];
                            return (
                                <button key={id} type="button" onClick={() => changerOnglet(id)}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${onglet === id ? 'bg-[#1a1a1a] text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                                    <Icon size={15} /> {label} <span className={`text-xs ${onglet === id ? 'text-[#FFB103]' : 'text-gray-400'}`}>{nb}</span>
                                </button>
                            );
                        })}
                    </div>
                    <div className="relative w-full sm:w-72">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input className={inputCls + ' pl-9'} placeholder="Client, n° commande, BC, fournisseur…" value={recherche} onChange={e => setRecherche(e.target.value)} />
                    </div>
                </div>

                {/* ---------- Commandes en cours ---------- */}
                {onglet === 'commandes' && (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            {compteursCommandes.map(([cle, label, couleur]) => (
                                <Compteur key={cle} label={label} couleur={couleur} actif={filtre === cle} onClick={() => setFiltre(filtre === cle ? '' : cle)}
                                    valeur={commandes.filter(c => cle === 'relance' ? c.aRelancer : c.statut === cle).length} />
                            ))}
                        </div>
                        <div className="space-y-2.5">
                            {listeCommandes.map(c => (
                                <CarteCommande key={c.num || c.lignes[0].id} c={c} ouverte={!!ouvertes[c.num]} onToggle={() => setOuvertes(o => ({ ...o, [c.num]: !o[c.num] }))}
                                    onEditLigne={l => setModale({ type: 'ligne', ligne: l })}
                                    onAjouterLigne={() => setModale({ type: 'ligne', ligne: { num_commande: c.num, client: c.client, date_commande: today } })}
                                    onPose={() => setModale({ type: 'pose', commande: c })}
                                    onTerminer={() => terminer(c, false)} />
                            ))}
                            {!listeCommandes.length && <p className="text-center text-sm text-gray-400 py-10">Aucune commande{filtre || q ? ' pour ce filtre' : ''}.</p>}
                        </div>
                    </>
                )}

                {/* ---------- Chantiers terminés ---------- */}
                {onglet === 'termines' && (
                    <div className="space-y-2.5">
                        {listeTermines.map(c => (
                            <CarteCommande key={c.num || c.lignes[0].id} c={c} archive ouverte={!!ouvertes['t' + c.num]} onToggle={() => setOuvertes(o => ({ ...o, ['t' + c.num]: !o['t' + c.num] }))}
                                onEditLigne={l => setModale({ type: 'ligne', ligne: l })} onTerminer={() => terminer(c, true)} />
                        ))}
                        {!listeTermines.length && <p className="text-center text-sm text-gray-400 py-10">Aucun chantier terminé.</p>}
                    </div>
                )}

                {/* ---------- BC & compta ---------- */}
                {onglet === 'bc' && (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            {[['Non facturé', 'text-gray-700'], ['Partiellement facturé', 'text-amber-600'], ['Conforme', 'text-green-600'], ['Dépassement', 'text-red-600'], ['ecart', 'text-orange-600']].map(([cle, couleur]) => (
                                <Compteur key={cle} label={cle === 'ecart' ? 'Montant ≠ suivi' : cle} couleur={couleur} actif={filtre === cle} onClick={() => setFiltre(filtre === cle ? '' : cle)}
                                    valeur={bcs.filter(b => cle === 'ecart' ? b.montantSuivi !== null : b.statut === cle).length} />
                            ))}
                        </div>
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
                            <table className="w-full min-w-[980px] text-sm">
                                <thead className="bg-[#FFB103] text-[#1a1a1a] text-xs">
                                    <tr>{['Client', 'N° BC', 'Date BC', 'Fournisseur', 'BC HT', 'BC TTC', 'Facturé HT', 'Écart HT', 'Statut', 'Commentaire'].map(h => <th key={h} className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">{h}</th>)}</tr>
                                </thead>
                                <tbody>
                                    {listeBC.map(b => (
                                        <tr key={b.id} className="border-t border-gray-50 hover:bg-amber-50/40 cursor-pointer" onClick={() => setModale({ type: 'bc', bc: b })}>
                                            <td className="px-3 py-2 font-semibold text-gray-800">{b.client}</td>
                                            <td className="px-3 py-2 font-mono text-xs">{b.num_bc}</td>
                                            <td className="px-3 py-2 whitespace-nowrap">{fmtDate(b.date_bc)}</td>
                                            <td className="px-3 py-2">{b.fournisseur}</td>
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                {fmtEuro(b.montant_ht)}
                                                {b.montantSuivi !== null && (
                                                    <div className="text-[11px] text-orange-600 font-semibold flex items-center gap-1"><AlertTriangle size={11} /> suivi : {fmtEuro(b.montantSuivi)}</div>
                                                )}
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap">{fmtEuro(b.montant_ttc)}</td>
                                            <td className="px-3 py-2 whitespace-nowrap">{fmtEuro(b.factureHT)}{b.nbFactures > 1 && <span className="text-gray-400 text-xs"> ({b.nbFactures})</span>}</td>
                                            <td className={`px-3 py-2 whitespace-nowrap font-semibold ${b.ecartHT < 0 ? 'text-red-600' : ''}`}>{fmtEuro(b.ecartHT)}</td>
                                            <td className="px-3 py-2"><Badge cls={STATUTS_BC[b.statut]}>{b.statut}</Badge></td>
                                            <td className="px-3 py-2 text-xs text-gray-500 max-w-[220px] truncate">{b.commentaire}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {!listeBC.length && <p className="text-center text-sm text-gray-400 py-10">Aucun BC.</p>}
                        </div>
                        <p className="text-xs text-gray-400">Chaque BC saisi dans les commandes arrive ici automatiquement : plus besoin du bouton « Importer les nouveaux BC ».</p>
                    </>
                )}

                {/* ---------- Factures ---------- */}
                {onglet === 'factures' && (
                    <>
                        <div className="grid grid-cols-3 gap-3">
                            {[['Payée', 'Factures payées', 'text-green-600'], ['À payer', 'Factures à payer', 'text-amber-600'], ['En litige', 'Factures en litige', 'text-red-600']].map(([cle, label, couleur]) => (
                                <Compteur key={cle} label={label} couleur={couleur} actif={filtre === cle} onClick={() => setFiltre(filtre === cle ? '' : cle)}
                                    valeur={factures.filter(f => f.statut === cle).length} />
                            ))}
                        </div>
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
                            <table className="w-full min-w-[900px] text-sm">
                                <thead className="bg-[#FFB103] text-[#1a1a1a] text-xs">
                                    <tr>{['Client', 'N° facture', 'N° BC', 'Fournisseur', 'Date facture', 'Montant HT', 'Montant TTC', 'Statut', 'Payée le', 'Commentaire'].map(h => <th key={h} className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">{h}</th>)}</tr>
                                </thead>
                                <tbody>
                                    {listeFactures.map(f => (
                                        <tr key={f.id} className="border-t border-gray-50 hover:bg-amber-50/40 cursor-pointer" onClick={() => setModale({ type: 'facture', facture: f })}>
                                            <td className="px-3 py-2 font-semibold text-gray-800">{f.client}</td>
                                            <td className="px-3 py-2">{f.num_facture}</td>
                                            <td className="px-3 py-2 font-mono text-xs">{f.num_bc}</td>
                                            <td className="px-3 py-2">{f.fournisseur}</td>
                                            <td className="px-3 py-2 whitespace-nowrap">{fmtDate(f.date_facture)}</td>
                                            <td className="px-3 py-2 whitespace-nowrap">{fmtEuro(f.montant_ht)}</td>
                                            <td className="px-3 py-2 whitespace-nowrap">{fmtEuro(f.montant_ttc)}</td>
                                            <td className="px-3 py-2"><Badge cls={STATUTS_PAIEMENT[f.statut]}>{f.statut}</Badge></td>
                                            <td className="px-3 py-2 whitespace-nowrap">{fmtDate(f.date_paiement)}</td>
                                            <td className="px-3 py-2 text-xs text-gray-500 max-w-[200px] truncate">{f.commentaire}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {!listeFactures.length && <p className="text-center text-sm text-gray-400 py-10">Aucune facture.</p>}
                        </div>
                    </>
                )}
            </div>

            {/* ---------- Modales ---------- */}
            {modale?.type === 'ligne' && (
                <LigneForm initial={modale.ligne} parametres={p} onSave={enregistrerLigne} onDelete={supprimerLigne} onClose={() => setModale(null)} />
            )}
            {modale?.type === 'pose' && (
                <PoseForm commande={modale.commande} onClose={() => setModale(null)}
                    onSave={(date, statut) => executer(() => appeler({ action: 'pose', num_commande: modale.commande.num, date_pose: date, statut_pose: statut }), date ? 'Date de pose enregistrée ✓' : 'Date de pose retirée')} />
            )}
            {modale?.type === 'bc' && (
                <BCForm initial={modale.bc} parametres={p} onClose={() => setModale(null)}
                    onSave={bc => executer(() => appeler({ action: 'bc_save', bc }), 'BC enregistré ✓')}
                    onDelete={async bc => { if (await confirm(`Supprimer le BC ${bc.num_bc} de la compta ?`)) executer(() => appeler({ action: 'bc_delete', id: bc.id }), 'BC supprimé'); }} />
            )}
            {modale?.type === 'facture' && (
                <FactureForm initial={modale.facture} bcs={bcs} onClose={() => setModale(null)}
                    onSave={facture => executer(() => appeler({ action: 'facture_save', facture }), 'Facture enregistrée ✓')}
                    onDelete={async f => { if (await confirm(`Supprimer la facture ${f.num_facture || ''} ?`)) executer(() => appeler({ action: 'facture_delete', id: f.id }), 'Facture supprimée'); }} />
            )}
        </div>
    );
}
