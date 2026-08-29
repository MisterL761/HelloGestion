import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, FileText, Printer, Edit2, Eye, RotateCcw, Loader2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || '/hello-gestion/php';

/* ── Helpers ── */
function val(v) {
  if (v === null || v === undefined || v === 'null' || String(v).trim() === '') return null;
  return String(v).trim();
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

/* ── Inline editable field ── */
function EF({ value, onChange, placeholder = '—', multiline = false, readOnly = false, className = '' }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(value ?? '');

  const commit = () => { setEditing(false); onChange(draft); };

  if (editing && !readOnly) {
    return multiline
      ? (
        <textarea
          className={`border border-[#FFB103]/50 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFB103] w-full resize-none ${className}`}
          value={draft}
          autoFocus
          rows={3}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
        />
      ) : (
        <input
          className={`border border-[#FFB103]/50 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFB103] ${className}`}
          value={draft}
          autoFocus
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => e.key === 'Enter' && commit()}
        />
      );
  }

  return (
    <span
      className={`${!val(value) ? 'text-gray-400 italic' : ''} ${!readOnly ? 'cursor-pointer hover:bg-amber-50 rounded px-0.5 transition-colors' : ''} ${className}`}
      onClick={() => { if (!readOnly) { setDraft(value ?? ''); setEditing(true); } }}
      title={readOnly ? undefined : 'Cliquer pour modifier'}
    >
      {val(value) ?? placeholder}
      {!readOnly && <span className="ml-1 text-amber-500 text-xs opacity-0 group-hover:opacity-100">✎</span>}
    </span>
  );
}

/* ── Field block (label + value) ── */
function FieldBlock({ label, value, onChange, multiline = false, readOnly = false }) {
  if (value === null && readOnly) return null;
  return (
    <div className="flex gap-2 text-sm py-1 group">
      <span className="text-gray-500 font-medium whitespace-nowrap w-32 flex-shrink-0">{label}</span>
      <EF value={value} onChange={onChange} multiline={multiline} readOnly={readOnly} className="flex-1" />
    </div>
  );
}

/* ── Section card ── */
function SectionCard({ title, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
      <h3 className="text-xs font-bold uppercase tracking-widest text-[#FFB103] mb-3">{title}</h3>
      {children}
    </div>
  );
}

