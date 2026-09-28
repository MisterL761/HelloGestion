import React, { useState, useMemo, useCallback } from 'react';
import {
    Copy,
    Check,
    RotateCcw,
    FileText,
    Plus,
    Trash2,
    CopyPlus,
    ChevronDown
} from 'lucide-react';


/* =========================================================
   GROUPES
========================================================= */

const GROUPES = {

    depose: {
        titre: 'Dépose',
        type: 'check',
        options: [
            {
                id: 'depose',
                label: "Dépose de l'existant",
                phrase: p =>
                    `Dépose de votre ${p.nom} existant${p.genre === 'f' ? 'e' : ''}.`
            },
            {
                id: 'evacuation',
                label: "Évacuation de l'ancien matériel",
                phrase: () =>
                    "Évacuation de l'ancien matériel."
            },
            {
                id: 'depose_totale',
                label: 'Dépose totale',
                phrase: () =>
                    'Dépose totale.'
            },
            {
                id: 'conservation_dormant',
                label: 'Conservation du dormant existant',
                phrase: () =>
                    'Conservation du dormant existant.'
            },
            {
                id: 'depose_motorisation',
                label: 'Dépose de la motorisation existante',
                phrase: () =>
                    'Dépose de la motorisation existante.'
            }
        ]
    },

    support: {
        titre: 'Support & fixation',
        type: 'check',
        options: [
            {
                id: 'maconnerie',
                label: 'Maçonnerie existante',
                phrase: () =>
                    'Pose sur maçonnerie existante.'
            },
            {
                id: 'visse_cheville',
                label: 'Vissé / chevillé',
                phrase: () =>
                    'Fixation vissée et chevillée.'
            },
            {
                id: 'scellement_chimique',
                label: 'Scellement chimique',
                phrase: () =>
                    'Fixation par scellement chimique.'
            },
            {
                id: 'platines',
                label: 'Platines',
                phrase: () =>
                    'Pose sur platines.'
            },
            {
                id: 'mise_niveau',
                label: 'Mise à niveau et calage',
                phrase: () =>
                    'Mise à niveau et calage.'
            },
            {
                id: 'support_existant',
                label: 'Support existant',
                phrase: () =>
                    'Fixation sur support existant.'
            }
        ]
    },

    raccord: {
        titre: 'Alimentation & raccordement',
        type: 'radio',
        options: [
            {
                id: 'elec_soins',
                label: 'Électrique — par nos soins',
                phrase: () =>
                    'Raccordement électrique par nos soins.'
            },
            {
                id: 'elec_boite',
                label: 'Sous boîte de dérivation',
                phrase: () =>
                    'Raccordement sous boîte de dérivation.'
            },
            {
                id: 'elec_goulotte',
                label: 'Sous goulotte blanche',
                phrase: () =>
                    'Raccordement électrique par nos soins sous goulotte blanche.'
            },
            {
                id: 'elec_existante',
                label: 'Sur alimentation existante',
                phrase: () =>
                    'Raccordement sur alimentation électrique existante.'
            },
            {
                id: 'client',
                label: 'Alimentation à prévoir par le client',
                phrase: () =>
                    'Alimentation électrique à prévoir par le client.'
            },
            {
                id: 'solaire',
                label: 'Solaire — sans raccordement électrique',
                phrase: () =>
                    'Fonctionnement solaire, sans raccordement électrique.'
            }
        ]
    },

    moto: {
        titre: 'Motorisation — réglages',
        type: 'check',
        options: [
            {
                id: 'reglage',
                label: 'Réglage',
                phrase: () =>
                    'Réglage de la motorisation.'
            },
            {
                id: 'programmation',
                label: 'Programmation',
                phrase: () =>
                    'Programmation de la motorisation.'
            },
            {
                id: 'miseservice',
                label: 'Mise en service',
                phrase: () =>
                    "Mise en service de l'installation."
            },
            {
                id: 'essai',
                label: 'Essai avec le client',
                phrase: () =>
                    'Essai de fonctionnement réalisé avec le client.'
            }
        ]
    },

    finitions: {
        titre: 'Étanchéité & finitions',
        type: 'check',
        options: [
            {
                id: 'silicone',
                label: 'Étanchéité silicone',
                phrase: () =>
                    'Étanchéité silicone.'
            },
            {
                id: 'compribande',
                label: 'Mousse compribande',
                phrase: () =>
                    'Étanchéité par mousse compribande.'
            },
            {
                id: 'habillage_ext',
                label: 'Habillage extérieur',
                phrase: () =>
                    'Habillage extérieur.'
            },
            {
                id: 'habillage_int',
                label: 'Habillage intérieur',
                phrase: () =>
                    'Habillage intérieur.'
            },
            {
                id: 'corniere',
                label: 'Cornières de finition',
                phrase: () =>
                    'Pose de cornières de finition.'
            },
            {
                id: 'bavette',
                label: 'Bavette basse',
                phrase: () =>
                    "Mise en place d'une bavette basse."
            }
        ]
    },

    chantier: {
        titre: "Fin d'intervention",
        type: 'check',
        options: [
            {
                id: 'nettoyage',
                label: 'Nettoyage du chantier',
                phrase: () =>
                    "Nettoyage du chantier en fin d'intervention."
            },
            {
                id: 'emballages',
                label: 'Évacuation des emballages',
                phrase: () =>
                    'Évacuation des emballages.'
            }
        ]
    },

    reserves: {
        titre: 'Réserves & exclusions',
        type: 'check',
        options: [
            {
                id: 'reserve_maco',
                label: 'Réserve maçonnerie à prévoir',
                phrase: () =>
                    'Réserve maçonnerie à prévoir.'
            },
            {
                id: 'peinture',
                label: 'Reprise peinture non comprise',
                phrase: () =>
                    'Reprise de peinture non comprise.'
            },
            {
                id: 'vegetaux',
                label: 'Végétaux à supprimer par le client',
                phrase: () =>
                    'Végétaux à supprimer par le client.'
            },
            {
                id: 'acces',
                label: 'Accès chantier à prévoir par le client',
                phrase: () =>
                    'Accès chantier à prévoir par le client.'
            }
        ]
    },

    sav: {
        titre: 'Intervention SAV',
        type: 'check',
        options: [
            {
                id: 'diagnostic',
                label: 'Diagnostic sur site',
                phrase: () =>
                    'Diagnostic réalisé sur site.'
            },
            {
                id: 'remplacement',
                label: 'Remplacement de pièce',
                phrase: () =>
                    'Remplacement de la pièce défectueuse.'
            },
            {
                id: 'reglage_sav',
                label: 'Réglage',
                phrase: () =>
                    'Réglage et remise en fonctionnement.'
            },
            {
                id: 'remise_service',
                label: 'Remise en service',
                phrase: () =>
                    "Remise en service de l'installation."
            },
            {
                id: 'essai_sav',
                label: 'Essai avec le client',
                phrase: () =>
                    'Essai de fonctionnement réalisé avec le client.'
            }
        ]
    }
};


