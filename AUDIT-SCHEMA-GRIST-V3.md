# Audit du schéma Grist - refonte fonctionnelle V3

État du document : checklist préparatoire. Source vérifiée : dépôt `Pilotage-Grist` au 29 août 2026. Le fichier Grist lui-même n'est pas présent dans le dépôt : les mentions **OBS** ci-dessous signifient « observé dans le code, les démonstrations ou la documentation », pas « type confirmé dans Grist ».

## Règles de sécurité avant modification

- [ ] Faire une copie du document Grist et noter la date de sauvegarde.
- [ ] Dans Données > Tables, relever pour chaque colonne : titre, identifiant, type, formule, options, règles et vues qui l'utilisent.
- [ ] Ne supprimer aucune colonne marquée RETIRER avant d'avoir recherché son identifiant dans les formules, widgets, filtres, tris, cartes récapitulatives et règles d'accès.
- [ ] Créer les nouvelles tables et colonnes, migrer les valeurs, tester les widgets, puis seulement masquer les anciennes colonnes.
- [ ] Conserver les colonnes historiques masquées pendant au moins une recette complète ; suppression définitive réservée à une passe ultérieure.
- [ ] Les formules ci-dessous sont des intentions fonctionnelles. Les adapter aux noms exacts confirmés dans Grist.

Légende : **C** conserver ; **M** modifier/renommer ; **N** nouveau ; **R** retirer après contrôle ; **A** à auditer dans Grist.

## 0. Comprendre et paramétrer les colonnes d'audit

`CreatedAt`, `CreatedBy`, `ModifiedAt` et `ModifiedBy` désignent une **fonction**, pas un type Grist. Utiliser les types ordinaires ci-dessous et une **formule d'initialisation** (appelée aussi formule déclenchée), jamais une colonne Formule classique :

| Fonction | Titre / ID conseillé | Type Grist | Formule d'initialisation | Déclenchement |
|---|---|---|---|---|
| Date de création | Créé le / `Cree_le` | DateTime | `NOW()` | cocher seulement **Appliquer aux nouveaux enregistrements** |
| Auteur de création | Créé par / `Cree_par` | Text | `user.Name` | cocher seulement **Appliquer aux nouveaux enregistrements** |
| Date de modification | Modifié le / `Modifie_le` | DateTime | `NOW()` | cocher **Appliquer aux nouveaux enregistrements** et **Appliquer lors des modifications > N'importe quel champ** |
| Auteur de modification | Modifié par / `Modifie_par` | Text | `user.Name` | cocher **Appliquer aux nouveaux enregistrements** et **Appliquer lors des modifications > N'importe quel champ** |

Procédure dans Grist : sélectionner la colonne, choisir le bon type, ouvrir **Comportement de la colonne > Définir une formule d'initialisation**, saisir la formule, puis régler les cases de déclenchement. Ne pas utiliser une colonne Formule permanente : `NOW()` se recalculerait et ne conserverait pas l'instant historique. `user.Name` stocke un texte lisible ; utiliser `user.Email` à la place si l'adresse électronique doit être l'identifiant stable. Ces colonnes d'audit ne sont pas des références vers `INTERLOCUTEURS`.

Pour les lignes déjà existantes, les formules d'initialisation ne reconstruisent pas le passé. Laisser la valeur vide ou effectuer une reprise manuelle datée et documentée ; ne pas inventer l'auteur.

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
| 19 | Créé le | `Cree_le` | DateTime + initialisation | `NOW()` ; nouveaux enregistrements | N/A |
| 20 | Créé par | `Cree_par` | Text + initialisation | `user.Name` ; nouveaux enregistrements | N/A |
| 21 | Modifié le | `Modifie_le` | DateTime + initialisation | `NOW()` ; nouveau + toute modification | N/A |
| 22 | Modifié par | `Modifie_par` | Text + initialisation | `user.Name` ; nouveau + toute modification | N/A |
| 23 | Pourcentage d'avancement | identifiant réel à relever | Numeric | vérifier jauges/formules | R |
| 24 | Priorité | `Priorite` (OBS) | Choice | vérifier dashboard et démos | R |
| 25 | Catégorie | identifiant réel à relever | Choice/Ref | migrer vers `Thematiques` | R après migration |
| 26 | Prochaine étape | identifiant réel à relever | Text/Date | migrer vers JALONS | R après migration |
| 27 | Point de vigilance | `Point_vigilance` (OBS) | Text | migrer vers VIGILANCES | R après migration |

