import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
    Copy,
    Check,
    RotateCcw,
    FileText,
    Plus,
    Trash2,
    CopyPlus,
    ChevronDown,
    Pencil,
    Settings,
    X
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
   OPTIONS DE MOTORISATION
========================================================= */

const MOTORISATION_OPTIONS = [
    'Électrique filaire',
    'Électrique radio',
    'Somfy IO',
    'Somfy RTS',
    'Solaire'
];


/* =========================================================
   PERSONNALISATION DES RUBRIQUES
========================================================= */

const CUSTOM_STORAGE_KEY =
    'helloGestion_generateurDescriptifs_personnalisation_v2';

const emptyCustomisations = () => ({
    groups: {},
    products: {},
    motorisations: {
        overrides: {},
        deleted: [],
        added: []
    }
});

const slugify = value =>
    String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

const ensurePeriod = value => {
    const clean = String(value || '').trim();
    if (!clean) return '';
    return /[.!?]$/.test(clean)
        ? clean
        : `${clean}.`;
};

// Pour les nouveaux types de pose, le descriptif est construit automatiquement
// à partir du nom affiché : « Créneau » devient « en créneau ».
const buildPosePhraseFromLabel = label => {
    const clean = String(label || '').trim();
    if (!clean) return '';

    const lower = clean.toLowerCase();

    if (/^(en|à|au|aux|sur|sous|entre|derrière|avec|sans)\b/.test(lower)) {
        return lower;
    }

    return `en ${lower}`;
};

const getGroupCustom = (customisations, groupKey) =>
    customisations.groups?.[groupKey] || {
        overrides: {},
        deleted: [],
        added: []
    };

const getPoseCustom = (customisations, productId) =>
    customisations.products?.[productId]?.pose || {
        overrides: {},
        deleted: [],
        added: []
    };

const getEffectiveGroupOptions = (
    customisations,
    groupKey,
    produit
) => {
    const base = GROUPES[groupKey];
    if (!base) return [];

    const custom = getGroupCustom(
        customisations,
        groupKey
    );

    const deleted = new Set(
        custom.deleted || []
    );

    const options = base.options
        .filter(option => !deleted.has(option.id))
        .map(option => {
            const override =
                custom.overrides?.[option.id];

            return {
                id: option.id,
                label:
                    override?.label ||
                    option.label,
                phraseText:
                    override?.phrase ||
                    option.phrase(produit),
                customPhrase:
                    !!override?.phrase
            };
        });

    (custom.added || []).forEach(option => {
        options.push({
            ...option,
            phraseText: ensurePeriod(option.label),
            customPhrase: true
        });
    });

    return options;
};

const getEffectivePoseOptions = (
    customisations,
    product
) => {
    if (!product?.pose) return [];

    const custom = getPoseCustom(
        customisations,
        product.id
    );

    const deleted = new Set(
        custom.deleted || []
    );

    const options = product.pose
        .filter(option => !deleted.has(option[0]))
        .map(option => {
            const override =
                custom.overrides?.[option[0]];

            const label =
                override?.label ||
                option[1];

            return {
                id: option[0],
                label,
                // Une option existante garde sa phrase métier.
                // Si elle est modifiée, son descriptif suit automatiquement
                // le nouveau nom.
                phraseText:
                    override?.label
                        ? buildPosePhraseFromLabel(label)
                        : option[2],
                customPhrase: !!override?.label
            };
        });

    (custom.added || []).forEach(option => {
        options.push({
            id: option.id,
            label: option.label,
            phraseText: buildPosePhraseFromLabel(
                option.label
            ),
            customPhrase: true
        });
    });

    return options;
};

const getEffectiveMotorisations = (
    customisations
) => {
    const custom =
        customisations.motorisations ||
        {};

    const deleted = new Set(
        custom.deleted || []
    );

    const options = MOTORISATION_OPTIONS
        .filter(
            option =>
                !deleted.has(option)
        )
        .map(option => ({
            id: option,
            label:
                custom.overrides?.[option]
                    ?.label ||
                option
        }));

    (custom.added || []).forEach(
        option => {
            options.push({
                id: option.id,
                label: option.label
            });
        }
    );

    return options;
};

