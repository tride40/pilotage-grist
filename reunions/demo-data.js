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
      { id: 301, Projet: 1, Date_reunion: "2026-09-08", Objet: "Comité de pilotage du plan-guide", Type_reunion: "COPIL", Participants: ["L", 10, 11, 12], Lieu: "Hôtel de ville", Points_cles: "Paysage, stationnement et calendrier de concertation.", Arbitrage_attendu: "Organisation définitive du stationnement." },
      { id: 302, Projet: 1, Date_reunion: "2026-08-22", Objet: "Élaboration de l’appel à projets", Type_reunion: "Atelier", Participants: ["L", 10, 12], Points_cles: "Étude des variantes d’insertion paysagère.", Decisions_prises: "Validation du principe de mail planté.", Prochaines_etapes: "Produire une variante chiffrée." },
    ],
    ACTIONS: [{id:401,Projet:1,Reunion_origine:301,Action:"Préparer une note",Responsable:10,Echeance:"2026-09-10",Statut:"À faire",Commentaire:""}],
    CONSIGNES_POLITIQUES: [{id:501,Projet:1,Reunion_origine:301,Consigne:"Préserver les arbres",Responsable:10,Echeance:"2026-09-10",Statut:"En cours",Commentaire:""}],
    ARBITRAGES_DECISIONS: [{id:601,Projet:1,Reunion_origine:301,Sujet:"Stationnement",Responsable:12,Echeance:"2026-09-12",Statut:"À décider",Commentaire:""}],
  },
  columnMeta: {
    ACTIONS: { Projet: { type: "Ref:PROJETS" }, Reunion_origine: { type: "Ref:REUNIONS" }, Statut: { type: "Choice", choices: ["À faire", "En cours", "À reprendre", "Réalisée", "Annulée"] } },
    CONSIGNES_POLITIQUES: { Projet: { type: "Ref:PROJETS:Nom_projet" }, Reunion_origine: { type: "Ref:REUNIONS:Resume_reunion" }, Statut: { type: "Choice", choices: ["À diffuser", "En cours", "Appliquée"] } },
    ARBITRAGES_DECISIONS: { Projet: { type: "Ref:PROJETS" }, Reunion_origine: { type: "Ref:REUNIONS:Resume_reunion" }, Statut: { type: "Choice", choices: ["À décider", "Décidé", "Reporté"] } },
  },
};
