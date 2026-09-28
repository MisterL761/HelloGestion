import React, { useEffect, useRef, useState } from "react";
import {
  Copy,
  RotateCcw,
  Upload,
  X,
  Check,
  ArrowLeftRight,
  Pencil,
  Sparkles,
} from "lucide-react";

/* =========================================================
   DONNÉES PRODUITS
========================================================= */

const PRODUCTS = [
  {
    name: "Portail",
    place: "entrée / clôture",
    details:
      "portail, battants, poteaux, piliers, clôture attenante",
  },
  {
    name: "Porte d'entrée",
    place: "façade / entrée",
    details:
      "porte, dormant, ouvrant, vitrage, poignée, seuil",
  },
  {
    name: "Fenêtre",
    place: "façade",
    details:
      "fenêtre, ouvrants, dormant, vitrage, appui, tableau",
  },
  {
    name: "Volet roulant",
    place: "façade / fenêtre",
    details:
      "volet roulant, coffre, tablier, coulisses, commande",
  },
  {
    name: "Porte de garage",
    place: "garage / façade",
    details:
      "porte de garage, panneaux, rails, encadrement",
  },
  {
    name: "Clôture",
    place: "limite de propriété",
    details:
      "clôture, panneaux, poteaux, soubassement",
  },
  {
    name: "Pergola",
    place: "terrasse / extérieur",
    details:
      "pergola, poteaux, structure, toiture, lames",
  },
];

/* =========================================================
   PROMPT NORMAL
========================================================= */

const NORMAL_BASE_PROMPT = `
À partir des références visuelles fournies, réaliser un photomontage ultra réaliste.

==================================================
RÈGLE ABSOLUE — RÔLE DES DEUX IMAGES
==================================================

IL Y A DEUX IMAGES DISTINCTES AVEC DEUX RÔLES STRICTEMENT DIFFÉRENTS.

PHOTO ENVIRONNEMENT = BASE FIXE.
PHOTO PRODUIT = SOURCE DU NOUVEAU PRODUIT.

NE JAMAIS INVERSER LES RÔLES.

==================================================
1 — PHOTO ENVIRONNEMENT
==================================================

La photo environnement constitue la scène réelle dans laquelle le nouveau produit doit être installé.

Elle définit UNIQUEMENT :

- le bâtiment existant
- la façade
- les murs
- les piliers
- les clôtures existantes
- le sol
- le jardin
- les plantations
- les arbres
- les objets présents
- les volumes architecturaux
- la perspective
- le cadrage
- la position de caméra
- la hauteur de caméra
- l'angle de prise de vue
- la profondeur
- les ombres générales
- la lumière ambiante
- l'environnement réel

TOUT CET ENVIRONNEMENT DOIT ÊTRE CONSERVÉ.

NE PAS :

- changer la façade
- déplacer les murs
- modifier les piliers
- modifier le sol
- déplacer les plantes
- supprimer des éléments existants
- ajouter de nouveaux éléments décoratifs
- changer l'architecture
- changer le cadrage
- changer l'angle de caméra
- reconstruire une nouvelle maison
- créer une nouvelle scène

La photo environnement est la BASE VISUELLE DU RÉSULTAT FINAL.

==================================================
2 — PHOTO PRODUIT
==================================================

La photo produit sert UNIQUEMENT de référence pour le nouveau produit à installer.

Elle définit :

- la forme du produit
- les dimensions relatives
- le design
- les panneaux
- les vantaux
- les lames
- les montants
- les traverses
- les profils
- les poignées
- les vitrages
- les décors
- les motifs
- les extensions
- les parties latérales
- les retours
- les finitions
- la couleur
- la texture
- les détails techniques visibles

UTILISER LE PRODUIT COMPLET PRÉSENT SUR LA PHOTO PRODUIT.

NE PAS SIMPLIFIER LE PRODUIT.

NE PAS utiliser uniquement sa partie centrale.

Si le produit présente :

- des extensions
- des parties latérales
- plusieurs panneaux
- plusieurs vantaux
- des retours
- des poteaux
- des éléments périphériques

ils doivent être conservés.

==================================================
3 — CE QUI DOIT ÊTRE FAIT
==================================================

Prendre la PHOTO ENVIRONNEMENT comme image de base.

Identifier le produit actuellement présent dans cet environnement.

Retirer UNIQUEMENT le produit existant.

Conserver intégralement le reste de la scène.

Prendre ensuite le produit complet visible sur la PHOTO PRODUIT.

Installer ce produit exactement à l'emplacement occupé par l'ancien produit.

Adapter uniquement le nouveau produit afin qu'il soit parfaitement intégré à la scène réelle.

==================================================
4 — INTÉGRATION RÉALISTE
==================================================

Le nouveau produit doit respecter :

- la perspective réelle
- les proportions réalistes
- le point de fuite
- la profondeur
- l'échelle
- les lignes architecturales
- le contact avec le sol
- les points de fixation
- les ombres naturelles
- la lumière présente dans la scène
- les reflets réalistes
- les matériaux
- les textures
- les occlusions naturelles

Le produit doit sembler réellement installé dans la scène.

Il ne doit pas donner l'impression d'avoir été simplement superposé.

==================================================
5 — LUMIÈRE ET OMBRES
==================================================

La lumière générale doit rester celle de la PHOTO ENVIRONNEMENT.

Le nouveau produit doit adopter :

- la même direction de lumière
- la même intensité lumineuse
- la même température de couleur
- les mêmes conditions météorologiques
- les mêmes ombres générales

Créer uniquement les ombres et reflets nécessaires à l'intégration du nouveau produit.

==================================================
6 — PERSPECTIVE ET CAMÉRA
==================================================

NE PAS modifier la caméra de la PHOTO ENVIRONNEMENT.

Conserver :

- le cadrage
- la focale apparente
- la hauteur
- l'angle
- la perspective
- la distance apparente

Le nouveau produit doit être adapté à cette caméra.

==================================================
7 — INTERDICTION D'INTERPRÉTATION
==================================================

Ne pas inventer de nouveau produit.

Ne pas mélanger les deux références.

Ne pas utiliser les éléments décoratifs de la photo produit.

Ne pas utiliser l'environnement de la photo produit.

Ne pas conserver l'ancien produit de la photo environnement.

Ne pas créer une nouvelle architecture.

Ne pas modifier la scène existante.

==================================================
8 — FORMULE FINALE
==================================================

PHOTO ENVIRONNEMENT
+
PRODUIT COMPLET DE LA PHOTO PRODUIT
=
IMAGE FINALE ULTRA RÉALISTE

Le résultat doit donner l'impression que le produit de la PHOTO PRODUIT vient réellement d'être installé dans l'environnement de la PHOTO ENVIRONNEMENT.
`;

