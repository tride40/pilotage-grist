# Navigation en mode application

Raccourci des agents :
https://grist.numerique.gouv.fr/o/docs/f8iwcexDATAw/Pilotage-des-projets/p/16?style=singlePage

Les liens des pages actives ouvrent les pages Grist avec `style=singlePage`, y compris les retours Accueil. Ce mode reste éditable selon les droits existants. Ne pas utiliser `embed=true`, qui active la lecture seule. Ne pas publier le document ni élargir les permissions pour masquer l’interface.

Les URL de l’administration restent accessibles sans ce paramètre. Le mode applicatif n’est pas une mesure de sécurité : les règles d’accès Grist restent applicables. La connexion et le petit titre du widget Grist peuvent rester visibles. La fenêtre du navigateur dépend du raccourci installé sur le poste.

## Maintenance

- Déclarer les nouvelles destinations dans `commun/navigation.js` et charger ce module avant le code de la page.
- Utiliser `PilotageNavigation.pageUrl()` pour les destinations dynamiques ; ajouter `?style=singlePage` aux liens HTML fixes, avec `target="_top"`.
- Conserver les boutons Accueil et les retours contextuels. Ne pas ouvrir une URL GitHub Pages seule pour une page nécessitant les données Grist.
- La fiche projet ouvre Mon espace (page 37, toutes les actions autorisées, sans nouveau filtre projet) ou les réunions (page 11). Le projet des réunions est transmis dans la même fenêtre, une seule fois, avec une expiration d’une minute. Si le stockage est indisponible, le sélecteur permet de choisir le projet.
- Les démonstrations restent distinctes de l’application réelle.
- Les anciennes pages d’actions et de tâches, destinées au retrait, ne sont pas réaménagées.

## Vérification avant distribution

Avec un compte propriétaire puis un compte agent : Accueil → Tableau de bord → Fiche projet → Réunions → Fiche projet → Accueil ; Accueil → Mon espace → Coordination / Mon travail → Accueil ; Accueil → Interlocuteurs → Accueil ; Accueil → Mon pilotage → Accueil. Vérifier l’identité, les autorisations habituelles et la conservation du mode à chaque changement de page. Aucun droit ni aucune donnée métier n’est modifié par cette livraison.
