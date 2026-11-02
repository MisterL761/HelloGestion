import React, { useMemo, useState } from "react";

const fournisseurs = [
  {
    nom: "ATULAM",
    categorie: "Menuiseries bois",
    remises: [
      {
        taux: "41 %",
        produit: "Ensemble du tarif public HT",
        conditions: "Remise négociée sur l’ensemble du tarif public HT.",
      },
    ],
    promotions: [
      {
        titre: "5 % de remise supplémentaire",
        produit: "Commandes passées via la solution en ligne PACOMME",
        dates: ["20 mars au 18 avril", "12 juin au 11 juillet", "25 septembre au 24 octobre"],
        conditions: "La commande doit être passée sur la solution en ligne PACOMME.",
      },
    ],
    contact: "Sarah VEIBERT",
    email: "sveibert@atulam.fr",
    telephone: "07 64 21 94 84",
  },
  {
    nom: "BOSCHAT LAVEIX",
    categorie: "Équipement et matériel de pose",
    remises: [
      {
        taux: "À consulter",
        produit: "Produits et tarifs négociés",
        conditions: "Consulter les produits, tarifs négociés et bons de commande.",
      },
    ],
    promotions: [],
    contact: "Eric DURIBREUX",
    email: "e.duribreux@boschat-laveix.com",
    telephone: "06 11 98 39 70",
  },
  {
    nom: "CETAL",
    categorie: "Volets battants, portails et clôtures",
    remises: [
      {
        taux: "35 %",
        produit: "Toutes les gammes de volets battants",
        conditions: "Remise négociée sur toutes les gammes de volets.",
      },
      {
        taux: "35 %",
        produit: "Motorisation des volets battants",
        conditions: "Remise négociée sur la motorisation.",
      },
      {
        taux: "50 %",
        produit: "Gamme de portails et clôtures (évolution)",
        conditions: "Remise négociée sur la gamme de portails et clôtures (évolution).",
      },
      {
        taux: "35 %",
        produit: "Motorisation et garde-corps",
        conditions: "Remise négociée sur la motorisation et les garde-corps.",
      },
    ],
    promotions: [
      {
        titre: "6 % de remise supplémentaire",
        produit: "Volets battants isolés",
        dates: ["Janvier à mars"],
        conditions: "Remise supplémentaire sur toutes les commandes de volets battants isolés.",
      },
      {
        titre: "10 % de remise",
        produit: "Portails de la gamme Création",
        dates: ["Janvier à mars"],
        conditions: "Offre promotionnelle sur les portails de la gamme Création.",
      },
      {
        titre: "10 % de remise",
        produit: "Portails tôle : Hercule, Titan, Planétaire et Pluton",
        dates: ["Janvier à mars"],
        conditions: "Offre promotionnelle sur les modèles indiqués.",
      },
      {
        titre: "15 % de remise",
        produit: "Clôtures",
        dates: ["Janvier à mars"],
        conditions: "Offre promotionnelle sur les clôtures.",
      },
      {
        titre: "10 % de remise",
        produit: "Garde-corps",
        dates: ["Janvier à mars"],
        conditions: "Hors main courante.",
      },
      {
        titre: "4 % de remise supplémentaire",
        produit: "Opérations salons / portes ouvertes",
        dates: ["4 semaines consécutives au choix"],
        conditions: "Remise supplémentaire hors motorisation. Choisir 4 semaines consécutives.",
      },
    ],
    contact: "Régis BERGAM",
    email: "directioncommerciale@cetal54.fr",
    telephone: "06 75 36 99 51",
  },
  {
    nom: "EHRET",
    categorie: "Volets battants",
    remises: [
      {
        taux: "41 %",
        produit: "Ensemble du tarif public HT",
        conditions: "Remise négociée sur l’ensemble du tarif public HT.",
      },
    ],
    promotions: [
      {
        titre: "5 % de remise supplémentaire",
        produit: "Produits EHRET",
        dates: ["10 mars au 30 avril", "2 juin au 15 juillet", "15 septembre au 31 octobre"],
        conditions: "Remise supplémentaire pendant les périodes indiquées.",
      },
    ],
    contact: "Rémy POUTOT",
    email: "remy.poutot@ehret.com",
    telephone: "06 48 76 45 21",
  },
  {
    nom: "ELCIA / PRODEVIS",
    categorie: "Services",
    remises: [
      {
        taux: "150 €/mois",
        produit: "Licence PRODEVIS",
        conditions: "Prix négocié au lieu de 175 €/mois.",
      },
      {
        taux: "55 €/mois",
        produit: "Licence supplémentaire PRODEVIS",
        conditions: "Prix négocié au lieu de 60 €/mois.",
      },
    ],
    promotions: [],
    contact: "Pierre-Louis GERLIER",
    email: "plgerlier@elcia.com",
    telephone: "06 13 16 22 54",
  },
  {
    nom: "ELDO",
    categorie: "Services",
    remises: [
      {
        taux: "2 590 € HT/an",
        produit: "Abonnement ELDO",
        conditions: "Abonnement négocié au lieu de 3 200 € HT/an.",
      },
    ],
    promotions: [],
    contact: "Alexandre VASSEUR",
    email: "alexandre.vasseur@eldo.com",
    telephone: "07 57 45 90 59",
  },
  {
    nom: "FILTERSUN",
    categorie: "Stores et moustiquaires",
    remises: [
      {
        taux: "À consulter",
        produit: "Stores intérieurs et moustiquaires",
        conditions: "Consulter le détail des remises négociées.",
      },
    ],
    promotions: [
      {
        titre: "10 % de remise supplémentaire",
        produit: "Stores intérieurs et moustiquaires",
        dates: ["2 périodes de 4 semaines consécutives au choix"],
        conditions: "Commande passée depuis l’espace PRO MARITON. Hors cumul avec une période de promotion.",
      },
    ],
    contact: "Cédric PEREZ",
    email: "c.perez@mariton.fr",
    telephone: "06 76 45 14 79",
  },
  {
    nom: "KRAFTÉO",
    categorie: "Services",
    remises: [
      {
        taux: "-10 %",
        produit: "Abonnement pour le pack de 5 licences",
        conditions: "Remise sur le tarif public de 170 € HT/mois.",
      },
      {
        taux: "-10 %",
        produit: "Licences supplémentaires",
        conditions: "Remise sur le tarif public de 20 € HT/mois.",
      },
    ],
    promotions: [],
    contact: "Franck MOULIN",
    email: "franck@krafteo.com",
    telephone: "06 71 07 44 07",
  },
  {
    nom: "LAKAL",
    categorie: "Volets roulants",
    remises: [
      {
        taux: "35 %",
        produit: "Potentiel de commande jusqu’à 89 999 €",
        conditions: "Remise négociée selon le potentiel de commande.",
      },
      {
        taux: "36,5 %",
        produit: "Potentiel de commande de 90 000 € à 199 999 €",
        conditions: "Remise négociée selon le potentiel de commande.",
      },
      {
        taux: "38 %",
        produit: "Potentiel de commande supérieur à 200 000 €",
        conditions: "Remise négociée selon le potentiel de commande.",
      },
    ],
    promotions: [
      {
        titre: "5 % de remise supplémentaire",
        produit: "Produits LAKAL",
        dates: ["3 périodes de 3 semaines consécutives au choix"],
        conditions: "Choisir 3 périodes de 3 semaines consécutives pour bénéficier de la promotion.",
      },
    ],
    contact: "David SEGURA",
    email: "david.segura@lakal-france.fr",
    telephone: "06 73 89 19 07",
  },
  {
    nom: "LE MOINE",
    categorie: "Stores bannes et pergolas",
    remises: [
      {
        taux: "53 %",
        produit: "Ensemble de la gamme pergolas",
        conditions: "Remise négociée sur l’ensemble de la gamme pergolas.",
      },
      {
        taux: "52 %",
        produit: "Stores extérieurs, corbeilles et toiles confectionnées",
        conditions: "Remise négociée sur les gammes indiquées.",
      },
      {
        taux: "60 %",
        produit: "Store Jade",
        conditions: "Remise négociée spécifique au store Jade.",
      },
      {
        taux: "55 %",
        produit: "Store Ambre",
        conditions: "Remise négociée spécifique au store Ambre.",
      },
      {
        taux: "52 %",
        produit: "Brise-soleil orientable et caisson",
        conditions: "Remise négociée sur la gamme indiquée.",
      },
    ],
    promotions: [
      {
        titre: "10 % de remise supplémentaire",
        produit: "Produits de la gamme Marquises",
        dates: ["10 jours consécutifs au choix"],
        conditions: "Remise supplémentaire à votre client pour l’achat d’un produit de la gamme Marquises.",
      },
      {
        titre: "Moteur solaire au prix du moteur radio IO Somfy",
        produit: "Stores de la gamme autonome",
        dates: ["23 février au 26 avril"],
        conditions: "Pour l’achat d’un store de la gamme autonome.",
      },
      {
        titre: "8 % de remise supplémentaire",
        produit: "Pergolas de la gamme Marquises",
        dates: ["23 février au 26 avril"],
        conditions: "Remise supplémentaire pour toute commande d’une pergola de la gamme Marquises.",
      },
      {
        titre: "Moteur radio IO Somfy offert",
        produit: "Stores",
        dates: ["23 février au 26 avril"],
        conditions: "Pour 1 € de plus sur l’achat d’un store.",
      },
      {
        titre: "10 % de remise supplémentaire",
        produit: "Carports de la gamme Marquises",
        dates: ["14 septembre au 31 octobre"],
        conditions: "Remise supplémentaire pour toute commande d’un carport de la gamme Marquises.",
      },
    ],
    contact: "Rudy BOYAVAL",
    email: "rboyaval@stores-marquises.fr",
    telephone: "06 32 92 28 97",
  },
  {
    nom: "MARITON",
    categorie: "Stores et moustiquaires",
    remises: [
      {
        taux: "55 %",
        produit: "Stores intérieurs",
        conditions: "Remise négociée sur les stores intérieurs.",
      },
      {
        taux: "50 %",
        produit: "Moustiquaires",
        conditions: "Remise négociée sur les moustiquaires.",
      },
      {
        taux: "45 %",
        produit: "Stores extérieurs Rollo et BSO",
        conditions: "Remise négociée sur les stores extérieurs indiqués.",
      },
    ],
    promotions: [
      {
        titre: "10 % de remise supplémentaire",
        produit: "Stores intérieurs et moustiquaires",
        dates: ["2 périodes de 4 semaines consécutives au choix"],
        conditions: "Commande passée depuis l’espace PRO MARITON. Hors cumul avec une période de promotion.",
      },
    ],
    contact: "Cédric PEREZ",
    email: "c.perez@mariton.fr",
    telephone: "06 76 45 14 79",
  },
  {
    nom: "MARQUISES",
    categorie: "Stores bannes et pergolas",
    remises: [
      {
        taux: "51 %",
        produit: "Stores bannes",
        conditions: "Remise négociée sur les stores bannes.",
      },
      {
        taux: "40 %",
        produit: "Pergolas",
        conditions: "Remise négociée sur les pergolas.",
      },
      {
        taux: "50 %",
        produit: "Stores intérieurs",
        conditions: "Remise négociée sur les stores intérieurs.",
      },
    ],
    promotions: [
      {
        titre: "10 % de remise supplémentaire",
        produit: "Stores bannes Marina, Tobago, Antalya, Océania, Hemera, Hermès, Kuba et Artemis",
        dates: ["23 mars au 19 avril", "11 mai au 7 juin", "14 septembre au 11 octobre"],
        conditions: "Remise supplémentaire sur les modèles listés.",
      },
      {
        titre: "LED offertes",
        produit: "Pergoklim Integral et Access",
        dates: ["23 mars au 19 avril", "11 mai au 7 juin", "14 septembre au 11 octobre"],
        conditions: "Hors transformateur et récepteur radio.",
      },
      {
        titre: "10 % de remise supplémentaire",
        produit: "Alizéo et options",
        dates: ["23 mars au 19 avril", "11 mai au 7 juin", "14 septembre au 11 octobre"],
        conditions: "Remise supplémentaire sur Alizéo et ses options.",
      },
      {
        titre: "10 % de remise supplémentaire",
        produit: "Carports et options",
        dates: ["23 mars au 19 avril", "11 mai au 7 juin", "14 septembre au 11 octobre"],
        conditions: "Remise supplémentaire sur les carports et leurs options.",
      },
    ],
    contact: "Christophe PICHOT",
    email: "christophe.pichot@soliso.com",
    telephone: "06 60 55 33 05",
  },
  {
    nom: "MSE",
    categorie: "À vérifier dans le dépliant",
    remises: [],
    promotions: [],
    contact: "",
    email: "",
    telephone: "",
  },
  {
    nom: "NICE",
    categorie: "Automatisme et domotique",
    remises: [
      {
        taux: "20 à 52 %",
        produit: "Produits NICE",
        conditions: "Remises variables selon les produits. Consulter le détail des remises.",
      },
    ],
    promotions: [
      {
        titre: "Remise sur sélection de produits intérieur",
        produit: "Portes de garage, MyBell seul et Screen EasyKit",
        dates: ["19 janvier au 13 février"],
        conditions: "Offre sur une sélection de produits intérieur. Consulter le détail de l’offre.",
      },
      {
        titre: "Remise sur les produits phares",
        produit: "Sélection de produits NICE",
        dates: ["2 mars au 30 avril", "7 septembre au 30 octobre"],
        conditions: "Consulter le détail de l’offre.",
      },
      {
        titre: "Sélection solaire",
        produit: "Solemyo 30W, kits solaires Screen et gestion des stores et volets roulants",
        dates: ["15 juin au 17 juillet"],
        conditions: "Offre sur la sélection solaire indiquée.",
      },
      {
        titre: "Sélection sécurité",
        produit: "Alarmes MyNice / Yubii Home, accessoires connectés, caméras, détecteurs de risques et contrôle d’accès",
        dates: ["16 novembre au 21 décembre"],
        conditions: "Offre sur la sélection sécurité indiquée.",
      },
    ],
    contact: "Pierre-Julien GARDE",
    email: "pj.garde@niceforyou.com",
    telephone: "06 77 04 39 51",
  },
  {
    nom: "NOVAFEN",
    categorie: "Menuiseries XXL",
    remises: [
      {
        taux: "40 %",
        produit: "Ensemble du tarif public HT",
        conditions: "Remise négociée sur l’ensemble du tarif public HT.",
      },
    ],
    promotions: [],
    contact: "Benjamin PININGRE",
    email: "marketing@novafen.com",
    telephone: "03 89 37 08 71",
  },
  {
    nom: "PICARD SERRURES",
    categorie: "Portes blindées",
    remises: [
      {
        taux: "42 %",
        produit: "Ensemble du tarif public HT",
        conditions: "Remise négociée sur l’ensemble du tarif public HT.",
      },
    ],
    promotions: [
      {
        titre: "5 % de remise supplémentaire",
        produit: "Portes blindées",
        dates: ["9 février au 27 mars", "7 septembre au 18 octobre"],
        conditions: "Remise supplémentaire sur les portes blindées.",
      },
      {
        titre: "Promotion liée à l’exposition",
        produit: "Présentation d’une porte ou mini-porte en exposition",
        dates: ["1 période de 4 semaines consécutives au choix"],
        conditions: "Choisir une période de 4 semaines consécutives pour bénéficier de la promotion.",
      },
    ],
    contact: "Régis DI DIA",
    email: "rdidia@picard-serrures.com",
    telephone: "06 22 43 24 97",
  },
  {
    nom: "PROFERM",
    categorie: "Menuiseries",
    remises: [],
    promotions: [
      {
        titre: "Choisissez votre vitrage",
        produit: "Vitrage",
        dates: ["20 mars au 15 mai"],
        conditions: "Temps fort Experts Agréés PROFERM.",
      },
      {
        titre: "Les couleurs standards HYBRIDE au prix de l’HYBRIDE blanc",
        produit: "Menuiseries HYBRIDE",
        dates: ["12 juin au 31 juillet"],
        conditions: "Temps fort Experts Agréés PROFERM.",
      },
      {
        titre: "La prime reprise",
        produit: "Offre PROFERM",
        dates: ["25 septembre au 15 novembre"],
        conditions: "Temps fort Experts Agréés PROFERM.",
      },
    ],
    contact: "",
    email: "communication@proferm.com",
    telephone: "03 21 77 42 20",
  },
  {
    nom: "REVEL’HOME",
    categorie: "Services",
    remises: [
      {
        taux: "-10 %",
        produit: "Abonnement",
        conditions: "Abonnement négocié à 157,50 € HT/mois.",
      },
      {
        taux: "-10 %",
        produit: "Utilisateur supplémentaire",
        conditions: "Utilisateur supplémentaire négocié à 22,50 € HT/mois.",
      },
    ],
    promotions: [],
    contact: "Charles PELLÉ",
    email: "charles.pelle@revelhome.fr",
    telephone: "06 61 08 17 31",
  },
  {
    nom: "SDA",
    categorie: "Portes de garage",
    remises: [
      {
        taux: "53 %",
        produit: "Ensemble du tarif public HT",
        conditions: "Remise négociée sur l’ensemble du tarif public HT.",
      },
    ],
    promotions: [
      {
        titre: "Easy Drive + au prix de Easy Drive",
        produit: "Portes de garage",
        dates: ["20 mars au 15 mai", "12 juin au 31 juillet", "25 septembre au 15 novembre"],
        conditions: "Offre Easy Drive + au prix de Easy Drive.",
      },
      {
        titre: "5 % de remise supplémentaire",
        produit: "Portes blindées",
        dates: ["9 février au 27 mars", "7 septembre au 18 octobre"],
        conditions: "Offre indiquée dans le récapitulatif annuel du dépliant.",
      },
      {
        titre: "Présentation d’une porte ou mini-porte en exposition",
        produit: "Porte ou mini-porte en exposition",
        dates: ["1 période de 4 semaines consécutives au choix"],
        conditions: "Choisir une période de 4 semaines consécutives.",
      },
    ],
    contact: "Jérôme DELASSUS",
    email: "j.delassus@sda-gm.com",
    telephone: "06 14 56 58 70",
  },
  {
    nom: "SOMFY",
    categorie: "Automatisme et domotique",
    remises: [
      {
        taux: "20 à 52 %",
        produit: "Produits Somfy",
        conditions: "Remises variables selon les produits. Consulter le détail des remises.",
      },
    ],
    promotions: [
      {
        titre: "Remise supplémentaire via le e-shop Somfy",
        produit: "Produits Somfy disponibles sur le e-shop",
        dates: ["20 avril au 10 mai", "6 au 26 juillet", "19 octobre au 8 novembre"],
        conditions: "Remise supplémentaire via le e-shop Somfy.",
      },
    ],
    contact: "Yoran LE BRUN",
    email: "yoran.le.brun@somfy.com",
    telephone: "06 29 76 33 31",
  },
  {
    nom: "SOLISO",
    categorie: "Stores bannes et pergolas",
    remises: [
      {
        taux: "À consulter",
        produit: "Sélections de produits selon la saison",
        conditions: "Remises sur sélections de produits selon la saison.",
      },
    ],
    promotions: [
      {
        titre: "Remise sur sélection de produits",
        produit: "Sélection saisonnière SOLISO",
        dates: [
          "19 janvier au 13 février",
          "2 mars au 30 avril",
          "15 juin au 17 juillet",
          "7 septembre au 30 octobre",
          "16 novembre au 21 décembre",
        ],
        conditions: "Consulter les produits concernés par chaque opération.",
      },
    ],
    contact: "Christophe PICHOT",
    email: "christophe.pichot@soliso.com",
    telephone: "06 60 55 33 05",
  },
  {
    nom: "SOPROFEN",
    categorie: "Volets roulants",
    remises: [
      {
        taux: "À consulter",
        produit: "Volets roulants, screens extérieurs et portes de garage",
        conditions: "Consulter les tarifs par catégorie : volets, screens extérieurs et portes de garage.",
      },
    ],
    promotions: [
      {
        titre: "10 % de remise supplémentaire",
        produit: "Gammes VR, PG et PS",
        dates: ["3 périodes de 4 semaines consécutives au choix"],
        conditions: "Choisir 3 périodes de 4 semaines consécutives pour bénéficier de la promotion.",
      },
      {
        titre: "Box TaHoma Switch pour 1 € de plus",
        produit: "Commande de 6 volets roulants",
        dates: ["1er janvier au 31 décembre"],
        conditions: "Valable pour toute commande de 6 volets roulants avec motorisation solaire ou radio RS 100.",
      },
      {
        titre: "5 % de remise",
        produit: "Commandes lors de foires ou portes ouvertes",
        dates: ["2 opérations maximum par an"],
        conditions: "Durée de 3 semaines par opération.",
      },
    ],
    contact: "Luc DELFILS",
    email: "ldelfils@soprofen.fr",
    telephone: "06 98 73 84 04",
  },
  {
    nom: "VESTALYS",
    categorie: "Services",
    remises: [
      {
        taux: "Jusqu’à -30 %",
        produit: "Assurance",
        conditions: "Jusqu’à 30 % par rapport à l’assurance actuelle.",
      },
    ],
    promotions: [],
    contact: "Élodie RENAUT",
    email: "contact@vestalys.fr",
    telephone: "06 16 61 41 01",
  },
  {
    nom: "VOLPRO",
    categorie: "Stores et moustiquaires",
    remises: [
      {
        taux: "67 %",
        produit: "Ensemble du tarif public HT",
        conditions: "Remise négociée sur l’ensemble du tarif public HT.",
      },
    ],
    promotions: [
      {
        titre: "7 % de remise supplémentaire",
        produit: "Moustiquaires",
        dates: ["10 mars au 30 avril"],
        conditions: "Remise supplémentaire sur la gamme moustiquaire.",
      },
      {
        titre: "20 % de remise",
        produit: "Duette, bandes verticales, rouleaux et Proscreen extérieurs",
        dates: ["16 mars au 26 avril"],
        conditions: "Remise sur les produits indiqués.",
      },
      {
        titre: "7 % de remise supplémentaire",
        produit: "Stores Proscreens extérieurs",
        dates: ["2 juin au 15 juillet"],
        conditions: "Remise supplémentaire sur les stores Proscreens extérieurs.",
      },
      {
        titre: "20 % de remise sur les moustiquaires et 50 % sur les moteurs PowerView",
        produit: "Moustiquaires et moteurs PowerView",
        dates: ["1er septembre au 4 octobre"],
        conditions: "Moteurs PowerView hors accessoires.",
      },
      {
        titre: "7 % de remise supplémentaire",
        produit: "Stores Multizone entre parclose : plissés, Duette et vénitiens",
        dates: ["15 septembre au 31 octobre"],
        conditions: "Remise supplémentaire sur les produits indiqués.",
      },
      {
        titre: "Offre à venir",
        produit: "Produits Volpro",
        dates: ["2 au 24 novembre"],
        conditions: "Détail de l’offre à consulter.",
      },
    ],
    contact: "Dominique GRUTER",
    email: "d.gruter@hde.nl",
    telephone: "",
  },
  {
    nom: "VOLTECH",
    categorie: "Volets roulants",
    remises: [
      {
        taux: "51 %",
        produit: "Porte de garage",
        conditions: "Remise négociée sur la porte de garage.",
      },
      {
        taux: "55 %",
        produit: "Radio filaire",
        conditions: "Remise négociée sur le radio filaire.",
      },
      {
        taux: "55 %",
        produit: "Tradi radio et filaire",
        conditions: "Remise négociée sur les produits tradi radio et filaire.",
      },
      {
        taux: "57 %",
        produit: "Radio solaire",
        conditions: "Remise négociée sur le radio solaire.",
      },
    ],
    promotions: [
      {
        titre: "5 % de remise supplémentaire",
        produit: "Toutes les commandes",
        dates: ["20 mars au 15 mai", "12 juin au 31 juillet", "25 septembre au 15 novembre"],
        conditions: "Remise supplémentaire pendant les périodes indiquées.",
      },
      {
        titre: "5 % de remise lors de foires / portes ouvertes",
        produit: "Commandes passées lors d’événements",
        dates: ["2 opérations maximum par an"],
        conditions: "Durée de 3 semaines par opération.",
      },
    ],
    contact: "Fabrice NIORT",
    email: "fabrice.n@lesfermeturesvoltech.com",
    telephone: "06 09 85 61 78",
  },
];

