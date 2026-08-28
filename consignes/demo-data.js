window.INSTRUCTIONS_DEMO_DATA = { tables: {
  PROJETS: [{ id: 1, Nom_projet: "Réaménagement du centre-ville", Statut: "En cours", Archive: false }],
  INTERLOCUTEURS: [{ id: 10, Nom_complet: "Camille Martin" }, { id: 11, Nom_complet: "Alex Dupont" }],
  CONSIGNES_POLITIQUES: [
    { id: 201, Projet: 1, Consigne: "Préserver une présence végétale forte dans les espaces publics.", Statut: "Active", Emetteur: 11, Destinataires: ["L", 10], Date_emission: "2026-08-10" },
    { id: 202, Projet: 1, Consigne: "Présenter le phasage des travaux aux commerçants.", Statut: "Active", Emetteur: 11, Destinataires: ["L", 10, 11], Date_emission: "2026-08-18" },
    { id: 203, Projet: 1, Consigne: "Maintenir les accès riverains.", Statut: "Archivée", Emetteur: 11, Destinataires: ["L", 10], Date_emission: "2026-07-12", Date_archivage: "2026-08-20", Motif_archivage: "Consigne intégrée au plan de circulation." }
  ]
}};
