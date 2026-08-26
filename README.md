# Pilotage Grist

Widgets personnalisés pour le document Grist « Pilotage des projets ». Le code publié ne contient aucune donnée réelle de la collectivité : les informations sont lues depuis Grist à l'exécution.

## Widgets disponibles

- `dashboard/` : tableau de bord général en lecture seule, avec KPI, filtres et recherche.
- `fiche-projet/` : fiche détaillée du projet sélectionné dans la table `PROJETS`.

Les fichiers `demo-data.js` ne sont activés que sur `localhost`, hors iframe, avec le paramètre `?demo=1`. Ils ne sont jamais utilisés dans un widget intégré à Grist.

## Structure

- `commun/` : thème et composants visuels partagés.
- `dashboard/` et `fiche-projet/` : widgets fonctionnels, séparés en HTML, CSS et JavaScript.
- `reunions/`, `interlocuteurs/`, `consignes/`, `actions/`, `point-hebdomadaire/` : emplacements réservés aux futurs widgets.
- `index.html` : accueil technique des widgets publiés.

## Utilisation dans Grist

Après publication, ajoutez un widget personnalisé puis utilisez l'URL du dossier voulu, par exemple `https://<compte>.github.io/pilotage-grist/dashboard/`. Autorisez l'accès complet au document lorsque Grist le demande ; les widgets restent en lecture seule.

## Publication

Le workflow `.github/workflows/pages.yml` déploie automatiquement la branche `main` sur GitHub Pages. Aucun secret, jeton ou fichier `.env` ne doit être ajouté au dépôt.
