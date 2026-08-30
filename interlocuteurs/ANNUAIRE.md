# Annuaire municipal catégorisé

## Ce qui change

- Au chargement : les interlocuteurs internes actifs uniquement. Les externes ne sont pas rendus dans la grille initiale.
- Élus municipaux : maire en premier, adjoints classés par rang, conseillers délégués puis conseillers municipaux. Dans les autres cas, le classement est alphabétique par nom et prénom.
- Le rang ne classe que les adjoints. Il figure dans le formulaire de modification, jamais dans les cartes, les fiches de consultation ou la recherche. Un rang vide place l’adjoint après les adjoints dont le rang est renseigné. Les rangs identiques sont départagés alphabétiquement.
- Administration : DGS en tête, puis pôles. Chaque pôle présente son responsable et son éventuel adjoint, puis les services dépliables et leurs agents. Les services sont repliés au départ.
- Un agent présent dans plusieurs services peut apparaître dans plusieurs groupes ; chaque carte ouvre la même fiche. Les compteurs de personnes sont dédupliqués.
- Le responsable d’un service est placé en tête de sa liste d’agents.
- Les services sans pôle et les agents sans service restent accessibles dans des groupes de rattachements à compléter.
- Les interlocuteurs inactifs restent accessibles grâce au filtre État ; ils ne sont ni supprimés ni détachés de leur historique.

## Recherche

Le champ unique recherche le nom, le prénom, l’organisme, la fonction, la fonction d’élu, la délégation, les coordonnées, les services et les pôles. Les accents et les majuscules ne bloquent pas les recherches. Plusieurs mots peuvent correspondre à plusieurs de ces champs.

La recherche inclut les externes et ouvre les services correspondant aux personnes trouvées. Les filtres Profil et État restent applicables. Le bouton **Parcourir les contacts externes** permet de consulter les externes sans saisir de mot-clé.

**Réinitialiser** rétablit la vue initiale : internes actifs, recherche vide, services repliés et externes masqués. **Effacer la recherche** conserve les autres filtres choisis.

## Champs des élus

Au premier chargement après publication, le bandeau **Fonctions et délégations des élus** propose **Préparer les champs des élus** si nécessaire. L’adaptation demande confirmation, se fait une seule fois et ne s’exécute pas au chargement.

| Colonne Grist | Type | Utilisation |
| --- | --- | --- |
| `Fonction_elu` | Choice | Maire, Adjoint au maire, Conseiller délégué, Conseiller municipal |
| `Delegation` | Text | Domaine de responsabilité des adjoints et conseillers délégués |
| `Rang` | Int | Classement des adjoints ; zéro correspond à un rang non renseigné |

Les colonnes existantes de même nom sont contrôlées avant adaptation. Une formule ou un type incompatible bloque l’opération avant tout envoi. Les choix et options Grist personnalisés sont conservés lors de l’ajout des quatre choix proposés. L’adaptation n’infère aucun mandat à partir d’un nom ou d’une fonction libre.

Les champs apparaissent dans la catégorie **Mandat et délégation**, uniquement pour les élus internes. Délégation s’affiche pour les adjoints et conseillers délégués ; Rang uniquement pour les adjoints.

La colonne historique `Fonction` n’est pas effacée. Elle reste affichée pour un élu tant que `Fonction_elu` n’est pas renseignée. Pour les agents et les externes, elle reste le champ de fonction habituel.

Un seul maire actif peut être désigné depuis le widget. Un maire inactif reste conservé dans l’historique. Ce contrôle ne constitue pas une règle d’accès Grist et ne bloque pas les modifications directes dans les tables.

## Vérifications et limites

- Tests de règles et de compatibilité : `node --test commun/*.test.js interlocuteurs/*.test.js`.
- Les tests `annuaire-dom.test.js` nécessitent `jsdom` (testés avec 26.1.0). Ils sont ignorés explicitement si la bibliothèque est absente. On peut l’installer dans un environnement de test séparé et définir `JSDOM_PATH` vers son dossier ou utiliser une installation locale accessible à Node.
- Les tests de DOM exécutent le widget complet avec des personnes fictives et une API Grist simulée. Ils couvrent l’ajout des champs, la sauvegarde, la gestion des erreurs, la recherche et la visibilité du rang. Ils ne remplacent pas un contrôle visuel dans un navigateur.
- Les règles responsive prévoient une colonne sur téléphone et des grilles de deux ou trois colonnes sur les écrans plus larges. La validation visuelle réelle n’a pas pu être réalisée pour cette livraison : le module du navigateur de test était indisponible.
- Aucune donnée de production n’a été modifiée pendant les tests.

L’URL publique du widget reste `https://tride40.github.io/pilotage-grist/interlocuteurs/`. Après publication, ajouter `?v=annuaire-20260830` permet de demander une nouvelle lecture de la page dans Grist.