Thématiques exactes : Finances & Fiscalité ; Sécurité & Tranquillité publique ; Voirie & Mobilités ; Concertation & Participation citoyenne ; Solidarités & Intergénérationnel ; Enfance, Jeunesse & Éducation ; Travaux & Patrimoine bâti ; Urbanisme & Cadre de vie ; Environnement & Transition écologique ; Culture, Vie associative & Festivités ; Vie économique & Tourisme ; Sport.

Règles : seul `Nom_projet` est obligatoire à la création ; statut initial `À venir`. Le passage à `En cours` requiert `Elu_pilote` et `Agent_pilote`. Un projet en cours ne peut perdre un pilote sans remplacement simultané. Tout changement de pilote ou d'objectif de réalisation crée une entrée de JOURNAL.

## 2. INTERLOCUTEURS

| # | Titre visible | ID technique | Type cible | Options / relation | Action |
|---:|---|---|---|---|---|
| 1 | Prénom | `Prenom` | Text | OBS | C |
| 2 | Nom | `Nom` | Text | obligatoire, OBS | C |
| 3 | Nom complet | `Nom_complet` | Formula Text | prénom + nom ; OBS en lecture | C/A |
| 4 | Interne à la Mairie | `Interne_Mairie` | Bool | renommer `Interne_Sanguinet` observé | M |
| 5 | Rôle interne | `Role_interne` | Choice | Agent; Élu | C |
| 6 | Services | `Services` | RefList:SERVICES | relation inverse via SERVICES_MEMBRES si nécessaire | N |
| 7 | Organisme | `Organisme` | Text | requis seulement pour externe ; OBS | C |
| 8 | Fonction | `Fonction` | Text | libre ; OBS | C |
| 9 | Courriel | `Email` | Text | OBS | C |
| 10 | Téléphone | `Telephone` | Text | OBS | C |
| 11 | Notes | `Notes` | Text | OBS | C |
| 12 | Actif | `Actif` | Bool | défaut vrai ; OBS | C |
| 13 | Type d'interlocuteur | `Type_interlocuteur` | Choice | — | R : remplacé par `Fonction` et `Role_interne` |
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
| 7 | Date de création | `Date_creation` | DateTime + initialisation | `NOW()` ; nouveaux enregistrements | C |
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

## 5. JALONS - nouvelle table

| # | Titre visible | ID technique | Type | Options / formule | Action |
|---:|---|---|---|---|---|
| 1 | Projet | `Projet` | Ref:PROJETS | obligatoire | N |
| 2 | Jalon | `Jalon` | Text | obligatoire | N |
| 3 | Ordre | `Ordre` | Int | ordre manuel | N |
| 4 | Date prévue | `Date_prevue` | Date | facultative | N |
| 5 | Franchi | `Franchi` | Bool | défaut faux | N |
| 6 | Date réelle | `Date_reelle` | Date | obligatoire lors du franchissement | N |
| 7 | À retenir | `A_retenir` | Text | facultatif | N |
| 8 | Créé le/par | `Cree_le`, `Cree_par` | DateTime + Text | initialisations `NOW()` et `user.Name` ; nouveaux enregistrements | N |

## 7. BLOCAGES - nouvelle table

Colonnes dans l'ordre : `Projet` (Ref:PROJETS), `Blocage` (Text), `Date_apparition` (DateTime), `Actif` (Bool), `Attente_externe` (Ref:ATTENTES_EXTERNES, facultatif), `Date_resolution` (DateTime), `Explication_resolution` (Text), `Cree_par` (Text avec initialisation `user.Name` sur les nouveaux enregistrements). La création et la résolution produisent une entrée JOURNAL.

## 8. VIGILANCES - nouvelle table

Même structure que BLOCAGES : `Projet`, `Vigilance`, `Date_apparition`, `Active`, `Date_resolution`, `Explication_resolution`, `Cree_par`. Ne pas fusionner les deux objets.

## 9. ATTENTES_EXTERNES - nouvelle table

| # | Titre visible | ID technique | Type | Options / relation | Action |
|---:|---|---|---|---|---|
| 1 | Projet | `Projet` | Ref:PROJETS | obligatoire | N |
| 2 | Attente | `Attente` | Text | obligatoire | N |
| 3 | Tiers | `Tiers` | Ref:INTERLOCUTEURS | externe | N |
| 4 | Date de création | `Date_creation` | DateTime + initialisation | `NOW()` ; nouveaux enregistrements | N |
| 5 | Date attendue | `Date_attendue` | Date | facultative | N |
| 6 | Statut | `Statut` | Choice | En attente; Reçue; Sans suite | N |
| 7 | Date de fin | `Date_fin` | DateTime | automatique | N |
| 8 | Résultat / motif | `Resultat` | Text | facultatif | N |
| 9 | Blocage lié | `Blocage` | Ref:BLOCAGES | facultatif | N |