/* ── ARC Document display ── */
function ArcDocument({ arc: initialArc }) {
  const [arc, setArc]           = useState(initialArc);
  const [previewMode, setPreviewMode] = useState(true);
  const ro = previewMode;

  const setField = useCallback((path, newVal) => {
    setArc(prev => {
      const next = structuredClone(prev);
      const keys = path.split('.');
      let obj = next;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!obj[keys[i]]) obj[keys[i]] = {};
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = newVal;
      return next;
    });
  }, []);

  const setLigneField = useCallback((idx, key, newVal) => {
    setArc(prev => {
      const next = structuredClone(prev);
      next.lignes[idx][key] = newVal;
      return next;
    });
  }, []);

  const lignes = arc.lignes || [];

  return (
    <div className="mt-6">
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
        }
      `}</style>

      {/* Action bar */}
      <div className="no-print flex items-center justify-between mb-4 bg-white rounded-xl p-3 border border-gray-100">
        <p className="text-sm text-gray-500">
          {previewMode
            ? 'Mode aperçu — cliquez sur "Modifier" pour éditer les champs'
            : 'Cliquez sur n\'importe quel champ pour le modifier'}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setPreviewMode(p => !p)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              previewMode
                ? 'bg-[#FFB103] text-[#1a1a1a] hover:bg-[#d49400]'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {previewMode ? <Edit2 size={14} /> : <Eye size={14} />}
            {previewMode ? 'Modifier' : 'Mode aperçu'}
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          >
            <Printer size={14} />
            Imprimer
          </button>
        </div>
      </div>

      {/* Document */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

        {/* Header */}
        <div className="bg-[#FFB103] text-[#1a1a1a] p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold tracking-wide">ACCUSÉ DE RÉCEPTION DE COMMANDE</h2>
              {val(arc.fournisseur?.nom) && (
                <p className="text-white/80 text-sm mt-1">
                  <EF value={arc.fournisseur.nom} onChange={v => setField('fournisseur.nom', v)} readOnly={ro} className="text-white/90" />
                </p>
              )}
            </div>
            <div className="text-right text-sm space-y-1">
              <div className="flex items-center gap-3 justify-end">
                <span className="text-white/60 text-xs uppercase tracking-wide">Référence ARC</span>
                <EF value={arc.reference_arc} onChange={v => setField('reference_arc', v)} readOnly={ro} className="font-bold text-white" placeholder="—" />
              </div>
              <div className="flex items-center gap-3 justify-end">
                <span className="text-white/60 text-xs uppercase tracking-wide">Date</span>
                <EF value={arc.date_arc} onChange={v => setField('date_arc', v)} readOnly={ro} className="text-white" placeholder="—" />
              </div>
              {val(arc.validite) && (
                <div className="flex items-center gap-3 justify-end">
                  <span className="text-white/60 text-xs uppercase tracking-wide">Validité</span>
                  <EF value={arc.validite} onChange={v => setField('validite', v)} readOnly={ro} className="text-white" />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-5 md:p-6">

          {/* Parties */}
          <div className={`grid gap-4 mb-4 ${val(arc.chantier?.nom) || val(arc.chantier?.adresse) ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
            <SectionCard title="Fournisseur">
              <FieldBlock label="Nom"      value={arc.fournisseur?.nom}       onChange={v => setField('fournisseur.nom', v)}       readOnly={ro} />
              <FieldBlock label="Adresse"  value={arc.fournisseur?.adresse}   onChange={v => setField('fournisseur.adresse', v)}   readOnly={ro} multiline />
              <FieldBlock label="Tél"      value={arc.fournisseur?.telephone} onChange={v => setField('fournisseur.telephone', v)} readOnly={ro} />
              <FieldBlock label="Email"    value={arc.fournisseur?.email}     onChange={v => setField('fournisseur.email', v)}     readOnly={ro} />
              <FieldBlock label="SIRET"    value={arc.fournisseur?.siret}     onChange={v => setField('fournisseur.siret', v)}     readOnly={ro} />
            </SectionCard>

            <SectionCard title="Client / Acheteur">
              <FieldBlock label="Nom"      value={arc.client?.nom}                onChange={v => setField('client.nom', v)}                readOnly={ro} />
              <FieldBlock label="Adresse"  value={arc.client?.adresse}            onChange={v => setField('client.adresse', v)}            readOnly={ro} multiline />
              <FieldBlock label="Contact"  value={arc.client?.contact}            onChange={v => setField('client.contact', v)}            readOnly={ro} />
              <FieldBlock label="Réf. BC"  value={arc.client?.reference_commande} onChange={v => setField('client.reference_commande', v)} readOnly={ro} />
            </SectionCard>

            {(val(arc.chantier?.nom) || val(arc.chantier?.adresse)) && (
              <SectionCard title="Chantier">
                <FieldBlock label="Nom"     value={arc.chantier?.nom}     onChange={v => setField('chantier.nom', v)}     readOnly={ro} />
                <FieldBlock label="Adresse" value={arc.chantier?.adresse} onChange={v => setField('chantier.adresse', v)} readOnly={ro} multiline />
              </SectionCard>
            )}
          </div>

          {/* Conditions */}
          {(val(arc.delai_livraison) || val(arc.date_livraison_prevue) || val(arc.conditions_paiement)) && (
            <SectionCard title="Conditions">
              <FieldBlock label="Délai de livraison"   value={arc.delai_livraison}       onChange={v => setField('delai_livraison', v)}       readOnly={ro} />
              <FieldBlock label="Date prévue"          value={arc.date_livraison_prevue} onChange={v => setField('date_livraison_prevue', v)} readOnly={ro} />
              <FieldBlock label="Conditions paiement"  value={arc.conditions_paiement}   onChange={v => setField('conditions_paiement', v)}   readOnly={ro} />
            </SectionCard>
          )}

          {/* Lignes produits */}
          {lignes.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#FFB103]">Lignes produits</h3>
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">{lignes.length}</span>
              </div>

              <div className="flex flex-col gap-3">
                {lignes.map((ligne, i) => {
                  const opts = Array.isArray(ligne.options) ? ligne.options.filter(Boolean) : [];
                  return (
                    <div key={i} className={`bg-white rounded-xl border p-4 ${i % 2 === 0 ? 'border-gray-100' : 'border-amber-100 bg-amber-50/30'}`}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-7 h-7 rounded-full bg-[#FFB103] text-[#1a1a1a] text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {val(ligne.numero) ?? (i + 1)}
                        </span>
                        <div className="flex-1 text-sm font-medium text-gray-800">
                          <EF value={ligne.designation} onChange={v => setLigneField(i, 'designation', v)} readOnly={ro} multiline className="w-full" placeholder="—" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-0">
                        {val(ligne.reference) && (
                          <FieldBlock label="Référence" value={ligne.reference} onChange={v => setLigneField(i, 'reference', v)} readOnly={ro} />
                        )}
                        {(val(ligne.largeur) || val(ligne.hauteur)) && (
                          <div className="flex gap-2 text-sm py-1">
                            <span className="text-gray-500 font-medium whitespace-nowrap w-32 flex-shrink-0">Dimensions</span>
                            <span className="flex items-center gap-1">
                              {val(ligne.largeur) && <EF value={ligne.largeur} onChange={v => setLigneField(i, 'largeur', v)} readOnly={ro} />}
                              {val(ligne.largeur) && val(ligne.hauteur) && <span className="text-gray-400">×</span>}
                              {val(ligne.hauteur) && <EF value={ligne.hauteur} onChange={v => setLigneField(i, 'hauteur', v)} readOnly={ro} />}
                              <span className="text-gray-400 text-xs">mm</span>
                              {val(ligne.cote_type) && (
                                <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium">
                                  <EF value={ligne.cote_type} onChange={v => setLigneField(i, 'cote_type', v)} readOnly={ro} />
                                </span>
                              )}
                            </span>
                          </div>
                        )}
                        {val(ligne.coloris_ext)    && <FieldBlock label="Coloris ext."   value={ligne.coloris_ext}    onChange={v => setLigneField(i, 'coloris_ext', v)}    readOnly={ro} />}
                        {val(ligne.coloris_int)    && <FieldBlock label="Coloris int."   value={ligne.coloris_int}    onChange={v => setLigneField(i, 'coloris_int', v)}    readOnly={ro} />}
                        {val(ligne.vitrage)        && <FieldBlock label="Vitrage"        value={ligne.vitrage}        onChange={v => setLigneField(i, 'vitrage', v)}        readOnly={ro} />}
                        {val(ligne.type_pose)      && <FieldBlock label="Type de pose"   value={ligne.type_pose}      onChange={v => setLigneField(i, 'type_pose', v)}      readOnly={ro} />}
                        {val(ligne.sens_ouverture) && <FieldBlock label="Sens ouverture" value={ligne.sens_ouverture} onChange={v => setLigneField(i, 'sens_ouverture', v)} readOnly={ro} />}
                        {val(ligne.type_coffre)    && <FieldBlock label="Coffre"         value={ligne.type_coffre}    onChange={v => setLigneField(i, 'type_coffre', v)}    readOnly={ro} />}
                        {val(ligne.motorisation)   && <FieldBlock label="Motorisation"   value={ligne.motorisation}   onChange={v => setLigneField(i, 'motorisation', v)}   readOnly={ro} />}
                        {val(ligne.toile_reference)&& <FieldBlock label="Réf. toile"     value={ligne.toile_reference}onChange={v => setLigneField(i, 'toile_reference', v)}readOnly={ro} />}
                        {val(ligne.toile_couleur)  && <FieldBlock label="Couleur toile"  value={ligne.toile_couleur}  onChange={v => setLigneField(i, 'toile_couleur', v)}  readOnly={ro} />}
                      </div>

                      {opts.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-gray-500 mb-1">Options</p>
                          <ul className="flex flex-wrap gap-1.5">
                            {opts.map((opt, j) => (
                              <li key={j} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{opt}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">QTÉ</span>
                          <EF value={ligne.quantite} onChange={v => setLigneField(i, 'quantite', v)} readOnly={ro} className="font-bold text-gray-800" placeholder="—" />
                        </div>
                        {val(ligne.prix_unitaire_ht) && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">PU HT</span>
                            <span className="text-gray-800">
                              <EF value={ligne.prix_unitaire_ht} onChange={v => setLigneField(i, 'prix_unitaire_ht', v)} readOnly={ro} /> €
                            </span>
                          </div>
                        )}
                        {val(ligne.prix_total_ht) && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">TOTAL HT</span>
                            <span className="font-bold text-gray-800">
                              <EF value={ligne.prix_total_ht} onChange={v => setLigneField(i, 'prix_total_ht', v)} readOnly={ro} /> €
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Totaux */}
          {(val(arc.sous_total_ht) || arc.total_ht !== undefined || val(arc.total_ttc) || lignes.length > 0) && (
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#FFB103] mb-3">Totaux</h3>
              <div className="max-w-xs ml-auto space-y-2 text-sm">
                {val(arc.sous_total_ht) && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Sous-total HT</span>
                    <span className="font-medium"><EF value={arc.sous_total_ht} onChange={v => setField('sous_total_ht', v)} readOnly={ro} /> €</span>
                  </div>
                )}
                {val(arc.remise) && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Remise</span>
                    <span className="font-medium"><EF value={arc.remise} onChange={v => setField('remise', v)} readOnly={ro} /></span>
                  </div>
                )}
                <div className="flex justify-between border-t border-gray-200 pt-2">
                  <span className="font-semibold text-gray-800">Total HT</span>
                  <span className="font-bold text-gray-900"><EF value={arc.total_ht} onChange={v => setField('total_ht', v)} readOnly={ro} placeholder="—" /> €</span>
                </div>
                {val(arc.taux_tva) && (
                  <div className="flex justify-between text-gray-600">
                    <span>TVA (<EF value={arc.taux_tva} onChange={v => setField('taux_tva', v)} readOnly={ro} />)</span>
                    <span><EF value={arc.montant_tva} onChange={v => setField('montant_tva', v)} readOnly={ro} placeholder="—" /> €</span>
                  </div>
                )}
                {val(arc.total_ttc) && (
                  <div className="flex justify-between border-t border-gray-200 pt-2">
                    <span className="font-bold text-gray-900 text-base">Total TTC</span>
                    <span className="font-bold text-[#FFB103] text-base">
                      <EF value={arc.total_ttc} onChange={v => setField('total_ttc', v)} readOnly={ro} /> €
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {val(arc.notes) && (
            <SectionCard title="Notes et conditions">
              <EF value={arc.notes} onChange={v => setField('notes', v)} readOnly={ro} multiline className="text-sm text-gray-700 w-full" />
            </SectionCard>
          )}

          {/* Footer RGPD */}
          <p className="no-print text-center text-xs text-gray-400 mt-4">
            Document traité en mémoire — aucun stockage effectué · Généré le {new Date().toLocaleString('fr-FR')}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Main component ── */
export default function GenerateurARC() {
  const [file, setFile]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [arcData, setArcData] = useState(null);
  const [error, setError]     = useState(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const handleFile = (f) => {
    setFile(f);
    setArcData(null);
    setError(null);
  };

  const handleDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = () => setDragging(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };
  const handleChange = (e) => {
    const f = e.target.files[0];
    if (f) handleFile(f);
    e.target.value = '';
  };

  const handleReset = () => {
    setFile(null);
    setArcData(null);
    setError(null);
  };

  const handleExtract = async () => {
    if (!file || loading) return;
    setLoading(true);
    setError(null);
    setArcData(null);

    try {
      const fd = new FormData();
      fd.append('arc', file);
      const res  = await fetch(`${API_BASE}/generate_arc.php`, { method: 'POST', body: fd, credentials: 'include' });
      const data = await res.json();

      if (data.success) {
        setArcData(data.arc);
      } else {
        setError(data.message || "Une erreur est survenue lors de l'extraction.");
      }
    } catch {
      setError("Impossible de contacter le serveur. Vérifiez votre connexion.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">

      {/* En-tête */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Générateur ARC</h1>
        <p className="text-sm text-gray-500 mt-1">Importez un ARC fournisseur PDF pour l'afficher et le modifier</p>
      </div>

      {/* Card upload */}
      <div className="bg-white rounded-2xl shadow-sm p-4 md:p-6 mb-6">
        {file ? (
          <div className="flex items-start gap-3 border border-green-200 bg-green-50 rounded-xl p-3 mb-4">
            <FileText size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
              <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
            </div>
            <button
              onClick={() => { setFile(null); setArcData(null); setError(null); }}
              className="text-gray-400 hover:text-red-500 flex-shrink-0 transition-colors"
              title="Retirer ce fichier"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors mb-4 ${
              dragging
                ? 'border-[#FFB103] bg-amber-50'
                : 'border-gray-200 hover:border-[#FFB103]'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <Upload size={28} className="text-gray-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-600">Déposer l'ARC fournisseur ici ou cliquer pour sélectionner</p>
            <p className="text-xs text-gray-400 mt-1">PDF · Max 10 Mo</p>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={handleChange}
            />
          </div>
        )}

        <div className="flex items-center gap-4">
          <button
            onClick={handleExtract}
            disabled={!file || loading}
            className="bg-[#FFB103] text-[#1a1a1a] rounded-xl px-6 py-2.5 font-medium text-sm hover:bg-[#d49400] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Extraction en cours…
              </>
            ) : (
              <>
                <FileText size={16} />
                Extraire et afficher
              </>
            )}
          </button>

          {(file || arcData) && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <RotateCcw size={14} />
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-2xl px-4 py-4 mb-6 flex items-start gap-3">
          <X size={18} className="flex-shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* ARC rendu */}
      {arcData && <ArcDocument arc={arcData} />}
    </div>
  );
}
