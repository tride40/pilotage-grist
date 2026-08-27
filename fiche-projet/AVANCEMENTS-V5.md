# Schéma AVANCEMENTS attendu par Fiche projet V5

La V5 inspecte les métadonnées Grist avant chaque écriture et exclut toute colonne calculée.

## Colonnes minimales recommandées

| ID technique | Type Grist | Rôle |
| --- | --- | --- |
| `Projet` | Référence vers `PROJETS` | Projet auquel appartient l’entrée |
| `Date_MAJ` | Date | Date de l’événement |
| `Type_entree` | Choix | Types métier du journal |
| `Contenu` | Texte multiligne | Réponse à « Qu’est-ce qui a changé ? » |
| `Entree_parent` | Référence vers `AVANCEMENTS` | Relie une résolution à l’entrée initiale |
| `Etat_entree` | Choix | `Ouvert` ou `Résolu` |
| `Decisionnaire` | Référence vers `INTERLOCUTEURS` | Personne appelée à décider |
| `Cree_le` | Date et heure | Horodatage automatique immuable utilisé pour départager les entrées d’une même date |

Ces colonnes doivent être des colonnes de saisie, sans formule. `Projet`, `Date_MAJ` et une colonne de contenu reconnue sont bloquantes. Pour rester compatible avec l’ancien modèle, la V5 accepte aussi `Type`, ainsi que `Fait_marquant`, `Travail_realise` ou `Commentaire` comme colonne de contenu, mais `Type_entree` et `Contenu` sont les IDs à privilégier.

## Choix de `Type_entree` pour la V6

- `Avancement`
- `Information`
- `Prochaine étape`
- `Étape franchie`
- `Vigilance`
- `Vigilance levée`
- `Blocage`
- `Déblocage`
- `Décision attendue`
- `Décision prise`

Les trois types de résolution sont créés par les actions contextuelles de la timeline. Ils ne sont pas proposés dans le formulaire d’ajout principal.

## Ordre du journal en V8

Le journal est toujours trié par `Date_MAJ` décroissante, puis par `Cree_le` décroissante lorsque plusieurs entrées partagent la même date. L’identifiant Grist décroissant sert uniquement de repli pour les anciennes lignes sans horodatage. Les recherches et filtres ne changent jamais cet ordre.

## Colonnes existantes utilisées si elles sont éditables

- `Avancement` (Numérique)
- `Travail_realise` (Texte)
- `Prochaine_etape` (Texte)
- `Difficulte_blocage` (Texte)
- `Decision_attendue` (Texte)
- `Point_vigilance` (Texte)
- `Commentaire` (Texte)
- `Saisi_par` (Référence vers `INTERLOCUTEURS`) : affiché seulement si déjà renseigné par une source fiable ; la V5 ne le devine pas.

## Diagnostic du défaut V4

La V4 filtrait silencieusement les champs absents ou non éditables, puis n’ajoutait une ligne que si plus de deux champs survivaient au filtrage. Elle pouvait donc mettre à jour `PROJETS` sans écrire dans `AVANCEMENTS`, sans signaler que la référence, la date ou le contenu n’étaient pas reconnus. La V5 valide ces colonnes avant l’action et affiche l’erreur exacte dans le dialogue.