### Paramétrage détaillé de RELANCES_ATTENTES

| # | Titre visible | ID technique | Type Grist | Réglage | Obligatoire |
|---:|---|---|---|---|---|
| 1 | Attente concernée | `Attente` | Ref:ATTENTES_EXTERNES | afficher la colonne `Attente` | oui |
| 2 | Date de relance | `Date_relance` | DateTime | colonne de données, sans formule ; le widget écrit l'heure | oui |
| 3 | Effectuée par | `Par` | Text + initialisation | `user.Name`, nouveaux enregistrements uniquement | non, recommandé |
| 4 | Note | `Note` | Text | texte long | non |

Ne pas configurer `Par` comme Ref:INTERLOCUTEURS : le widget n'envoie actuellement pas cette référence et la correspondance entre compte Grist et interlocuteur n'est pas garantie. Ne pas ajouter de colonne `Statut` : une relance est un événement daté et l'état reste porté par `ATTENTES_EXTERNES.Statut`. Aucun champ n'a de formule permanente.

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

Conserver dans cet ordre : `Projet` (Ref:PROJETS), `Date_reunion` (DateTime, fuseau Europe/Paris), `Objet` (Text), `Lieu` (Text), `Participants` (RefList:INTERLOCUTEURS), `Compte_rendu` (Text), `Points_cles` (Text), `Saisi_par` (Ref:INTERLOCUTEURS, saisie métier facultative), `Cree_le` (DateTime avec initialisation `NOW()` sur les nouveaux enregistrements). `Version_courante` n'est pas nécessaire au code actuel. Le widget saisit directement la date et l'heure dans `Date_reunion`.

Retirer après dépendances : `Type_reunion`, `CR_finalise`, `Decisions_prises`, `Suites`, `Actions`, `Engagements`, `Arbitrage_attendu` et autres champs textuels de conséquences. Les objets créés à partir d'une réunion utilisent un unique `Reunion_origine` (Ref:REUNIONS) ; supprimer les alias `Reunion`/`Origine_reunion` seulement après migration.

### Paramétrage détaillé de REUNIONS_VERSIONS

| # | Titre visible | ID technique | Type Grist | Réglage / choix | Obligatoire pour le widget |
|---:|---|---|---|---|---|
| 1 | Réunion | `Reunion` | Ref:REUNIONS | afficher `Objet` | oui |
| 2 | Numéro de version | `Numero_version` | Int | colonne de données, sans formule | oui |
| 3 | Compte rendu | `Compte_rendu` | Text | texte long | oui |
| 4 | Points clés | `Points_cles` | Text | texte long | non, recommandé |
| 5 | Auteur | `Auteur` | Ref:INTERLOCUTEURS | le widget reprend le demandeur | non, recommandé |
| 6 | Date de version | `Date_version` | DateTime | colonne de données, sans formule ; écrite par le widget | non, recommandé |
| 7 | Motif de modification | `Motif_modification` | Text | texte long | oui |
| 8 | Demandeur | `Demandeur` | Ref:INTERLOCUTEURS | afficher `Nom_complet` | oui |
| 9 | Approbateur | `Approbateur` | Ref:INTERLOCUTEURS | afficher `Nom_complet` ; différent du demandeur | oui |
| 10 | Statut de la demande | `Statut_demande` | Choice | choix exact actuel : `Approuvée` | non, recommandé |

Ne mettre aucune formule permanente sur `Numero_version`, `Auteur`, `Date_version` ou `Statut_demande` : l'application écrit ces valeurs en une opération contrôlée. Lors de la première correction d'un compte rendu existant, elle crée automatiquement la version initiale n°1, puis la correction approuvée n°2, et actualise `REUNIONS.Compte_rendu`. `REUNIONS.Version_courante` n'est pas requise par le code actuel et peut rester absente. La règle « demandeur différent de l'approbateur » est contrôlée par le widget ; une règle d'accès Grist complémentaire pourra être ajoutée après la recette, mais n'est pas nécessaire au premier test.

## 12. AVANCEMENTS à renommer visuellement JOURNAL

Conserver l'identifiant technique de table `AVANCEMENTS` et changer seulement son titre visible en **JOURNAL**.

