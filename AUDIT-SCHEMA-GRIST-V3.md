# Audit du schéma Grist - refonte fonctionnelle V3

État du document : checklist préparatoire. Source vérifiée : dépôt `Pilotage-Grist` au 28 août 2026. Le fichier Grist lui-même n'est pas présent dans le dépôt : les mentions **OBS** ci-dessous signifient « observé dans le code, les démonstrations ou la documentation », pas « type confirmé dans Grist ».

## Règles de sécurité avant modification

- [ ] Faire une copie du document Grist et noter la date de sauvegarde.
- [ ] Dans Données > Tables, relever pour chaque colonne : titre, identifiant, type, formule, options, règles et vues qui l'utilisent.
- [ ] Ne supprimer aucune colonne marquée RETIRER avant d'avoir recherché son identifiant dans les formules, widgets, filtres, tris, cartes récapitulatives et règles d'accès.
- [ ] Créer les nouvelles tables et colonnes, migrer les valeurs, tester les widgets, puis seulement masquer les anciennes colonnes.
- [ ] Conserver les colonnes historiques masquées pendant au moins une recette complète ; suppression définitive réservée à une passe ultérieure.
- [ ] Les formules ci-dessous sont des intentions fonctionnelles. Les adapter aux noms exacts confirmés dans Grist.

Légende : **C** conserver ; **M** modifier/renommer ; **N** nouveau ; **R** retirer après contrôle ; **A** à auditer dans Grist.

## 1. PROJETS

Ordre conseillé : identité, pilotage, périmètre, calendrier, état, clôture, audit.

| # | Titre visible | ID technique | Type Grist cible | Choix / relation / formule | Action |
|---:|---|---|---|---|---|
| 1 | Nom du projet | `Nom_projet` | Text | obligatoire | C - OBS |
| 2 | Description | `Description` | Text | facultatif | C - OBS |
| 3 | Objectif politique | `Objectif_politique` | Text | facultatif | C/A |
| 4 | Thématiques | `Thematiques` | ChoiceList | 12 choix listés plus bas | N ou M depuis catégorie |
| 5 | Services concernés | `Services_concernes` | RefList:SERVICES | afficher `Nom_service` | N |
| 6 | Élu pilote | `Elu_pilote` | Ref:INTERLOCUTEURS | personne interne, rôle Élu | C/A |
| 7 | Agent pilote | `Agent_pilote` | Ref:INTERLOCUTEURS | personne interne, rôle Agent | C/A |
| 8 | Élus associés | `Elus_associes` | RefList:INTERLOCUTEURS | personnes internes, rôle Élu | N ou M |
| 9 | Agents associés | `Agents_associes` | RefList:INTERLOCUTEURS | personnes internes, rôle Agent | N ou M |
| 10 | Interlocuteurs externes | `Interlocuteurs_externes` | RefList:INTERLOCUTEURS | `Interne_Mairie=False` | N ou M |
| 11 | Mois de lancement | `Mois_lancement` | Choice | Janvier à Décembre | N/M |
| 12 | Année de lancement | `Annee_lancement` | Int | année sur 4 chiffres | N/M |
| 13 | Trimestre objectif | `Trimestre_objectif` | Choice | T1, T2, T3, T4 | N/M |
| 14 | Année objectif | `Annee_objectif` | Int | année sur 4 chiffres | N/M |
| 15 | Statut | `Statut` | Choice | À venir; En cours; Terminé; Abandonné | M - OBS |
| 16 | Motif d'abandon | `Motif_abandon` | Text | obligatoire si Abandonné | N |
| 17 | Date de clôture | `Date_cloture` | DateTime | renseignée par le widget | N |
| 18 | Actif dans le pilotage | `Actif_pilotage` | Formula Bool | `Statut` dans À venir/En cours | N |
| 19 | Créé le | `Cree_le` | CreatedAt | audit | N/A |
| 20 | Créé par | `Cree_par` | CreatedBy | audit | N/A |
| 21 | Modifié le | `Modifie_le` | ModifiedAt | audit | N/A |
| 22 | Pourcentage d'avancement | identifiant réel à relever | Numeric | vérifier jauges/formules | R |
| 23 | Priorité | `Priorite` (OBS) | Choice | vérifier dashboard et démos | R |
| 24 | Catégorie | identifiant réel à relever | Choice/Ref | migrer vers `Thematiques` | R après migration |
| 25 | Prochaine étape | identifiant réel à relever | Text/Date | migrer vers JALONS | R après migration |
| 26 | Point de vigilance | `Point_vigilance` (OBS) | Text | migrer vers VIGILANCES | R après migration |

