// Constantes du module Générateur de courrier

export const TYPES_COURRIER = [
    { value: 'simple',          label: 'Courrier simple' },
    { value: 'recommande',      label: 'Recommandé' },
    { value: 'recommande_ar',   label: 'Recommandé avec AR' },
    { value: 'client',          label: 'Courrier client' },
    { value: 'fournisseur',     label: 'Courrier fournisseur' },
    { value: 'administratif',   label: 'Courrier administratif' },
    { value: 'mise_en_demeure', label: 'Mise en demeure' },
    { value: 'relance',         label: 'Relance' },
    { value: 'sav',             label: 'SAV' },
    { value: 'autre',           label: 'Autre' },
];

export const TONS = [
    { value: 'simple',        label: 'Simple' },
    { value: 'professionnel', label: 'Professionnel' },
    { value: 'ferme',         label: 'Ferme' },
    { value: 'commercial',    label: 'Commercial' },
    { value: 'administratif', label: 'Administratif' },
];

export const TYPES_CONTACT = [
    { value: 'client',         label: 'Client' },
    { value: 'fournisseur',    label: 'Fournisseur' },
    { value: 'administration', label: 'Administration' },
    { value: 'partenaire',     label: 'Partenaire' },
    { value: 'autre',          label: 'Autre' },
];

export const typeCourrierLabel = (v) => TYPES_COURRIER.find(t => t.value === v)?.label ?? v;
export const typeContactLabel  = (v) => TYPES_CONTACT.find(t => t.value === v)?.label ?? v;

// Nom d'affichage d'un contact : « Société (Prénom Nom) » ou l'un des deux
export const contactDisplayName = (c) => {
    if (!c) return '';
    const personne = [c.civilite, c.prenom, c.nom].filter(Boolean).join(' ').trim();
    if (c.societe && personne) return `${c.societe} (${personne})`;
    return c.societe || personne;
};
