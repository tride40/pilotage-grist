"use strict";

/*
 * Données réservées à la prévisualisation locale avec ?demo=1.
 * app.js refuse de les utiliser dans une iframe Grist.
 */
window.DASHBOARD_DEMO_DATA = {
  PROJETS: [
    {
      id: 1,
      Nom_projet: "Nouveau quartier — secteur Nord",
      Categorie: "Aménagement",
      Priorite: "Prioritaire",
      Statut: "En cours",
      Archive: false,
      Avancement: 70,
      Responsable: "Direction de l’aménagement",
      Prochaine_etape: "Finaliser les orientations d’aménagement",
      Echeance: "2026-10-15",
      Point_vigilance: "Intégration paysagère du stationnement",
    },
  ],
  INTERLOCUTEURS: [],
  REUNIONS: [],
  ACTIONS: [
    { id: 1, Projet: 1, Statut: "En cours", En_retard: false },
  ],
  CONSIGNES_POLITIQUES: [
    { id: 1, Projet: 1, Statut: "En cours", A_controler: true },
  ],
  ARBITRAGES_DECISIONS: [
    { id: 1, Projet: 1, A_decider: true },
  ],
  AVANCEMENTS: [],
};
