# Projet Pilotage Grist

## Objectif

Créer une application de pilotage de projets pour une collectivité, basée sur Grist et des widgets personnalisés HTML/CSS/JavaScript.

## Principes techniques

- Le code doit être modulaire, lisible et commenté.
- Séparer autant que possible HTML, CSS et JavaScript.
- Centraliser les styles communs dans une charte graphique réutilisable.
- Ne jamais coder en dur des données métier qui peuvent venir de Grist.
- Toute fonctionnalité doit être facilement modifiable ultérieurement.
- Éviter les gros fichiers monolithiques.
- Toute modification doit préserver les fonctionnalités existantes.

## Responsive

- Toute interface doit fonctionner sur smartphone, tablette et ordinateur.
- Concevoir mobile-first autant que possible.
- Aucun élément essentiel ne doit dépendre uniquement du survol de la souris.
- Les boutons et zones tactiles doivent être suffisamment grands pour une utilisation au doigt.
- Éviter les tableaux difficiles à utiliser sur mobile ; préférer des cartes ou des mises en page adaptatives.

## Charte graphique

- Style moderne, élégant et professionnel.
- Fond général clair légèrement bleuté.
- Cartes blanches, coins arrondis, ombres discrètes.
- Effets de survol doux sur ordinateur : légère élévation et ombre.
- Transitions courtes et fluides, environ 150 à 250 ms.
- Navigation bleu nuit.
- Couleur principale : indigo/violet.
- Couleurs fonctionnelles :
  - Vert : terminé / conforme
  - Orange : vigilance
  - Rouge : blocage / retard
  - Violet : arbitrage politique
  - Bleu : information / action en cours
- Utiliser des badges arrondis, jauges et composants homogènes.

## Composants réutilisables

Prévoir des composants cohérents pour :

- Carte projet
- Badge de statut
- Carte réunion
- Interlocuteur
- Action à suivre
- Consigne politique
- Arbitrage
- Bouton principal
- Alerte
- Jauge d'avancement

## Formulaires d’ajout et de modification

- Le formulaire « Nouveau projet » du Tableau de bord constitue le modèle visuel de référence pour tous les formulaires de création et de modification de l’application.
- Afficher la fenêtre sur un fond assombri, dans un panneau blanc largement arrondi, centré sur ordinateur et occupant l’écran sur mobile.
- Placer dans l’en-tête un surtitre métier en petites capitales, un titre explicite et un bouton de fermeture rond violet clair.
- Organiser les formulaires longs en catégories visuelles clairement nommées et ordonnées.
- Présenter chaque catégorie dans une carte blanche bordée et arrondie, avec un numéro dans une pastille violette, un titre court et une phrase d’aide.
- Numéroter les catégories selon l’ordre réel de saisie. Les sections conditionnelles doivent être intégrées à une catégorie stable ou renumérotées lorsqu’elles apparaissent.
- Chaque catégorie regroupe des champs qui appartiennent au même sujet métier : informations générales, classification, pilotage, calendrier, destinataires, etc.
- Accompagner si utile le titre de catégorie d’une courte explication, sans alourdir la lecture.
- Conserver ensemble les champs formant une même information, par exemple mois et année, trimestre et année, agent et élu pilotes.
- Éviter les longues suites de champs sans séparation visuelle ainsi que les légendes qui chevauchent les bordures.
- Utiliser un fond bleu très clair pour les sous-groupes, les listes de choix et les informations complémentaires.
- Conserver les libellés au-dessus des champs, signaler clairement les champs obligatoires et afficher les erreurs près du formulaire sans effacer les valeurs saisies.
- Fixer la barre d’actions en bas de la fenêtre : action secondaire à gauche et action principale violette à droite. Le libellé principal doit décrire l’effet réel, par exemple « Créer le projet », « Créer l’action » ou « Enregistrer l’interlocuteur ».
- Le contenu central est la seule zone défilante : l’en-tête, le bouton de fermeture et la barre d’actions restent toujours visibles.
- Sur mobile, empiler les groupes et les champs sans perdre leur ordre logique ni tronquer les valeurs usuelles telles que « Non renseigné ».
- Toute nouvelle fenêtre de saisie doit reprendre ce gabarit avant d’introduire un style spécifique au métier.

## Grist

Le projet s'appuie sur les tables suivantes :

- PROJETS
- INTERLOCUTEURS
- REUNIONS
- ACTIONS
- CONSIGNES_POLITIQUES
- ARBITRAGES_DECISIONS
- AVANCEMENTS

Le code devra utiliser l'API des widgets personnalisés Grist pour lire et modifier les données.

## Méthode

- Ne pas développer plusieurs fonctionnalités à la fois sans demande explicite.
- Avant une modification importante, vérifier l'impact sur les autres widgets.
- Favoriser la simplicité et la maintenabilité.
- Le propriétaire du projet n'est pas développeur : garder le code compréhensible et expliquer clairement les changements importants.
