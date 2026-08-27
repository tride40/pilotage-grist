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
      { id: 10, Nom_complet: "Camille Martin", Fonction: "Agent pilote", Organisme: "Ville" },
      { id: 11, Nom_complet: "Nicolas Robert", Fonction: "Élu pilote", Organisme: "Ville" },
      { id: 12, Nom_complet: "Adrien Tordeur", Fonction: "Chef de projet", Organisme: "Aménageur" },
      { id: 13, Nom_complet: "Léa Bernard", Fonction: "Paysagiste", Organisme: "Agence externe" },
    ],
    REUNIONS: [
      { id: 301, Projet: 1, Date_reunion: "2026-09-08", Objet: "Comité de pilotage du plan-guide", Type_reunion: "COPIL", Participants: ["L", 10, 11, 12], Lieu: "Hôtel de ville", Points_cles: "Paysage, stationnement et calendrier de concertation.", Arbitrage_attendu: "Organisation définitive du stationnement." },
      { id: 302, Projet: 1, Date_reunion: "2026-08-22", Objet: "Atelier technique", Type_reunion: "Atelier", Participants: ["L", 10, 12], Points_cles: "Étude des variantes d’insertion paysagère.", Decisions_prises: "Validation du principe de mail planté.", Prochaines_etapes: "Produire une variante chiffrée." },
    ],
    ACTIONS: [{id:401,Projet:1,Reunion_origine:301,Action:"Préparer une note",Responsable:10,Echeance:"2026-09-10",Statut:"À faire",Commentaire:""}],
    CONSIGNES_POLITIQUES: [{id:501,Projet:1,Reunion_origine:301,Consigne:"Préserver les arbres",Responsable:10,Echeance:"2026-09-10",Statut:"En cours",Commentaire:""}],
    ARBITRAGES_DECISIONS: [{id:601,Projet:1,Reunion_origine:301,Sujet:"Stationnement",Responsable:12,Echeance:"2026-09-12",Statut:"À décider",Commentaire:""}],
  },
};
