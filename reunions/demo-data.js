"use strict";

/* Données fictives, disponibles uniquement avec ?demo=1 sur localhost. */
window.MEETINGS_DEMO_DATA = {
  project: { id: 1, Nom_projet: "Nouveau quartier — secteur Nord" },
  tables: {
    PROJETS: [
      { id: 1, Nom_projet: "Nouveau quartier — secteur Nord", Statut: "En cours", Archive: false },
      { id: 2, Nom_projet: "Rénovation du centre culturel", Statut: "En cours", Archive: false },
    ],
    INTERLOCUTEURS: [
      { id: 10, Nom_complet: "Camille Martin" },
      { id: 11, Nom_complet: "Nicolas Robert" },
      { id: 12, Nom_complet: "Sophie Bernard" },
    ],
    REUNIONS: [
      { id: 301, Projet: 1, Date_reunion: "2026-09-08", Objet: "Comité de pilotage du plan-guide", Type_reunion: "COPIL", Participants: ["L", 10, 11, 12], Lieu: "Hôtel de ville", Points_cles: "Paysage, stationnement et calendrier de concertation.", Arbitrage_attendu: "Organisation définitive du stationnement." },
      { id: 302, Projet: 1, Date_reunion: "2026-08-22", Objet: "Atelier technique", Type_reunion: "Atelier", Participants: ["L", 10, 12], Points_cles: "Étude des variantes d’insertion paysagère.", Decisions_prises: "Validation du principe de mail planté.", Prochaines_etapes: "Produire une variante chiffrée." },
    ],
  },
};
