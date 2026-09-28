import React, { useState } from 'react';

import {
    Plus,
    Download,
    Search,
    Eye,
    Edit,
    Trash2,
    Package,
    AlertTriangle,
    Box,
    CheckCircle,
    XCircle
} from 'lucide-react';

import StatsCard from './StatsCard';
import InventoryItemRow from './InventoryItemRow';


// ================================================================
// IMAGES PRODUITS
// ================================================================

import acryliqueBlancImage
    from '../assets/products/acrylique-blanc.png';

import boiteDerivationCarreImage
    from '../assets/products/boite-derivation-carre.png';

import boiteDerivationRondImage
    from '../assets/products/boite-derivation-rond.png';

import buldex120Image
    from '../assets/products/buldex-120.png';

import buldex150Image
    from '../assets/products/buldex-150.png';

import buldex92Image
    from '../assets/products/buldex-92.png';

import buldexSansTete112Image
    from '../assets/products/buldex-sans-tete-112.png';

import buldexSansTete72mmImage
    from '../assets/products/buldex-sans-tete-72mm.png';

import buldexTetePlateRonde92mmImage
    from '../assets/products/buldex-tete-plate-ronde-92mm.png';

import buseChimiqueImage
    from '../assets/products/buse-chimique.png';

import cable2FilsImage
    from '../assets/products/cable-2-fils.png';

import cable3FilsImage
    from '../assets/products/cable-3-fils.png';

import cable4FilsImage
    from '../assets/products/cable-4-fils.png';

import calleImage
    from '../assets/products/calle.png';

import chattertonImage
    from '../assets/products/chatterton.png';

import cheville10Image
    from '../assets/products/cheville-10.png';

import cheville6Bte200Image
    from '../assets/products/cheville-6-bte-200.png';

import cheville8Image
    from '../assets/products/cheville-8.png';

import chimiqueImage
    from '../assets/products/chimique.png';

import chimiqueTonPierreImage
    from '../assets/products/chimique-ton-pierre.png';

import coffretLamesScieSabreBte20Image
    from '../assets/products/coffret-lames-scie-sabre-bte-20.png';

import colleS80Image
    from '../assets/products/colle-s-80.png';

import compriBandeImage
    from '../assets/products/compri-bande.png';

import couvranteImage
    from '../assets/products/couvrante.png';

import crayonImage
    from '../assets/products/crayon.png';

import disqueAlu125Boite25Image
    from '../assets/products/disque-alu-125-boite-25.png';

import disqueMetauxImage
    from '../assets/products/disque-metaux.png';

import disqueVibranteMetauxRondImage
    from '../assets/products/disque-vibrante-metaux-rond.png';

import equerreFixationDoublage100mmImage
    from '../assets/products/equerre-fixation-doublage-100mm.png';

import equerreFixationDoublage120mmImage
    from '../assets/products/equerre-fixation-doublage-120mm.png';

import equerreFixationDoublage160mmImage
    from '../assets/products/equerre-fixation-doublage-160mm.png';

import fondDeJoint20Image
    from '../assets/products/fond-de-joint-20.png';

import fondJoint15Image
    from '../assets/products/fond-joint-15.png';

import foret10Image
    from '../assets/products/foret-10.png';

import foret42Image
    from '../assets/products/foret-4-2.png';

import foret6BetonPerfoImage
    from '../assets/products/foret-6-beton-perfo.png';

import foret6MetauxImage
    from '../assets/products/foret-6-metaux.png';

import foret65BetonPerfoImage
    from '../assets/products/foret-6-5-beton-perfo.png';

import foret8Image
    from '../assets/products/foret-8.png';

import goulotteImage
    from '../assets/products/goulotte.png';

import lameCutterImage
    from '../assets/products/lame-cutter.png';

import lameOscillanteBoite25Image
    from '../assets/products/lame-oscillante-boite-25.png';

import lameScieSabreBoisLongueImage
    from '../assets/products/lame-scie-sabre-bois-longue.png';

import lameScieMetauxImage
    from '../assets/products/lame-scie-metaux.png';


import nettoyantType20Image
    from '../assets/products/nettoyant-type-20.png';

import nettoyantVitreImage
    from '../assets/products/nettoyant-vitre.png';

import nettoyantMoussePvcAluImage
    from '../assets/products/nettoyant-mousse-pvc-alu.png';

import papierImage
    from '../assets/products/papier.png';

import priseGigogneImage
    from '../assets/products/prise-gigogne.png';

import priseSaillieImage
    from '../assets/products/prise-saillie.png';

import produitAluImage
    from '../assets/products/produit-alu.png';

import produitPvcImage
    from '../assets/products/produit-pvc.png';

import rondelle104Image
    from '../assets/products/rondelle-10-4.png';

import rondelle105Image
    from '../assets/products/rondelle-10-5.png';

import rondelle64Image
    from '../assets/products/rondelle-6-4.png';

import rondelle84Image
    from '../assets/products/rondelle-8-4.png';

import rondelle84x25x15Image
    from '../assets/products/rondelle-8-4-x25x1-5.png';

import silicone7016Image
    from '../assets/products/silicone-7016.png';

import siliconeAcryliqueCarton24Image
    from '../assets/products/silicone-acrylique-carton-24.png';

import siliconeBeigeImage
    from '../assets/products/silicone-beige.png';

import siliconeBlancImage
    from '../assets/products/silicone-blanc.png';

import siliconeCheneDoreImage
    from '../assets/products/silicone-chene-dore.png';

import siliconeNoirImage
    from '../assets/products/silicone-noir.png';

import siliconeTranslucideImage
    from '../assets/products/silicone-translucide.png';

import spraySiliconeImage
    from '../assets/products/spray-silicone.png';

import styloRetoucheBlancImage
    from '../assets/products/stylo-retouche-blanc.png';

import styloRetoucheNoirImage
    from '../assets/products/stylo-retouche-noir.png';

import tahomaImage
    from '../assets/products/tahoma.png';

import tami16x130mmStoreBanneImage
    from '../assets/products/tami-16x130mm-store-banne.png';

import supportTubeIro10Image
    from '../assets/products/support-tube-iro-10.png';

import tami12Image
    from '../assets/products/tami-12.png';

import tasseauxImage
    from '../assets/products/tasseaux-2-5-x-1-5.png';

import telecommandeBiCanauxIoRtsImage
    from '../assets/products/telecommande-bi-canaux-io-rts.png';

