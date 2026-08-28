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
    Agent_pilote: 10,
    Agents_associes: ["L", 10],
    Elus_associes: ["L", 11],
    Interlocuteurs_externes: ["L", 12],
    Services_concernes: ["L", 21],
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
      { id: 10, Nom_complet: "Camille Martin", Organisme: "Mairie de Sanguinet", Fonction: "Cheffe de projet", Type_interlocuteur: "Agent collectivité", Actif: true, Est_agent_Sanguinet: true, Est_elu_Sanguinet: false },
      { id: 11, Nom_complet: "Sophie Bernard", Organisme: "Mairie de Sanguinet", Fonction: "Adjointe à l’urbanisme", Type_interlocuteur: "Élu", Actif: true, Est_agent_Sanguinet: false, Est_elu_Sanguinet: true },
      { id: 12, Nom_complet: "Alex Dubois", Organisme: "Agence Territoires", Fonction: "Paysagiste", Type_interlocuteur: "Partenaire", Actif: true, Est_agent_Sanguinet: false, Est_elu_Sanguinet: false },
    ],
    SERVICES: [{ id: 21, Nom_service: "Aménagement", Actif: true }],
    JALONS: [{id:701,Projet:1,Jalon:"Valider le plan-guide",Ordre:1,Date_prevue:"2026-10-15",Franchi:false,Date_reelle:null}],
    BLOCAGES: [{id:702,Projet:1,Blocage:"Accord foncier en attente",Date_apparition:"2026-08-20",Actif:true,Date_resolution:null,Explication_resolution:""}],
    VIGILANCES: [{id:703,Projet:1,Vigilance:"Maintenir les accès riverains",Date_apparition:"2026-08-22",Active:true,Date_resolution:null,Explication_resolution:""}],
    AVANCEMENTS: [
      { id: 101, Projet: 1, Date_MAJ: "2026-08-24", Cree_le: "2026-08-24T15:30:00", Type_entree: "Avancement", Contenu: "Finalisation de l’étude de capacité et partage du scénario préférentiel.", Entree_parent: 0, Etat_entree: "", Decisionnaire: 0, Saisi_par: 10, Avancement: 70, Travail_realise: "Finalisation de l’étude de capacité et partage du scénario préférentiel.", Prochaine_etape: "Arbitrer le traitement du stationnement.", Date_prochaine_etape: "2026-09-12", Difficulte_blocage: "Insertion paysagère à consolider.", Decision_attendue: "Choix entre stationnement mutualisé et poches réparties." },
      { id: 102, Projet: 1, Date_MAJ: "2026-07-28", Cree_le: "2026-07-28T10:00:00", Type_entree: "Information", Contenu: "Atelier avec les services techniques et les partenaires mobilité.", Entree_parent: 0, Etat_entree: "", Decisionnaire: 0, Saisi_par: 10, Avancement: 0, Travail_realise: "Atelier avec les services techniques et les partenaires mobilité.", Prochaine_etape: "Mettre à jour le plan-guide." },
      { id: 103, Projet: 1, Date_MAJ: "2026-08-25", Cree_le: "2026-08-25T12:00:00", Type_entree: "Prochaine étape", Contenu: "Valider le scénario d’aménagement des espaces publics", Date_prochaine_etape: "2026-09-18", Entree_parent: 0, Etat_entree: "Ouvert", Decisionnaire: 0, Saisi_par: 10, Avancement: 0 },
      { id: 104, Projet: 1, Date_MAJ: "2026-08-25", Cree_le: "2026-08-25T11:00:00", Type_entree: "Prochaine étape", Contenu: "Préparer la consultation des entreprises", Date_prochaine_etape: "2026-10-05", Entree_parent: 0, Etat_entree: "Ouvert", Decisionnaire: 0, Saisi_par: 10, Avancement: 0 },
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
      { id: 501, Projet: 1, Date_MAJ: "2026-08-24", Sujet: "Organisation du stationnement", Contexte: "Le plan-guide doit fixer un principe durable.", Question_a_trancher: "Quel niveau de mutualisation retenir ?", Options: "Parking mutualisé en entrée de quartier ; poches de proximité réparties.", Position_elue: "Privilégier la qualité paysagère et limiter la voiture en cœur de quartier.", Demandee_par: 10, Echeance_decision: "2026-09-12", Statut: "En instruction", Decision_prise: "", Date_decision: null, Instance_decision: "", Decision_par: null },
      { id: 502, Projet: 1, Date_MAJ: "2026-08-18", Sujet: "Principe du mail planté", Contexte: "La composition paysagère a été présentée en comité.", Question_a_trancher: "Valider le mail planté ?", Options: "", Position_elue: "", Demandee_par: 10, Echeance_decision: "2026-08-20", Statut: "Prise", Decision_prise: "Le mail planté est validé.", Date_decision: "2026-08-22", Instance_decision: "Comité de pilotage", Decision_par: 11 },
    ],
  },
};
