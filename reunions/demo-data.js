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
      { id: 301, Projet: 1, Date_reunion: "2026-09-08", Heure: "09:30", Objet: "Comité de pilotage du plan-guide", Participants: ["L", 10, 11, 12], Lieu: "Hôtel de ville", Compte_rendu: "Le comité a examiné le plan-guide et les conditions de concertation.", Points_cles: "Paysage, stationnement et calendrier de concertation." },
      { id: 302, Projet: 1, Date_reunion: "2026-08-22", Heure: "14:00", Objet: "Élaboration de l’appel à projets", Participants: ["L", 10, 12], Compte_rendu: "Les variantes d’insertion ont été comparées.", Points_cles: "Étude des variantes d’insertion paysagère." },
    ],
    ACTIONS: [{id:401,Projet:1,Reunion_origine:301,Action:"Préparer une note",Attribuee_a:10,Echeance:"2026-09-10",Statut:"À faire"}],
    ARBITRAGES_DECISIONS: [{id:601,Projet:1,Reunion_origine:301,Sujet:"Organisation du stationnement",Question_a_trancher:"Quel scénario retenir ?",Echeance_decision:"2026-09-12",Statut:"Demandée"}],
    JALONS: [{id:701,Projet:1,Reunion_origine:302,Jalon:"Valider le plan-guide",Ordre:2,Date_prevue:"2026-10-15",Franchi:false}],
    BLOCAGES: [], VIGILANCES: [], ATTENTES_EXTERNES: [], REUNIONS_VERSIONS: [],
  },
  columnMeta: {
    ACTIONS: { Projet: { type: "Ref:PROJETS" }, Reunion_origine: { type: "Ref:REUNIONS" }, Action:{type:"Text"}, Attribuee_a:{type:"Ref:INTERLOCUTEURS"}, Echeance:{type:"Date"}, Statut: { type: "Choice", choices: ["À attribuer", "À faire", "En cours", "Réalisée", "Non aboutie"] } },
    ARBITRAGES_DECISIONS: { Projet: { type: "Ref:PROJETS" }, Reunion_origine: { type: "Ref:REUNIONS" }, Sujet:{type:"Text"}, Contexte:{type:"Text"}, Question_a_trancher:{type:"Text"}, Echeance_decision:{type:"Date"}, Statut: { type: "Choice", choices: ["Demandée", "En instruction", "Prise", "Sans suite"] } },
    JALONS: { Projet: { type: "Ref:PROJETS" }, Reunion_origine: { type: "Ref:REUNIONS" }, Jalon:{type:"Text"}, Ordre:{type:"Int"}, Date_prevue:{type:"Date"}, Franchi:{type:"Bool"} },
    BLOCAGES: { Projet: { type: "Ref:PROJETS" }, Reunion_origine: { type: "Ref:REUNIONS" }, Blocage:{type:"Text"}, Date_apparition:{type:"Date"}, Actif:{type:"Bool"} },
    VIGILANCES: { Projet: { type: "Ref:PROJETS" }, Reunion_origine: { type: "Ref:REUNIONS" }, Vigilance:{type:"Text"}, Date_apparition:{type:"Date"}, Active:{type:"Bool"} },
    ATTENTES_EXTERNES: { Projet: { type: "Ref:PROJETS" }, Reunion_origine: { type: "Ref:REUNIONS" }, Attente:{type:"Text"}, Date_attendue:{type:"Date"}, Statut: { type: "Choice", choices: ["En attente", "Reçue", "Sans suite"] } },
    REUNIONS_VERSIONS: { Reunion:{type:"Ref:REUNIONS"}, Numero_version:{type:"Int"}, Compte_rendu:{type:"Text"}, Points_cles:{type:"Text"}, Auteur:{type:"Ref:INTERLOCUTEURS"}, Date_version:{type:"DateTime"}, Motif_modification:{type:"Text"}, Demandeur:{type:"Ref:INTERLOCUTEURS"}, Approbateur:{type:"Ref:INTERLOCUTEURS"}, Statut_demande:{type:"Choice",choices:["Approuvée"]} },
  },
};
