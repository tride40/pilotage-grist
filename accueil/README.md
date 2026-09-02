# Accueil de Pilotage Grist

Le widget `accueil` sert de porte d’entrée vers les six pages métier du même document Grist. Il ne lit ni ne modifie aucune donnée.

## Configurer les liens Grist

Pour chaque page à relier :

1. Ouvrir la page voulue dans le document Grist.
2. Copier l’adresse complète affichée par le navigateur. Elle contient l’identifiant du document et celui de la page.
3. Ouvrir `accueil/app.js` et coller cette adresse dans la valeur correspondante de `PAGE_URLS`, entre les guillemets.

Correspondances : `dashboard` = Tableau de bord, `project` = Fiche projet, `meetings` = Réunions, `actions` = Mon espace, `contacts` = Interlocuteurs et `weekly` = Mon pilotage.

Exemple fictif :

```js
const PAGE_URLS = Object.freeze({
  dashboard: "https://docs.getgrist.com/abc123/p/4",
  project: "https://docs.getgrist.com/abc123/p/7",
  meetings: "https://docs.getgrist.com/abc123/p/9",
  actions: "https://docs.getgrist.com/abc123/p/13",
  contacts: "https://docs.getgrist.com/abc123/p/15",
  weekly: "https://docs.getgrist.com/abc123/p/17",
});
```

Une adresse vide ou invalide laisse la carte visible avec le badge « Lien à configurer ». Les liens valides sont de vrais liens HTML ouverts avec `target="_top"`, afin de sortir de l’iframe du widget et d’afficher la page Grist dans le même onglet.

## Installer et prévisualiser

Dans Grist, ajouter un widget personnalisé avec l’adresse `https://tride40.github.io/pilotage-grist/accueil/?v=1`. Le widget ne demande aucun accès aux données.

Pour une démonstration hors Grist, ouvrir `accueil/?v=1&demo=1`. Dans ce mode uniquement, les cartes pointent vers les pages publiques des widgets du dépôt.