/* =========================================================
   PRODUITS
========================================================= */

const PRODUITS = [

    {
        id: 'fenetre',
        label: 'Fenêtre',
        nom: 'fenêtre',
        genre: 'f',

        pose: [
            ['renovation', 'En rénovation', 'en rénovation'],
            ['depose_totale', 'En dépose totale', 'en dépose totale'],
            ['applique_interieure', 'En applique intérieure', 'en applique intérieure'],
            ['applique_exterieure', 'En applique extérieure', 'en applique extérieure'],
            ['tunnel', 'En tunnel', 'en tunnel']
        ],

        groupes: [
            'depose',
            'support',
            'finitions',
            'chantier',
            'reserves'
        ]
    },

    {
        id: 'porte_entree',
        label: "Porte d'entrée",
        nom: "porte d'entrée",
        genre: 'f',

        pose: [
            ['renovation', 'En rénovation', 'en rénovation'],
            ['depose_totale', 'En dépose totale', 'en dépose totale'],
            ['neuf', 'En neuf (tunnel)', 'en neuf, pose en tunnel'],
            ['applique', 'En applique', 'en applique']
        ],

        groupes: [
            'depose',
            'support',
            'finitions',
            'chantier',
            'reserves'
        ]
    },

    {
        id: 'volet',
        label: 'Volet roulant',
        nom: 'volet roulant',
        genre: 'm',

        pose: [
            ['renovation', 'En rénovation', 'en rénovation'],
            ['applique', 'En applique extérieure', 'en applique extérieure'],
            ['linteau', 'Sous linteau', 'sous linteau'],
            ['entremurs', 'Entre murs', 'entre murs']
        ],

        groupes: [
            'depose',
            'support',
            'raccord',
            'moto',
            'finitions',
            'chantier',
            'reserves'
        ]
    },

    {
        id: 'volet_battant',
        label: 'Volet battant',
        nom: 'volet battant',
        genre: 'm',

        pose: [
            ['applique', 'En applique', 'en applique'],
            ['gonds', 'Sur gonds existants', 'sur gonds existants']
        ],

        groupes: [
            'depose',
            'support',
            'finitions',
            'chantier',
            'reserves'
        ]
    },

    {
        id: 'porte_garage',
        label: 'Porte de garage',
        nom: 'porte de garage',
        genre: 'f',

        pose: [
            ['linteau', 'Sous linteau', 'sous linteau'],
            ['tableau', 'Derrière tableau', 'derrière tableau'],
            ['applique', 'En applique', 'en applique']
        ],

        groupes: [
            'depose',
            'support',
            'raccord',
            'moto',
            'finitions',
            'chantier',
            'reserves'
        ]
    },

    {
        id: 'portail',
        label: 'Portail',
        nom: 'portail',
        genre: 'm',

        pose: [
            ['scellement', 'Scellement des poteaux', 'avec scellement des poteaux'],
            ['platines', 'Sur platines', 'sur platines']
        ],

        groupes: [
            'depose',
            'support',
            'raccord',
            'moto',
            'chantier',
            'reserves'
        ]
    },

    {
        id: 'cloture',
        label: 'Clôture',
        nom: 'clôture',
        genre: 'f',

        pose: [
            ['scellement', 'Scellement', 'avec scellement'],
            ['platines', 'Sur platines', 'sur platines']
        ],

        groupes: [
            'depose',
            'support',
            'chantier',
            'reserves'
        ]
    },

    {
        id: 'store',
        label: 'Store banne',
        nom: 'store banne',
        genre: 'm',

        pose: [
            ['mur', 'Fixation murale', 'en fixation murale'],
            ['plafond', 'Fixation au plafond', 'en fixation au plafond'],
            ['sousface', 'Sous-face de toit', 'en sous-face de toit']
        ],

        groupes: [
            'depose',
            'support',
            'raccord',
            'moto',
            'chantier',
            'reserves'
        ]
    },

    {
        id: 'pergola',
        label: 'Pergola',
        nom: 'pergola',
        genre: 'f',

        pose: [
            ['adossee', 'Adossée', 'en version adossée'],
            ['autoportee', 'Autoportée', 'en version autoportée']
        ],

        groupes: [
            'support',
            'raccord',
            'moto',
            'chantier',
            'reserves'
        ]
    },

    {
        id: 'garde_corps',
        label: 'Garde-corps',
        nom: 'garde-corps',
        genre: 'm',

        pose: [
            [
                'francaise',
                'À la française (dessus de dalle)',
                'à la française, sur le dessus de dalle'
            ],
            [
                'anglaise',
                "À l'anglaise (en tableau)",
                "à l'anglaise, en tableau"
            ],
            [
                'platines',
                'Sur platines',
                'sur platines'
            ]
        ],

        groupes: [
            'depose',
            'support',
            'chantier',
            'reserves'
        ]
    },

    {
        id: 'sav',
        label: 'SAV / intervention',
        nom: 'intervention',
        genre: 'f',

        pose: null,

        groupes: [
            'sav',
            'chantier'
        ]
    }
];


