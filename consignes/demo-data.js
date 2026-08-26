window.INSTRUCTIONS_DEMO_DATA = { tables: {
  PROJETS: [{ id: 1, Nom_projet: "Réaménagement du centre-ville", Statut: "En cours", Archive: false }],
  INTERLOCUTEURS: [{ id: 10, Nom_complet: "Camille Martin" }, { id: 11, Nom_complet: "Alex Dupont" }],
  CONSIGNES_POLITIQUES: [
    { id: 201, Projet: 1, Consigne: "Préserver une présence végétale forte dans les espaces publics.", Statut: "En cours", Priorite: "Haute", Echeance: "2026-09-15", Responsable: 10, Retour_service: "", A_controler: false, Validee: false },
    { id: 202, Projet: 1, Consigne: "Présenter le phasage des travaux aux commerçants.", Statut: "À contrôler", Priorite: "Urgente", Echeance: "2026-08-20", Responsable: 11, Retour_service: "Réunion préparatoire organisée, support joint au dossier.", A_controler: true, Validee: false },
    { id: 203, Projet: 1, Consigne: "Maintenir les accès riverains.", Statut: "Validée", Priorite: "Normale", Echeance: "2026-07-30", Responsable: 10, Retour_service: "Plan de circulation validé.", Controle_elu: "Conforme.", A_controler: false, Validee: true }
  ]
}};
