# Schéma AVANCEMENTS attendu par Fiche projet V5

La V5 inspecte les métadonnées Grist avant chaque écriture et exclut toute colonne calculée.

## Colonnes minimales recommandées

| ID technique | Type Grist | Rôle |
| --- | --- | --- |
| `Projet` | Référence vers `PROJETS` | Projet auquel appartient l’entrée |
| `Date_MAJ` | Date | Date de l’événement |
| `Type_entree` | Choix | `Avancement`, `Information`, `Étape franchie`, `Vigilance`, `Blocage`, `Décision attendue` |
| `Contenu` | Texte multiligne | Réponse à « Qu’est-ce qui a changé ? » |

Ces quatre colonnes doivent être des colonnes de saisie, sans formule. `Projet`, `Date_MAJ` et une colonne de contenu reconnue sont bloquantes. Pour rester compatible avec l’ancien modèle, la V5 accepte aussi `Type`, ainsi que `Fait_marquant`, `Travail_realise` ou `Commentaire` comme colonne de contenu, mais `Type_entree` et `Contenu` sont les IDs à privilégier.

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
