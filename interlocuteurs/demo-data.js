"use strict";const day=86400,today=Math.floor(Date.now()/1000/day)*day;window.INTERLOCUTEURS_DEMO_DATA={tables:{INTERLOCUTEURS:[{id:10,Nom_complet:"Camille Martin",Nom:"Martin",Prenom:"Camille",Organisme:"Direction de l’aménagement",Fonction:"Cheffe de projet",Type_interlocuteur:"Service",Email:"camille.martin@example.fr",Telephone:"01 40 00 00 10",Notes:"Référente principale pour les sujets d’aménagement.",Actif:true},{id:11,Nom_complet:"Sophie Bernard",Nom:"Bernard",Prenom:"Sophie",Organisme:"Ville",Fonction:"Adjointe à l’urbanisme",Type_interlocuteur:"Élue",Email:"sophie.bernard@example.fr",Telephone:"01 40 00 00 11",Notes:"Élue pilote du projet centre-ville.",Actif:true},{id:12,Nom_complet:"Alex Dubois",Nom:"Dubois",Prenom:"Alex",Organisme:"Agence Territoires",Fonction:"Paysagiste",Type_interlocuteur:"Partenaire",Email:"alex.dubois@example.fr",Telephone:"06 20 30 40 50",Notes:"Intervient sur le plan-guide et les ateliers techniques.",Actif:true},{id:13,Nom_complet:"Nadia Leroy",Nom:"Leroy",Prenom:"Nadia",Organisme:"Commerçants du centre",Fonction:"Ancienne présidente",Type_interlocuteur:"Association",Email:"nadia.leroy@example.fr",Telephone:"06 10 20 30 40",Notes:"Contact historique, mandat terminé.",Actif:false}],PROJETS:[{id:1,Nom_projet:"Réaménagement du centre-ville",Responsable:10,Elu_pilote:11},{id:2,Nom_projet:"Plan mobilités",Responsable:10,Elu_pilote:11}],REUNIONS:[{id:301,Projet:1,Date_reunion:today-4*day,Objet:"Comité de pilotage",Participants:["L",10,11,12],Points_cles:"Validation du calendrier de concertation."},{id:302,Projet:1,Date_reunion:today-18*day,Objet:"Atelier paysage",Participants:["L",10,12],Points_cles:"Étude des variantes de végétalisation."},{id:303,Projet:2,Date_reunion:today-30*day,Objet:"Réunion mobilités",Participants:["L",10,11],Points_cles:"Priorisation des itinéraires cyclables."}],ACTIONS:[{id:401,Projet:1,Action:"Produire une variante paysagère",Responsable:12,Statut:"En cours",Echeance:today+8*day,Commentaire:"Présentation au prochain atelier."},{id:402,Projet:1,Action:"Préparer la note de décision",Responsable:10,Statut:"À faire",Echeance:today+3*day},{id:403,Projet:2,Action:"Consolider les retours des services",Responsable:10,Statut:"Réalisée",Date_realisation:today-2*day,Resultat:"Synthèse transmise."}],CONSIGNES_POLITIQUES:[{id:501,Projet:1,Consigne:"Préserver une présence végétale forte.",Responsable:10,Statut:"En cours",Date_MAJ:today-2*day,Retour_service:"Déclinaison intégrée au plan-guide."},{id:502,Projet:2,Consigne:"Sécuriser les liaisons cyclables scolaires.",Responsable:10,Statut:"À contrôler",Date_MAJ:today-day,Retour_service:"Premier scénario disponible."}]}};
// Personnes fictives, utilisées uniquement avec ?demo=1 hors de Grist.
// L'organisation comporte des élus, une DGS et des appartenances multiples.
(() => {
  const tables=window.INTERLOCUTEURS_DEMO_DATA.tables;
  Object.assign(tables.INTERLOCUTEURS.find(p=>p.id===10),{Interne_Mairie:true,Role_interne:"Agent"});
  Object.assign(tables.INTERLOCUTEURS.find(p=>p.id===11),{Interne_Mairie:true,Role_interne:"Élu"});
  tables.INTERLOCUTEURS.push(
    {id:14,Nom:"Moreau",Prenom:"Léa",Interne_Mairie:true,Role_interne:"Agent",Actif:true},
    {id:15,Nom:"Petit",Prenom:"Noé",Interne_Mairie:true,Role_interne:"Agent",Actif:true},
    {id:16,Nom:"Robert",Prenom:"Alice",Interne_Mairie:true,Role_interne:"Agent",Actif:true}
  );
  tables.SERVICES=[
    {id:1,Nom_service:"Aménagement",Responsable:10,Responsable_designe:10,Agents:["L",10,14],Actif:true,Pole:0},
    {id:2,Nom_service:"Bâtiments",Responsable:15,Responsable_designe:15,Agents:["L",15,14],Actif:true,Pole:0}
  ];
  tables.POLES=[{id:1,Pole:"Aménagement et cadre de vie",Responsable:10,Responsable_adjoint:14,Actif:true},{id:2,Pole:"Services à la population",Responsable:14,Responsable_adjoint:0,Actif:true}];
  tables.SERVICES.forEach(s=>s.Pole=1);
  tables.SERVICES.push({id:3,Nom_service:"Accueil et démarches",Responsable:14,Responsable_designe:14,Agents:["L",14],Actif:true,Pole:2});
  tables.INTERLOCUTEURS.find(p=>p.id===16).Est_DGS=true;
  Object.assign(tables.INTERLOCUTEURS.find(p=>p.id===11),{Fonction_elu:"Adjoint au maire",Delegation:"Urbanisme et aménagement",Rang:2});
  tables.INTERLOCUTEURS.push(
    {id:20,Nom:"Renaud",Prenom:"Zoé",Interne_Mairie:true,Role_interne:"Élu",Fonction_elu:"Maire",Actif:true,Email:"maire@example.fr"},
    {id:21,Nom:"Garcia",Prenom:"Thomas",Interne_Mairie:true,Role_interne:"Élu",Fonction_elu:"Adjoint au maire",Delegation:"Finances et ressources humaines",Rang:1,Actif:true},
    {id:22,Nom:"Benali",Prenom:"Inès",Interne_Mairie:true,Role_interne:"Élu",Fonction_elu:"Conseiller délégué",Delegation:"Culture et vie associative",Actif:true},
    {id:23,Nom:"André",Prenom:"Louis",Interne_Mairie:true,Role_interne:"Élu",Fonction_elu:"Conseiller municipal",Actif:true},
    {id:24,Nom:"Lefort",Prenom:"Emma",Interne_Mairie:true,Role_interne:"Élu",Fonction:"Conseillère municipale",Actif:true}
  );
})();
