## Tests Playwright de bout en bout

Ce dossier ajoute un smoke/crawl complet Playwright pour cartographier le site, valider la navigation, les ressources, l’accessibilité basique et générer un rapport JSON + HTML.

### Pré-requis
- Node.js installé
- Dépendances dev : `npm install`
- Playwright (drivers) : `npx playwright install`

### Commandes principales
- `npm run test:full-site` : crawl + checks complets (toutes les pages découvertes, multi-navigateurs définis dans `playwright.config.ts`).
- `npm run test:navigation` : filtre uniquement les tests tagués navigation.
- `npm run test:forms` : filtre les tests formulaires.
- `npm run test:performance` : filtre les tests performance.
- `npm run test:debug` : lance en mode debug Playwright (`PWDEBUG=1`).
- `npm run report:generate` : regénère le rapport HTML/JSON à partir du dernier run (appelé aussi en fin de test).

### Variables d’environnement utiles
- `SITE_BASE_URL` : URL de base du site (défaut `http://localhost:3000`).
- `SITE_MAX_PAGES` : nombre max de pages à crawler (défaut `50`).
- `SITE_DELAY_MS` : délai entre requêtes pour limiter le rate limit (défaut `250` ms).
- `EXCLUDE_PATTERNS` : patterns séparés par des virgules à exclure du crawl (ex: `/admin,/api,/static`).
- `SITE_SAME_ORIGIN=false` : pour autoriser les liens inter-domaines.
- `SITE_SCREENSHOT_ON_ISSUE=false` : pour désactiver les captures auto sur erreurs.

### Sorties
- `test-results/full-site-report.json` : rapport structuré.
- `test-results/full-site-report.html` : rapport lisible.
- `test-results/screenshots/` : captures des pages en erreur (si activé).

### Structure des fichiers
- `playwright.config.ts` : configuration globale (projects Chromium/Firefox/WebKit, timeouts, reporter).
- `tests/full-site-test.spec.ts` : scénario principal (crawl + inspection).
- `utils/test-helpers.ts` : utilitaires (crawl BFS, collecte d’erreurs, checks visuels/A11y/perf).
- `utils/report-generator.ts` : génération des rapports JSON/HTML.

### Bonnes pratiques
- Les tests sont en lecture seule (aucune soumission de formulaire en production). Pour tester les soumissions, ajoutez des comptes de test et des flags de mode bac à sable.
- Adaptez `EXCLUDE_PATTERNS` pour ne pas crawler les routes admin/sensibles.
- Si le site nécessite un login, ajoutez un hook d’authentification (fixture Playwright) et stockez les cookies avant le crawl.
- Ajustez `SITE_MAX_PAGES` pour éviter de surcharger le site en production.***