Thématiques exactes : Finances & Fiscalité ; Sécurité & Tranquillité publique ; Voirie & Mobilités ; Concertation & Participation citoyenne ; Solidarités & Intergénérationnel ; Enfance, Jeunesse & Éducation ; Travaux & Patrimoine bâti ; Urbanisme & Cadre de vie ; Environnement & Transition écologique ; Culture, Vie associative & Festivités ; Vie économique & Tourisme ; Sport.

Règles : seul `Nom_projet` est obligatoire à la création ; statut initial `À venir`. Le passage à `En cours` requiert `Elu_pilote` et `Agent_pilote`. Un projet en cours ne peut perdre un pilote sans remplacement simultané. Tout changement de pilote ou d'objectif de réalisation crée une entrée de JOURNAL.

## 2. INTERLOCUTEURS

| # | Titre visible | ID technique | Type cible | Options / relation | Action |
|---:|---|---|---|---|---|
| 1 | Prénom | `Prenom` | Text | OBS | C |
| 2 | Nom | `Nom` | Text | obligatoire, OBS | C |
| 3 | Nom complet | `Nom_complet` | Formula Text | prénom + nom ; OBS en lecture | C/A |
| 4 | Interne à la Mairie | `Interne_Mairie` | Bool | renommer `Interne_Sanguinet` observé | M |
| 5 | Rôle interne | `Role_interne` | Choice | Agent; Élu | N/M depuis `Type_interlocuteur` |
| 6 | Services | `Services` | RefList:SERVICES | relation inverse via SERVICES_MEMBRES si nécessaire | N |
| 7 | Organisme | `Organisme` | Text | requis seulement pour externe ; OBS | C |
| 8 | Fonction | `Fonction` | Text | libre ; OBS | C |
| 9 | Courriel | `Email` | Text | OBS | C |
| 10 | Téléphone | `Telephone` | Text | OBS | C |
| 11 | Notes | `Notes` | Text | OBS | C |
| 12 | Actif | `Actif` | Bool | défaut vrai ; OBS | C |
| 13 | Type d'interlocuteur | `Type_interlocuteur` | Choice | migrer vers interne + rôle | R après migration |
| 14 | Ancienne taxonomie externe | identifiants à relever | Choice/Text | secteur, catégorie, sous-type… | R après inventaire |

## 3. SERVICES - nouvelle table

| # | Titre visible | ID technique | Type | Options / relation | Action |
|---:|---|---|---|---|---|
| 1 | Nom du service | `Nom_service` | Text | obligatoire, unique | N |
| 2 | Responsable | `Responsable` | Ref:INTERLOCUTEURS | agent interne actif | N |
| 3 | Agents | `Agents` | RefList:INTERLOCUTEURS | un agent peut être dans plusieurs services | N |
| 4 | Actif | `Actif` | Bool | défaut vrai | N |
| 5 | Notes | `Notes` | Text | facultatif | N |

Si la relation multiple ne peut être maintenue proprement des deux côtés, créer `SERVICES_MEMBRES` avec `Service` (Ref:SERVICES), `Agent` (Ref:INTERLOCUTEURS), `Est_responsable` (Bool), `Date_debut` et `Date_fin`.

## 4. ACTIONS

