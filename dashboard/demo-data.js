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
      Description: "Création d’un quartier mixte et connecté au centre-bourg.",
      Objectif_politique: "Accueillir de nouveaux habitants tout en préservant la qualité du cadre de vie.",
      Thematiques: ["L", "Urbanisme & Cadre de vie", "Environnement & Transition écologique"],
      Agent_pilote: 11,
      Elu_pilote: 12,
      Mois_lancement: "Septembre",
      Annee_lancement: 2026,
      Trimestre_objectif: "T4",
      Annee_objectif: 2028,
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
  INTERLOCUTEURS: [{ id: 11, Nom_complet: "Claire Martin", Role_interne: "Agent", Est_agent_Sanguinet: true }, { id: 12, Nom_complet: "Julien Bernard", Role_interne: "Élu", Est_elu_Sanguinet: true }],
  REUNIONS: [],
  ACTIONS: [
    { id: 1, Projet: 1, Statut: "En cours", En_retard: false },
  ],
  ARBITRAGES_DECISIONS: [
    { id: 1, Projet: 1, A_decider: true },
  ],
  AVANCEMENTS: [],
};
