"use strict";

window.PILOTAGE_ACCESS_DEMO_DATA = {
  identity: { administrator: true, accountActive: true, personId: 1, person: { id: 1, Prenom: "Tristan", Nom: "Deguilhem", Fonction: "Adjoint au maire", Role_interne: "Élu", Actif: true, Interne_Mairie: true } },
  tables: {
    INTERLOCUTEURS: [
      { id: 1, Prenom: "Tristan", Nom: "Deguilhem", Email: "tristan.deguilhem@sanguinet.fr", Fonction: "Adjoint au maire", Role_interne: "Élu", Interne_Mairie: true, Actif: true },
      { id: 2, Prenom: "Caroline", Nom: "Gillet", Email: "urbanisme2@sanguinet.fr", Fonction: "Chargée d’urbanisme", Role_interne: "Agent", Interne_Mairie: true, Actif: true },
      { id: 3, Prenom: "Adrien", Nom: "Tordeur", Email: "operations@sanguinet.fr", Fonction: "Chargé d’opérations", Role_interne: "Agent", Interne_Mairie: true, Actif: true },
    ],
    PILOTAGE_COMPTES: [
      { id: 10, Email: "tristan.deguilhem@sanguinet.fr", Interlocuteur: 1, Actif: true, Administrateur: true },
      { id: 11, Email: "operations@sanguinet.fr", Interlocuteur: 3, Actif: true, Administrateur: false },
    ],
  },
};