| # | Titre visible | ID technique | Type cible | Options / formule | Action |
|---:|---|---|---|---|---|
| 1 | Projet | `Projet` | Ref:PROJETS | OBS | C |
| 2 | Action | `Action` | Text | obligatoire, OBS | C |
| 3 | Demandée par | `Demandee_par` | Ref:INTERLOCUTEURS | automatique si possible ; OBS | C |
| 4 | Attribuée à | `Attribuee_a` | Ref:INTERLOCUTEURS | migrer `Responsable` ; une personne | M |
| 5 | Service destinataire | `Service_destinataire` | Ref:SERVICES | utilisé tant que non attribuée | N |
| 6 | Statut | `Statut` | Choice | À attribuer; À faire; En cours; Réalisée; Non aboutie | M |
| 7 | Date de création | `Date_creation` | DateTime/CreatedAt | OBS | C |
| 8 | Échéance | `Echeance` | Date | facultative, OBS | C |
| 9 | Date de fin | `Date_fin` | DateTime | automatique pour les 2 statuts finaux | M depuis `Date_realisation` |
| 10 | Résultat | `Resultat` | Text | facultatif si Réalisée ; OBS | C |
| 11 | Raison de non-aboutissement | `Raison_non_aboutie` | Text | obligatoire si Non aboutie | N |
| 12 | Réunion d'origine | `Reunion_origine` | Ref:REUNIONS | OBS parmi 3 alias possibles | C/M vers ID unique |
| 13 | En retard | `En_retard` | Formula Bool | ouverte et échéance dépassée ; OBS | C/M |
| 14 | Type d'action | `Type_action` | Choice | OBS | R |
| 15 | Nature de l'action | `Nature_action` | Choice | OBS V2 | R |
| 16 | Priorité | `Priorite` | Choice | OBS | R |
| 17 | Contrôle requis/effectué | `Controle_requis`, `Controle_effectue` | Bool | OBS | R |
| 18 | À contrôler | `A_controler` | Formula Bool | OBS | R |
| 19 | Commentaire/discussion | `Commentaire` et IDs à relever | Text/Ref | OBS | R après export utile |
| 20 | Origine générique | identifiant réel à relever | Choice/Text | conserver seulement Réunion liée | R |

Tri recommandé : retard, échéance croissante, sans échéance à la fin ; aucune apparence dévalorisante pour ces dernières. Une demande à un service naît `À attribuer`, puis le responsable affecte une personne ou crée plusieurs actions.

## 5. CONSIGNES_POLITIQUES

| # | Titre visible | ID technique | Type cible | Options / relation | Action |
|---:|---|---|---|---|---|
| 1 | Projet | `Projet` | Ref:PROJETS | OBS | C |
| 2 | Consigne | `Consigne` | Text | obligatoire, OBS | C |
| 3 | Émetteur | `Emetteur` | Ref:INTERLOCUTEURS | obligatoire, OBS | C |
| 4 | Destinataires | `Destinataires` | RefList:INTERLOCUTEURS | au moins personnes ou services ; OBS | C |
| 5 | Services destinataires | `Services_destinataires` | RefList:SERVICES | reste attachée au service | N |
| 6 | Date d'émission | `Date_emission` | CreatedAt/DateTime | automatique | N/A |
| 7 | État | `Statut` | Choice | Active; Archivée | M - OBS |
| 8 | Date d'archivage | `Date_archivage` | DateTime | automatique | N |
| 9 | Motif d'archivage | `Motif_archivage` | Text | facultatif | N |
| 10 | Réunion d'origine | `Reunion_origine` | Ref:REUNIONS | si utile ; OBS alias | C/M |
| 11 | Responsable | `Responsable` | Ref | compatibilité V2 | R après migration |
| 12 | Priorité, échéance, contrôle, retour | IDs observés `Priorite`, `Echeance`, `Controle_requis`, `Retour_attendu`, `Retour_service` | divers | anciennes fonctions | R |

## 6. JALONS - nouvelle table

| # | Titre visible | ID technique | Type | Options / formule | Action |
|---:|---|---|---|---|---|
| 1 | Projet | `Projet` | Ref:PROJETS | obligatoire | N |
| 2 | Jalon | `Jalon` | Text | obligatoire | N |
| 3 | Ordre | `Ordre` | Int | ordre manuel | N |
| 4 | Date prévue | `Date_prevue` | Date | facultative | N |
| 5 | Franchi | `Franchi` | Bool | défaut faux | N |
| 6 | Date réelle | `Date_reelle` | Date | obligatoire lors du franchissement | N |
| 7 | À retenir | `A_retenir` | Text | facultatif | N |
| 8 | Créé le/par | `Cree_le`, `Cree_par` | CreatedAt/CreatedBy | audit | N |

## 7. BLOCAGES - nouvelle table

Colonnes dans l'ordre : `Projet` (Ref:PROJETS), `Blocage` (Text), `Date_apparition` (DateTime), `Actif` (Bool), `Attente_externe` (Ref:ATTENTES_EXTERNES, facultatif), `Date_resolution` (DateTime), `Explication_resolution` (Text), `Cree_par` (CreatedBy). La création et la résolution produisent une entrée JOURNAL.

## 8. VIGILANCES - nouvelle table