/* =========================================================
   CONFIGURATION VIDE
========================================================= */

const emptyConfig = () => ({
    qty: 1,
    unit: 'unité(s)',
    repere: '',
    checks: {},
    radios: {},
    motorisation: '',
    particular: '',
    excluded: ''
});


/* =========================================================
   OPTION CHECKBOX / RADIO
========================================================= */

function OptionRow({
    type,
    checked,
    onChange,
    label
}) {

    return (
        <button
            type="button"
            onClick={onChange}
            className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg cursor-pointer select-none hover:bg-gray-50 transition-colors text-left"
        >

            <span
                className={`flex-none w-5 h-5 grid place-items-center border-2 transition-all ${
                    type === 'radio'
                        ? 'rounded-full'
                        : 'rounded-md'
                } ${
                    checked
                        ? 'bg-[#FFB103] border-[#FFB103]'
                        : 'bg-white border-gray-300'
                }`}
            >

                {checked && (
                    <Check
                        size={13}
                        strokeWidth={3.5}
                        className="text-[#1a1a1a]"
                    />
                )}

            </span>

            <span
                className={`text-sm ${
                    checked
                        ? 'font-semibold text-gray-900'
                        : 'text-gray-700'
                }`}
            >
                {label}
            </span>

        </button>
    );
}


/* =========================================================
   GÉNÉRATION DU DESCRIPTIF
========================================================= */

