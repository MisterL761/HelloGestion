import React, { useState, useRef } from 'react';
import { Upload, X, FileText, CheckCircle, AlertTriangle, AlertCircle, ChevronDown, ChevronUp, RotateCcw, Loader2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || '/hello-gestion/php';

const ZONES = [
  { key: 'devis', label: 'Devis', fieldName: 'devis' },
  { key: 'arc',   label: 'ARC Fournisseur', fieldName: 'arc' },
  { key: 'bon',   label: 'Bon de Commande', fieldName: 'bon' },
];

const SEVERITY_BORDER = {
  CRITIQUE: 'border-l-4 border-red-500',
  MAJEUR:   'border-l-4 border-orange-500',
  MINEUR:   'border-l-4 border-yellow-500',
};

const SEVERITY_BADGE = {
  CRITIQUE: 'bg-red-100 text-red-700',
  MAJEUR:   'bg-orange-100 text-orange-700',
  MINEUR:   'bg-yellow-100 text-yellow-700',
};

const STATUS_STYLES = {
  CONFORME:     'bg-green-50 border border-green-200 text-green-800',
  NON_CONFORME: 'bg-red-50 border border-red-200 text-red-800',
  ATTENTION:    'bg-orange-50 border border-orange-200 text-orange-800',
};

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function DropZone({ label, file, onFile, onRemove }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  };

  const handleChange = (e) => {
    const f = e.target.files[0];
    if (f) onFile(f);
    e.target.value = '';
  };

  return (
    <div className="flex-1 min-w-0">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        {label}
        <span className="ml-1 text-gray-400 font-normal normal-case">(optionnel)</span>
      </p>
      {file ? (
        <div className="flex items-start gap-3 border border-green-200 bg-green-50 rounded-xl p-3">
          <FileText size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
            <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
          </div>
          <button
            onClick={onRemove}
            className="text-gray-400 hover:text-red-500 flex-shrink-0 transition-colors"
            title="Retirer ce fichier"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
            dragging
              ? 'border-[#FFB103] bg-amber-50'
              : 'border-gray-200 hover:border-[#FFB103]'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <Upload size={20} className="text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Déposer ou cliquer</p>
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
    </div>
  );
}

function SeverityChip({ label, count, colorClass }) {
  if (!count) return null;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${colorClass}`}>
      {label} · {count}
    </span>
  );
}

function AnomalyCard({ anomaly, index, corrected, onToggle }) {
  const [expanded, setExpanded] = useState(true);
  const valeurs = anomaly.valeurs || {};
  const hasValeurs = Object.values(valeurs).some(v => v !== null && v !== undefined);

  return (
    <div className={`rounded-xl bg-white shadow-sm overflow-hidden ${SEVERITY_BORDER[anomaly.severite] || 'border-l-4 border-gray-300'} ${corrected ? 'opacity-50' : ''}`}>
      <div
        className="flex items-start gap-3 p-4 cursor-pointer select-none"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {anomaly.type}
            </span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${SEVERITY_BADGE[anomaly.severite] || 'bg-gray-100 text-gray-600'}`}>
              {anomaly.severite}
            </span>
          </div>
          <p className="text-sm text-gray-800 font-medium">{anomaly.description}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(index); }}
            title={corrected ? 'Marquer comme non corrigé' : 'Marquer comme corrigé'}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
              corrected
                ? 'bg-green-500 border-green-500'
                : 'border-gray-300 hover:border-green-400'
            }`}
          >
            {corrected && <CheckCircle size={12} className="text-white" />}
          </button>
          {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </div>

      {expanded && hasValeurs && (
        <div className="px-4 pb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Valeurs comparées</p>
          <table className="w-full text-sm border-collapse">
            <tbody>
              {Object.entries(valeurs).map(([doc, val]) => (
                val !== null && val !== undefined ? (
                  <tr key={doc} className="border-b border-gray-100 last:border-0">
                    <td className="py-1.5 pr-3 text-xs font-medium text-gray-500 whitespace-nowrap w-36">{doc}</td>
                    <td className="py-1.5 text-gray-800">{val}</td>
                  </tr>
                ) : null
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function ComparateurDevis() {
  const [files, setFiles]         = useState({ devis: null, arc: null, bon: null });
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState(null);
  const [error, setError]         = useState(null);
  const [corrected, setCorrected] = useState({});

  const fileCount = Object.values(files).filter(Boolean).length;
  const canAnalyze = fileCount >= 2;

  const handleFile = (key, file) => {
    setFiles(prev => ({ ...prev, [key]: file }));
    setResult(null);
    setError(null);
  };

  const handleRemove = (key) => {
    setFiles(prev => ({ ...prev, [key]: null }));
    setResult(null);
    setError(null);
  };

  const handleReset = () => {
    setFiles({ devis: null, arc: null, bon: null });
    setResult(null);
    setError(null);
    setCorrected({});
  };

  const handleAnalyze = async () => {
    if (!canAnalyze || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setCorrected({});

    try {
      const fd = new FormData();
      if (files.devis) fd.append('devis', files.devis);
      if (files.arc)   fd.append('arc',   files.arc);
      if (files.bon)   fd.append('bon',   files.bon);

      const res  = await fetch(`${API_BASE}/verify.php`, { method: 'POST', body: fd, credentials: 'include' });
      const data = await res.json();

      if (data.success) {
        setResult(data.result);
      } else {
        setError(data.message || "Une erreur est survenue lors de l'analyse.");
      }
    } catch (err) {
      setError("Impossible de contacter le serveur. Vérifiez votre connexion.");
    } finally {
      setLoading(false);
    }
  };

  const toggleCorrected = (idx) => {
    setCorrected(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const anomalies      = result?.anomalies || [];
  const pointsConformes = result?.points_conformes || [];
  const correctedCount  = Object.values(corrected).filter(Boolean).length;
  const statusStyle     = STATUS_STYLES[result?.statut] || 'bg-gray-50 border border-gray-200 text-gray-700';

  const critiques = anomalies.filter(a => a.severite === 'CRITIQUE').length;
  const majeurs   = anomalies.filter(a => a.severite === 'MAJEUR').length;
  const mineurs   = anomalies.filter(a => a.severite === 'MINEUR').length;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">

      {/* En-tête */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Comparateur Devis / ARC / BDC</h1>
        <p className="text-sm text-gray-500 mt-1">Upload au moins 2 documents PDF pour détecter les anomalies</p>
      </div>

      {/* Card upload */}
      <div className="bg-white rounded-2xl shadow-sm p-4 md:p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          {ZONES.map(zone => (
            <DropZone
              key={zone.key}
              label={zone.label}
              file={files[zone.key]}
              onFile={(f) => handleFile(zone.key, f)}
              onRemove={() => handleRemove(zone.key)}
            />
          ))}
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleAnalyze}
            disabled={!canAnalyze || loading}
            className="bg-[#FFB103] text-[#1a1a1a] rounded-xl px-6 py-2.5 font-medium text-sm hover:bg-[#d49400] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Analyse en cours…
              </>
            ) : (
              <>
                <AlertCircle size={16} />
                Analyser
              </>
            )}
          </button>

          {(fileCount > 0 || result) && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <RotateCcw size={14} />
              Réinitialiser
            </button>
          )}

          {!canAnalyze && fileCount > 0 && (
            <p className="text-xs text-gray-400">
              {2 - fileCount} document{2 - fileCount > 1 ? 's' : ''} supplémentaire{2 - fileCount > 1 ? 's' : ''} requis
            </p>
          )}
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-2xl px-4 py-4 mb-6 flex items-start gap-3">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Résultats */}
      {result && (
        <>
          {/* Bannière statut */}
          <div className={`rounded-2xl px-5 py-4 mb-6 flex flex-wrap items-center gap-3 ${statusStyle}`}>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-base">{result.statut_libelle || result.statut}</p>
              {anomalies.length > 0 && (
                <p className="text-sm opacity-80 mt-0.5">{anomalies.length} anomalie{anomalies.length > 1 ? 's' : ''} détectée{anomalies.length > 1 ? 's' : ''}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <SeverityChip label="CRITIQUE" count={critiques} colorClass="bg-red-100 text-red-700" />
              <SeverityChip label="MAJEUR"   count={majeurs}   colorClass="bg-orange-100 text-orange-700" />
              <SeverityChip label="MINEUR"   count={mineurs}   colorClass="bg-yellow-100 text-yellow-700" />
            </div>
          </div>

          {/* Barre de progression corrections */}
          {anomalies.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-4 md:p-5 mb-6">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-medium text-gray-700">Anomalies corrigées</span>
                <span className="text-gray-500">{correctedCount} / {anomalies.length}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${anomalies.length ? (correctedCount / anomalies.length) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          {/* Anomalies */}
          {anomalies.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-4 md:p-6 mb-6">
              <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                <AlertTriangle size={18} className="text-orange-500" />
                Anomalies détectées
              </h2>
              <div className="flex flex-col gap-3">
                {anomalies.map((anomaly, idx) => (
                  <AnomalyCard
                    key={idx}
                    anomaly={anomaly}
                    index={idx}
                    corrected={!!corrected[idx]}
                    onToggle={toggleCorrected}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Points conformes */}
          {pointsConformes.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-4 md:p-6 mb-6">
              <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle size={18} className="text-green-500" />
                Points conformes
              </h2>
              <ul className="flex flex-col gap-2">
                {pointsConformes.map((point, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle size={14} className="text-green-500 flex-shrink-0 mt-0.5" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommandations */}
          {result.recommandations && (
            <div className="bg-white rounded-2xl shadow-sm p-4 md:p-6 mb-6">
              <h2 className="text-base font-bold text-gray-900 mb-3">Recommandations</h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{result.recommandations}</p>
            </div>
          )}

          {/* Rapport détaillé */}
          {result.rapport_detaille && (
            <div className="bg-white rounded-2xl shadow-sm p-4 md:p-6 mb-6">
              <h2 className="text-base font-bold text-gray-900 mb-3">Rapport détaillé</h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{result.rapport_detaille}</p>
            </div>
          )}

          {/* Footer RGPD */}
          <p className="text-center text-xs text-gray-400 mb-6">
            Documents traités en mémoire — aucun stockage
          </p>
        </>
      )}
    </div>
  );
}