Même structure que BLOCAGES : `Projet`, `Vigilance`, `Date_apparition`, `Active`, `Date_resolution`, `Explication_resolution`, `Cree_par`. Ne pas fusionner les deux objets.

## 9. ATTENTES_EXTERNES - nouvelle table

| # | Titre visible | ID technique | Type | Options / relation | Action |
|---:|---|---|---|---|---|
| 1 | Projet | `Projet` | Ref:PROJETS | obligatoire | N |
| 2 | Attente | `Attente` | Text | obligatoire | N |
| 3 | Tiers | `Tiers` | Ref:INTERLOCUTEURS | externe | N |
| 4 | Date de création | `Date_creation` | CreatedAt | automatique | N |
| 5 | Date attendue | `Date_attendue` | Date | facultative | N |
| 6 | Statut | `Statut` | Choice | En attente; Reçue; Sans suite | N |
| 7 | Date de fin | `Date_fin` | DateTime | automatique | N |
| 8 | Résultat / motif | `Resultat` | Text | facultatif | N |
| 9 | Blocage lié | `Blocage` | Ref:BLOCAGES | facultatif | N |

Créer `RELANCES_ATTENTES` : `Attente` (Ref:ATTENTES_EXTERNES), `Date_relance` (DateTime), `Par` (Ref:INTERLOCUTEURS ou CreatedBy), `Note` (Text). Une relance n'est jamais un statut.

## 10. ARBITRAGES_DECISIONS (titre visible : DÉCISIONS)

| # | Titre visible | ID technique | Type cible | Options | Action |
|---:|---|---|---|---|---|
| 1 | Projet | `Projet` | Ref:PROJETS | OBS | C |
| 2 | Sujet | `Sujet` | Text | OBS | C |
| 3 | Question à trancher | `Question_a_trancher` | Text | OBS | C |
| 4 | Contexte | `Contexte` | Text | OBS | C |
| 5 | Date nécessaire | `Echeance_decision` | Date | OBS | C/M titre |
| 6 | Demandée par | `Demandee_par` | Ref:INTERLOCUTEURS | agent ou élu | N/A |
| 7 | Circuit / instance | `Instance_decision` | Text/Choice | OBS | C |
| 8 | Statut | `Statut` | Choice | Demandée; En instruction; Prise; Sans suite | M |
| 9 | Décision | `Decision_prise` | Text | saisie par autorité habilitée ; OBS | C |
| 10 | Date de décision | `Date_decision` | DateTime | OBS | C |
| 11 | Décidée par | `Decision_par` | Ref:INTERLOCUTEURS | OBS | C |
| 12 | À transmettre | `A_transmettre` | Bool | reste actif tant que vrai ; OBS | C |
| 13 | Transmise | `Transmis` | Bool/DateTime | OBS | C/M |
| 14 | Options / position élue | `Options`, `Position_elue` | Text | OBS | A : garder seulement si utile |
| 15 | Urgence | `Urgence` | Choice | déduire de l'échéance | R |
| 16 | Point hebdo | `Point_hebdo` | Bool | OBS | R |
| 17 | Historique/report | `Motif_report`, `Historique_evolution` | Text | OBS V2 | R après migration au JOURNAL |

## 11. REUNIONS

Conserver dans cet ordre : `Projet` (Ref:PROJETS), `Date_reunion` (Date), `Heure` (Time/Text à confirmer), `Objet` (Text), `Lieu` (Text), `Participants` (RefList:INTERLOCUTEURS), `Compte_rendu` (Text), `Points_cles` (Text), `Version_courante` (Ref:REUNIONS_VERSIONS ou Int), `Saisi_par` (Ref/CreatedBy), `Cree_le` (CreatedAt).

Retirer après dépendances : `Type_reunion`, `CR_finalise`, `Decisions_prises`, `Suites`, `Actions`, `Engagements`, `Arbitrage_attendu` et autres champs textuels de conséquences. Les objets créés à partir d'une réunion utilisent un unique `Reunion_origine` (Ref:REUNIONS) ; supprimer les alias `Reunion`/`Origine_reunion` seulement après migration.

Créer `REUNIONS_VERSIONS` : `Reunion`, `Numero_version`, `Compte_rendu`, `Points_cles`, `Auteur`, `Date_version`, `Motif_modification`, `Demandeur`, `Approbateur`, `Statut_demande`. Exiger demandeur différent de l'approbateur.