function genererProduit(item) {

    const {
        produit,
        qty,
        unit,
        repere,
        pose,
        radios,
        checks,
        motorisation,
        particular,
        excluded
    } = item;

    const parts = [];

    const quantite =
        Math.max(
            1,
            Number(qty) || 1
        );

    const nomProduit =
        quantite > 1
            ? `${produit.label}s`
            : produit.label;


    /* Produit */

    let ligneProduit =
        `Pose de ${quantite} ${nomProduit.toLowerCase()}`;

    if (
        unit &&
        unit !== 'unité(s)'
    ) {
        ligneProduit += ` (${unit})`;
    }

    parts.push(
        `${ligneProduit}.`
    );


    /* Repère */

    if (repere) {
        parts.push(
            `Repère : ${repere}.`
        );
    }


    /* Dépose */

    if (checks?.depose) {
        parts.push(
            `Dépose de votre ${produit.nom} existant${produit.genre === 'f' ? 'e' : ''}.`
        );
    }

    if (checks?.evacuation) {
        parts.push(
            "Évacuation de l'ancien matériel."
        );
    }

    if (checks?.depose_totale) {
        parts.push(
            'Dépose totale.'
        );
    }

    if (checks?.conservation_dormant) {
        parts.push(
            'Conservation du dormant existant.'
        );
    }

    if (checks?.depose_motorisation) {
        parts.push(
            'Dépose de la motorisation existante.'
        );
    }


    /* Type de pose */

    if (
        pose &&
        produit.pose
    ) {

        const option =
            produit.pose.find(
                option =>
                    option[0] === pose
            );

        if (option) {
            parts.push(
                `Pose ${option[2]}.`
            );
        }
    }


    /* Support */

    GROUPES.support.options.forEach(
        option => {

            if (
                checks?.[
                    option.id
                ]
            ) {
                parts.push(
                    option.phrase(
                        produit
                    )
                );
            }

        }
    );


    /* Raccordement */

    if (radios?.raccord) {

        const option =
            GROUPES.raccord.options.find(
                option =>
                    option.id ===
                    radios.raccord
            );

        if (option) {
            parts.push(
                option.phrase(
                    produit
                )
            );
        }
    }


    /* Motorisation */

    if (motorisation) {
        parts.push(
            `Motorisation : ${motorisation}.`
        );
    }


    GROUPES.moto.options.forEach(
        option => {

            if (
                checks?.[
                    option.id
                ]
            ) {
                parts.push(
                    option.phrase(
                        produit
                    )
                );
            }

        }
    );


    /* Finitions */

    GROUPES.finitions.options.forEach(
        option => {

            if (
                checks?.[
                    option.id
                ]
            ) {
                parts.push(
                    option.phrase(
                        produit
                    )
                );
            }

        }
    );


    /* Chantier */

    GROUPES.chantier.options.forEach(
        option => {

            if (
                checks?.[
                    option.id
                ]
            ) {
                parts.push(
                    option.phrase(
                        produit
                    )
                );
            }

        }
    );


    /* Réserves */

    GROUPES.reserves.options.forEach(
        option => {

            if (
                checks?.[
                    option.id
                ]
            ) {
                parts.push(
                    option.phrase(
                        produit
                    )
                );
            }

        }
    );


    /* SAV */

    GROUPES.sav.options.forEach(
        option => {

            if (
                checks?.[
                    option.id
                ]
            ) {
                parts.push(
                    option.phrase(
                        produit
                    )
                );
            }

        }
    );


    /* Particularité */

    if (particular) {
        parts.push(
            `Particularité chantier : ${particular}.`
        );
    }


    /* Non compris */

    if (excluded) {
        parts.push(
            `Prestations non comprises : ${excluded}.`
        );
    }


    return parts.join(' ');
}


/* =========================================================
   COMPOSANT
========================================================= */

