# Mode test temporaire

Sur l’accueil, activer « Mode test » puis choisir un interlocuteur actif (interne ou externe). Chaque changement recharge l’accueil ; les autres widgets déjà ouverts demandent une actualisation. Un bandeau permanent identifie la simulation et permet de la quitter. Quitter recharge la page et rétablit l’identification réelle normale.

La sélection est stockée localement, pour cette application et son document configuré, dans le navigateur. Elle est partagée entre les onglets de la même origine, pas entre les utilisateurs ou appareils. Aucun changement de compte Grist, de droit, de table ou de profil n’est réalisé. Les permissions restent celles du compte réellement connecté ; une vue filtrée par les règles d’accès Grist n’est donc pas simulée. Terminer les opérations en cours avant d’activer le mode et recharger tous les widgets après publication (une ancienne version déjà ouverte ne possède pas le garde).

Les vues communes restent communes : en particulier le widget point-hebdomadaire/« Mon pilotage » agrège actuellement tous les projets actifs et n’applique aucun filtre personnel. Le mode ne crée pas de nouvelles règles de visibilité métier. L’identité simulée est fournie au résolveur partagé pour les widgets qui le consomment.

Toutes les écritures métier des widgets passent par `PilotageTestMode.applyUserActions`, qui contrôle le stockage juste avant l’appel. Les créations, modifications, suppressions, changements d’ordre et adaptations de schéma sont refusés. Les formulaires et principaux boutons de mutation sont également interceptés. Ce garde est une protection de l’interface, pas un mécanisme de sécurité Grist contre une personne qui modifie le JavaScript ou utilise directement les tables Grist.

L’identification simulée ne crée aucune ligne dans CONTEXTE_UTILISATEUR. L’identification réelle conserve son mécanisme technique normal. Une opération déjà envoyée avant l’activation n’est pas annulée. Un ancien widget conservant une identité simulée reste verrouillé après la sortie jusqu’à son rechargement. Stockage corrompu/interdit, choix absent, contact inactif ou inaccessible : aucun repli vers une écriture sous l’identité réelle. Le choix doit être corrigé ou le mode quitté.

Le bandeau est conservé à l’impression. Pas de date d’expiration silencieuse : seul « Quitter le mode test » désactive la sélection. Si les contextes de widgets n’autorisent pas le stockage partagé, le test n’est pas pris en charge dans ce navigateur ; ne pas considérer des widgets sans bandeau comme simulés.

Tests : `node --test commun/*.test.js accueil/*.test.js dashboard/*.test.js interlocuteurs/*.test.js` avec jsdom disponible via JSDOM_PATH. Les tests sont des tests de logique/DOM et ne reproduisent pas l’authentification ni les permissions réelles de Grist.