## 12. AVANCEMENTS à renommer visuellement JOURNAL

Le dépôt documente `Projet`, `Date_evenement`, `Type_entree`, `Titre`, `Description`, `Source_table`, `Source_id`, `Auteur`, `Automatique`, `Actif` et des champs historiques à confirmer dans `AVANCEMENTS-V5.md`.

Cible : conserver `Projet`, `Date_evenement`, `Type_entree`, `Titre`, `Description`, `Source_table`, `Source_id`, `Auteur`, `Automatique`. Choix manuels autorisés pour `Type_entree` : uniquement `Avancement`, `Information`. Les autres types sont générés par l'application : changement de pilote/calendrier, jalon franchi, blocage/vigilance créé ou levé, décision prise, clôture/réouverture. Retirer après migration les pseudo-objets `Prochaine étape`, `Vigilance`, `Blocage`, `Décision attendue` désormais stockés dans leurs tables propres.

## 13. Tables techniques complémentaires

- `REUNIONS_VERSIONS` : voir section Réunions.
- `RELANCES_ATTENTES` : voir section Attentes externes.
- `SERVICES_MEMBRES` : seulement si nécessaire pour la relation plusieurs-à-plusieurs.
- Ne pas créer de table « Demandes au service » : utiliser ACTIONS avec `Statut=À attribuer`.
- Ne pas créer de table de résumé narratif ni de sélection manuelle pour Mon pilotage.

## 14. Dépendances observées dans le dépôt

- Tous les widgets lisent `PROJETS`; `fiche-projet`, `dashboard` et `point-hebdomadaire` agrègent plusieurs tables.
- `actions` écrit actuellement `Type_action`, `Nature_action`, `Priorite`, `Controle_requis`, `Controle_effectue`, `Commentaire` : adapter le widget avant retrait.
- `consignes` écrit encore `Retour_service` et les statuts de contrôle : adapter avant retrait.
- `reunions` peut créer ACTIONS, CONSIGNES et ARBITRAGES et accepte trois identifiants de réunion d'origine : migrer vers un seul.
- `point-hebdomadaire` dépend explicitement des anciennes priorités, contrôles et `Point_hebdo` : remplacer par Mon pilotage avant retrait.
- `interlocuteurs` écrit `Type_interlocuteur` et `Interne_Sanguinet` : migrer avant renommage/suppression.
- Les démonstrations contiennent encore `Point_vigilance`, `Priorite`, `CR_finalise`, champs de suites de réunion et anciens statuts.

## 15. Ordre d'exécution manuel conseillé

1. [ ] Sauvegarder et inventorier le schéma réel (y compris formules, vues et ACL).
2. [ ] Créer SERVICES, JALONS, BLOCAGES, VIGILANCES, ATTENTES_EXTERNES, RELANCES_ATTENTES et REUNIONS_VERSIONS.
3. [ ] Ajouter les nouvelles colonnes à PROJETS, INTERLOCUTEURS, ACTIONS, CONSIGNES, DÉCISIONS et JOURNAL.
4. [ ] Migrer catégories vers thématiques, responsables vers attribués, services/personnes, prochaine étape vers jalons et alertes textuelles vers objets dédiés.
5. [ ] Adapter les widgets et vérifier toutes les écritures Grist.
6. [ ] Tester création et passage En cours, changement de pilotes, actions de service, clôtures, journal automatique et permissions.
7. [ ] Masquer les anciennes colonnes et effectuer une recette sur copie.
8. [ ] Rechercher chaque ancien ID dans formules, widgets, vues, tris, filtres, graphiques et ACL.
9. [ ] Supprimer seulement les colonnes sans dépendance résiduelle, lors d'une passe distincte.

## 16. Contrôle final

- [ ] Aucun projet En cours sans deux pilotes.
- [ ] Aucun objet actif d'un projet clos dans Mon pilotage.
- [ ] Aucune suppression de projet pour agents/élus.
- [ ] Motif obligatoire pour Abandonné et Non aboutie.
- [ ] Journal automatique sans doublon ; seulement deux types manuels.
- [ ] Les CR restent versionnés et non écrasés.
- [ ] Les actions sans échéance restent lisibles et classées après les échéances.
- [ ] Les anciens champs sont absents des écritures du code avant suppression physique.
- [ ] Arbitrage n°56 explicitement exclu : aucune règle nouvelle sur l'ajout/retrait libre des participants n'est considérée validée.
