# Organisation municipale — activation

Cette livraison concerne uniquement l’organisation du widget Interlocuteurs. Elle ne modifie pas la présentation des autres widgets, les projets, les réunions ou leurs références aux interlocuteurs.

## Première utilisation

1. Conserver une sauvegarde récente du document Grist.
2. Après publication, ouvrir le widget Interlocuteurs puis **Organisation municipale**.
3. Cliquer sur **Activer l’organisation municipale**. Le widget demande confirmation avant toute adaptation. Les droits existants du widget restent inchangés ; l’adaptation de structure nécessite un compte autorisé à modifier les tables.
4. Créer les pôles en désignant leurs responsables et éventuels adjoints.
5. Dans **Services à rattacher**, modifier chaque service pour choisir son pôle et son mode de responsabilité.
6. Désigner explicitement la DGS. Aucune personne n’est choisie automatiquement d’après sa fonction.
7. Compléter les agents signalés dans **Rattachements à compléter**.

Les services existants restent disponibles pendant la mise en place. Pour créer un pôle, son responsable et son adjoint doivent déjà appartenir à un service actif. Leur appartenance peut être complétée depuis la fiche de l’interlocuteur, y compris pour les services existants encore à rattacher.

## Règles

- Un service appartient à un pôle ; un agent peut appartenir à plusieurs services.
- Le responsable du service est compris dans l’effectif, une seule fois.
- Le service peut avoir un responsable désigné ou reprendre automatiquement celui du pôle.
- Changer un responsable ne retire pas l’ancien responsable de l’effectif ordinaire. Une réaffectation ultérieure reste possible.
- La DGS est hors services et pôles. Sa désignation retire ses appartenances aux services ; ses liens avec les projets restent inchangés. Ses responsabilités de service ou de pôle doivent être réaffectées avant sa désignation.
- Lors d’un remplacement de DGS, un service doit être choisi pour la personne sortante si elle reste active.
- Une responsabilité active bloque la désactivation ou le passage au profil externe. Une modification ne doit pas laisser un agent actif sans service actif.
- La désactivation conserve les lignes et leurs références historiques ; aucun bouton de suppression n’est ajouté.

## Adaptation technique, déclenchée uniquement par le bouton

- Correction de `POLES.Responsbale_adjoint` en `Responsable_adjoint`, sans suppression de la colonne.
- Conversion des colonnes métier à formule vide en colonnes saisissables.
- Ajout de `INTERLOCUTEURS.Est_DGS`, `SERVICES.Responsable_du_pole` et `SERVICES.Responsable_designe`.
- Copie des responsables actuels vers `Responsable_designe` et inclusion de ces responsables dans `Agents`.
- `SERVICES.Responsable` reste la référence publique utilisée par les autres widgets. Elle devient calculée : `$Pole.Responsable if $Responsable_du_pole else $Responsable_designe`.
- Si une formule métier ou un type incompatible est détecté, l’adaptation est refusée avant l’envoi du lot.
- La table intermédiaire `SERVICES_MEMBRES` et la colonne historique `INTERLOCUTEURS.Services` ne sont pas supprimées. Les appartenances multiples restent portées par `SERVICES.Agents`.

Les garanties de validation concernent les opérations réalisées depuis ce widget. Une modification directe dans les tables Grist doit respecter les mêmes règles. En particulier, lors d’une modification directe d’un responsable de pôle, son appartenance effective est calculée, mais le maintien de l’ancien responsable dans `Agents` doit être contrôlé manuellement.

## Vérifications

- Tests automatisés : `node --test commun/*.test.js interlocuteurs/organisation-model.test.js`.
- Scénario local, sans écriture dans Grist : `interlocuteurs/?demo=1`.
- La démonstration contient uniquement des personnes fictives et repart de zéro au rechargement.
- Le fichier Grist fourni a été inspecté en lecture seule. L’adaptation n’a pas été exécutée sur le document de production.
