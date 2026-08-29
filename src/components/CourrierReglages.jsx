import React, { useState, useEffect, useRef } from 'react';
import { Save, Upload, Loader2, Check } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || '/hello-gestion/php';

const CHAMPS = [
    { key: 'nom',              label: "Nom de l'entreprise",  placeholder: 'Hello Fermetures' },
    { key: 'adresse',          label: 'Adresse',              placeholder: '12 rue des Artisans' },
    { key: 'code_postal',      label: 'Code postal',          placeholder: '76000' },
    { key: 'ville',            label: 'Ville',                placeholder: 'Rouen' },
    { key: 'telephone',        label: 'Téléphone',            placeholder: '02 35 00 00 00' },
    { key: 'email',            label: 'Email',                placeholder: 'contact@hello-fermetures.com' },
    { key: 'siret',            label: 'SIRET',                placeholder: '000 000 000 00000' },
    { key: 'mentions_legales', label: 'Mentions légales',     placeholder: 'SARL au capital de … — RCS …' },
    { key: 'signataire',       label: 'Signataire (nom et fonction)', placeholder: 'Jean Dupont, Gérant' },
];

const CourrierReglages = ({ config, onSaved }) => {
    const [form, setForm]         = useState({});
    const [saving, setSaving]     = useState(false);
    const [saved, setSaved]       = useState(false);
    const [error, setError]       = useState('');
    const [logoPath, setLogoPath] = useState(null);
    const fileRef = useRef(null);

    useEffect(() => {
        if (config) {
            setForm(Object.fromEntries(CHAMPS.map(c => [c.key, config[c.key] ?? ''])));
            setLogoPath(config.logo_path || null);
        }
    }, [config]);

    const save = async () => {
        setSaving(true); setError(''); setSaved(false);
        try {
            const res = await fetch(`${API_BASE}/courrier_config_api.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.message || 'Erreur serveur');
            onSaved(data.data);
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch (e) {
            setError('Sauvegarde impossible : ' + e.message);
        } finally {
            setSaving(false);
        }
    };

    const uploadLogo = async (file) => {
        if (!file) return;
        setError('');
        try {
            const fd = new FormData();
            fd.append('logo', file);
            const res = await fetch(`${API_BASE}/courrier_config_api.php`, {
                method: 'POST',
                credentials: 'include',
                body: fd,
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.message || 'Erreur serveur');
            setLogoPath(data.logo_path);
            onSaved({ ...(config || {}), ...form, logo_path: data.logo_path });
        } catch (e) {
            setError('Upload du logo impossible : ' + e.message);
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 md:p-6 max-w-3xl">
            <h3 className="font-bold text-[#1a1a1a] mb-4">Coordonnées du papier à en-tête</h3>

            {/* Logo */}
            <div className="mb-5 flex items-center gap-4">
                <div className="w-32 h-20 bg-gray-50 border border-dashed border-gray-300 rounded-xl flex items-center justify-center overflow-hidden">
                    {logoPath
                        ? <img src={`${API_BASE}/${logoPath}?v=${Date.now()}`} alt="Logo" className="max-w-full max-h-full object-contain" />
                        : <span className="text-xs text-gray-400">Aucun logo</span>}
                </div>
                <div>
                    <button
                        onClick={() => fileRef.current?.click()}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
                    >
                        <Upload size={14} /> {logoPath ? 'Changer le logo' : 'Ajouter le logo'}
                    </button>
                    <p className="text-xs text-gray-400 mt-1">PNG, JPG ou WebP — 2 Mo max</p>
                    <input
                        ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={e => { uploadLogo(e.target.files?.[0]); e.target.value = ''; }}
                    />
                </div>
            </div>

            {/* Champs */}
            <div className="grid md:grid-cols-2 gap-3">
                {CHAMPS.map(({ key, label, placeholder }) => (
                    <div key={key} className={key === 'mentions_legales' || key === 'adresse' ? 'md:col-span-2' : ''}>
                        <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                        <input
                            type="text"
                            value={form[key] ?? ''}
                            placeholder={placeholder}
                            onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#FFB103]"
                        />
                    </div>
                ))}
            </div>

            {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

            <button
                onClick={save}
                disabled={saving}
                className="mt-4 flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#FFB103] text-[#1a1a1a] hover:bg-[#d49400] disabled:opacity-50"
            >
                {saving ? <Loader2 size={15} className="animate-spin" /> : saved ? <Check size={15} /> : <Save size={15} />}
                {saved ? 'Enregistré' : 'Enregistrer'}
            </button>
        </div>
    );
};

export default CourrierReglages;
