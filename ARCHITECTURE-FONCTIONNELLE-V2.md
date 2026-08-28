# Architecture fonctionnelle V2 — passation technique

État : **candidate locale à tester dans Grist, non publiée et non déclarée opérationnelle**.

## Contrat de navigation

Les widgets acceptent désormais les paramètres suivants :

- `mode=global` : choix du projet disponible dans le widget ;
- `mode=project&projectId=<ID Grist>` : projet imposé par la Fiche projet ;
- `demo=1` : uniquement sur `localhost`, hors iframe Grist.

La Fiche projet transmet ce contexte vers `actions/`, `reunions/` et `consignes/`. Les anciennes sélections de ligne Grist et la clé locale `pilotage-grist:selected-project` restent des replis compatibles.

## Colonnes Grist recommandées

Ne supprimer et ne renommer aucune colonne existante. Les widgets détectent les colonnes avant écriture et conservent les anciens champs lorsqu'ils existent.

### ACTIONS

| ID technique | Type Grist | Formule | Choix / rôle |
| --- | --- | --- | --- |
| `Demandee_par` | `Ref:INTERLOCUTEURS` | aucune | auteur de la demande |
| `Responsable` | `Ref:INTERLOCUTEURS` | aucune | personne à laquelle l'action est attribuée (existant conservé) |
| `Nature_action` | `Choice` | aucune | `Interne`, `Externe`, `Attente partenaire` |
| `Controle_requis` | `Bool` | aucune | contrôle politique demandé |
| `Controle_effectue` | `Bool` | aucune | contrôle réalisé |
| `Date_realisation` | `Date` | aucune | renseignée à la clôture |
| `Resultat` | `Text` | aucune | renseigné à la clôture |

Choix recommandés pour `Statut` : `À faire`, `En cours`, `À contrôler`, `Contrôlée`, `À reprendre`, `Réalisée`, `Annulée`. À la création, le widget force `À faire` sans afficher le champ.

### CONSIGNES_POLITIQUES

| ID technique | Type Grist | Formule | Choix / rôle |
| --- | --- | --- | --- |
| `Emetteur` | `Ref:INTERLOCUTEURS` | aucune | auteur politique de la consigne |
| `Destinataires` | `RefList:INTERLOCUTEURS` | aucune | un ou plusieurs destinataires |
| `Retour_attendu` | `Text` | aucune | nature du retour demandé |
| `Controle_requis` | `Bool` | aucune | détermine si le retour passe par `À contrôler` |

`Responsable` reste alimenté avec le premier destinataire lorsqu'il existe, pour compatibilité avec les vues et formules historiques. Choix recommandés pour `Statut` : `En cours`, `À contrôler`, `À reprendre`, `Traitée`, `Validée`, `Archivée`.

### ARBITRAGES_DECISIONS

| ID technique | Type Grist | Formule | Choix / rôle |
| --- | --- | --- | --- |
| `Motif_report` | `Text` | aucune | dernier motif de report |
| `Historique_evolution` | `Text` | aucune | journal horodaté des reports et classements |

Choix recommandés pour `Statut` : `À préparer`, `À décider`, `Reportée`, `Décidée`, `Sans suite`. Les champs existants `Decision_prise`, `Date_decision`, `Instance_decision` et `Decision_par` restent utilisés lors de l'action **Décider**.

### AVANCEMENTS

Conserver le schéma décrit dans `fiche-projet/AVANCEMENTS-V5.md`. Pour `Type_entree`, utiliser exactement : `Avancement`, `Information`, `Prochaine étape`, `Étape franchie`, `Vigilance`, `Vigilance levée`, `Blocage`, `Déblocage`, `Décision attendue`, `Décision prise`.

## Versions de ressources prévues

- `commun/context.js?v=1`
- Dashboard : `app.js?v=6`, `style.css?v=6`
- Fiche projet : `app.js?v=11`, `style.css?v=12`
- Actions : `app.js?v=7`, `styles.css?v=7`, `demo-data.js?v=7`
- Consignes : `app.js?v=4`, `styles.css?v=4`, `demo-data.js?v=4`
- Réunions : `app.js?v=9`, `styles.css?v=9`
- composants communs : `components.css?v=6` pour les pages touchées

Les URLs de widget restent celles des dossiers GitHub Pages existants. Aucun changement d'URL ne doit être fait avant validation ; le contexte est ajouté sous la forme `?mode=project&projectId=<ID>`.

## Recette obligatoire avant publication

1. Ouvrir la Fiche projet depuis une ligne `PROJETS`, puis chaque lien du hub ; vérifier que le même projet est imposé.
2. Ouvrir Actions depuis l'Accueil ; vérifier que le sélecteur reste utilisable en mode global.
3. Créer une Action depuis le widget et depuis une Réunion ; contrôler projet, origine, contrôle élu, demandeur, attributaire, priorité et échéance.
4. Clôturer une Action avec et sans contrôle requis ; vérifier l'apparition tardive du résultat et de la date de réalisation.
5. Créer une Consigne avec plusieurs destinataires, sans échéance, avec puis sans contrôle requis.
6. Reporter, décider et classer sans suite trois décisions de test ; contrôler le motif et `Historique_evolution`.
7. Créer une Réunion avec une heure et plus de deux participants ; rechercher et sélectionner plusieurs personnes successivement.
8. Vérifier le Dashboard à 320, 768 et 1440 px : deux cartes maximum par ligne, hauteurs stables, élu pilote visible.
9. Vérifier le journal : cinq entrées initiales, bouton Tout afficher, titres et bordures, résolution d'une vigilance et d'un blocage.
10. Refaire la recette avec plusieurs champs facultatifs vides et d'anciennes lignes contenant des références `0`.

## Points encore ouverts après ce lot

- décider métier par métier si `Type_reunion` et `CR_finalise` doivent rester visibles ou devenir des automatismes ; aucune suppression n'est faite ;
- l'ajout rapide d'un nouvel interlocuteur depuis le sélecteur de participants demande un contrat précis sur les champs obligatoires d'`INTERLOCUTEURS` ;
- harmoniser complètement la recherche d'interlocuteurs dans les formulaires dynamiques de la Fiche projet et des suites de Réunion ;
- confirmer les choix Grist réels et les formules existantes avant d'ajouter les colonnes proposées.