import tubeIro10Image
    from '../assets/products/tube-iro-10.png';

import tubeIro20Image
    from '../assets/products/tube-iro-20.png';

import vis10x10030Image
    from '../assets/products/vis-10-x-100-30.png';

import vis5x100Image
    from '../assets/products/vis-5-x-100.png';

import vis5x30Image
    from '../assets/products/vis-5-x-30.png';

import vis5x60Image
    from '../assets/products/vis-5-x-60.png';

import vis7x5x112Image
    from '../assets/products/vis-7-5x112.png';

import visAutoPerf48x22Image
    from '../assets/products/vis-auto-perf-4-8-x-22-boite-250.png';

import visStoreBanne14070Image
    from '../assets/products/vis-store-banne-140-70.png';

import visiophoneEncastreImage
    from '../assets/products/visiophone-encastre.png';

import wago2Image
    from '../assets/products/wago-2-100-pieces.png';

import wago3Image
    from '../assets/products/wago-3-50-pieces.png';

import wago5Image
    from '../assets/products/wago-5-25-pieces.png';


// ================================================================
// FOURNISSEURS
// ================================================================

const SUPPLIERS = [
    'Wurth',
    'Reca',
    'yess',
    'trenois',
    'pointp',
    'boschat',
    'berner',
    'somfy'
];


// ================================================================
// CATÉGORIE
// ================================================================

const getCategoryLabel = (category) => {

    if (!category) {
        return '';
    }

    if (
        category.toLowerCase() === 'domotique'
    ) {
        return 'Emetteur/Recepteur';
    }

    return category;
};


// ================================================================
// COMPOSANT PRINCIPAL
// ================================================================

