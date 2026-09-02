# Pilotage Grist

Widgets personnalisés pour le document Grist « Pilotage des projets ». Le code publié ne contient aucune donnée réelle de la collectivité : les informations sont lues depuis Grist à l'exécution.

## Widgets disponibles

- `accueil/` : page d’entrée ergonomique vers tous les outils du document Grist.
- `dashboard/` : tableau de bord général en lecture seule, avec KPI, filtres et recherche.
- `fiche-projet/` : fiche détaillée du projet sélectionné dans la table `PROJETS`.
- `reunions/` : agenda et historique des réunions du projet sélectionné.
- `diagnostic-v3/` : contrôle en lecture seule du schéma Grist avant la recette et la publication de la V3.

Les fichiers `demo-data.js` ne sont activés que sur `localhost`, hors iframe, avec le paramètre `?demo=1`. Ils ne sont jamais utilisés dans un widget intégré à Grist.

## Structure

- `commun/` : thème et composants visuels partagés.
- `dashboard/`, `fiche-projet/` et `reunions/` : widgets fonctionnels, séparés en HTML, CSS et JavaScript.
- `interlocuteurs/`, `actions/`, `point-hebdomadaire/` : widgets de gestion et de synthèse ; le dossier historique `point-hebdomadaire/` affiche désormais « Mon pilotage » afin de préserver son URL Grist.
- `index.html` : accueil technique des widgets publiés.

La configuration des six liens de l'accueil est expliquée dans [`accueil/README.md`](accueil/README.md).

## Utilisation dans Grist

Après publication, ajoutez un widget personnalisé puis utilisez l'URL du dossier voulu, par exemple `https://<compte>.github.io/pilotage-grist/dashboard/`. Autorisez l'accès complet au document lorsque Grist le demande ; les widgets restent en lecture seule.

## Publication

Le workflow `.github/workflows/pages.yml` déploie automatiquement la branche `main` sur GitHub Pages. Aucun secret, jeton ou fichier `.env` ne doit être ajouté au dépôt.