const GenerateurDescriptifs = () => {

    const [produitId, setProduitId] =
        useState(
            PRODUITS[0].id
        );

    const [config, setConfig] =
        useState(
            emptyConfig()
        );

    const [chantier, setChantier] =
        useState([]);

    const [manualText, setManualText] =
        useState(null);

    const [copied, setCopied] =
        useState(false);


    const produit =
        useMemo(
            () =>
                PRODUITS.find(
                    p =>
                        p.id ===
                        produitId
                ),
            [produitId]
        );


    /* =====================================================
       CHANGER PRODUIT
    ===================================================== */

    const changerProduit = id => {

        setProduitId(id);

        setConfig(
            emptyConfig()
        );

        setManualText(null);
        setCopied(false);
    };


    /* =====================================================
       UPDATE
    ===================================================== */

    const updateConfig = updater => {

        setConfig(
            current =>
                updater(current)
        );

        setManualText(null);
        setCopied(false);
    };


    /* =====================================================
       CHECKBOX
    ===================================================== */

    const toggleCheck = id => {

        updateConfig(
            current => {

                const checks = {
                    ...current.checks
                };

                if (checks[id]) {
                    delete checks[id];
                } else {
                    checks[id] = true;
                }

                return {
                    ...current,
                    checks
                };

            }
        );
    };


    /* =====================================================
       RADIO
    ===================================================== */

    const setRadio = (
        group,
        value
    ) => {

        updateConfig(
            current => ({
                ...current,

                radios: {
                    ...current.radios,
                    [group]: value
                }
            })
        );
    };


    /* =====================================================
       CHAMP
    ===================================================== */

    const setField = (
        field,
        value
    ) => {

        updateConfig(
            current => ({
                ...current,
                [field]: value
            })
        );
    };


    /* =====================================================
       AJOUTER AU CHANTIER
    ===================================================== */

    const ajouterAuChantier = () => {

        setChantier(
            current => [
                ...current,

                {
                    produit,

                    ...config,

                    checks: {
                        ...config.checks
                    },

                    radios: {
                        ...config.radios
                    }
                }
            ]
        );

        setConfig(
            emptyConfig()
        );

        setManualText(null);
        setCopied(false);
    };


    /* =====================================================
       DUPLIQUER
    ===================================================== */

    const dupliquer = () => {

        setChantier(
            current => [
                ...current,

                {
                    produit,

                    ...config,

                    checks: {
                        ...config.checks
                    },

                    radios: {
                        ...config.radios
                    }
                }
            ]
        );

        setManualText(null);
        setCopied(false);
    };


    /* =====================================================
       SUPPRIMER
    ===================================================== */

    const supprimer = index => {

        setChantier(
            current =>
                current.filter(
                    (_, i) =>
                        i !== index
                )
        );

        setManualText(null);
        setCopied(false);
    };


    /* =====================================================
       VIDER
    ===================================================== */

    const viderChantier = () => {

        setChantier([]);

        setManualText(null);
        setCopied(false);
    };


    /* =====================================================
       RESET
    ===================================================== */

    const reset = () => {

        setProduitId(
            PRODUITS[0].id
        );

        setConfig(
            emptyConfig()
        );

        setChantier([]);

        setManualText(null);
        setCopied(false);
    };


    /* =====================================================
       DESCRIPTIF
    ===================================================== */

    const autoText =
        useMemo(
            () =>
                chantier
                    .map(
                        genererProduit
                    )
                    .join('\n\n'),
            [chantier]
        );


    const text =
        manualText ??
        autoText;


    /* =====================================================
       TOTAL
    ===================================================== */

    const totalProduits =
        useMemo(
            () =>
                chantier.reduce(
                    (total, item) =>
                        total +
                        (
                            Number(
                                item.qty
                            ) || 1
                        ),
                    0
                ),
            [chantier]
        );


    /* =====================================================
       COPIER
    ===================================================== */

    const copier =
        useCallback(
            async () => {

                const value =
                    text.trim();

                if (!value) {
                    return;
                }

                try {

                    await navigator.clipboard.writeText(
                        value
                    );

                } catch {

                    const textarea =
                        document.createElement(
                            'textarea'
                        );

                    textarea.value =
                        value;

                    textarea.style.position =
                        'fixed';

                    textarea.style.opacity =
                        '0';

                    document.body.appendChild(
                        textarea
                    );

                    textarea.select();

                    try {
                        document.execCommand(
                            'copy'
                        );
                    } catch {
                        // Rien
                    }

                    textarea.remove();
                }

                setCopied(true);

                setTimeout(
                    () =>
                        setCopied(false),
                    1800
                );

            },
            [text]
        );


    /* =====================================================
       AFFICHAGE
    ===================================================== */

    return (
        <div className="max-w-6xl mx-auto">

            {/* TITRE */}

            <div className="flex items-center gap-3 mb-1">

                <FileText
                    size={22}
                    className="text-[#FFB103]"
                />

                <h1 className="text-xl font-bold text-gray-900">
                    Générateur de descriptifs de pose
                </h1>

            </div>


            <p className="text-sm text-gray-500 mb-5">
                Configurez un produit, ajoutez-le au chantier,
                puis passez au produit suivant.
            </p>


            {/* PRODUITS */}

            <div className="flex flex-wrap gap-2 mb-5">

                {PRODUITS.map(
                    p => {

                        const active =
                            p.id ===
                            produitId;

                        return (

                            <button
                                key={p.id}
                                type="button"
                                onClick={() =>
                                    changerProduit(
                                        p.id
                                    )
                                }
                                className={`px-3.5 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                                    active
                                        ? 'bg-[#1a1a1a] text-white shadow-sm'
                                        : 'bg-white text-gray-600 border border-gray-200 hover:border-[#FFB103]/60 hover:text-amber-700'
                                }`}
                            >
                                {p.label}
                            </button>

                        );

                    }
                )}

            </div>


            {/* NOTE */}

            <div className="bg-[#fff7ed] border border-orange-200 text-orange-800 rounded-xl px-4 py-3 mb-5 text-sm">

                <strong>
                    Principe :
                </strong>{' '}

                configurez le produit,
                cliquez sur{' '}

                <strong>
                    Ajouter au chantier
                </strong>

                , puis choisissez
                un autre produit.

                <br />

                Chaque produit ajouté garde
                sa propre configuration.

            </div>


            {/* ACTIONS */}

            <div className="flex flex-wrap gap-2 mb-5">

                <button
                    type="button"
                    onClick={
                        ajouterAuChantier
                    }
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FFB103] text-[#1a1a1a] font-bold text-sm hover:bg-amber-400 transition-colors"
                >
                    <Plus size={17} />

                    Ajouter au chantier

                </button>


                <button
                    type="button"
                    onClick={dupliquer}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 font-semibold text-sm hover:border-gray-300 transition-colors"
                >
                    <CopyPlus size={16} />

                    Dupliquer

                </button>


                <button
                    type="button"
                    onClick={reset}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 font-semibold text-sm hover:border-gray-300 transition-colors"
                >
                    <RotateCcw size={16} />

                    Réinitialiser

                </button>

            </div>


            {/* CONTENU */}

            <div className="grid lg:grid-cols-[1.45fr_.85fr] gap-5 items-start">


                {/* =================================================
                   GAUCHE
                ================================================= */}

                <div className="space-y-4">


                    {/* PRODUIT & QUANTITÉ */}

                    <div className="bg-white border border-gray-200 rounded-2xl p-5">

                        <h2 className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-4">
                            Produit & quantité
                        </h2>


                        <div className="grid md:grid-cols-2 gap-4">

                            <div>

                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Produit
                                </label>

                                <input
                                    value={
                                        produit.label
                                    }
                                    readOnly
                                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm"
                                />

                            </div>


                            <div>

                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Quantité
                                </label>


                                <div className="flex gap-2">

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setField(
                                                'qty',
                                                Math.max(
                                                    1,
                                                    Number(
                                                        config.qty
                                                    ) - 1
                                                )
                                            )
                                        }
                                        className="w-11 rounded-xl border border-gray-200 bg-white text-xl hover:bg-gray-50"
                                    >
                                        −
                                    </button>


                                    <input
                                        type="number"
                                        min="1"
                                        value={
                                            config.qty
                                        }
                                        onChange={
                                            e =>
                                                setField(
                                                    'qty',
                                                    Math.max(
                                                        1,
                                                        Number(
                                                            e.target.value
                                                        ) || 1
                                                    )
                                                )
                                        }
                                        className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-center"
                                    />


                                    <button
                                        type="button"
                                        onClick={() =>
                                            setField(
                                                'qty',
                                                Number(
                                                    config.qty
                                                ) + 1
                                            )
                                        }
                                        className="w-11 rounded-xl border border-gray-200 bg-white text-xl hover:bg-gray-50"
                                    >
                                        +
                                    </button>

                                </div>

                            </div>

                        </div>


                        <div className="grid md:grid-cols-2 gap-4 mt-4">


                            {/* UNITÉ */}

                            <div>

                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Unité
                                </label>


                                <div className="relative">

                                    <select
                                        value={
                                            config.unit
                                        }
                                        onChange={
                                            e =>
                                                setField(
                                                    'unit',
                                                    e.target.value
                                                )
                                        }
                                        className="w-full appearance-none px-3 py-2.5 pr-10 rounded-xl border border-gray-200 text-sm bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#FFB103]/40"
                                    >

                                        <option>
                                            unité(s)
                                        </option>

                                        <option>
                                            ml
                                        </option>

                                        <option>
                                            m²
                                        </option>

                                        <option>
                                            panneau(x)
                                        </option>

                                        <option>
                                            ensemble(s)
                                        </option>

                                    </select>


                                    <ChevronDown
                                        size={18}
                                        strokeWidth={2}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"
                                    />

                                </div>

                            </div>


                            {/* REPÈRE */}

                            <div>

                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Repère / pièce
                                </label>

                                <input
                                    type="text"
                                    value={
                                        config.repere
                                    }
                                    onChange={
                                        e =>
                                            setField(
                                                'repere',
                                                e.target.value
                                            )
                                    }
                                    placeholder="Ex. RDC façade avant"
                                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm"
                                />

                            </div>

                        </div>

                    </div>


                    {/* TYPE DE POSE */}

                    {produit.pose && (

                        <div className="bg-white border border-gray-200 rounded-2xl p-5">

                            <h2 className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-2">

                                Type de pose

                                <span className="text-gray-400 font-medium normal-case tracking-normal">
                                    {' '}— un seul
                                </span>

                            </h2>


                            <div className="grid md:grid-cols-2">

                                {produit.pose.map(
                                    option => (

                                        <OptionRow
                                            key={
                                                option[0]
                                            }
                                            type="radio"
                                            label={
                                                option[1]
                                            }
                                            checked={
                                                config
                                                    .radios
                                                    .pose ===
                                                option[0]
                                            }
                                            onChange={() =>
                                                setRadio(
                                                    'pose',
                                                    option[0]
                                                )
                                            }
                                        />

                                    )
                                )}

                            </div>

                        </div>

                    )}


                    {/* GROUPES */}

                    {produit.groupes.map(
                        groupKey => {

                            const groupe =
                                GROUPES[
                                    groupKey
                                ];

                            if (!groupe) {
                                return null;
                            }

                            const isRadio =
                                groupe.type ===
                                'radio';


                            return (

                                <div
                                    key={
                                        groupKey
                                    }
                                    className="bg-white border border-gray-200 rounded-2xl p-5"
                                >

                                    <h2 className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-2">

                                        {
                                            groupe.titre
                                        }

                                        {isRadio && (
                                            <span className="text-gray-400 font-medium normal-case tracking-normal">
                                                {' '}— un seul
                                            </span>
                                        )}

                                    </h2>


                                    <div className="grid md:grid-cols-2">

                                        {groupe.options.map(
                                            option => (

                                                <OptionRow
                                                    key={
                                                        option.id
                                                    }
                                                    type={
                                                        isRadio
                                                            ? 'radio'
                                                            : 'checkbox'
                                                    }
                                                    label={
                                                        option.label
                                                    }
                                                    checked={
                                                        isRadio
                                                            ? config
                                                                .radios[
                                                                    groupKey
                                                                ] ===
                                                              option.id
                                                            : !!config
                                                                .checks[
                                                                    option.id
                                                                ]
                                                    }
                                                    onChange={() =>
                                                        isRadio
                                                            ? setRadio(
                                                                groupKey,
                                                                option.id
                                                            )
                                                            : toggleCheck(
                                                                option.id
                                                            )
                                                    }
                                                />

                                            )
                                        )}

                                    </div>

                                </div>

                            );

                        }
                    )}


                    {/* MOTORISATION */}

                    {produit.groupes.includes(
                        'moto'
                    ) && (

                        <div className="bg-white border border-gray-200 rounded-2xl p-5">

                            <h2 className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-3">
                                Type de motorisation
                            </h2>


                            <select
                                value={
                                    config.motorisation
                                }
                                onChange={
                                    e =>
                                        setField(
                                            'motorisation',
                                            e.target.value
                                        )
                                }
                                className="w-full appearance-none px-3 py-2.5 rounded-xl border border-gray-200 text-sm"
                            >

                                <option value="">
                                    Aucune / manuel
                                </option>

                                <option>
                                    Électrique filaire
                                </option>

                                <option>
                                    Électrique radio
                                </option>

                                <option>
                                    Somfy IO
                                </option>

                                <option>
                                    Somfy RTS
                                </option>

                                <option>
                                    Solaire
                                </option>

                            </select>

                        </div>

                    )}


                    {/* PARTICULARITÉS */}

                    <div className="bg-white border border-gray-200 rounded-2xl p-5">

                        <h2 className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-4">
                            Particularités / non compris
                        </h2>


                        <div className="grid md:grid-cols-2 gap-4">

                            <div>

                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Particularité chantier
                                </label>

                                <textarea
                                    value={
                                        config.particular
                                    }
                                    onChange={
                                        e =>
                                            setField(
                                                'particular',
                                                e.target.value
                                            )
                                    }
                                    rows={4}
                                    placeholder="Ex. passage du câble derrière le doublage..."
                                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm resize-y"
                                />

                            </div>


                            <div>

                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Prestations non comprises
                                </label>

                                <textarea
                                    value={
                                        config.excluded
                                    }
                                    onChange={
                                        e =>
                                            setField(
                                                'excluded',
                                                e.target.value
                                            )
                                    }
                                    rows={4}
                                    placeholder="Ex. peinture, enduit, alimentation électrique..."
                                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm resize-y"
                                />

                            </div>

                        </div>

                    </div>


                    {/* AJOUT */}

                    <button
                        type="button"
                        onClick={
                            ajouterAuChantier
                        }
                        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#FFB103] text-[#1a1a1a] font-bold text-sm hover:bg-amber-400 transition-colors"
                    >

                        <Plus size={18} />

                        Ajouter ce produit au chantier

                    </button>

                </div>


                {/* =================================================
                   DROITE
                ================================================= */}

                <aside className="lg:sticky lg:top-5 space-y-4">


                    {/* COMPOSITION */}

                    <div className="bg-white border border-gray-200 rounded-2xl p-5">

                        <div className="flex items-center justify-between mb-4">

                            <div>

                                <h2 className="text-sm font-bold text-gray-900">
                                    Composition du chantier
                                </h2>

                                <p className="text-xs text-gray-500 mt-1">
                                    {
                                        chantier.length
                                    } ligne(s)
                                </p>

                            </div>


                            {chantier.length > 0 && (

                                <button
                                    type="button"
                                    onClick={
                                        viderChantier
                                    }
                                    className="text-xs font-semibold text-red-600 hover:text-red-700"
                                >
                                    Vider
                                </button>

                            )}

                        </div>


                        {chantier.length === 0 ? (

                            <div className="text-sm text-gray-400 py-4">
                                Aucun produit ajouté pour le moment.
                            </div>

                        ) : (

                            <div className="space-y-2">

                                {chantier.map(
                                    (
                                        item,
                                        index
                                    ) => {

                                        const pose =
                                            item.produit.pose?.find(
                                                p =>
                                                    p[0] ===
                                                    item.radios.pose
                                            );

                                        return (

                                            <div
                                                key={
                                                    index
                                                }
                                                className="border border-gray-200 rounded-xl p-3 flex items-center justify-between gap-3"
                                            >

                                                <div className="min-w-0">

                                                    <div className="font-bold text-sm text-gray-900">

                                                        {
                                                            item.qty
                                                        }{' '}

                                                        ×{' '}

                                                        {
                                                            item.produit.label
                                                        }

                                                    </div>


                                                    <div className="text-xs text-gray-500 mt-1">

                                                        {
                                                            pose?.[1] ||
                                                            'Configuration à préciser'
                                                        }

                                                        {item.repere &&
                                                            ` — ${item.repere}`
                                                        }

                                                    </div>

                                                </div>


                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        supprimer(
                                                            index
                                                        )
                                                    }
                                                    className="flex-none p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                    title="Supprimer"
                                                >

                                                    <Trash2
                                                        size={
                                                            15
                                                        }
                                                    />

                                                </button>

                                            </div>

                                        );

                                    }
                                )}

                            </div>

                        )}

                    </div>


                    {/* DESCRIPTIF */}

                    <div className="bg-[#1a1a1a] rounded-2xl p-5">

                        <h2 className="text-white font-bold text-sm mb-1">
                            Descriptif généré
                        </h2>

                        <p className="text-[11px] text-gray-400 mb-3">
                            Le texte regroupe uniquement les produits ajoutés au chantier.
                        </p>


                        <textarea
                            value={
                                text
                            }
                            onChange={
                                e =>
                                    setManualText(
                                        e.target.value
                                    )
                            }
                            placeholder="Ajoutez un ou plusieurs produits au chantier..."
                            spellCheck
                            className="w-full min-h-[420px] rounded-xl bg-[#111] text-gray-100 text-sm leading-relaxed p-3.5 resize-y border border-gray-700 focus:outline-none focus:ring-2 focus:ring-[#FFB103] placeholder:text-gray-600"
                        />


                        <div className="flex gap-2 mt-3">

                            <button
                                type="button"
                                onClick={
                                    copier
                                }
                                disabled={
                                    !text.trim()
                                }
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                                    copied
                                        ? 'bg-green-600 text-white'
                                        : 'bg-[#FFB103] text-[#1a1a1a] hover:bg-amber-400'
                                }`}
                            >

                                {copied ? (

                                    <>
                                        <Check
                                            size={
                                                16
                                            }
                                            strokeWidth={
                                                3
                                            }
                                        />

                                        Copié !

                                    </>

                                ) : (

                                    <>
                                        <Copy
                                            size={
                                                16
                                            }
                                        />

                                        Copier le descriptif

                                    </>

                                )}

                            </button>

                        </div>


                        <p className="text-[11px] text-gray-500 mt-3 text-right">

                            <span className="text-[#FFB103] font-semibold">
                                {
                                    totalProduits
                                }
                            </span>{' '}

                            produit(s) dans le chantier

                        </p>

                    </div>

                </aside>

            </div>

        </div>
    );
};


export default GenerateurDescriptifs;