/* =========================================================
   PROMPT INVERSÉ
========================================================= */

const INVERTED_BASE_PROMPT = `
À partir des deux références visuelles fournies, réaliser un photomontage ultra réaliste.

==================================================
MODE INVERSÉ — RÈGLE ABSOLUE
==================================================

ATTENTION :

POUR CETTE GÉNÉRATION, LES RÔLES DES DEUX IMAGES SONT VOLONTAIREMENT INVERSÉS.

IL EST IMPÉRATIF DE NE PAS REVENIR AUX RÔLES UTILISÉS LORS DE LA GÉNÉRATION PRÉCÉDENTE.

==================================================
NOUVEAUX RÔLES
==================================================

L'ANCIENNE PHOTO PRODUIT DEVIENT LA PHOTO ENVIRONNEMENT.

L'ANCIENNE PHOTO ENVIRONNEMENT DEVIENT LA PHOTO PRODUIT.

Donc :

PHOTO ENVIRONNEMENT = ANCIENNE PHOTO PRODUIT.

PHOTO PRODUIT = ANCIENNE PHOTO ENVIRONNEMENT.

Cette inversion est volontaire et doit être respectée pour cette génération.

==================================================
1 — NOUVELLE PHOTO ENVIRONNEMENT
==================================================

L'image qui était précédemment utilisée comme PHOTO PRODUIT doit maintenant être considérée comme la scène environnementale de base.

Elle définit désormais :

- l'environnement
- l'architecture
- les murs
- les volumes
- le sol
- les éléments environnants
- les plantations
- les objets présents
- le cadrage
- la perspective
- la caméra
- la lumière
- les ombres
- l'ensemble de la scène

Cette image devient donc la BASE FIXE du nouveau photomontage.

Son environnement doit être conservé.

==================================================
2 — NOUVELLE PHOTO PRODUIT
==================================================

L'image qui était précédemment utilisée comme PHOTO ENVIRONNEMENT doit maintenant être considérée comme la référence du nouveau produit.

Le produit visible dans cette image doit être utilisé comme nouveau produit.

Extraire le produit complet visible dans cette image.

Ne pas simplement reprendre sa partie centrale.

Conserver autant que possible :

- la forme
- les dimensions relatives
- les panneaux
- les vantaux
- les montants
- les traverses
- les profils
- les motifs
- les décors
- les extensions
- les parties latérales
- les retours
- les finitions
- les couleurs
- les textures
- les détails visibles

==================================================
3 — OPÉRATION DE PHOTOMONTAGE
==================================================

Prendre l'ANCIENNE PHOTO PRODUIT comme nouvelle PHOTO ENVIRONNEMENT.

Prendre l'ANCIENNE PHOTO ENVIRONNEMENT comme nouvelle PHOTO PRODUIT.

Identifier dans la nouvelle PHOTO ENVIRONNEMENT le produit ou élément qui doit être remplacé.

Retirer uniquement cet élément si nécessaire.

Conserver tout le reste de la nouvelle PHOTO ENVIRONNEMENT.

Installer ensuite le produit provenant de la nouvelle PHOTO PRODUIT.

Le nouveau produit doit être intégré naturellement dans cette nouvelle scène.

==================================================
4 — IMPORTANT : NE PAS REVENIR AUX ANCIENS RÔLES
==================================================

NE PAS traiter l'ancienne photo environnement comme environnement.

NE PAS traiter l'ancienne photo produit comme produit.

Les rôles ont volontairement été inversés.

L'objectif est d'obtenir une composition visuellement différente de la génération précédente.

La nouvelle image doit donc être construite à partir de la combinaison :

ANCIENNE PHOTO PRODUIT = NOUVEL ENVIRONNEMENT

+

ANCIENNE PHOTO ENVIRONNEMENT = NOUVEAU PRODUIT

==================================================
5 — INTÉGRATION RÉALISTE
==================================================

Le nouveau produit doit respecter la perspective de la nouvelle PHOTO ENVIRONNEMENT.

Adapter :

- la perspective
- l'échelle
- la profondeur
- les proportions
- les points de contact
- les ombres
- les reflets
- la lumière
- les textures
- les occlusions

Le produit doit sembler réellement présent dans la nouvelle scène.

==================================================
6 — LUMIÈRE
==================================================

Conserver la lumière de la nouvelle PHOTO ENVIRONNEMENT.

Le nouveau produit doit adopter :

- la même direction de lumière
- la même intensité
- la même température de couleur
- les mêmes conditions lumineuses
- des ombres cohérentes avec la scène

==================================================
7 — CAMÉRA
==================================================

La caméra doit être définie par la nouvelle PHOTO ENVIRONNEMENT.

Conserver :

- son cadrage
- son angle
- sa hauteur
- sa perspective
- sa profondeur
- sa focale apparente

==================================================
8 — RÉSULTAT ATTENDU
==================================================

Le résultat doit être VISIBLY DIFFÉRENT de la génération précédente.

NE PAS reproduire automatiquement la composition précédente.

NE PAS conserver les anciens rôles.

NE PAS mélanger les environnements.

NE PAS mélanger les produits.

==================================================
9 — FORMULE FINALE
==================================================

ANCIENNE PHOTO PRODUIT
=
NOUVEL ENVIRONNEMENT

+

ANCIENNE PHOTO ENVIRONNEMENT
=
NOUVEAU PRODUIT

Le résultat final doit donc être une nouvelle composition ultra réaliste basée sur l'inversion complète des deux références.
`;

/* =========================================================
   PROMPT MODIFICATION
========================================================= */

