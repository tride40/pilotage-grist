# Publication de la V3

État : **schéma Grist validé le 29 août 2026 ; candidate prête pour la recette fonctionnelle sur la branche `refonte-v3`**.

Le contrôle direct du dernier export `.grist` a confirmé une base saine, 15 tables métier et aucun écart structurel ou de formule d'audit. Ne pas fusionner dans `main` avant validation de la recette fonctionnelle ci-dessous.

## Périmètre validé

La V3 applique les arbitrages n°1 à n°55. L'arbitrage n°56 n'est pas intégré. Le détail du modèle cible et des dépendances figure dans `AUDIT-SCHEMA-GRIST-V3.md`.

## Compatibilité progressive

- `PROJETS.Agent_pilote` utilise temporairement `PROJETS.Responsable` si la nouvelle colonne n'existe pas.
- `ACTIONS.Attribuee_a` utilise temporairement `ACTIONS.Responsable` si nécessaire.
- `ACTIONS.Date_fin` utilise temporairement `Date_realisation`.
- `ACTIONS.Raison_non_aboutie` utilise temporairement `Commentaire`.
- Les anciens identifiants de réunion d'origine restent lisibles ; les nouvelles écritures doivent converger vers `Reunion_origine`.
- Les nouvelles tables de pilotage sont facultatives à la lecture tant qu'elles ne sont pas créées ; leur rubrique apparaît vide dans Mon pilotage.

Cette compatibilité sert uniquement à accompagner la migration. Elle ne valide pas la conservation durable des anciennes colonnes.

## Colonnes minimales avant recette Grist

- `PROJETS` : `Nom_projet`, `Statut`, `Elu_pilote` et `Agent_pilote` (ou ancien `Responsable` pendant la migration).
- `ACTIONS` : `Projet`, `Action`, `Statut`, `Demandee_par`, `Attribuee_a`, `Service_destinataire`, `Echeance`, `Date_fin`, `Resultat`, `Raison_non_aboutie`.
- `INTERLOCUTEURS` : identité, `Interne_Mairie`, `Role_interne`, `Actif`.

## Tables nécessaires pour la V3 complète

- `SERVICES`
- `JALONS`
- `BLOCAGES`
- `VIGILANCES`
- `ATTENTES_EXTERNES`
- `RELANCES_ATTENTES`
- `REUNIONS_VERSIONS`

## Recette bloquante avant fusion

- [x] Valider le dernier export du document Grist : intégrité correcte, 15 tables métier et aucun écart avec le schéma V3.
- [ ] Ouvrir `diagnostic-v3/` comme widget personnalisé dans la copie du document Grist et confirmer « Schéma prêt pour la recette fonctionnelle » depuis l'environnement Grist.
- [ ] Cliquer sur « Exporter le schéma », conserver le fichier `schema-grist-v3-AAAA-MM-JJ.json` avec le dossier de recette et vérifier que `containsBusinessRows` vaut `false`.
- [ ] Depuis une réunion ayant déjà un compte rendu, enregistrer une modification exceptionnelle avec un motif, un demandeur et un approbateur distincts.
- [ ] Vérifier que la version initiale et la nouvelle version sont présentes dans `REUNIONS_VERSIONS`, puis que seule la version approuvée est affichée dans `REUNIONS`.
- [ ] Vérifier que la modification est refusée si le demandeur et l'approbateur sont identiques.

- [ ] Créer un projet avec son seul nom : statut obtenu `À venir`.
- [ ] Refuser le passage à `En cours` sans Élu pilote et Agent pilote.
- [ ] Changer chaque pilote et vérifier la trace automatique au Journal.
- [ ] Créer une action attribuée à une personne.
- [ ] Créer une action adressée à un service : statut `À attribuer`.
- [ ] Terminer une action sans résultat, puis classer une autre `Non aboutie` avec raison obligatoire.
- [ ] Vérifier que Mon pilotage agrège décisions, blocages, vigilances, attentes, jalons et actions.
- [ ] Vérifier qu'un projet Terminé ou Abandonné disparaît de Mon pilotage sans altérer ses objets.
- [ ] Créer une réunion et vérifier que ses conséquences sont de vrais objets liés.
- [ ] Vérifier le verrouillage et la version du compte rendu.
- [ ] Tester à 320 px, 768 px et 1440 px sans commande flottante ni contenu masqué.
- [ ] Vérifier les droits dans Grist avec un administrateur, un élu pilote, un agent pilote et un utilisateur associé.

## Déploiement

1. Valider la recette sur une copie du document Grist.
2. Mettre à jour les versions de ressources restantes.
3. Committer la candidate sur `refonte-v3`.
4. Fusionner `refonte-v3` dans `main` sans réécriture de l'historique.
5. Pousser `main` vers `origin` ; le workflow GitHub Pages publie automatiquement.
6. Vérifier les URLs GitHub Pages puis chaque widget intégré dans Grist.
7. Conserver un plan de retour vers le commit V2 précédent pendant la période d'observation.