/* =========================================================
   OPTION CHECKBOX / RADIO
========================================================= */

function OptionRow({
    type,
    checked,
    onChange,
    label,
    onEdit,
    onDelete,
    showActions = true,
    canEdit = true,
    canDelete = true
}) {

    return (
        <div className="w-full flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">

            <button
                type="button"
                onClick={onChange}
                className="flex-1 min-w-0 flex items-center gap-3 cursor-pointer select-none text-left"
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
                    } truncate`}
                >
                    {label}
                </span>
            </button>

            {showActions && (
                <>
                    {showActions && (
                    <>
                        <button
                            type="button"
                            onClick={onEdit}
                            title={canEdit ? "Modifier" : "Modifier — droit requis"}
                            className={`flex-none p-1.5 rounded-lg transition-colors ${
                                canEdit
                                    ? 'text-gray-400 hover:text-amber-700 hover:bg-amber-50'
                                    : 'text-gray-300 hover:text-amber-700 hover:bg-amber-50'
                            }`}
                        >
                            <Pencil size={14} />
                        </button>

                        <button
                            type="button"
                            onClick={onDelete}
                            title={canDelete ? "Supprimer" : "Supprimer — droit requis"}
                            className={`flex-none p-1.5 rounded-lg transition-colors ${
                                canDelete
                                    ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                                    : 'text-gray-300 hover:text-red-600 hover:bg-red-50'
                            }`}
                        >
                            <Trash2 size={14} />
                        </button>
                    </>
                    )}
                </>
            )}

        </div>
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
        poseOptions,
        groupOptions,
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

    let ligneProduit =
        `Pose de ${quantite} ${nomProduit.toLowerCase()}`;

    if (
        unit &&
        unit !== 'unité(s)'
    ) {
        ligneProduit += ` (${unit})`;
    }

    // Le type de pose complète directement la phrase principale.
    // Exemple : option « Créneau » -> « Pose de 1 fenêtre en créneau. »
    if (pose && poseOptions?.length) {
        const option = poseOptions.find(
            item => item.id === pose
        );

        if (option?.phraseText) {
            ligneProduit += ` ${String(option.phraseText).trim()}`;
        }
    }

    parts.push(`${ligneProduit}.`);

    if (repere) {
        parts.push(
            `Repère : ${repere}.`
        );
    }

    const deposes =
        groupOptions?.depose || [];

    deposes.forEach(option => {
        if (checks?.[option.id]) {
            if (
                option.id === 'depose' &&
                !option.customPhrase
            ) {
                parts.push(
                    `Dépose de votre ${produit.nom} existant${produit.genre === 'f' ? 'e' : ''}.`
                );
            } else {
                parts.push(
                    ensurePeriod(
                        option.phraseText
                    )
                );
            }
        }
    });

    [
        'support',
        'raccord',
        'moto',
        'finitions',
        'chantier',
        'reserves',
        'sav'
    ].forEach(groupKey => {

        const options =
            groupOptions?.[groupKey] || [];

        const groupType =
            GROUPES[groupKey]?.type;

        if (groupType === 'radio') {
            const selected =
                options.find(
                    option =>
                        option.id ===
                        radios?.[groupKey]
                );

            if (selected) {
                parts.push(
                    ensurePeriod(
                        selected.phraseText
                    )
                );
            }

            return;
        }

        options.forEach(option => {
            if (checks?.[option.id]) {
                parts.push(
                    ensurePeriod(
                        option.phraseText
                    )
                );
            }
        });
    });

    if (motorisation) {
        parts.push(
            `Motorisation : ${motorisation}.`
        );
    }

    if (particular) {
        parts.push(
            `Particularité chantier : ${particular}.`
        );
    }

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

    const [customisations, setCustomisations] =
        useState(() => {
            try {
                const saved =
                    localStorage.getItem(
                        CUSTOM_STORAGE_KEY
                    );

                return saved
                    ? {
                        ...emptyCustomisations(),
                        ...JSON.parse(saved)
                    }
                    : emptyCustomisations();
            } catch {
                return emptyCustomisations();
            }
        });

    const [editor, setEditor] =
        useState(null);

    /* =====================================================
       DROITS GÉNÉRATEUR
    ===================================================== */

    const [generatorPermissions, setGeneratorPermissions] =
        useState({
            can_add: false,
            can_edit: false,
            can_delete: false
        });

    const [isGeneratorAdmin, setIsGeneratorAdmin] =
        useState(false);

    const [permissionUsers, setPermissionUsers] =
        useState([]);

    const [permissionsManagerOpen, setPermissionsManagerOpen] =
        useState(false);

    const [permissionsLoading, setPermissionsLoading] =
        useState(false);

    const [permissionsSavingId, setPermissionsSavingId] =
        useState(null);

    const [permissionsError, setPermissionsError] =
        useState('');

    const [permissionToast, setPermissionToast] =
        useState('');

    const showPermissionDenied = useCallback((action) => {
        const message =
            `Vous n'avez pas les droits pour ${action}. Veuillez demander les droits à Lotfi pour réaliser cette action.`;

        setPermissionToast(message);

        window.clearTimeout(
            window.__generatorPermissionToastTimer
        );

        window.__generatorPermissionToastTimer =
            window.setTimeout(() => {
                setPermissionToast('');
            }, 4500);
    }, []);

    const PERMISSIONS_API =
        '/hello-gestion/php/generator_permissions.php';

    const loadMyGeneratorPermissions = useCallback(async () => {
        try {
            const response = await fetch(
                `${PERMISSIONS_API}?action=me`,
                {
                    method: 'GET',
                    credentials: 'include',
                    cache: 'no-store'
                }
            );

            if (!response.ok) return;

            const data = await response.json();

            if (data.success) {
                setIsGeneratorAdmin(!!data.is_admin);
                setGeneratorPermissions({
                    can_add: !!data.permissions?.can_add,
                    can_edit: !!data.permissions?.can_edit,
                    can_delete: !!data.permissions?.can_delete
                });
            }
        } catch (error) {
            console.error(
                'Erreur récupération droits générateur :',
                error
            );
        }
    }, []);

    useEffect(() => {
        loadMyGeneratorPermissions();
    }, [loadMyGeneratorPermissions]);

    const loadPermissionUsers = useCallback(async () => {
        setPermissionsLoading(true);
        setPermissionsError('');

        try {
            const response = await fetch(
                `${PERMISSIONS_API}?action=list`,
                {
                    method: 'GET',
                    credentials: 'include',
                    cache: 'no-store'
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message || 'Impossible de récupérer les utilisateurs.'
                );
            }

            setPermissionUsers(
                Array.isArray(data.users)
                    ? data.users
                    : []
            );
        } catch (error) {
            setPermissionsError(
                error?.message ||
                'Erreur lors du chargement des droits.'
            );
        } finally {
            setPermissionsLoading(false);
        }
    }, []);

    const updatePermissionUser = (
        userId,
        field,
        value
    ) => {
        setPermissionUsers(current =>
            current.map(user =>
                Number(user.id) === Number(userId)
                    ? {
                        ...user,
                        permissions: {
                            ...user.permissions,
                            [field]: !!value
                        }
                    }
                    : user
            )
        );
    };

    const saveUserPermissions = async user => {
        setPermissionsSavingId(user.id);
        setPermissionsError('');

        try {
            const response = await fetch(
                PERMISSIONS_API,
                {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        action: 'save',
                        user_id: Number(user.id),
                        can_add: !!user.permissions?.can_add,
                        can_edit: !!user.permissions?.can_edit,
                        can_delete: !!user.permissions?.can_delete
                    })
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message || 'Impossible d’enregistrer les droits.'
                );
            }

            setPermissionToast(
                `Droits de ${user.name || 'l’utilisateur'} enregistrés.`
            );

            setTimeout(() => {
                setPermissionToast('');
            }, 2500);
        } catch (error) {
            setPermissionsError(
                error?.message ||
                'Erreur lors de l’enregistrement des droits.'
            );
        } finally {
            setPermissionsSavingId(null);
        }
    };

    useEffect(() => {
        try {
            localStorage.setItem(
                CUSTOM_STORAGE_KEY,
                JSON.stringify(customisations)
            );
        } catch {
            // Rien
        }
    }, [customisations]);


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


    const poseOptions =
        useMemo(
            () =>
                getEffectivePoseOptions(
                    customisations,
                    produit
                ),
            [customisations, produit]
        );

    const groupOptions =
        useMemo(
            () => {
                const result = {};

                (produit?.groupes || []).forEach(
                    groupKey => {
                        result[groupKey] =
                            getEffectiveGroupOptions(
                                customisations,
                                groupKey,
                                produit
                            );
                    }
                );

                return result;
            },
            [customisations, produit]
        );

    const motorisationOptions =
        useMemo(
            () =>
                getEffectiveMotorisations(
                    customisations
                ),
            [customisations]
        );


    /* =====================================================
       GESTION DES RUBRIQUES
    ===================================================== */

    const openEditor = ({
        scope,
        productId = null,
        groupKey = null,
        id = null,
        label = '',
    }) => {
        setEditor({
            scope,
            productId,
            groupKey,
            id,
            label,
            isNew: !id
        });
    };

    const saveEditor = () => {
        if (!editor) return;

        const label =
            editor.label.trim();

        if (!label) {
            return;
        }

        if (editor.isNew && !isGeneratorAdmin && !generatorPermissions.can_add) {
            showPermissionDenied('ajouter cette option');
            return;
        }

        if (!editor.isNew && !isGeneratorAdmin && !generatorPermissions.can_edit) {
            showPermissionDenied('modifier cette option');
            return;
        }

        const next = {
            ...customisations,
            groups: {
                ...(customisations.groups || {})
            },
            products: {
                ...(customisations.products || {})
            },
            motorisations: {
                ...(customisations.motorisations || {})
            }
        };

        const makeId = () =>
            `${slugify(label) || 'option'}-${Date.now()}`;

        if (editor.scope === 'pose') {
            const current =
                getPoseCustom(
                    customisations,
                    editor.productId
                );

            const data = {
                overrides: {
                    ...(current.overrides || {})
                },
                deleted: [
                    ...(current.deleted || [])
                ],
                added: [
                    ...(current.added || [])
                ]
            };

            if (editor.isNew) {
                data.added.push({
                    id: makeId(),
                    label
                });
            } else {
                const addedIndex =
                    data.added.findIndex(
                        option =>
                            option.id ===
                            editor.id
                    );

                if (addedIndex >= 0) {
                    data.added[addedIndex] = {
                        ...data.added[addedIndex],
                        label
                    };
                } else {
                    data.overrides[editor.id] = {
                        label
                    };
                }
            }

            next.products[editor.productId] = {
                ...(next.products[editor.productId] || {}),
                pose: data
            };
        }

        if (editor.scope === 'group') {
            const current =
                getGroupCustom(
                    customisations,
                    editor.groupKey
                );

            const data = {
                overrides: {
                    ...(current.overrides || {})
                },
                deleted: [
                    ...(current.deleted || [])
                ],
                added: [
                    ...(current.added || [])
                ]
            };

            if (editor.isNew) {
                data.added.push({
                    id: makeId(),
                    label
                });
            } else {
                const addedIndex =
                    data.added.findIndex(
                        option =>
                            option.id ===
                            editor.id
                    );

                if (addedIndex >= 0) {
                    data.added[addedIndex] = {
                        ...data.added[addedIndex],
                        label
                    };
                } else {
                    data.overrides[editor.id] = {
                        label
                    };
                }
            }

            next.groups[editor.groupKey] =
                data;
        }

        if (
            editor.scope ===
            'motorisation'
        ) {
            const current =
                customisations.motorisations ||
                {};

            const data = {
                overrides: {
                    ...(current.overrides || {})
                },
                deleted: [
                    ...(current.deleted || [])
                ],
                added: [
                    ...(current.added || [])
                ]
            };

            if (editor.isNew) {
                data.added.push({
                    id: makeId(),
                    label,
                    phrase: label
                });
            } else {
                const addedIndex =
                    data.added.findIndex(
                        option =>
                            option.id ===
                            editor.id
                    );

                if (addedIndex >= 0) {
                    data.added[addedIndex] = {
                        ...data.added[addedIndex],
                        label
                    };
                } else {
                    data.overrides[editor.id] = {
                        label
                    };
                }
            }

            next.motorisations =
                data;
        }

        setCustomisations(next);
        setEditor(null);
        setManualText(null);
        setCopied(false);
    };

    const deleteRubrique = ({
        scope,
        productId = null,
        groupKey = null,
        id
    }) => {
        if (!isGeneratorAdmin && !generatorPermissions.can_delete) {
            showPermissionDenied('supprimer cette option');
            return;
        }

        if (
            !window.confirm(
                'Supprimer cette rubrique ?'
            )
        ) {
            return;
        }

        const next = {
            ...customisations,
            groups: {
                ...(customisations.groups || {})
            },
            products: {
                ...(customisations.products || {})
            },
            motorisations: {
                ...(customisations.motorisations || {})
            }
        };

        if (scope === 'pose') {
            const current =
                getPoseCustom(
                    customisations,
                    productId
                );

            const added =
                (current.added || [])
                    .filter(
                        option =>
                            option.id !== id
                    );

            const deleted =
                (current.deleted || [])
                    .includes(id)
                    ? current.deleted || []
                    : [
                        ...(current.deleted || []),
                        id
                    ];

            const overrides = {
                ...(current.overrides || {})
            };

            delete overrides[id];

            next.products[productId] = {
                ...(next.products[productId] || {}),
                pose: {
                    overrides,
                    deleted,
                    added
                }
            };

            if (
                config.radios?.pose === id
            ) {
                setConfig(currentConfig => ({
                    ...currentConfig,
                    radios: {
                        ...currentConfig.radios,
                        pose: ''
                    }
                }));
            }
        }

        if (scope === 'group') {
            const current =
                getGroupCustom(
                    customisations,
                    groupKey
                );

            const added =
                (current.added || [])
                    .filter(
                        option =>
                            option.id !== id
                    );

            const deleted =
                (current.deleted || [])
                    .includes(id)
                    ? current.deleted || []
                    : [
                        ...(current.deleted || []),
                        id
                    ];

            const overrides = {
                ...(current.overrides || {})
            };

            delete overrides[id];

            next.groups[groupKey] = {
                overrides,
                deleted,
                added
            };
        }

        if (
            scope ===
            'motorisation'
        ) {
            const current =
                customisations.motorisations ||
                {};

            next.motorisations = {
                overrides: {
                    ...(current.overrides || {})
                },
                deleted: [
                    ...(
                        current.deleted || []
                    ).filter(
                        value =>
                            value !== id
                    ),
                    ...(MOTORISATION_OPTIONS.includes(id)
                        ? [id]
                        : [])
                ],
                added: (
                    current.added || []
                ).filter(
                    option =>
                        option.id !== id
                )
            };

            if (
                config.motorisation === id
            ) {
                setConfig(currentConfig => ({
                    ...currentConfig,
                    motorisation: ''
                }));
            }
        }

        setCustomisations(next);
        setManualText(null);
        setCopied(false);
    };

    const addPose = () => {
        if (!isGeneratorAdmin && !generatorPermissions.can_add) {
            showPermissionDenied('ajouter une option');
            return;
        }

        openEditor({
            scope: 'pose',
            productId: produitId
        });
    };

    const addGroupOption = groupKey => {
        if (!isGeneratorAdmin && !generatorPermissions.can_add) {
            showPermissionDenied('ajouter une option');
            return;
        }

        openEditor({
            scope: 'group',
            groupKey
        });
    };

    const addMotorisation = () => {
        if (!isGeneratorAdmin && !generatorPermissions.can_add) {
            showPermissionDenied('ajouter une motorisation');
            return;
        }

        openEditor({
            scope: 'motorisation'
        });
    };

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
                    },

                    poseOptions: poseOptions.map(
                        option => ({
                            ...option
                        })
                    ),

                    groupOptions: Object.fromEntries(
                        Object.entries(groupOptions)
                            .map(
                                ([key, options]) => [
                                    key,
                                    options.map(
                                        option => ({
                                            ...option
                                        })
                                    )
                                ]
                            )
                    )
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
                    },

                    poseOptions: poseOptions.map(
                        option => ({
                            ...option
                        })
                    ),

                    groupOptions: Object.fromEntries(
                        Object.entries(groupOptions)
                            .map(
                                ([key, options]) => [
                                    key,
                                    options.map(
                                        option => ({
                                            ...option
                                        })
                                    )
                                ]
                            )
                    )
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

            {isGeneratorAdmin && (
                <div className="mb-5">
                    <button
                        type="button"
                        onClick={() => {
                            setPermissionsManagerOpen(true);
                            loadPermissionUsers();
                        }}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1a1a1a] text-white font-bold text-sm hover:bg-black transition-colors"
                    >
                        <Settings size={16} />
                        Gestion des droits
                    </button>
                </div>
            )}

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

                            <div className="flex items-center justify-between mb-2">
                                <h2 className="text-xs font-bold uppercase tracking-wider text-amber-700">
                                    Type de pose
                                    <span className="text-gray-400 font-medium normal-case tracking-normal">
                                        {' '}— un seul
                                    </span>
                                </h2>

                                <button
                                    type="button"
                                    onClick={addPose}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FFB103] text-[#1a1a1a] text-xs font-bold hover:bg-amber-400 transition-colors"
                                >
                                    <Plus size={14} />
                                    Ajouter
                                </button>
                            </div>

                            <p className="text-[11px] text-gray-400 mb-2">
                                Ajoutez, modifiez ou supprimez les types de pose.
                            </p>

                            <div className="grid md:grid-cols-2">
                                {poseOptions.map(
                                    option => (
                                        <OptionRow
                                            key={option.id}
                                            type="radio"
                                            label={option.label}
                                            checked={
                                                config.radios.pose ===
                                                option.id
                                            }
                                            onChange={() =>
                                                setRadio(
                                                    'pose',
                                                    option.id
                                                )
                                            }
                                            onEdit={() =>
                                                openEditor({
                                                    scope: 'pose',
                                                    productId: produitId,
                                                    id: option.id,
                                                    label: option.label,
                                                    phrase: option.phraseText
                                                })
                                            }
                                            onDelete={() =>
                                                deleteRubrique({
                                                    scope: 'pose',
                                                    productId: produitId,
                                                    id: option.id
                                                })
                                            }
                                        canEdit={isGeneratorAdmin || generatorPermissions.can_edit}
                                        canDelete={isGeneratorAdmin || generatorPermissions.can_delete}
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
                                GROUPES[groupKey];

                            if (!groupe) {
                                return null;
                            }

                            const isRadio =
                                groupe.type === 'radio';

                            const options =
                                groupOptions[groupKey] || [];

                            return (
                                <div
                                    key={groupKey}
                                    className="bg-white border border-gray-200 rounded-2xl p-5"
                                >

                                    <div className="flex items-center justify-between mb-2">
                                        <h2 className="text-xs font-bold uppercase tracking-wider text-amber-700">
                                            {groupe.titre}

                                            {isRadio && (
                                                <span className="text-gray-400 font-medium normal-case tracking-normal">
                                                    {' '}— un seul
                                                </span>
                                            )}
                                        </h2>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                addGroupOption(
                                                    groupKey
                                                )
                                            }
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FFB103] text-[#1a1a1a] text-xs font-bold hover:bg-amber-400 transition-colors"
                                        >
                                            <Plus size={14} />
                                            Ajouter
                                        </button>
                                    </div>

                                    <p className="text-[11px] text-gray-400 mb-2">
                                        Ajoutez, modifiez ou supprimez les options de cette rubrique.
                                    </p>

                                    <div className="grid md:grid-cols-2">
                                        {options.map(
                                            option => (
                                                <OptionRow
                                                    key={option.id}
                                                    type={
                                                        isRadio
                                                            ? 'radio'
                                                            : 'checkbox'
                                                    }
                                                    label={option.label}
                                                    checked={
                                                        isRadio
                                                            ? config.radios[groupKey] ===
                                                              option.id
                                                            : !!config.checks[option.id]
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
                                                    onEdit={() =>
                                                        openEditor({
                                                            scope: 'group',
                                                            groupKey,
                                                            id: option.id,
                                                            label: option.label,
                                                            phrase: option.phraseText
                                                        })
                                                    }
                                                    onDelete={() =>
                                                        deleteRubrique({
                                                            scope: 'group',
                                                            groupKey,
                                                            id: option.id
                                                        })
                                                    }
                                                    canEdit={isGeneratorAdmin || generatorPermissions.can_edit}
                                                    canDelete={isGeneratorAdmin || generatorPermissions.can_delete}
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

                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-xs font-bold uppercase tracking-wider text-amber-700">
                                    Type de motorisation
                                </h2>

                                <button
                                    type="button"
                                    onClick={addMotorisation}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FFB103] text-[#1a1a1a] text-xs font-bold hover:bg-amber-400 transition-colors"
                                >
                                    <Plus size={14} />
                                    Ajouter
                                </button>
                            </div>

                            <div className="space-y-1">
                                <OptionRow
                                    type="radio"
                                    label="Aucune / manuel"
                                    checked={
                                        !config.motorisation
                                    }
                                    onChange={() =>
                                        setField(
                                            'motorisation',
                                            ''
                                        )
                                    }
                                    onEdit={() => {}}
                                    onDelete={() => {}}
                                    showActions={false}
                                />

                                {motorisationOptions.map(
                                    option => (
                                        <OptionRow
                                            key={option.id}
                                            type="radio"
                                            label={option.label}
                                            checked={
                                                config.motorisation ===
                                                option.label
                                            }
                                            onChange={() =>
                                                setField(
                                                    'motorisation',
                                                    option.label
                                                )
                                            }
                                            onEdit={() =>
                                                openEditor({
                                                    scope: 'motorisation',
                                                    id: option.id,
                                                    label: option.label,
                                                    phrase: option.label
                                                })
                                            }
                                            onDelete={() =>
                                                deleteRubrique({
                                                    scope: 'motorisation',
                                                    id: option.id
                                                })
                                            }
                                        canEdit={isGeneratorAdmin || generatorPermissions.can_edit}
                                        canDelete={isGeneratorAdmin || generatorPermissions.can_delete}
                                        />
                                    )
                                )}
                            </div>

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
                                            item.poseOptions?.find(
                                                option =>
                                                    option.id ===
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
                                                            pose?.label ||
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


            {permissionToast && (
                <div
                    role="alert"
                    className="fixed top-5 right-5 z-[120] max-w-md bg-red-600 text-white px-5 py-4 rounded-xl shadow-2xl text-sm font-semibold leading-relaxed border border-red-700"
                >
                    {permissionToast}
                </div>
            )}

            {permissionsManagerOpen && isGeneratorAdmin && (
                <div className="fixed inset-0 z-[110] bg-black/50 flex items-center justify-center p-4 overflow-hidden">
                    <div className="w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                        <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-white">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Gestion des droits</h3>
                                <p className="text-xs text-gray-500 mt-1">
                                    Lotfi est le seul administrateur de cette gestion.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setPermissionsManagerOpen(false)}
                                className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="flex-1 min-h-0 overflow-y-auto p-5">
                            {permissionsError && (
                                <div className="mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
                                    {permissionsError}
                                </div>
                            )}

                            {permissionsLoading ? (
                                <div className="py-10 text-center text-sm text-gray-500">Chargement des utilisateurs…</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="sticky top-0 z-10 bg-white">
                                            <tr className="text-left border-b border-gray-200">
                                                <th className="py-3 pr-4 font-bold">Utilisateur</th>
                                                <th className="py-3 px-3 text-center font-bold">Ajouter</th>
                                                <th className="py-3 px-3 text-center font-bold">Modifier</th>
                                                <th className="py-3 px-3 text-center font-bold">Supprimer</th>
                                                <th className="py-3 pl-3 text-right font-bold">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {permissionUsers.map(user => (
                                                <tr key={user.id} className="border-b border-gray-100">
                                                    <td className="py-3 pr-4">
                                                        <div className="font-semibold text-gray-900">{user.name}</div>
                                                        <div className="text-xs text-gray-500">{user.position || user.role || ''}</div>
                                                    </td>
                                                    {['can_add','can_edit','can_delete'].map(field => (
                                                        <td key={field} className="py-3 px-3 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={!!user.permissions?.[field]}
                                                                onChange={e => updatePermissionUser(user.id, field, e.target.checked)}
                                                                className="w-4 h-4 accent-[#FFB103] cursor-pointer"
                                                            />
                                                        </td>
                                                    ))}
                                                    <td className="py-3 pl-3 text-right">
                                                        <button
                                                            type="button"
                                                            onClick={() => saveUserPermissions(user)}
                                                            disabled={permissionsSavingId === user.id}
                                                            className="px-3 py-2 rounded-lg bg-[#FFB103] text-[#1a1a1a] text-xs font-bold disabled:opacity-50"
                                                        >
                                                            {permissionsSavingId === user.id ? 'Enregistrement…' : 'Enregistrer'}
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {editor && (
                <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4">
                    <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-5">

                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-base font-bold text-gray-900">
                                {editor.isNew
                                    ? 'Ajouter une rubrique'
                                    : 'Modifier la rubrique'}
                            </h3>

                            <button
                                type="button"
                                onClick={() =>
                                    setEditor(null)
                                }
                                className="text-gray-400 hover:text-gray-700 text-xl"
                            >
                                ×
                            </button>
                        </div>

                        <div className="space-y-4">

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Nom affiché
                                </label>

                                <input
                                    autoFocus
                                    value={editor.label}
                                    onChange={e =>
                                        setEditor(
                                            current => ({
                                                ...current,
                                                label: e.target.value
                                            })
                                        )
                                    }
                                    placeholder="Ex. Test dev"
                                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFB103]/40"
                                />
                            </div>

                        </div>

                        <div className="flex justify-end gap-2 mt-5">
                            <button
                                type="button"
                                onClick={() =>
                                    setEditor(null)
                                }
                                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                            >
                                Annuler
                            </button>

                            <button
                                type="button"
                                onClick={saveEditor}
                                disabled={
                                    !editor.label.trim()
                                }
                                className="px-4 py-2.5 rounded-xl bg-[#FFB103] text-[#1a1a1a] text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-amber-400"
                            >
                                Enregistrer
                            </button>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
};


export default GenerateurDescriptifs;