const MODIFICATION_BASE_PROMPT = `
==================================================
MODE MODIFICATION D'UNE IMAGE EXISTANTE
==================================================

L'IMAGE FOURNIE EST LA DERNIÈRE VERSION GÉNÉRÉE ET VALIDÉE.

ELLE DOIT SERVIR DE BASE DIRECTE À LA MODIFICATION.

IL NE S'AGIT PAS DE RECRÉER UNE NOUVELLE SCÈNE.

IL S'AGIT DE MODIFIER L'IMAGE EXISTANTE.

==================================================
RÈGLE ABSOLUE
==================================================

APPLIQUER RÉELLEMENT LA MODIFICATION DEMANDÉE.

NE PAS SIMPLEMENT RENVOYER LA MÊME IMAGE.

NE PAS IGNORER LA MODIFICATION.

NE PAS CONSIDÉRER LA DEMANDE COMME UNE SIMPLE SUGGESTION.

La différence demandée doit être VISIBILE dans le résultat final.

==================================================
ÉLÉMENTS À CONSERVER
==================================================

Sauf indication contraire explicite, conserver :

- le cadrage
- la composition
- la caméra
- la perspective
- l'architecture
- les proportions générales
- l'environnement
- le sol
- les murs
- les plantations
- les éléments non concernés
- la position générale du produit
- la lumière générale
- le réalisme photographique

==================================================
MODIFIER UNIQUEMENT CE QUI EST DEMANDÉ
==================================================

Ne modifier aucun autre élément sans nécessité.

Si l'utilisateur demande une modification de couleur :

→ changer réellement la couleur demandée
→ conserver la forme et le design du produit
→ conserver l'environnement

Si l'utilisateur demande une modification de matériau :

→ changer réellement le matériau demandé
→ conserver les dimensions et la forme
→ conserver la scène

Si l'utilisateur demande une modification d'un détail :

→ modifier précisément ce détail
→ ne pas modifier les autres parties du produit

Si l'utilisateur demande une modification de position :

→ déplacer uniquement l'élément concerné
→ adapter les ombres et les contacts
→ conserver la scène

==================================================
NOUVELLE VERSION OBLIGATOIRE
==================================================

Le résultat final doit être une NOUVELLE VERSION de l'image précédente.

La modification demandée doit être clairement perceptible.

Ne pas reproduire pixel pour pixel l'image précédente.

Ne pas annuler la modification.

Ne pas revenir à l'état précédent.

==================================================
CONTRÔLE FINAL
==================================================

Avant de générer :

1. Identifier précisément la modification demandée.
2. Modifier réellement l'élément concerné.
3. Conserver tout ce qui n'est pas concerné.
4. Vérifier que la modification est visible.
5. Vérifier que le résultat reste photoréaliste.
6. Vérifier que la scène n'a pas été inutilement reconstruite.
`;

/* =========================================================
   COMPOSANT
========================================================= */

