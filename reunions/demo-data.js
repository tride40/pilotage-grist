"use strict";

/* Données fictives, disponibles uniquement avec ?demo=1 sur localhost. */
window.MEETINGS_DEMO_DATA = {
  project: { id: 1, Nom_projet: "Quartier Eco-Responsable - Broustaricq", Responsable: 10, Elu_pilote: 11, Membres_projet: ["L", 12] },
  tables: {
    PROJETS: [
      { id: 1, Nom_projet: "Quartier Eco-Responsable - Broustaricq", Statut: "En cours", Archive: false, Responsable: 10, Elu_pilote: 11, Membres_projet: ["L", 12] },
      { id: 2, Nom_projet: "Rénovation du centre culturel", Statut: "En cours", Archive: false },
    ],
    INTERLOCUTEURS: [
      { id: 10, Nom_complet: "Camille Martin", Fonction: "Agent pilote", Organisme: "Ville", Type_interlocuteur: "Interne" },
      { id: 11, Nom_complet: "Nicolas Robert", Fonction: "Élu pilote", Organisme: "Ville", Type_interlocuteur: "Élu" },
      { id: 12, Nom_complet: "Adrien Tordeur", Fonction: "Chef de projet de l’aménagement et de la concertation avec les riverains", Organisme: "Aménageur public du territoire", Type_interlocuteur: "Partenaire" },
      { id: 13, Nom_complet: "Léa Bernard", Fonction: "Paysagiste conceptrice et référente biodiversité", Organisme: "Agence externe des paysages urbains", Type_interlocuteur: "Prestataire" },
    ],
    REUNIONS: [
      { id: 301, Projet: 1, Date_reunion: "2026-09-08", Heure: "09:30", Objet: "Comité de pilotage du plan-guide", Participants: ["L", 10, 11, 12], Lieu: "Hôtel de ville", Ordre_du_jour: "Paysage, stationnement et calendrier de concertation.", Compte_rendu: "Le comité a examiné le plan-guide et les conditions de concertation." },
      { id: 302, Projet: 1, Date_reunion: "2026-08-22", Heure: "14:00", Objet: "Élaboration de l’appel à projets", Participants: ["L", 10, 12], Ordre_du_jour: "Étude des variantes d’insertion paysagère.", Compte_rendu: "Les variantes d’insertion ont été comparées." },
    ],
    REUNIONS_VERSIONS: [],
  },
  columnMeta: {
    REUNIONS: { Projet:{type:"Ref:PROJETS"}, Date_reunion:{type:"Date"}, Heure:{type:"Text"}, Objet:{type:"Text"}, Lieu:{type:"Text"}, Participants:{type:"RefList:INTERLOCUTEURS"}, Ordre_du_jour:{type:"Text"}, Compte_rendu:{type:"Text"} },
    REUNIONS_VERSIONS: { Reunion:{type:"Ref:REUNIONS"}, Numero_version:{type:"Int"}, Compte_rendu:{type:"Text"}, Auteur:{type:"Ref:INTERLOCUTEURS"}, Date_version:{type:"DateTime"}, Motif_modification:{type:"Text"}, Demandeur:{type:"Ref:INTERLOCUTEURS"}, Approbateur:{type:"Ref:INTERLOCUTEURS"}, Statut_demande:{type:"Choice",choices:["Approuvée"]} },
  },
};