const Inventory = ({
    inventoryItems = [],
    stats,
    onAddArticle,
    onExport,
    onEditArticle,
    onDeleteArticle,
    onUpdateStock,
    onBulkEdit,
    user
}) => {

    const [supplierFilter, setSupplierFilter] = useState(
        () =>
            sessionStorage.getItem(
                'inv_supplierFilter'
            ) || ''
    );

    const [categoryFilter, setCategoryFilter] = useState(
        () =>
            sessionStorage.getItem(
                'inv_categoryFilter'
            ) || ''
    );

    const [conditionnementFilter, setConditionnementFilter] =
        useState(
            () =>
                sessionStorage.getItem(
                    'inv_conditionnementFilter'
                ) || ''
        );

    const [statusFilter, setStatusFilter] = useState(
        () =>
            sessionStorage.getItem(
                'inv_statusFilter'
            ) || ''
    );

    const [searchTerm, setSearchTerm] = useState('');

    // Vue affichée : nouvelle version (cartes) ou ancienne version (tableau)
    const [viewMode, setViewMode] = useState(
        () => sessionStorage.getItem('inventory_view_mode') || 'new'
    );

    const handleViewMode = (mode) => {
        setViewMode(mode);
        sessionStorage.setItem('inventory_view_mode', mode);
    };


    // ============================================================
    // FILTRES
    // ============================================================

    const handleSupplierFilter = (value) => {

        setSupplierFilter(value);

        sessionStorage.setItem(
            'inv_supplierFilter',
            value
        );
    };


    const handleCategoryFilter = (value) => {

        setCategoryFilter(value);

        sessionStorage.setItem(
            'inv_categoryFilter',
            value
        );
    };


    const handleConditionnementFilter = (value) => {

        setConditionnementFilter(value);

        sessionStorage.setItem(
            'inv_conditionnementFilter',
            value
        );
    };


    const handleStatusFilter = (value) => {

        setStatusFilter(value);

        sessionStorage.setItem(
            'inv_statusFilter',
            value
        );
    };


    // ============================================================
    // CATÉGORIES
    // ============================================================

    const uniqueCategories = [
        ...new Set(
            inventoryItems
                .map(item => item.category)
                .filter(Boolean)
        )
    ].sort();


    // ============================================================
    // FILTRAGE
    // ============================================================

    const filteredItems = inventoryItems.filter(item => {

        const material = item.material || '';

        const supplier = item.supplier || '';

        const category = item.category || '';

        const reference =
            item.reference ||
            item.ref ||
            item.code ||
            item.id ||
            '';

        const search =
            searchTerm
                .toLowerCase()
                .trim();


        const matchSearch = search
            ? (
                material.toLowerCase().includes(search) ||
                supplier.toLowerCase().includes(search) ||
                category.toLowerCase().includes(search) ||
                String(reference)
                    .toLowerCase()
                    .includes(search)
            )
            : true;


        const matchSupplier = supplierFilter
            ? supplier.toLowerCase().trim() ===
              supplierFilter.toLowerCase().trim()
            : true;


        const realCategoryFilter =
            categoryFilter === 'Emetteur/Recepteur'
                ? 'Domotique'
                : categoryFilter;


        const matchCategory =
            realCategoryFilter
                ? category.toLowerCase().includes(
                    realCategoryFilter.toLowerCase()
                )
                : true;


        const matchConditionnement =
            conditionnementFilter
                ? item.conditionnement ===
                  conditionnementFilter
                : true;


        const matchStatus =
            statusFilter
                ? item.status === statusFilter
                : true;


        return (
            matchSearch &&
            matchSupplier &&
            matchCategory &&
            matchConditionnement &&
            matchStatus
        );
    });


    // ============================================================
    // IMPRESSION
    // ============================================================

    const handlePrint = () => {

        const printWindow = window.open(
            '',
            '',
            'width=1000,height=700'
        );


        if (!printWindow) {
            return;
        }


        printWindow.document.write(`
            <html>
                <head>

                    <title>
                        Inventaire
                    </title>

                    <style>

                        body {
                            font-family: Arial, sans-serif;
                            margin: 30px;
                            color: #1f2937;
                        }

                        h1 {
                            text-align: center;
                        }

                        .date {
                            text-align: center;
                            color: #6b7280;
                            margin-bottom: 25px;
                        }

                        table {
                            width: 100%;
                            border-collapse: collapse;
                        }

                        th,
                        td {
                            border: 1px solid #ddd;
                            padding: 10px;
                            text-align: left;
                        }

                        th {
                            background: #f3f4f6;
                        }

                    </style>

                </head>

                <body>

                    <h1>
                        Inventaire
                    </h1>

                    <div class="date">
                        ${new Date().toLocaleDateString('fr-FR')}
                    </div>

                    <table>

                        <thead>

                            <tr>

                                <th>
                                    Matériel
                                </th>

                                <th>
                                    Fournisseur
                                </th>

                                <th>
                                    Catégorie
                                </th>

                                <th>
                                    Stock
                                </th>

                                <th>
                                    Seuil
                                </th>

                                <th>
                                    Prix
                                </th>

                            </tr>

                        </thead>

                        <tbody>

                            ${
                                filteredItems
                                    .map(item => `
                                        <tr>

                                            <td>
                                                ${item.material || ''}
                                            </td>

                                            <td>
                                                ${item.supplier || ''}
                                            </td>

                                            <td>
                                                ${getCategoryLabel(
                                                    item.category
                                                )}
                                            </td>

                                            <td>
                                                ${item.stock ?? 0}
                                            </td>

                                            <td>
                                                ${item.threshold ?? 0}
                                            </td>

                                            <td>
                                                ${
                                                    item.price !== undefined &&
                                                    item.price !== null &&
                                                    item.price !== ''
                                                        ? `${parseFloat(
                                                            item.price
                                                        ).toFixed(2)} €`
                                                        : 'N/A'
                                                }
                                            </td>

                                        </tr>
                                    `)
                                    .join('')
                            }

                        </tbody>

                    </table>

                </body>
            </html>
        `);


        printWindow.document.close();

        printWindow.focus();


        setTimeout(() => {

            printWindow.print();

            printWindow.close();

        }, 250);
    };


    // ============================================================
    // STATUT STOCK
    // ============================================================

    const getStockStatus = (item) => {

        if (
            item.status === 'Rupture' ||
            Number(item.stock) <= 0
        ) {

            return {
                label: 'Stock : 0',
                type: 'rupture'
            };
        }


        if (
            item.status === 'Faible Stock' ||
            (
                item.threshold !== undefined &&
                Number(item.stock) <=
                Number(item.threshold)
            )
        ) {

            return {
                label: `Stock : ${item.stock}`,
                type: 'faible'
            };
        }


        return {
            label: `Stock : ${item.stock}`,
            type: 'disponible'
        };
    };


    // ============================================================
    // ASSOCIATION IMAGE / PRODUIT
    // ============================================================

    // Normalise les noms produits de façon identique partout.
    // Les accents, parenthèses, points, tirets et espaces ne bloquent
    // plus l'association avec une image.
    const normalizeProductName = (value) => (
        String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
    );


    const getProductImage = (item) => {

        // On regarde plusieurs champs possibles afin que l'image reste
        // associée même si le nom du produit vient d'un champ différent.
        const productNames = [
            item.material,
            item.name,
            item.product,
            item.designation,
            item.libelle,
            item.label
        ]
            .map(normalizeProductName)
            .filter(Boolean);

        // Le champ principal reste "material".
        const material = productNames[0] || '';

        // Permet de tester un alias exact ou plusieurs variantes.
        const matches = (...aliases) =>
            productNames.some(name =>
                aliases
                    .map(normalizeProductName)
                    .includes(name)
            );

        // Variante utile pour les noms qui contiennent des informations
        // supplémentaires (dimensions, conditionnement, etc.).
        const containsAll = (...words) =>
            productNames.some(name =>
                words.every(word =>
                    name.includes(normalizeProductName(word))
                )
            );


        // ACRYLIQUE BLANC
        if (material === 'acrylique blanc') {
            return acryliqueBlancImage;
        }


        // BOITE DE DERIVATION CARRE
        if (material === 'boite de derivation carre') {
            return boiteDerivationCarreImage;
        }


        // BOITE DE DERIVATION ROND / RONDE
        if (
            material === 'boite de derivation rond' ||
            material === 'boite de derivation ronde'
        ) {
            return boiteDerivationRondImage;
        }


        // BULDEX 120
        if (material === 'buldex 120') {
            return buldex120Image;
        }


        // BULDEX 150
        if (material === 'buldex 150') {
            return buldex150Image;
        }


        // BULDEX 92
        if (material === 'buldex 92') {
            return buldex92Image;
        }


        // BULDEX SANS TETE 112
        if (material === 'buldex sans tete 112') {
            return buldexSansTete112Image;
        }


        // BULDEX SANS TETE 72 MM
        if (
            material === 'buldex sans tete 72mm' ||
            material === 'buldex sans tete 72 mm' ||
            material === 'buldex sans tete 72'
        ) {
            return buldexSansTete72mmImage;
        }


        // BULDEX TETE PLATE RONDE 92 MM
        if (
            material === 'buldex tete plate ronde 92mm' ||
            material === 'buldex tete plate ronde 92 mm' ||
            material === 'buldex tete plate ronde 92'
        ) {
            return buldexTetePlateRonde92mmImage;
        }


        // BUSE CHIMIQUE
        if (material === 'buse chimique') {
            return buseChimiqueImage;
        }


        // CABLE 2 FILS
        if (material === 'cable 2 fils') {
            return cable2FilsImage;
        }


        // CABLE 3 FILS
        if (material === 'cable 3 fils') {
            return cable3FilsImage;
        }


        // CABLE 4 FILS
        if (material === 'cable 4 fils') {
            return cable4FilsImage;
        }


        // CALLE
        if (material === 'calle') {
            return calleImage;
        }


        // CHATTERTON
        if (material === 'chatterton') {
            return chattertonImage;
        }


        // CHEVILLE 10
        if (material === 'cheville 10') {
            return cheville10Image;
        }


        // CHEVILLE 6
        if (
            material === 'cheville 6 bte de 200' ||
            material === 'cheville 6 bte de 200 pieces'
        ) {
            return cheville6Bte200Image;
        }


        // CHEVILLE 8
        if (material === 'cheville 8') {
            return cheville8Image;
        }


        // CHIMIQUE
        if (material === 'chimique') {
            return chimiqueImage;
        }


        // CHIMIQUE TON PIERRE
        if (material === 'chimique ton pierre' || material === 'chimique ton pierre') {
            return chimiqueTonPierreImage;
        }


        // COFFRET LAMES SCIE SABRE
        if (
            material === 'coffret lames scie sabre bte de 20' ||
            material === 'coffret lames scie sabre boite de 20' ||
            material === 'coffret lames scie sabre bte 20'
        ) {
            return coffretLamesScieSabreBte20Image;
        }


        // COLLE S 80
        if (material === 'colle s 80' || material === 'colle s80') {
            return colleS80Image;
        }


        // COMPRI BANDE
        if (material === 'compri bande') {
            return compriBandeImage;
        }


        // COUVRANTE
        if (material === 'couvrante') {
            return couvranteImage;
        }


        // CRAYON
        if (material === 'crayon') {
            return crayonImage;
        }


        // DISQUE ALU 125
        if (
            material === 'disque alu 125 boite de 25' ||
            material === 'disque alu 125 bte de 25'
        ) {
            return disqueAlu125Boite25Image;
        }


        // DISQUE METAUX
        if (material === 'disque metaux') {
            return disqueMetauxImage;
        }


        // DISQUE VIBRANTE METAUX ROND
        if (material === 'disque vibrante metaux rond') {
            return disqueVibranteMetauxRondImage;
        }


        // EQUERRE DE FIXATION POUR DOUBLAGE
        if (material === 'equerre de fixation pour doublage de 100 mm') {
            return equerreFixationDoublage100mmImage;
        }

        if (material === 'equerre de fixation pour doublage de 120 mm') {
            return equerreFixationDoublage120mmImage;
        }

        if (material === 'equerre de fixation pour doublage de 160 mm') {
            return equerreFixationDoublage160mmImage;
        }


        // FOND DE JOINT 20
        if (
            material === 'fond de joint 20' ||
            material === 'fond de joint 20mm' ||
            material === 'fond de joint 20 mm'
        ) {
            return fondDeJoint20Image;
        }


        // FOND JOINT 15
        if (
            material === 'fond joint 15' ||
            material === 'fond de joint 15' ||
            material === 'fond joint 15mm' ||
            material === 'fond de joint 15mm' ||
            material === 'fond de joint 15 mm'
        ) {
            return fondJoint15Image;
        }


        // FORET 10
        if (material === 'foret 10') {
            return foret10Image;
        }


        // FORET 4.2
        // La normalisation transforme 4.2 en "4 2".
        if (
            material === 'foret 4 2' ||
            material === 'foret 4 2 mm'
        ) {
            return foret42Image;
        }


        // FORET 6 BETON PERFO
        if (
            material === 'foret 6 beton perfo' ||
            material === 'foret 6 beton'
        ) {
            return foret6BetonPerfoImage;
        }


        // FORET 6 METAUX
        if (material === 'foret 6 metaux') {
            return foret6MetauxImage;
        }


        // FORET 6.5 BETON PERFO
        // La normalisation transforme 6.5 en "6 5".
        if (
            material === 'foret 6 5 beton perfo' ||
            material === 'foret 6 5 beton'
        ) {
            return foret65BetonPerfoImage;
        }


        // FORET 8
        if (material === 'foret 8') {
            return foret8Image;
        }


        // GOULOTTE
        if (material === 'goulotte') {
            return goulotteImage;
        }


        // LAME CUTTER
        if (
            material === 'lame cut' ||
            material === 'lame cutter' ||
            material === 'lames cutter'
        ) {
            return lameCutterImage;
        }


        // LAME OSCILLANTE
        if (
            material === 'lame oscillante bte de 25' ||
            material === 'lame oscillante bte 25' ||
            material === 'lame oscillante boite de 25' ||
            material === 'lame oscillante boite 25'
        ) {
            return lameOscillanteBoite25Image;
        }


        // LAME SCIE SABRE BOIS / LONGUE
        if (
            material === 'lame scie sabre bois longue' ||
            material === 'lames scie sabre bois longue' ||
            material === 'lame de scie sabre bois longue'
        ) {
            return lameScieSabreBoisLongueImage;
        }



        // LAME SCIE METAUX
        if (
            matches(
                'lame scie metaux',
                'lames scie metaux',
                'lame de scie metaux',
                'lames de scie metaux'
            ) ||
            containsAll('lame', 'scie', 'metaux')
        ) {
            return lameScieMetauxImage;
        }


        // NETTOYANT TYPE 20
        if (material === 'nettoyant type 20') {
            return nettoyantType20Image;
        }

        // NETTOYANT VITRE / VITRES
        if (
            material === 'nettoyant vitre' ||
            material === 'nettoyant vitres'
        ) {
            return nettoyantVitreImage;
        }

        // NETTOYANT MOUSSE PVC ALU
        if (
            material === 'nettoyant mousse pvc alu' ||
            material === 'nettoyant mousse pvc alu'
        ) {
            return nettoyantMoussePvcAluImage;
        }

        // PAPIER
        if (material === 'papier') {
            return papierImage;
        }

        // PRISE GIGOGNE
        if (material === 'prise gigogne') {
            return priseGigogneImage;
        }

        // PRISE SAILLIE
        if (material === 'prise saillie') {
            return priseSaillieImage;
        }

        // PRODUIT ALU
        if (
            material === 'produit alu' ||
            containsAll('produit', 'alu')
        ) {
            return produitAluImage;
        }

        // PRODUIT PVC
        if (
            material === 'produit pvc' ||
            containsAll('produit', 'pvc')
        ) {
            return produitPvcImage;
        }

        // RONDELLE 10.4
        if (containsAll('rondelle', '10', '4')) {
            return rondelle104Image;
        }

        // RONDELLE 10.5
        if (containsAll('rondelle', '10', '5')) {
            return rondelle105Image;
        }

        // RONDELLE 6.4
        if (containsAll('rondelle', '6', '4')) {
            return rondelle64Image;
        }

        // RONDELLE 8.4 X 25 X 1.5
        if (
            containsAll('rondelle', '8', '4', '25', '1', '5') ||
            material === 'rondelle 8 4 x25x1 5'
        ) {
            return rondelle84x25x15Image;
        }

        // RONDELLE 8.4
        if (containsAll('rondelle', '8', '4')) {
            return rondelle84Image;
        }

        // SILICONE 7016
        if (containsAll('silicone', '7016')) {
            return silicone7016Image;
        }

        // SILICONE ACRYLIQUE - CARTON DE 24
        if (
            containsAll('silicone', 'acrylique') ||
            containsAll('acrylique', 'carton', '24')
        ) {
            return siliconeAcryliqueCarton24Image;
        }

        // SILICONE BEIGE
        if (containsAll('silicone', 'beige')) {
            return siliconeBeigeImage;
        }

        // SILICONE BLANC
        if (containsAll('silicone', 'blanc')) {
            return siliconeBlancImage;
        }

        // SILICONE CHENE DORE
        if (containsAll('silicone', 'chene', 'dore')) {
            return siliconeCheneDoreImage;
        }

        // SILICONE NOIR
        if (containsAll('silicone', 'noir')) {
            return siliconeNoirImage;
        }

        // SILICONE TRANSLUCIDE
        if (containsAll('silicone', 'translucide')) {
            return siliconeTranslucideImage;
        }

        // SPRAY SILICONE
        if (containsAll('spray', 'silicone')) {
            return spraySiliconeImage;
        }

        // STYLO RETOUCHE BLANC
        if (containsAll('stylo', 'retouche', 'blanc')) {
            return styloRetoucheBlancImage;
        }

        // STYLO RETOUCHE NOIR
        if (containsAll('stylo', 'retouche', 'noir')) {
            return styloRetoucheNoirImage;
        }

        // TAHOMA
        if (
            material === 'tahoma' ||
            containsAll('tahoma')
        ) {
            return tahomaImage;
        }


        // TAMI 16 X 130 MM - STORE BANNE
        if (
            material === 'tami 16x130mm store banne' ||
            material === 'tami 16 x 130 mm store banne' ||
            material === 'tami 16 130 mm store banne' ||
            (
                containsAll('tami', '16', '130') &&
                containsAll('store', 'banne')
            )
        ) {
            return tami16x130mmStoreBanneImage;
        }


        // SUPPORT TUBE IRO 10
        if (
            material === 'support tube iro 10' ||
            material === 'support tube iro10' ||
            material === 'support de tube iro 10' ||
            containsAll('support', 'tube', 'iro', '10')
        ) {
            return supportTubeIro10Image;
        }


        // TAMI 12
        if (material === 'tami 12' || containsAll('tami', '12')) {
            return tami12Image;
        }


        // TASSEAUX 2,5 X 1,5
        if (
            material === 'tasseaux 2 5 x 1 5' ||
            material === 'tasseaux 2 5 x 1 5' ||
            (containsAll('tasseaux', '2', '5') && containsAll('1', '5'))
        ) {
            return tasseauxImage;
        }


        // TELECOMMANDE BI CANAUX IO / RTS
        if (
            material === 'telecommande bi canaux io rts' ||
            material === 'telecommande bi canaux io rts' ||
            (
                containsAll('telecommande', 'bi', 'canaux') &&
                containsAll('io', 'rts')
            )
        ) {
            return telecommandeBiCanauxIoRtsImage;
        }


        // TUBE IRO 10
        if (
            material === 'tube iro 10' ||
            containsAll('tube', 'iro', '10')
        ) {
            return tubeIro10Image;
        }


        // TUBE IRO 20
        if (
            material === 'tube iro 20' ||
            containsAll('tube', 'iro', '20')
        ) {
            return tubeIro20Image;
        }


        // VIS 10 X 100/30
        if (
            material === 'vis 10 x 100 30' ||
            material === 'vis 10 x 100 30' ||
            (containsAll('vis', '10', '100') && containsAll('30'))
        ) {
            return vis10x10030Image;
        }


        // VIS 5 X 100
        if (
            material === 'vis 5 x 100' ||
            containsAll('vis', '5', '100')
        ) {
            return vis5x100Image;
        }


        // VIS 5 X 30
        if (
            material === 'vis 5 x 30' ||
            containsAll('vis', '5', '30')
        ) {
            return vis5x30Image;
        }


        // VIS 5 X 60
        if (
            material === 'vis 5 x 60' ||
            containsAll('vis', '5', '60')
        ) {
            return vis5x60Image;
        }


        // VIS 7,5 X 112
        if (
            material === 'vis 7 5x112' ||
            material === 'vis 7 5 x 112' ||
            material === 'vis 7 5 112' ||
            containsAll('vis', '7', '5', '112')
        ) {
            return vis7x5x112Image;
        }


        // VIS AUTO-PERF 4,8 X 22 (BTE DE 250)
        if (
            material === 'vis auto perf 4 8 x 22 bte de 250' ||
            material === 'vis auto perf 4 8 x 22 boite de 250' ||
            (
                containsAll('vis', 'auto', 'perf', '4', '8', '22') &&
                containsAll('250')
            )
        ) {
            return visAutoPerf48x22Image;
        }


        // VIS STORE BANNE 140/70
        if (
            material === 'vis store banne 140 70 ref 0912814603' ||
            material === 'vis store banne 140 70' ||
            (
                containsAll('vis', 'store', 'banne', '140', '70')
            )
        ) {
            return visStoreBanne14070Image;
        }


        // VISIOPHONE ENCASTRE
        if (
            material === 'visiophone encastre' ||
            containsAll('visiophone', 'encastre')
        ) {
            return visiophoneEncastreImage;
        }


        // WAGO 2 - 100 PIECES
        if (
            material === 'wago 2 100 pieces' ||
            (containsAll('wago', '2') && containsAll('100', 'pieces'))
        ) {
            return wago2Image;
        }


        // WAGO 3 - 50 PIECES
        if (
            material === 'wago 3 50 pieces' ||
            (containsAll('wago', '3') && containsAll('50', 'pieces'))
        ) {
            return wago3Image;
        }


        // WAGO 5 - 25 PIECES
        if (
            material === 'wago 5 25 pieces' ||
            (containsAll('wago', '5') && containsAll('25', 'pieces'))
        ) {
            return wago5Image;
        }


        // AUCUNE IMAGE
        return null;
    };


    // ============================================================
    // CARTE PRODUIT
    // ============================================================

    const ProductCard = ({ item }) => {

        const stockStatus =
            getStockStatus(item);

        const productImage =
            getProductImage(item);

        const reference =
            item.reference ||
            item.ref ||
            item.code ||
            item.id ||
            '—';


        return (
            <div
                className="
                    bg-white
                    border
                    border-gray-200
                    rounded-2xl
                    overflow-hidden
                    flex
                    flex-col
                    min-w-0
                    transition-all
                    duration-200
                    hover:shadow-md
                    hover:border-gray-300
                "
            >

                {/* IMAGE */}

                <div
                    className="
                        h-48
                        md:h-52
                        bg-gray-50
                        flex
                        items-center
                        justify-center
                        border-b
                        border-gray-100
                        overflow-hidden
                    "
                >

                    {productImage ? (

                        <img
                            src={productImage}
                            alt={
                                item.material ||
                                'Produit'
                            }
                            className="
                                w-full
                                h-full
                                object-contain
                                p-5
                            "
                        />

                    ) : (

                        <div
                            className="
                                flex
                                flex-col
                                items-center
                                justify-center
                                text-gray-300
                            "
                        >

                            <Package
                                size={58}
                                strokeWidth={1.2}
                            />

                            <span
                                className="
                                    mt-2
                                    text-xs
                                    text-gray-400
                                "
                            >
                                Image du produit
                            </span>

                        </div>

                    )}

                </div>


                {/* CONTENU */}

                <div
                    className="
                        p-4
                        md:p-5
                        flex
                        flex-col
                        flex-1
                    "
                >

                    <div
                        className="
                            text-xs
                            text-gray-400
                            mb-2
                        "
                    >
                        Réf. {reference}
                    </div>


                    <h4
                        className="
                            text-base
                            md:text-lg
                            font-semibold
                            text-gray-800
                            leading-snug
                            min-h-[48px]
                        "
                    >
                        {
                            item.material ||
                            'Produit sans nom'
                        }
                    </h4>


                    {item.supplier && (

                        <div
                            className="
                                mt-2
                                text-xs
                                text-gray-400
                            "
                        >
                            {item.supplier}
                        </div>

                    )}


                    {/* STOCK + PRIX */}

                    <div
                        className="
                            mt-5
                            mb-4
                            flex
                            items-center
                            gap-4
                            flex-wrap
                        "
                    >

                        <span
                            className={`
                                text-sm
                                font-semibold

                                ${
                                    stockStatus.type ===
                                    'disponible'
                                        ? 'text-green-600'
                                        : ''
                                }

                                ${
                                    stockStatus.type ===
                                    'faible'
                                        ? 'text-yellow-600'
                                        : ''
                                }

                                ${
                                    stockStatus.type ===
                                    'rupture'
                                        ? 'text-red-500'
                                        : ''
                                }
                            `}
                        >
                            {stockStatus.label}
                        </span>


                        <span
                            className="
                                h-5
                                w-px
                                bg-gray-200
                            "
                        />


                        <span
                            className="
                                text-sm
                                md:text-base
                                font-semibold
                                text-blue-900
                            "
                        >
                            {
                                item.price !== undefined &&
                                item.price !== null &&
                                item.price !== ''
                                    ? `${parseFloat(
                                        item.price
                                    ).toFixed(2)} €`
                                    : 'Prix N/A'
                            }
                        </span>

                    </div>


                    {/* ACTIONS */}

                    <div
                        className="
                            mt-auto
                            flex
                            items-center
                            gap-2
                        "
                    >

                        <button
                            onClick={() =>
                                onEditArticle(item)
                            }
                            className="
                                flex-1
                                bg-blue-50
                                hover:bg-blue-100
                                text-blue-600
                                font-semibold
                                py-2.5
                                px-4
                                rounded-lg
                                transition-colors
                                flex
                                items-center
                                justify-center
                                gap-2
                                text-sm
                            "
                        >

                            <Eye size={17} />

                            Voir

                        </button>


                        <button
                            onClick={() =>
                                onEditArticle(item)
                            }
                            className="
                                w-10
                                h-10
                                rounded-lg
                                border
                                border-gray-200
                                text-gray-500
                                hover:text-blue-600
                                hover:border-blue-200
                                hover:bg-blue-50
                                flex
                                items-center
                                justify-center
                                transition-colors
                            "
                            title="Modifier"
                        >

                            <Edit size={16} />

                        </button>


                        <button
                            onClick={() =>
                                onDeleteArticle(item)
                            }
                            className="
                                w-10
                                h-10
                                rounded-lg
                                border
                                border-red-100
                                text-red-400
                                hover:text-red-600
                                hover:border-red-200
                                hover:bg-red-50
                                flex
                                items-center
                                justify-center
                                transition-colors
                            "
                            title="Supprimer"
                        >

                            <Trash2 size={16} />

                        </button>

                    </div>

                </div>

            </div>
        );
    };


    // ============================================================
    // ANCIENNE VERSION
    // ============================================================

    if (viewMode === 'old') {
        return (
            <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 xl:p-8">

                <div className="flex justify-between items-center mb-4 md:mb-6 xl:mb-8 flex-wrap gap-3">
                    <h3 className="text-lg md:text-xl xl:text-2xl font-semibold text-gray-800">
                        Inventaire
                    </h3>

                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => handleViewMode('new')}
                            className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
                        >
                            <Package size={18} />
                            Nouvelle version
                        </button>

                        <button
                            onClick={onAddArticle}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
                        >
                            <Plus size={18} />
                            Ajouter Article
                        </button>

                        <button
                            onClick={handlePrint}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
                        >
                            <Download size={18} />
                            Imprimer
                        </button>
                    </div>
                </div>

                <div className="mb-4">
                    <div className="relative max-w-xl">
                        <Search size={19} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Rechercher un produit, une référence..."
                            className="w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Filtrer par fournisseur</label>
                        <select
                            value={supplierFilter}
                            onChange={(e) => handleSupplierFilter(e.target.value)}
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-white text-sm"
                        >
                            <option value="">Tous les fournisseurs</option>
                            {SUPPLIERS.map((supplier) => (
                                <option key={supplier} value={supplier}>{supplier}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Filtrer par catégorie</label>
                        <select
                            value={categoryFilter}
                            onChange={(e) => handleCategoryFilter(e.target.value)}
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-white text-sm"
                        >
                            <option value="">Toutes les catégories</option>
                            {uniqueCategories.map((category) => (
                                <option key={category} value={category}>
                                    {getCategoryLabel(category)}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap mb-5">
                    <span className="text-sm text-gray-500">Conditionnement :</span>
                    {[
                        { value: '', label: 'Tous' },
                        { value: 'carton', label: '📦 Carton' },
                        { value: 'unite', label: '🔩 Unité' }
                    ].map((option) => (
                        <button
                            key={option.value || 'all'}
                            onClick={() => handleConditionnementFilter(option.value)}
                            className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
                                conditionnementFilter === option.value
                                    ? 'bg-gray-100 text-gray-700 border-gray-200 shadow-sm'
                                    : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-5 md:mb-6">
                    <StatsCard title="Articles en Stock" value={stats?.total ?? inventoryItems.length} icon={Box} color="blue" onClick={() => handleStatusFilter('')} active={statusFilter === ''} />
                    <StatsCard title="Disponible" value={stats?.available ?? 0} icon={CheckCircle} color="green" onClick={() => handleStatusFilter('Disponible')} active={statusFilter === 'Disponible'} />
                    <StatsCard title="Faible Stock" value={stats?.lowStock ?? 0} icon={AlertTriangle} color="yellow" onClick={() => handleStatusFilter('Faible Stock')} active={statusFilter === 'Faible Stock'} />
                    <StatsCard title="Rupture" value={stats?.outOfStock ?? 0} icon={XCircle} color="red" onClick={() => handleStatusFilter('Rupture')} active={statusFilter === 'Rupture'} />
                </div>

                {filteredItems.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 border border-gray-200 rounded-xl">
                        <Search size={48} className="mx-auto mb-3 opacity-50" />
                        <p>Aucun résultat trouvé</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-gray-200">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Matériel</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Fournisseur</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Catégorie</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-40">Stock</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Seuil</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Prix</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {filteredItems.map((item) => (
                                    <InventoryItemRow
                                        key={item.id}
                                        item={item}
                                        onEdit={onEditArticle}
                                        onDelete={onDeleteArticle}
                                        onUpdateStock={onUpdateStock}
                                        isManager={true}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    }


    // ============================================================
    // RENDU PRINCIPAL
    // ============================================================

    return (

        <div
            className="
                bg-white
                rounded-xl
                shadow-sm
                p-4
                md:p-6
                xl:p-8
            "
        >

            {/* HEADER */}

            <div
                className="
                    flex
                    justify-between
                    items-center
                    gap-4
                    mb-6
                    flex-wrap
                "
            >

                <div>

                    <h3
                        className="
                            text-xl
                            md:text-2xl
                            xl:text-3xl
                            font-semibold
                            text-gray-800
                        "
                    >
                        Inventaire
                    </h3>

                </div>


                <div
                    className="
                        flex
                        gap-2
                        flex-wrap
                        justify-end
                    "
                >

                    <div
                        className="
                            flex
                            items-center
                            gap-1.5
                            flex-wrap
                            justify-end
                        "
                    >
                        <button
                            onClick={() => handleStatusFilter('')}
                            className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                                statusFilter === ''
                                    ? 'bg-gray-100 text-gray-800 border-gray-300'
                                    : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                            Tous
                        </button>

                        <button
                            onClick={() => handleStatusFilter('Disponible')}
                            className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                                statusFilter === 'Disponible'
                                    ? 'bg-green-50 text-green-600 border-green-200'
                                    : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                            Disponible
                        </button>

                        <button
                            onClick={() => handleStatusFilter('Faible Stock')}
                            className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                                statusFilter === 'Faible Stock'
                                    ? 'bg-yellow-50 text-yellow-600 border-yellow-200'
                                    : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                            Stock faible
                        </button>

                        <button
                            onClick={() => handleStatusFilter('Rupture')}
                            className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                                statusFilter === 'Rupture'
                                    ? 'bg-red-50 text-red-500 border-red-200'
                                    : 'bg-white text-gray-500 border-gray-200 hover:bg-red-50'
                            }`}
                        >
                            Rupture de stock
                        </button>
                    </div>


                    <button
                        onClick={() => handleViewMode('old')}
                        className="
                            bg-gray-700
                            hover:bg-gray-800
                            text-white
                            px-4
                            py-2.5
                            rounded-lg
                            flex
                            items-center
                            gap-2
                            text-sm
                            font-medium
                            transition-colors
                        "
                    >
                        <Package size={18} />
                        Ancienne version
                    </button>

                    <button
                        onClick={onAddArticle}
                        className="
                            bg-blue-600
                            hover:bg-blue-700
                            text-white
                            px-4
                            py-2.5
                            rounded-lg
                            flex
                            items-center
                            gap-2
                            text-sm
                            font-medium
                            transition-colors
                        "
                    >

                        <Plus size={18} />

                        Ajouter Article

                    </button>


                    <button
                        onClick={handlePrint}
                        className="
                            bg-green-600
                            hover:bg-green-700
                            text-white
                            px-4
                            py-2.5
                            rounded-lg
                            flex
                            items-center
                            gap-2
                            text-sm
                            font-medium
                            transition-colors
                        "
                    >

                        <Download size={18} />

                        Imprimer

                    </button>

                </div>

            </div>


            {/* RECHERCHE */}

            <div
                className="
                    mb-6
                "
            >

                <div
                    className="
                        relative
                        max-w-xl
                    "
                >

                    <Search
                        size={19}
                        className="
                            absolute
                            left-4
                            top-1/2
                            -translate-y-1/2
                            text-gray-400
                        "
                    />


                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) =>
                            setSearchTerm(
                                e.target.value
                            )
                        }
                        placeholder="
                            Rechercher un produit, une référence...
                        "
                        className="
                            w-full
                            pl-11
                            pr-4
                            py-3
                            border
                            border-gray-200
                            rounded-xl
                            bg-white
                            text-sm
                            text-gray-700
                            focus:outline-none
                            focus:ring-2
                            focus:ring-blue-500
                            focus:border-transparent
                        "
                    />

                </div>

            </div>


            {/* CONTENU */}

            <div
                className="
                    grid
                    grid-cols-1
                    lg:grid-cols-[280px_minmax(0,1fr)]
                    gap-6
                    items-start
                "
            >

                {/* FILTRES */}

                <aside
                    className="
                        bg-white
                        border
                        border-gray-200
                        rounded-2xl
                        p-5
                        lg:sticky
                        lg:top-4
                        lg:h-[calc(100vh-8rem)]
                        lg:max-h-[calc(100vh-8rem)]
                        lg:overflow-y-auto
                        lg:pb-10
                    "
                >

                    <h4
                        className="
                            text-xl
                            font-semibold
                            text-gray-800
                            mb-6
                        "
                    >
                        Filtres
                    </h4>


                    <div
                        className="
                            mb-7
                        "
                    >

                        <h5
                            className="
                                text-sm
                                font-semibold
                                text-gray-800
                                mb-4
                            "
                        >
                            Type de produit
                        </h5>


                        <div
                            className="
                                space-y-3
                            "
                        >

                            <label
                                className="
                                    flex
                                    items-center
                                    gap-3
                                    cursor-pointer
                                "
                            >

                                <input
                                    type="checkbox"
                                    checked={
                                        categoryFilter === ''
                                    }
                                    onChange={() =>
                                        handleCategoryFilter('')
                                    }
                                    className="
                                        w-4
                                        h-4
                                        rounded
                                        border-gray-300
                                        text-blue-600
                                    "
                                />

                                <span
                                    className="
                                        text-sm
                                        text-gray-600
                                    "
                                >
                                    Tous
                                </span>

                            </label>


                            {uniqueCategories.map(
                                (category) => {

                                    const label =
                                        getCategoryLabel(
                                            category
                                        );


                                    return (

                                        <label
                                            key={category}
                                            className="
                                                flex
                                                items-center
                                                gap-3
                                                cursor-pointer
                                            "
                                        >

                                            <input
                                                type="checkbox"
                                                checked={
                                                    categoryFilter ===
                                                    label
                                                }
                                                onChange={() =>
                                                    handleCategoryFilter(
                                                        categoryFilter ===
                                                        label
                                                            ? ''
                                                            : label
                                                    )
                                                }
                                                className="
                                                    w-4
                                                    h-4
                                                    rounded
                                                    border-gray-300
                                                    text-blue-600
                                                "
                                            />


                                            <span
                                                className="
                                                    text-sm
                                                    text-gray-600
                                                "
                                            >
                                                {label}
                                            </span>

                                        </label>

                                    );
                                }
                            )}

                        </div>

                    </div>


                    {/* FOURNISSEUR */}

                    <div
                        className="
                            mb-7
                        "
                    >

                        <h5
                            className="
                                text-sm
                                font-semibold
                                text-gray-800
                                mb-3
                            "
                        >
                            Fournisseur
                        </h5>


                        <select
                            value={supplierFilter}
                            onChange={(e) =>
                                handleSupplierFilter(
                                    e.target.value
                                )
                            }
                            className="
                                w-full
                                px-3
                                py-2.5
                                text-sm
                                border
                                border-gray-200
                                rounded-lg
                                bg-white
                                text-gray-600
                                focus:outline-none
                                focus:ring-2
                                focus:ring-blue-500
                            "
                        >

                            <option value="">
                                Tous les fournisseurs
                            </option>


                            {SUPPLIERS.map(
                                (supplier) => (

                                    <option
                                        key={supplier}
                                        value={supplier}
                                    >
                                        {supplier}
                                    </option>

                                )
                            )}

                        </select>

                    </div>


                    {/* CONDITIONNEMENT */}

                    <div
                        className="
                            mb-7
                        "
                    >

                        <h5
                            className="
                                text-sm
                                font-semibold
                                text-gray-800
                                mb-3
                            "
                        >
                            Conditionnement
                        </h5>


                        <div
                            className="
                                flex
                                flex-wrap
                                gap-2
                            "
                        >

                            <button
                                onClick={() =>
                                    handleConditionnementFilter('')
                                }
                                className={`
                                    px-4
                                    py-2
                                    rounded-full
                                    border
                                    text-sm
                                    font-medium

                                    ${
                                        conditionnementFilter === ''
                                            ? 'bg-blue-50 text-blue-600 border-blue-200'
                                            : 'bg-white text-gray-500 border-gray-200'
                                    }
                                `}
                            >
                                Tous
                            </button>


                            <button
                                onClick={() =>
                                    handleConditionnementFilter(
                                        'carton'
                                    )
                                }
                                className={`
                                    px-4
                                    py-2
                                    rounded-full
                                    border
                                    text-sm
                                    font-medium

                                    ${
                                        conditionnementFilter === 'carton'
                                            ? 'bg-blue-50 text-blue-600 border-blue-200'
                                            : 'bg-white text-gray-500 border-gray-200'
                                    }
                                `}
                            >
                                📦 Carton
                            </button>


                            <button
                                onClick={() =>
                                    handleConditionnementFilter(
                                        'unite'
                                    )
                                }
                                className={`
                                    px-4
                                    py-2
                                    rounded-full
                                    border
                                    text-sm
                                    font-medium

                                    ${
                                        conditionnementFilter === 'unite'
                                            ? 'bg-blue-50 text-blue-600 border-blue-200'
                                            : 'bg-white text-gray-500 border-gray-200'
                                    }
                                `}
                            >
                                🔩 Unité
                            </button>

                        </div>

                    </div>



                </aside>


                {/* PRODUITS */}

                <section
                    className="
                        min-w-0
                    "
                >

                    <div
                        className="
                            flex
                            justify-between
                            items-center
                            mb-5
                            gap-3
                            flex-wrap
                        "
                    >

                        <div>

                            <h4
                                className="
                                    text-2xl
                                    font-semibold
                                    text-gray-800
                                "
                            >
                                Produits
                            </h4>


                            <p
                                className="
                                    text-sm
                                    text-gray-400
                                    mt-1
                                "
                            >
                                {filteredItems.length}
                                {' '}
                                produit
                                {filteredItems.length > 1
                                    ? 's'
                                    : ''}
                                {' '}
                                trouvé
                                {filteredItems.length > 1
                                    ? 's'
                                    : ''}
                            </p>

                        </div>

                    </div>


                    {filteredItems.length === 0 ? (

                        <div
                            className="
                                bg-white
                                border
                                border-gray-200
                                rounded-2xl
                                py-16
                                text-center
                            "
                        >

                            <Search
                                size={48}
                                className="
                                    mx-auto
                                    mb-4
                                    text-gray-300
                                "
                            />


                            <p
                                className="
                                    text-gray-500
                                "
                            >
                                Aucun produit trouvé
                            </p>


                            <button
                                onClick={() => {

                                    setSearchTerm('');

                                    handleSupplierFilter('');

                                    handleCategoryFilter('');

                                    handleConditionnementFilter('');

                                    handleStatusFilter('');

                                }}
                                className="
                                    mt-4
                                    text-sm
                                    text-blue-600
                                    hover:text-blue-700
                                    font-medium
                                "
                            >
                                Réinitialiser les filtres
                            </button>

                        </div>

                    ) : (

                        <div
                            className="
                                grid
                                grid-cols-1
                                sm:grid-cols-2
                                xl:grid-cols-3
                                gap-4
                                xl:gap-5
                            "
                        >

                            {filteredItems.map(
                                (item) => (

                                    <ProductCard
                                        key={item.id}
                                        item={item}
                                    />

                                )
                            )}

                        </div>

                    )}

                </section>

            </div>

        </div>
    );
};


export default Inventory;