export default function GenerateurPrompts() {
  const [product, setProduct] = useState("Portail");

  const [render, setRender] = useState(
    "photomontage ultra réaliste"
  );

  const [color, setColor] = useState(
    "couleur fidèle au modèle"
  );

  const [place, setPlace] = useState("");
  const [details, setDetails] = useState("");
  const [site, setSite] = useState("");

  const [keepEnv, setKeepEnv] = useState(true);
  const [sameLight, setSameLight] = useState(true);
  const [onlyProduct, setOnlyProduct] = useState(true);

  /* =======================================================
     MODE DE GÉNÉRATION
  ======================================================= */

  const [generationMode, setGenerationMode] =
    useState("new");

  /*
    new        = nouvelle génération
    modify     = modification d'une image existante
  */

  const [modification, setModification] = useState("");

  /* =======================================================
     IMAGES
  ======================================================= */

  const [environmentPhoto, setEnvironmentPhoto] =
    useState(null);

  const [productPhoto, setProductPhoto] =
    useState(null);

  const [plan, setPlan] = useState(null);

  /* =======================================================
     INVERSION
  ======================================================= */

  const [inverted, setInverted] = useState(false);

  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);

  const environmentInputRef = useRef(null);
  const productInputRef = useRef(null);
  const planInputRef = useRef(null);

  /* =======================================================
     PRODUIT
  ======================================================= */

  const selectedProduct =
    PRODUCTS.find((item) => item.name === product) ||
    PRODUCTS[0];

  /* =======================================================
     UPLOAD
  ======================================================= */

  const uploadImage = (type, event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Veuillez sélectionner une image.");
      event.target.value = "";
      return;
    }

    const maxSize = 10 * 1024 * 1024;

    if (file.size > maxSize) {
      alert("L'image ne doit pas dépasser 10 Mo.");
      event.target.value = "";
      return;
    }

    const url = URL.createObjectURL(file);

    const imageData = {
      file,
      url,
      name: file.name,
      size: file.size,
      type: file.type,
    };

    if (type === "environment") {
      if (environmentPhoto?.url) {
        URL.revokeObjectURL(environmentPhoto.url);
      }

      setEnvironmentPhoto(imageData);
    }

    if (type === "product") {
      if (productPhoto?.url) {
        URL.revokeObjectURL(productPhoto.url);
      }

      setProductPhoto(imageData);
    }

    if (type === "plan") {
      if (plan?.url) {
        URL.revokeObjectURL(plan.url);
      }

      setPlan(imageData);
    }

    event.target.value = "";
  };

  /* =======================================================
     SUPPRESSION
  ======================================================= */

  const removeImage = (type) => {
    if (type === "environment") {
      if (environmentPhoto?.url) {
        URL.revokeObjectURL(environmentPhoto.url);
      }

      setEnvironmentPhoto(null);
    }

    if (type === "product") {
      if (productPhoto?.url) {
        URL.revokeObjectURL(productPhoto.url);
      }

      setProductPhoto(null);
    }

    if (type === "plan") {
      if (plan?.url) {
        URL.revokeObjectURL(plan.url);
      }

      setPlan(null);
    }
  };

  /* =======================================================
     INVERSION
  ======================================================= */

  const toggleInversion = () => {
    if (!environmentPhoto || !productPhoto) {
      alert(
        "Ajoutez d'abord une photo environnement et une photo produit."
      );
      return;
    }

    setInverted((previous) => !previous);
    setCopied(false);
  };

  /* =======================================================
     MODE MODIFICATION
  ======================================================= */

  const activateModificationMode = () => {
    setGenerationMode("modify");
    setInverted(false);
    setCopied(false);
  };

  const activateNewMode = () => {
    setGenerationMode("new");
    setCopied(false);
  };

  /* =======================================================
     RÉINITIALISATION
  ======================================================= */

  const resetAll = () => {
    if (environmentPhoto?.url) {
      URL.revokeObjectURL(environmentPhoto.url);
    }

    if (productPhoto?.url) {
      URL.revokeObjectURL(productPhoto.url);
    }

    if (plan?.url) {
      URL.revokeObjectURL(plan.url);
    }

    setProduct("Portail");
    setRender("photomontage ultra réaliste");
    setColor("couleur fidèle au modèle");
    setPlace("");
    setDetails("");
    setSite("");

    setKeepEnv(true);
    setSameLight(true);
    setOnlyProduct(true);

    setGenerationMode("new");
    setModification("");

    setEnvironmentPhoto(null);
    setProductPhoto(null);
    setPlan(null);

    setInverted(false);

    setOutput("");
    setCopied(false);
  };

  /* =======================================================
     RÔLES EFFECTIFS
  ======================================================= */

  const effectiveEnvironmentPhoto = inverted
    ? productPhoto
    : environmentPhoto;

  const effectiveProductPhoto = inverted
    ? environmentPhoto
    : productPhoto;

  /* =======================================================
     CONSTRUCTION DU PROMPT
  ======================================================= */

  const buildPrompt = () => {
    const environmentName =
      effectiveEnvironmentPhoto?.name ||
      "PHOTO_ENVIRONNEMENT.jpg";

    const productName =
      effectiveProductPhoto?.name ||
      "PHOTO_PRODUIT.jpg";

    const planName =
      plan?.name || "Aucun plan complémentaire";

    /* =====================================================
       MODE MODIFICATION
    ===================================================== */

    if (generationMode === "modify") {
      return `
GÉNÉRATEUR DE PROMPTS — MODIFICATION D'IMAGE

==================================================
IMAGE À MODIFIER
==================================================

La référence principale est la dernière image générée.

Cette image doit être utilisée comme BASE DIRECTE de la modification.

==================================================
MODIFICATION DEMANDÉE
==================================================

${modification.trim() || "Aucune modification précisée."}

==================================================
PARAMÈTRES DU PROJET
==================================================

PRODUIT :
${product}

TYPE DE RENDU :
${render}

COULEUR / FINITION :
${color}

EMPLACEMENT :
${place || selectedProduct.place}

DÉTAILS PRODUIT :
${details || selectedProduct.details}

TYPE DE SITE :
${site || "site résidentiel / extérieur"}

==================================================
CONTRAINTES
==================================================

Conserver l'environnement :
${keepEnv ? "OUI" : "NON"}

Respecter la lumière existante :
${sameLight ? "OUI" : "NON"}

Modifier uniquement ce qui est demandé :
${onlyProduct ? "OUI" : "NON"}

${MODIFICATION_BASE_PROMPT}

==================================================
INSTRUCTION FINALE
==================================================

Générer la version modifiée de l'image.

La modification demandée doit être clairement visible.

Tout élément non concerné doit rester aussi proche que possible
de la dernière image générée.

NE PAS simplement renvoyer la même image.
NE PAS ignorer la demande.
NE PAS annuler la modification.

Le résultat doit être une nouvelle version réellement modifiée.
      `.trim();
    }

    /* =====================================================
       MODE NORMAL / INVERSÉ
    ===================================================== */

    const roleBlock = inverted
      ? `
==================================================
MODE INVERSÉ ACTIF
==================================================

ATTENTION : LES RÔLES ONT ÉTÉ VOLONTAIREMENT INVERSÉS.

PHOTO ENVIRONNEMENT EFFECTIVE :
${environmentName}

PHOTO PRODUIT EFFECTIVE :
${productName}

IMPORTANT :

La photo "${environmentPhoto?.name || "ancienne photo environnement"}"
est maintenant utilisée comme PHOTO PRODUIT.

La photo "${productPhoto?.name || "ancienne photo produit"}"
est maintenant utilisée comme PHOTO ENVIRONNEMENT.

NE PAS revenir aux rôles précédents.

NE PAS utiliser l'ancienne photo environnement comme scène.

NE PAS utiliser l'ancienne photo produit comme produit.

Cette génération doit utiliser exclusivement les nouveaux rôles définis ci-dessus.

Le résultat doit être différent de la génération précédente.
`
      : `
==================================================
MODE NORMAL
==================================================

PHOTO ENVIRONNEMENT EFFECTIVE :
${environmentName}

PHOTO PRODUIT EFFECTIVE :
${productName}

PHOTO ENVIRONNEMENT = BASE FIXE.

PHOTO PRODUIT = PRODUIT À INSTALLER.

NE JAMAIS INVERSER LES RÔLES.
`;

    const constraints = `
==================================================
PARAMÈTRES DU PROJET
==================================================

PRODUIT :
${product}

TYPE DE RENDU :
${render}

COULEUR / FINITION :
${color}

EMPLACEMENT :
${place || selectedProduct.place}

DÉTAILS PRODUIT :
${details || selectedProduct.details}

TYPE DE SITE :
${site || "site résidentiel / extérieur"}

RÉFÉRENCE TECHNIQUE :
${planName}

==================================================
CONTRAINTES ACTIVÉES
==================================================

Conserver l'environnement :
${keepEnv ? "OUI" : "NON"}

Respecter la lumière existante :
${sameLight ? "OUI" : "NON"}

Modifier uniquement le produit :
${onlyProduct ? "OUI" : "NON"}
`;

    const finalBlock = inverted
      ? `
==================================================
CONTRÔLE FINAL — MODE INVERSÉ
==================================================

1. Les deux photos ont changé de rôle.
2. L'ancienne photo produit est l'environnement.
3. L'ancienne photo environnement est le produit.
4. Aucun retour aux rôles précédents.
5. La composition doit être différente.
6. Le résultat doit rester photoréaliste.
7. Ne pas mélanger les deux scènes.
8. Respecter la nouvelle perspective.
`
      : `
==================================================
CONTRÔLE FINAL — MODE NORMAL
==================================================

1. La PHOTO ENVIRONNEMENT définit la scène.
2. La PHOTO PRODUIT définit le nouveau produit.
3. Les rôles ne sont pas inversés.
4. Le produit complet est utilisé.
5. L'environnement est conservé.
6. La perspective est respectée.
7. La lumière est cohérente.
8. Le résultat est photoréaliste.
`;

    return `
GÉNÉRATEUR DE PROMPTS — PHOTOMONTAGE

${roleBlock}

${inverted ? INVERTED_BASE_PROMPT : NORMAL_BASE_PROMPT}

${constraints}

${finalBlock}
`.trim();
  };

  /* =======================================================
     MISE À JOUR AUTOMATIQUE
  ======================================================= */

  useEffect(() => {
    setOutput(buildPrompt());
    setCopied(false);
  }, [
    product,
    render,
    color,
    place,
    details,
    site,
    keepEnv,
    sameLight,
    onlyProduct,
    environmentPhoto,
    productPhoto,
    plan,
    inverted,
    generationMode,
    modification,
  ]);

  /* =======================================================
     COPIE
  ======================================================= */

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(output);

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error(error);
      alert("Impossible de copier le prompt.");
    }
  };

  /* =======================================================
     COMPOSANT IMAGE
  ======================================================= */

  const ImageBox = ({
    title,
    subtitle,
    image,
    type,
    roleColor,
    inputRef,
  }) => {
    return (
      <div className="gp-image-box">

        <div className="gp-image-header">
          <div>
            <div className="gp-image-title">
              {title}
            </div>

            <div className="gp-image-subtitle">
              {subtitle}
            </div>
          </div>

          <span
            className="gp-role-badge"
            style={{
              background:
                roleColor === "blue"
                  ? "#eff6ff"
                  : roleColor === "purple"
                  ? "#f5f3ff"
                  : "#f3f4f6",

              color:
                roleColor === "blue"
                  ? "#2563eb"
                  : roleColor === "purple"
                  ? "#7c3aed"
                  : "#4b5563",
            }}
          >
            {type === "environment"
              ? inverted
                ? "PRODUIT"
                : "ENVIRONNEMENT"
              : type === "product"
              ? inverted
                ? "ENVIRONNEMENT"
                : "PRODUIT"
              : "COMPLÉMENT"}
          </span>
        </div>

        {image ? (
          <div className="gp-preview-wrapper">

            <img
              src={image.url}
              alt={image.name}
              className="gp-preview"
            />

            <div className="gp-file-name">
              {image.name}
            </div>

            <div className="gp-image-actions">

              <button
                type="button"
                onClick={() =>
                  inputRef.current?.click()
                }
                className="gp-secondary-button"
              >
                <Upload size={15} />
                Remplacer
              </button>

              <button
                type="button"
                onClick={() =>
                  removeImage(type)
                }
                className="gp-delete-button"
              >
                <X size={15} />
                Supprimer
              </button>

            </div>
          </div>
        ) : (
          <button
            type="button"
            className="gp-upload-zone"
            onClick={() =>
              inputRef.current?.click()
            }
          >
            <Upload size={24} />

            <strong>
              Ajouter une image
            </strong>

            <span>
              Cliquez pour sélectionner une image
            </span>

            <small>
              JPG, PNG, WEBP — 10 Mo maximum
            </small>
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={(event) =>
            uploadImage(type, event)
          }
          style={{ display: "none" }}
        />
      </div>
    );
  };

  const hasBothPhotos =
    Boolean(environmentPhoto) &&
    Boolean(productPhoto);

  /* =======================================================
     RENDU
  ======================================================= */

  return (
    <div className="gp-page">

      <style>{`

        .gp-page {
          min-height: 100%;
          background: #f6f7f9;
          color: #1f2937;
          padding: 28px;
          box-sizing: border-box;
          font-family: Inter, ui-sans-serif, system-ui,
            -apple-system, BlinkMacSystemFont,
            "Segoe UI", sans-serif;
        }

        .gp-wrap {
          max-width: 1380px;
          margin: 0 auto;
        }

        .gp-top {
          margin-bottom: 22px;
        }

        .gp-title-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
        }

        .gp-title {
          margin: 0;
          font-size: 28px;
          line-height: 1.2;
          font-weight: 800;
          letter-spacing: -0.5px;
          color: #171717;
        }

        .gp-subtitle {
          margin: 8px 0 0;
          color: #6b7280;
          font-size: 14px;
          line-height: 1.6;
        }

        .gp-reset {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1px solid #d1d5db;
          background: white;
          color: #374151;
          border-radius: 10px;
          padding: 10px 13px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }

        .gp-reset:hover {
          background: #f9fafb;
        }

        .gp-note {
          margin-top: 18px;
          padding: 14px 16px;
          border: 1px solid #fed7aa;
          background: #fff7ed;
          border-radius: 12px;
          color: #9a3412;
          font-size: 13px;
          line-height: 1.6;
        }

        .gp-note strong {
          color: #7c2d12;
        }

        .gp-mode-selector {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 18px;
        }

        .gp-mode-button {
          display: flex;
          align-items: center;
          gap: 12px;
          text-align: left;
          padding: 13px 15px;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          background: white;
          cursor: pointer;
          color: #374151;
        }

        .gp-mode-button:hover {
          background: #fafafa;
        }

        .gp-mode-button.active {
          border-color: #f59e0b;
          background: #fff7ed;
        }

        .gp-mode-icon {
          width: 34px;
          height: 34px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 9px;
          background: #f3f4f6;
        }

        .gp-mode-button.active .gp-mode-icon {
          background: #f59e0b;
          color: #171717;
        }

        .gp-mode-title {
          font-size: 12px;
          font-weight: 900;
          color: #171717;
        }

        .gp-mode-text {
          margin-top: 3px;
          color: #6b7280;
          font-size: 10px;
          line-height: 1.4;
        }

        .gp-inversion-banner {
          margin-top: 14px;
          padding: 14px 16px;
          border-radius: 12px;
          background: #fff7ed;
          border: 2px solid #f59e0b;
          color: #9a3412;
          font-size: 13px;
          line-height: 1.6;
        }

        .gp-inversion-banner strong {
          display: block;
          margin-bottom: 4px;
          color: #7c2d12;
        }

        .gp-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 22px;
          padding-bottom: 4px;
        }

        .gp-tab {
          border: 1px solid #d1d5db;
          background: white;
          color: #374151;
          border-radius: 999px;
          padding: 9px 14px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }

        .gp-tab.active {
          background: #171717;
          border-color: #171717;
          color: white;
        }

        .gp-grid {
          display: grid;
          grid-template-columns: 1.05fr 1fr;
          gap: 22px;
          align-items: start;
          margin-top: 22px;
        }

        .gp-left {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .gp-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          padding: 20px;
          box-sizing: border-box;
        }

        .gp-section-title {
          margin: 0 0 16px;
          color: #c2410c;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.9px;
          text-transform: uppercase;
        }

        .gp-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .gp-field {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .gp-field.full {
          grid-column: 1 / -1;
        }

        .gp-label {
          color: #374151;
          font-size: 12px;
          font-weight: 800;
        }

        .gp-input,
        .gp-select,
        .gp-textarea {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #d1d5db;
          border-radius: 10px;
          background: white;
          color: #1f2937;
          font: inherit;
          font-size: 13px;
          outline: none;
        }

        .gp-input,
        .gp-select {
          height: 42px;
          padding: 0 12px;
        }

        .gp-textarea {
          min-height: 95px;
          padding: 11px 12px;
          resize: vertical;
          line-height: 1.5;
        }

        .gp-input:focus,
        .gp-select:focus,
        .gp-textarea:focus {
          border-color: #f59e0b;
          box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.12);
        }

        .gp-modification-box {
          margin-top: 16px;
          padding: 15px;
          border-radius: 12px;
          background: #fff7ed;
          border: 1px solid #fed7aa;
        }

        .gp-modification-title {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 8px;
          color: #9a3412;
          font-size: 12px;
          font-weight: 900;
        }

        .gp-modification-help {
          margin-bottom: 9px;
          color: #92400e;
          font-size: 11px;
          line-height: 1.5;
        }

        .gp-checkboxes {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .gp-check {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 11px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          cursor: pointer;
          font-size: 13px;
          color: #374151;
        }

        .gp-check:hover {
          background: #f9fafb;
        }

        .gp-check input {
          width: 16px;
          height: 16px;
          accent-color: #f59e0b;
        }

        .gp-reference-info {
          margin-bottom: 14px;
          padding: 12px 14px;
          border-radius: 10px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          color: #4b5563;
          font-size: 12px;
          line-height: 1.6;
        }

        .gp-reference-info strong {
          color: #171717;
        }

        .gp-images {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .gp-image-box {
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          padding: 14px;
          background: #fff;
          min-width: 0;
        }

        .gp-image-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 12px;
        }

        .gp-image-title {
          font-size: 13px;
          font-weight: 900;
          color: #171717;
        }

        .gp-image-subtitle {
          margin-top: 4px;
          color: #6b7280;
          font-size: 11px;
          line-height: 1.4;
        }

        .gp-role-badge {
          flex-shrink: 0;
          border-radius: 999px;
          padding: 5px 8px;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.4px;
        }

        .gp-upload-zone {
          width: 100%;
          min-height: 220px;
          border: 1.5px dashed #d1d5db;
          border-radius: 12px;
          background: #fafafa;
          color: #6b7280;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          padding: 20px;
          box-sizing: border-box;
        }

        .gp-upload-zone:hover {
          border-color: #f59e0b;
          background: #fffaf3;
          color: #c2410c;
        }

        .gp-upload-zone strong {
          color: #374151;
          font-size: 13px;
        }

        .gp-upload-zone span {
          font-size: 12px;
        }

        .gp-upload-zone small {
          color: #9ca3af;
          font-size: 10px;
        }

        .gp-preview-wrapper {
          min-width: 0;
        }

        .gp-preview {
          display: block;
          width: 100%;
          height: 220px;
          object-fit: contain;
          background: #f9fafb;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
        }

        .gp-file-name {
          margin-top: 8px;
          color: #4b5563;
          font-size: 11px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .gp-image-actions {
          display: flex;
          gap: 8px;
          margin-top: 10px;
        }

        .gp-secondary-button,
        .gp-delete-button {
          flex: 1;
          display: inline-flex;
          justify-content: center;
          align-items: center;
          gap: 6px;
          border-radius: 9px;
          padding: 9px 10px;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }

        .gp-secondary-button {
          border: 1px solid #d1d5db;
          background: white;
          color: #374151;
        }

        .gp-delete-button {
          border: 1px solid #fecaca;
          background: #fff;
          color: #dc2626;
        }

        .gp-secondary-button:hover {
          background: #f9fafb;
        }

        .gp-delete-button:hover {
          background: #fef2f2;
        }

        .gp-invert-wrapper {
          margin-top: 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px;
          border-radius: 12px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
        }

        .gp-invert-description {
          min-width: 0;
        }

        .gp-invert-title {
          font-size: 12px;
          font-weight: 900;
          color: #171717;
        }

        .gp-invert-text {
          margin-top: 3px;
          color: #6b7280;
          font-size: 11px;
          line-height: 1.5;
        }

        .gp-invert-button {
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border: 1px solid #171717;
          background: #171717;
          color: white;
          border-radius: 10px;
          padding: 10px 13px;
          font-size: 11px;
          font-weight: 900;
          cursor: pointer;
        }

        .gp-invert-button:hover {
          background: #000;
        }

        .gp-invert-button.active {
          background: #f59e0b;
          border-color: #f59e0b;
          color: #171717;
        }

        .gp-invert-button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .gp-effective-roles {
          margin-top: 14px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .gp-effective-role {
          padding: 10px 12px;
          border-radius: 10px;
          background: #fff;
          border: 1px solid #e5e7eb;
          font-size: 11px;
          line-height: 1.5;
        }

        .gp-effective-role strong {
          display: block;
          margin-bottom: 2px;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          color: #c2410c;
        }

        .gp-effective-role span {
          display: block;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
          color: #374151;
        }

        .gp-plan {
          margin-top: 14px;
        }

        .gp-prompt-card {
          position: sticky;
          top: 20px;
          background: #171717;
          border-radius: 20px;
          padding: 22px;
          color: white;
          box-sizing: border-box;
        }

        .gp-prompt-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          margin-bottom: 14px;
        }

        .gp-prompt-title {
          margin: 0;
          font-size: 15px;
          font-weight: 900;
        }

        .gp-prompt-status {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 8px;
          border-radius: 999px;
          font-size: 9px;
          font-weight: 900;
          background: #272727;
          color: #d1d5db;
        }

        .gp-prompt-status.modify {
          background: #f59e0b;
          color: #171717;
        }

        .gp-prompt-status.inverted {
          background: #f59e0b;
          color: #171717;
        }

        .gp-active-files {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-bottom: 12px;
        }

        .gp-active-file {
          min-width: 0;
          padding: 9px 10px;
          border-radius: 9px;
          background: #0f1012;
          border: 1px solid #2d2f33;
        }

        .gp-active-file strong {
          display: block;
          color: #f59e0b;
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          margin-bottom: 3px;
        }

        .gp-active-file span {
          display: block;
          color: #d1d5db;
          font-size: 10px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .gp-prompt-textarea {
          width: 100%;
          min-height: 640px;
          resize: vertical;
          box-sizing: border-box;
          background: #0f1012;
          border: 1px solid #374151;
          border-radius: 13px;
          color: #f3f4f6;
          padding: 15px;
          font-family: ui-monospace, SFMono-Regular,
            Menlo, Monaco, Consolas,
            "Liberation Mono", monospace;
          font-size: 11px;
          line-height: 1.55;
          outline: none;
        }

        .gp-prompt-textarea:focus {
          border-color: #f59e0b;
          box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.12);
        }

        .gp-prompt-actions {
          display: flex;
          gap: 10px;
          margin-top: 12px;
        }

        .gp-copy {
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 0;
          border-radius: 10px;
          background: #f59e0b;
          color: #171717;
          padding: 11px 14px;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
        }

        .gp-copy:hover {
          background: #fbbf24;
        }

        .gp-copy.copied {
          background: #22c55e;
          color: white;
        }

        .gp-footer-note {
          margin-top: 11px;
          color: #9ca3af;
          font-size: 10px;
          line-height: 1.5;
        }

        @media (max-width: 980px) {
          .gp-grid {
            grid-template-columns: 1fr;
          }

          .gp-prompt-card {
            position: static;
          }
        }

        @media (max-width: 700px) {
          .gp-page {
            padding: 16px;
          }

          .gp-title-row {
            flex-direction: column;
          }

          .gp-form-grid,
          .gp-images,
          .gp-effective-roles,
          .gp-active-files,
          .gp-mode-selector {
            grid-template-columns: 1fr;
          }

          .gp-invert-wrapper {
            flex-direction: column;
            align-items: stretch;
          }

          .gp-invert-button {
            justify-content: center;
          }
        }

      `}</style>

      <div className="gp-wrap">

        {/* =====================================================
            HEADER
        ====================================================== */}

        <div className="gp-top">

          <div className="gp-title-row">

            <div>
              <h1 className="gp-title">
                Générateur de prompts
              </h1>

              <p className="gp-subtitle">
                Créez des prompts précis pour vos photomontages
                ultra réalistes.
              </p>
            </div>

            <button
              type="button"
              className="gp-reset"
              onClick={resetAll}
            >
              <RotateCcw size={15} />
              Réinitialiser
            </button>

          </div>

          <div className="gp-note">
            <strong>Important :</strong>{" "}
            choisissez une nouvelle génération ou une modification
            de l'image existante. Le mode modification demande
            explicitement à l'IA d'appliquer réellement le changement.
          </div>

          {/* ===================================================
              MODES
          ==================================================== */}

          <div className="gp-mode-selector">

            <button
              type="button"
              className={`gp-mode-button ${
                generationMode === "new"
                  ? "active"
                  : ""
              }`}
              onClick={activateNewMode}
            >
              <div className="gp-mode-icon">
                <Sparkles size={17} />
              </div>

              <div>
                <div className="gp-mode-title">
                  Nouvelle génération
                </div>

                <div className="gp-mode-text">
                  Créer un nouveau photomontage à partir
                  des références.
                </div>
              </div>
            </button>

            <button
              type="button"
              className={`gp-mode-button ${
                generationMode === "modify"
                  ? "active"
                  : ""
              }`}
              onClick={activateModificationMode}
            >
              <div className="gp-mode-icon">
                <Pencil size={17} />
              </div>

              <div>
                <div className="gp-mode-title">
                  Modifier l'image existante
                </div>

                <div className="gp-mode-text">
                  Partir de la dernière image générée
                  et modifier uniquement ce qui est demandé.
                </div>
              </div>
            </button>

          </div>

          {/* ===================================================
              MODE MODIFICATION
          ==================================================== */}

          {generationMode === "modify" && (
            <div className="gp-modification-box">

              <div className="gp-modification-title">
                <Pencil size={15} />

                Modification à appliquer
              </div>

              <div className="gp-modification-help">
                Décrivez précisément ce que vous voulez changer.
                Le reste de l'image doit rester identique.
              </div>

              <textarea
                className="gp-textarea"
                value={modification}
                onChange={(event) =>
                  setModification(event.target.value)
                }
                placeholder={
                  "Ex. Changer uniquement la couleur du portail en noir mat. Conserver absolument tout le reste identique."
                }
                style={{
                  minHeight: 110,
                }}
              />

            </div>
          )}

          {/* ===================================================
              INVERSION
          ==================================================== */}

          {inverted && (
            <div className="gp-inversion-banner">

              <strong>
                ⚠ MODE INVERSÉ ACTIF
              </strong>

              Les deux références ont changé de rôle pour
              cette génération.

            </div>
          )}

          {/* ===================================================
              PRODUITS
          ==================================================== */}

          <div className="gp-tabs">

            {PRODUCTS.map((item) => (
              <button
                key={item.name}
                type="button"
                className={`gp-tab ${
                  product === item.name
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setProduct(item.name)
                }
              >
                {item.name}
              </button>
            ))}

          </div>

        </div>

        {/* =====================================================
            GRID
        ====================================================== */}

        <div className="gp-grid">

          {/* ===================================================
              GAUCHE
          ==================================================== */}

          <div className="gp-left">

            {/* PARAMÈTRES */}

            <div className="gp-card">

              <h2 className="gp-section-title">
                Paramètres du projet
              </h2>

              <div className="gp-form-grid">

                <div className="gp-field">

                  <label className="gp-label">
                    Produit
                  </label>

                  <input
                    className="gp-input"
                    value={product}
                    readOnly
                  />

                </div>

                <div className="gp-field">

                  <label className="gp-label">
                    Type de rendu
                  </label>

                  <select
                    className="gp-select"
                    value={render}
                    onChange={(event) =>
                      setRender(event.target.value)
                    }
                  >
                    <option>
                      photomontage ultra réaliste
                    </option>

                    <option>
                      rendu architectural réaliste
                    </option>

                    <option>
                      visualisation commerciale réaliste
                    </option>
                  </select>

                </div>

                <div className="gp-field">

                  <label className="gp-label">
                    Couleur / finition
                  </label>

                  <input
                    className="gp-input"
                    value={color}
                    onChange={(event) =>
                      setColor(event.target.value)
                    }
                    placeholder="Ex. noir mat, gris anthracite..."
                  />

                </div>

                <div className="gp-field">

                  <label className="gp-label">
                    Emplacement
                  </label>

                  <input
                    className="gp-input"
                    value={place}
                    onChange={(event) =>
                      setPlace(event.target.value)
                    }
                    placeholder={
                      selectedProduct.place
                    }
                  />

                </div>

                <div className="gp-field full">

                  <label className="gp-label">
                    Détails du produit
                  </label>

                  <textarea
                    className="gp-textarea"
                    value={details}
                    onChange={(event) =>
                      setDetails(event.target.value)
                    }
                    placeholder={
                      selectedProduct.details
                    }
                  />

                </div>

                <div className="gp-field full">

                  <label className="gp-label">
                    Type de site / contexte
                  </label>

                  <input
                    className="gp-input"
                    value={site}
                    onChange={(event) =>
                      setSite(event.target.value)
                    }
                    placeholder={
                      "Ex. maison individuelle, résidence..."
                    }
                  />

                </div>

              </div>

            </div>

            {/* RÉFÉRENCES */}

            <div className="gp-card">

              <h2 className="gp-section-title">
                Références visuelles
              </h2>

              <div className="gp-reference-info">

                <strong>Mode normal :</strong>{" "}
                environnement → décor à conserver ;
                produit → nouveau produit.

                <br />

                <strong>Mode inversé :</strong>{" "}
                les deux rôles sont volontairement échangés.

                <br />

                <strong>Mode modification :</strong>{" "}
                la dernière image générée devient la base
                de la nouvelle modification.

              </div>

              <div className="gp-images">

                <ImageBox
                  title="Photo environnement"
                  subtitle="Image originale — emplacement 1"
                  image={environmentPhoto}
                  type="environment"
                  roleColor="blue"
                  inputRef={environmentInputRef}
                />

                <ImageBox
                  title="Photo produit"
                  subtitle="Image originale — emplacement 2"
                  image={productPhoto}
                  type="product"
                  roleColor="purple"
                  inputRef={productInputRef}
                />

              </div>

              {/* INVERSION */}

              <div className="gp-invert-wrapper">

                <div className="gp-invert-description">

                  <div className="gp-invert-title">
                    Inverser les rôles des deux images
                  </div>

                  <div className="gp-invert-text">
                    Le fichier reste à sa place, mais son rôle
                    dans le prompt est complètement inversé.
                  </div>

                </div>

                <button
                  type="button"
                  className={`gp-invert-button ${
                    inverted
                      ? "active"
                      : ""
                  }`}
                  onClick={toggleInversion}
                  disabled={
                    !hasBothPhotos ||
                    generationMode === "modify"
                  }
                >

                  <ArrowLeftRight size={15} />

                  {inverted
                    ? "Rôles inversés"
                    : "Échanger les rôles"}

                </button>

              </div>

              {/* RÔLES EFFECTIFS */}

              <div className="gp-effective-roles">

                <div className="gp-effective-role">

                  <strong>
                    Environnement utilisé
                  </strong>

                  <span>
                    {effectiveEnvironmentPhoto?.name ||
                      "Aucune image"}
                  </span>

                </div>

                <div className="gp-effective-role">

                  <strong>
                    Produit utilisé
                  </strong>

                  <span>
                    {effectiveProductPhoto?.name ||
                      "Aucune image"}
                  </span>

                </div>

              </div>

              {/* PLAN */}

              <div className="gp-plan">

                <div className="gp-field">

                  <label className="gp-label">
                    Référence technique complémentaire
                  </label>

                  <div style={{ marginTop: 2 }}>

                    <ImageBox
                      title="Plan / détail technique"
                      subtitle="Optionnel"
                      image={plan}
                      type="plan"
                      roleColor="gray"
                      inputRef={planInputRef}
                    />

                  </div>

                </div>

              </div>

            </div>

            {/* CONTRAINTES */}

            <div className="gp-card">

              <h2 className="gp-section-title">
                Contraintes de génération
              </h2>

              <div className="gp-checkboxes">

                <label className="gp-check">

                  <input
                    type="checkbox"
                    checked={keepEnv}
                    onChange={(event) =>
                      setKeepEnv(
                        event.target.checked
                      )
                    }
                  />

                  <span>
                    Conserver intégralement
                    l'environnement existant
                  </span>

                </label>

                <label className="gp-check">

                  <input
                    type="checkbox"
                    checked={sameLight}
                    onChange={(event) =>
                      setSameLight(
                        event.target.checked
                      )
                    }
                  />

                  <span>
                    Respecter la lumière et les ombres
                    de la scène
                  </span>

                </label>

                <label className="gp-check">

                  <input
                    type="checkbox"
                    checked={onlyProduct}
                    onChange={(event) =>
                      setOnlyProduct(
                        event.target.checked
                      )
                    }
                  />

                  <span>
                    Modifier uniquement ce qui est demandé
                  </span>

                </label>

              </div>

            </div>

          </div>

          {/* ===================================================
              DROITE
          ==================================================== */}

          <div className="gp-prompt-card">

            <div className="gp-prompt-top">

              <h2 className="gp-prompt-title">
                Prompt généré
              </h2>

              <span
                className={`gp-prompt-status ${
                  generationMode === "modify"
                    ? "modify"
                    : inverted
                    ? "inverted"
                    : ""
                }`}
              >

                {generationMode === "modify" ? (
                  <>
                    <Pencil size={11} />
                    MODIFICATION
                  </>
                ) : inverted ? (
                  <>
                    <ArrowLeftRight size={11} />
                    MODE INVERSÉ
                  </>
                ) : (
                  <>
                    <Check size={11} />
                    MODE NORMAL
                  </>
                )}

              </span>

            </div>

            {/* FICHIERS */}

            {generationMode === "new" && (
              <div className="gp-active-files">

                <div className="gp-active-file">

                  <strong>
                    Environnement
                  </strong>

                  <span>
                    {effectiveEnvironmentPhoto?.name ||
                      "Aucune image"}
                  </span>

                </div>

                <div className="gp-active-file">

                  <strong>
                    Produit
                  </strong>

                  <span>
                    {effectiveProductPhoto?.name ||
                      "Aucune image"}
                  </span>

                </div>

              </div>
            )}

            {generationMode === "modify" && (
              <div className="gp-active-files">

                <div
                  className="gp-active-file"
                  style={{
                    gridColumn: "1 / -1",
                  }}
                >

                  <strong>
                    Image de base
                  </strong>

                  <span>
                    Dernière image générée
                  </span>

                </div>

              </div>
            )}

            {/* PROMPT */}

            <textarea
              className="gp-prompt-textarea"
              value={output}
              onChange={(event) =>
                setOutput(event.target.value)
              }
              spellCheck={false}
            />

            {/* ACTION */}

            <div className="gp-prompt-actions">

              <button
                type="button"
                className={`gp-copy ${
                  copied ? "copied" : ""
                }`}
                onClick={copyPrompt}
              >

                {copied ? (
                  <>
                    <Check size={16} />
                    Copié
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    Copier le prompt
                  </>
                )}

              </button>

            </div>

            <div className="gp-footer-note">

              {generationMode === "modify"
                ? "Le prompt demande explicitement une nouvelle version modifiée de l'image précédente, sans recréer inutilement la scène."
                : inverted
                ? "Les rôles des deux références sont volontairement inversés."
                : "Le prompt utilise la photo environnement comme base et la photo produit comme référence du nouveau produit."}

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}