# Utilisateurs et accès

Widget d’administration des comptes applicatifs. `INTERLOCUTEURS` reste la source unique des noms, fonctions, coordonnées et rattachements organisationnels. Le widget ne crée ou ne modifie dans `PILOTAGE_COMPTES` que `Email`, `Interlocuteur`, `Actif` et, lorsqu’elle existe, `Administrateur`.

L’URL à utiliser dans un widget personnalisé Grist est `https://tride40.github.io/pilotage-grist/utilisateurs-acces/`, avec accès complet au document. La page est réservée à un compte actif dont `PILOTAGE_COMPTES.Administrateur` vaut vrai.

L’invitation comme Éditeur reste une opération de partage Grist : le widget la rappelle explicitement mais ne conserve aucun jeton d’administration et ne tente pas de modifier le partage du document.