const styles = `
.remises-page {
  font-family: inherit;
  color: #1f2937;
  padding: 24px;
  background: #f8fafc;
  min-height: 100%;
}
.remises-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 18px;
  margin-bottom: 24px;
}
.remises-title {
  margin: 0;
  font-size: 26px;
  font-weight: 750;
  color: #111827;
}
.remises-subtitle {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 14px;
}
.remises-search {
  position: relative;
  width: min(100%, 360px);
}
.remises-search input {
  box-sizing: border-box;
  width: 100%;
  padding: 12px 42px 12px 14px;
  border: 1px solid #dbe2ea;
  border-radius: 12px;
  outline: none;
  background: white;
  font-size: 14px;
  transition: border-color .2s, box-shadow .2s;
}
.remises-search input:focus {
  border-color: #64748b;
  box-shadow: 0 0 0 3px rgba(100,116,139,.12);
}
.remises-search-icon {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  pointer-events: none;
}
.remises-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 24px;
}
.remises-stat {
  background: white;
  border: 1px solid #e5eaf0;
  border-radius: 14px;
  padding: 16px 18px;
}
.remises-stat-value {
  font-size: 24px;
  font-weight: 750;
  color: #111827;
}
.remises-stat-label {
  font-size: 12px;
  color: #64748b;
  margin-top: 4px;
}
.remises-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.remise-card {
  background: white;
  border: 1px solid #e5eaf0;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 6px rgba(15,23,42,.025);
  transition: box-shadow .2s, transform .2s;
}
.remise-card:hover {
  box-shadow: 0 8px 24px rgba(15,23,42,.07);
  transform: translateY(-2px);
}
.remise-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding: 18px 20px;
  border-bottom: 1px solid #f1f5f9;
}
.remise-provider {
  margin: 0;
  font-size: 16px;
  font-weight: 750;
  color: #111827;
}
.remise-category {
  margin-top: 5px;
  color: #64748b;
  font-size: 12px;
}
.remise-count {
  flex-shrink: 0;
  font-size: 11px;
  color: #64748b;
  background: #f1f5f9;
  padding: 5px 8px;
  border-radius: 999px;
}
.remise-card-content {
  padding: 18px 20px;
}
.remise-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 12px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: .06em;
  color: #64748b;
  font-weight: 750;
}
.remise-section-title.promo {
  margin-top: 20px;
}
.remise-line {
  border: 1px solid #edf1f5;
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 8px;
}
.remise-line:last-child {
  margin-bottom: 0;
}
.remise-line-top {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}
.remise-rate {
  flex-shrink: 0;
  min-width: 64px;
  color: #0f766e;
  background: #ecfdf5;
  border: 1px solid #d1fae5;
  border-radius: 8px;
  padding: 6px 8px;
  text-align: center;
  font-size: 13px;
  font-weight: 800;
}
.remise-product {
  font-size: 13px;
  font-weight: 700;
  color: #1f2937;
  line-height: 1.45;
}
.remise-condition {
  font-size: 12px;
  line-height: 1.55;
  color: #64748b;
  margin-top: 7px;
}
.remise-promo-line {
  border: 1px solid #f1e7d5;
  background: #fffcf5;
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 8px;
}
.remise-promo-title {
  color: #92400e;
  font-size: 13px;
  font-weight: 750;
  line-height: 1.45;
}
.remise-promo-product {
  color: #374151;
  font-size: 12px;
  margin-top: 5px;
  line-height: 1.45;
}
.remise-dates {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 8px;
}
.remise-date {
  display: inline-flex;
  background: #fef3c7;
  color: #92400e;
  padding: 4px 7px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 700;
}
.remise-contact {
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid #f1f5f9;
}
.remise-contact-title {
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: .05em;
  font-size: 10px;
  font-weight: 750;
  margin-bottom: 7px;
}
.remise-contact-name {
  font-size: 13px;
  font-weight: 700;
  color: #334155;
}
.remise-contact-links {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 6px;
  font-size: 12px;
}
.remise-contact-links a {
  color: #475569;
  text-decoration: none;
}
.remise-contact-links a:hover {
  color: #0f766e;
  text-decoration: underline;
}
.remise-empty {
  padding: 30px;
  text-align: center;
  color: #64748b;
  background: white;
  border: 1px dashed #cbd5e1;
  border-radius: 14px;
}
.remise-disclaimer {
  margin-top: 20px;
  color: #94a3b8;
  font-size: 11px;
  line-height: 1.5;
}
@media (max-width: 900px) {
  .remises-grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 600px) {
  .remises-page {
    padding: 14px;
  }
  .remises-stats {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  .remises-title {
    font-size: 22px;
  }
  .remise-card-header,
  .remise-card-content {
    padding: 15px;
  }
  .remise-line-top {
    flex-direction: column;
  }
}
`;

