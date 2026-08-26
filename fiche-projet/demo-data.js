"use strict";

/* Données exclusivement réservées à localhost?demo=1, hors iframe Grist. */
window.PROJECT_SHEET_DEMO = {
  project: {
    id: 1,
    Nom_projet: "Nouveau quartier — secteur Nord",
    Code_projet: "AMN-024",
    Categorie: "Aménagement",
    Statut: "En cours",
    Priorite: "Prioritaire",
    Responsable: 10,
    Elu_pilote: 11,
    Objectif_politique: "Créer un quartier vivant, sobre et connecté au paysage",
    Description: "Aménagement d’un nouveau secteur résidentiel intégrant logements, espaces publics, mobilités actives et services de proximité.",
    Avancement: 70,
    Prochaine_etape: "Valider le scénario d’aménagement des espaces publics",
    Date_prochaine_etape: "2026-09-18",
    Echeance: "2027-06-30",
    Derniere_MAJ: "2026-08-24",
    Point_vigilance: "Intégration paysagère du stationnement et traitement des lisières.",
  },
  tables: {
    PROJETS: [],
    INTERLOCUTEURS: [
      { id: 10, Nom_complet: "Camille Martin", Organisme: "Direction de l’aménagement", Fonction: "Cheffe de projet", Type_interlocuteur: "Service" },
      { id: 11, Nom_complet: "Sophie Bernard", Organisme: "Ville", Fonction: "Adjointe à l’urbanisme", Type_interlocuteur: "Élue" },
      { id: 12, Nom_complet: "Alex Dubois", Organisme: "Agence Territoires", Fonction: "Paysagiste", Type_interlocuteur: "Partenaire" },
    ],
    AVANCEMENTS: [
      { id: 101, Projet: 1, Date_MAJ: "2026-08-24", Saisi_par: 10, Avancement: 70, Travail_realise: "Finalisation de l’étude de capacité et partage du scénario préférentiel.", Prochaine_etape: "Arbitrer le traitement du stationnement.", Difficulte_blocage: "Insertion paysagère à consolider.", Decision_attendue: "Choix entre stationnement mutualisé et poches réparties." },
      { id: 102, Projet: 1, Date_MAJ: "2026-07-28", Saisi_par: 10, Avancement: 62, Travail_realise: "Atelier avec les services techniques et les partenaires mobilité.", Prochaine_etape: "Mettre à jour le plan-guide." },
    ],
    CONSIGNES_POLITIQUES: [
      { id: 201, Projet: 1, Date_MAJ: "2026-08-20", Consigne: "Préserver une présence végétale forte dans les espaces publics.", Statut: "En cours", Priorite: "Haute", Echeance: "2026-09-15", Responsable: 10, Retour_service: "Déclinaison intégrée au plan-guide.", A_controler: true, En_retard: false, Validee: false },
    ],
    REUNIONS: [
      { id: 301, Projet: 1, Date_reunion: "2026-08-22", Objet: "Comité de pilotage du plan-guide", Type_reunion: "COPIL", Participants: ["L", 10, 11, 12], Points_cles: "Paysage, stationnement et calendrier de concertation.", Decisions_prises: "Validation du principe de mail planté.", Arbitrage_attendu: "Organisation définitive du stationnement." },
    ],
    ACTIONS: [
      { id: 401, Projet: 1, Action: "Produire une variante paysagère du stationnement", Responsable: 12, Statut: "En cours", Priorite: "Haute", Echeance: "2026-09-08", En_retard: false, A_controler: true },
      { id: 402, Projet: 1, Action: "Préparer la note de décision", Responsable: 10, Statut: "À faire", Priorite: "Prioritaire", Echeance: "2026-08-20", En_retard: true, A_controler: false },
    ],
    ARBITRAGES_DECISIONS: [
      { id: 501, Projet: 1, Date_MAJ: "2026-08-24", Sujet: "Organisation du stationnement", Type: "Arbitrage politique", Question_a_trancher: "Quel niveau de mutualisation retenir ?", Options: "Parking mutualisé en entrée de quartier ; poches de proximité réparties.", Position_elue: "Privilégier la qualité paysagère et limiter la voiture en cœur de quartier.", Urgence: "Haute", Echeance_decision: "2026-09-12", Statut: "À décider", A_decider: true, Point_hebdo: true },
    ],
  },
};