| # | Titre visible | ID technique | Type Grist | Réglage / choix | Obligatoire |
|---:|---|---|---|---|---|
| 1 | Projet | `Projet` | Ref:PROJETS | afficher `Nom_projet` | oui |
| 2 | Date de l'événement | `Date_evenement` | DateTime | colonne de données, sans formule ; écrite par le widget | oui |
| 3 | Type d'entrée | `Type_entree` | Choice | voir liste exacte ci-dessous | oui |
| 4 | Titre | `Titre` | Text | texte court | non, recommandé |
| 5 | Description | `Description` | Text | texte long ; contenu principal | oui |
| 6 | Table source | `Source_table` | Text | identifiant technique de la table d'origine | non, recommandé |
| 7 | ID source | `Source_id` | Int | identifiant de ligne dans la table source | non, recommandé |
| 8 | Auteur | `Auteur` | Text + initialisation | `user.Name`, nouveaux enregistrements uniquement | non, recommandé |
| 9 | Automatique | `Automatique` | Bool | défaut faux ; le widget écrit vrai pour les traces automatiques | oui |
| 10 | Créé le | `Cree_le` | DateTime + initialisation | `NOW()`, nouveaux enregistrements uniquement | non, recommandé |

Choix exacts conseillés dans `Type_entree` : `Avancement`, `Information`, `Changement de pilote`, `Changement d’objectif`, `Changement de statut`, `Clôture du projet`, `Réouverture du projet`, `Jalon franchi`, `Blocage levé`, `Vigilance levée`, `Décision prise`. Seuls `Avancement` et `Information` sont proposés à la saisie manuelle ; les autres sont écrits par l'application.

Ne pas mettre de formule permanente dans ces colonnes. `Date_evenement`, `Type_entree`, `Description`, `Source_table`, `Source_id` et `Automatique` doivent rester modifiables par le widget. Si la colonne existante s'appelle `Contenu`, la renommer techniquement en `Description` avant la recette, ou la conserver temporairement : le code sait lire les deux, mais le diagnostic V3 exige `Description` pour converger vers un schéma unique.

Après migration, masquer puis retirer les anciens pseudo-objets et leurs colonnes : `Prochaine_etape`, `Date_prochaine_etape`, `Point_vigilance`, `Difficulte_blocage`, `Decision_attendue`, `Entree_parent`, `Etat_entree`, `Decisionnaire`, ainsi que le pourcentage `Avancement`. Les prochaines étapes, vigilances, blocages et décisions vivent désormais dans leurs tables propres.

## 13. Tables techniques complémentaires

- `REUNIONS_VERSIONS` : voir section Réunions.
- `RELANCES_ATTENTES` : voir section Attentes externes.
- `SERVICES_MEMBRES` : seulement si nécessaire pour la relation plusieurs-à-plusieurs.
- Ne pas créer de table « Demandes au service » : utiliser ACTIONS avec `Statut=À attribuer`.
- Ne pas créer de table de résumé narratif ni de sélection manuelle pour Mon pilotage.
- Ajouter `Reunion_origine` (`Ref:REUNIONS`, facultative) à ACTIONS, ARBITRAGES_DECISIONS, JALONS, BLOCAGES, VIGILANCES et ATTENTES_EXTERNES afin que les conséquences créées depuis une réunion restent traçables comme de vrais objets.

## 14. Dépendances observées dans le dépôt

- Tous les widgets lisent `PROJETS`; `fiche-projet`, `dashboard` et `point-hebdomadaire` agrègent plusieurs tables.
- `actions` écrit actuellement `Type_action`, `Nature_action`, `Priorite`, `Controle_requis`, `Controle_effectue`, `Commentaire` : adapter le widget avant retrait.
- `reunions` peut créer des ACTIONS et ARBITRAGES et accepte trois identifiants de réunion d'origine : migrer vers un seul.
- `point-hebdomadaire` dépend explicitement des anciennes priorités, contrôles et `Point_hebdo` : remplacer par Mon pilotage avant retrait.
- `Type_interlocuteur` n'est plus lu ni écrit par les widgets V3 et peut être supprimé après sauvegarde du document.
- Les démonstrations contiennent encore `Point_vigilance`, `Priorite`, `CR_finalise`, champs de suites de réunion et anciens statuts.

## 15. Ordre d'exécution manuel conseillé

1. [ ] Sauvegarder et inventorier le schéma réel (y compris formules, vues et ACL).
2. [ ] Créer SERVICES, JALONS, BLOCAGES, VIGILANCES, ATTENTES_EXTERNES, RELANCES_ATTENTES et REUNIONS_VERSIONS.
3. [ ] Ajouter les nouvelles colonnes à PROJETS, INTERLOCUTEURS, ACTIONS, DÉCISIONS et JOURNAL.
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