function RemiseLine({ remise }) {
  return (
    <div className="remise-line">
      <div className="remise-line-top">
        <div className="remise-rate">{remise.taux}</div>
        <div>
          <div className="remise-product">{remise.produit}</div>
          {remise.conditions && (
            <div className="remise-condition">{remise.conditions}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function PromotionLine({ promotion }) {
  return (
    <div className="remise-promo-line">
      <div className="remise-promo-title">{promotion.titre}</div>
      <div className="remise-promo-product">
        <strong>Produit concerné :</strong> {promotion.produit}
      </div>

      {promotion.dates?.length > 0 && (
        <div className="remise-dates">
          {promotion.dates.map((date, index) => (
            <span className="remise-date" key={`${date}-${index}`}>
              {date}
            </span>
          ))}
        </div>
      )}

      {promotion.conditions && (
        <div className="remise-condition">{promotion.conditions}</div>
      )}
    </div>
  );
}

function FournisseurCard({ fournisseur }) {
  const total = fournisseur.remises.length + fournisseur.promotions.length;

  return (
    <article className="remise-card">
      <div className="remise-card-header">
        <div>
          <h2 className="remise-provider">{fournisseur.nom}</h2>
          <div className="remise-category">{fournisseur.categorie}</div>
        </div>
        <span className="remise-count">
          {total} {total > 1 ? "offres" : "offre"}
        </span>
      </div>

      <div className="remise-card-content">
        {fournisseur.remises.length > 0 && (
          <>
            <h3 className="remise-section-title">
              <span>●</span> Remises négociées
            </h3>
            {fournisseur.remises.map((remise, index) => (
              <RemiseLine
                remise={remise}
                key={`${fournisseur.nom}-remise-${index}`}
              />
            ))}
          </>
        )}

        {fournisseur.promotions.length > 0 && (
          <>
            <h3 className="remise-section-title promo">
              <span>◆</span> Promotions et offres
            </h3>
            {fournisseur.promotions.map((promotion, index) => (
              <PromotionLine
                promotion={promotion}
                key={`${fournisseur.nom}-promo-${index}`}
              />
            ))}
          </>
        )}

        {fournisseur.remises.length === 0 &&
          fournisseur.promotions.length === 0 && (
            <div className="remise-empty">
              Les conditions de remise de ce fournisseur restent à compléter.
            </div>
          )}

        {(fournisseur.contact || fournisseur.email || fournisseur.telephone) && (
          <div className="remise-contact">
            <div className="remise-contact-title">Contact privilégié</div>

            {fournisseur.contact && (
              <div className="remise-contact-name">{fournisseur.contact}</div>
            )}

            <div className="remise-contact-links">
              {fournisseur.email && (
                <a href={`mailto:${fournisseur.email}`}>
                  ✉ {fournisseur.email}
                </a>
              )}
              {fournisseur.telephone && (
                <a href={`tel:${fournisseur.telephone.replace(/\s/g, "")}`}>
                  ☎ {fournisseur.telephone}
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

export default function RemisesFournisseurs() {
  const [recherche, setRecherche] = useState("");

  const fournisseursFiltres = useMemo(() => {
    const terme = recherche.trim().toLowerCase();

    if (!terme) return fournisseurs;

    return fournisseurs.filter((fournisseur) => {
      const contenu = [
        fournisseur.nom,
        fournisseur.categorie,
        fournisseur.contact,
        fournisseur.email,
        ...fournisseur.remises.map(
          (remise) =>
            `${remise.taux} ${remise.produit} ${remise.conditions}`
        ),
        ...fournisseur.promotions.map(
          (promotion) =>
            `${promotion.titre} ${promotion.produit} ${promotion.conditions} ${promotion.dates.join(" ")}`
        ),
      ]
        .join(" ")
        .toLowerCase();

      return contenu.includes(terme);
    });
  }, [recherche]);

  const totalRemises = fournisseurs.reduce(
    (total, fournisseur) => total + fournisseur.remises.length,
    0
  );

  const totalPromotions = fournisseurs.reduce(
    (total, fournisseur) => total + fournisseur.promotions.length,
    0
  );

  return (
    <div className="remises-page">
      <style>{styles}</style>

      <header className="remises-header">
        <div>
          <h1 className="remises-title">Remises fournisseurs</h1>
          <p className="remises-subtitle">
            Retrouvez les remises négociées, les produits concernés et les
            conditions des offres PROFERM 2026.
          </p>
        </div>

        <div className="remises-search">
          <input
            type="search"
            value={recherche}
            onChange={(event) => setRecherche(event.target.value)}
            placeholder="Rechercher un fournisseur ou un produit…"
            aria-label="Rechercher un fournisseur ou un produit"
          />
          <span className="remises-search-icon">⌕</span>
        </div>
      </header>

      <section className="remises-stats" aria-label="Résumé des offres">
        <div className="remises-stat">
          <div className="remises-stat-value">{fournisseurs.length}</div>
          <div className="remises-stat-label">Fournisseurs référencés</div>
        </div>
        <div className="remises-stat">
          <div className="remises-stat-value">{totalRemises}</div>
          <div className="remises-stat-label">Remises négociées détaillées</div>
        </div>
        <div className="remises-stat">
          <div className="remises-stat-value">{totalPromotions}</div>
          <div className="remises-stat-label">Promotions et offres</div>
        </div>
      </section>

      {fournisseursFiltres.length > 0 ? (
        <section className="remises-grid">
          {fournisseursFiltres.map((fournisseur) => (
            <FournisseurCard
              fournisseur={fournisseur}
              key={fournisseur.nom}
            />
          ))}
        </section>
      ) : (
        <div className="remise-empty">
          Aucun fournisseur ou produit ne correspond à « {recherche} ».
        </div>
      )}

      <p className="remise-disclaimer">
        Données issues du dépliant PROFERM « Les amis du réseau – Temps forts
        2026 ». Lorsque le dépliant renvoie vers un tarif ou un détail d’offre
        complémentaire, celui-ci est indiqué comme étant à consulter.
      </p>
    </div>
  );
}