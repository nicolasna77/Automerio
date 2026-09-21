# Automerio

## Description du projet

Automerio vend des automatisations IA clé-en-main à des artisans, coachs,
indépendants et TPE/PME en France : standard téléphonique IA (agent vocal qui
répond aux appels), prise de rendez-vous automatique, réponses e-mail
automatisées, génération de documents administratifs, etc.

Trois espaces :
- Site public (`/`, `/prestations/[slug]`, `/contact`) — landing page et
  catalogue, vitrine commerciale de l'agence.
- Tableau de bord client (`/dashboard`, rôle `CLIENT`) — un client peut avoir
  plusieurs entreprises (organisations), activer une même prestation
  plusieurs fois (ex. deux boutiques), payer via Stripe, suivre le statut de
  chaque prestation et contacter l'équipe (`/dashboard/aide`).
- Espace admin (`/admin`, rôle `ADMIN`) — supervision de tous les clients,
  gestion du catalogue, centre d'aide.

## Stack technique

- **Next.js 16** (App Router, Turbopack, Server Components/Actions), React 19, TypeScript
- **Prisma 7** + **PostgreSQL** (adapter `@prisma/adapter-pg`)
- **better-auth 1.6.23** — email/mot de passe, plugin `admin` (rôles,
  bannissement, réinitialisation de mot de passe), plugin `organization`
  (une organisation = une entreprise du client), `@better-auth/stripe`
- **Stripe** — une Checkout Session par prestation (frais de mise en place
  ponctuels et/ou abonnement mensuel, indépendamment optionnels) ; le
  montant est toujours lu depuis la table `Service` côté serveur, jamais
  transmis par le client
- **Twilio** — achat de numéros de téléphone français, routage des appels entrants
- **OpenAI Realtime API (SIP)** — l'agent vocal IA qui décroche les appels des clients
- **Google Calendar (OAuth)** — connexion de l'agenda du client pour la prise de rendez-vous automatique
- **Tailwind CSS v4** + **shadcn** (style « base-luma ») sur des primitives
  **Base UI** (`@base-ui/react`) — pas Radix ; attention à `nativeButton` sur
  `Button`/`SheetClose` quand on les fait rendre un élément non-`<button>`
  (ex. `render={<Link .../>}`)
- lucide-react (icônes), sonner (toasts), next-themes (thème clair/sombre), recharts (graphiques)

## Architecture

- `src/app/(auth)` — connexion / inscription
- `src/app/admin` — espace équipe (rôle `ADMIN` vérifié dans le layout **et**
  dans chaque Server Action séparément, une action n'hérite pas de l'auth du layout)
- `src/app/dashboard` — espace client, toutes les données sont scopées par
  l'organisation active (`requireActiveOrganization`), jamais par le seul `userId`
- `src/app/api` — webhooks externes (Twilio, OpenAI, Stripe via better-auth,
  callback OAuth Google Calendar), tous avec vérification de signature/état,
  et routes consultées en polling par le dashboard client
- `src/lib` — logique métier partagée (catalogue, session, organisation,
  intégrations tierces, agent vocal)
- `src/components/ui` — primitives shadcn/Base UI ; `src/components` — composants applicatifs partagés

## Pièges connus

Ceux qui se déguisent en bugs de code alors qu'ils n'en sont pas — chacun a
déjà coûté du temps, tous sont vérifiés.

- **Client Prisma périmé dans `next dev`.** Après toute modification de
  `prisma/schema.prisma`, `prisma generate` écrit un nouveau client sur le
  disque, mais un serveur de développement déjà lancé garde l'ancien en
  mémoire : Node ne recharge pas `node_modules` à chaud. Symptôme :
  `Cannot read properties of undefined (reading 'findMany')` sur un modèle
  qui vient d'être ajouté, alors que le build de production fonctionne.
  **Il faut redémarrer `next dev`.** Sur Windows, `pkill` échoue sur le
  processus tenu par l'IDE ; utiliser `taskkill //PID <pid> //F` après
  `netstat -ano | grep ":3000"`.

- **Prisma 7 : `migrate dev` ne régénère plus le client.** La migration
  s'applique à la base, mais les types restent ceux d'avant : `tsc` signale
  des champs ou des valeurs d'énumération « inexistants » alors qu'ils sont
  bien dans le schéma et dans la base. Lancer `npx prisma generate` après
  chaque `migrate dev`, puis redémarrer `next dev` (piège précédent) — dans
  cet ordre, sinon le serveur recharge l'ancien client.

- **`generateStaticParams` sur une page qui lit la session.** Une page
  appelant `getSession()` lit les en-têtes de la requête : elle ne peut pas
  être rendue à l'avance. Si `generateStaticParams` ne renvoie aucun
  paramètre — base vide, premier déploiement, preview sur une base neuve —
  Next ne rend jamais la page au build, n'y voit donc pas l'appel dynamique,
  classe la route comme statique, et chaque requête répond 500 (« Page
  changed from static to dynamic at runtime, reason: headers »). Invisible en
  développement, où la base est peuplée.

- **better-auth refuse une origine inattendue.** Le serveur répond 403
  « Invalid origin » quand l'origine de la page n'est pas dans ses
  `trustedOrigins` — d'où la variable passée au serveur de test dans
  `playwright.config.ts`. Traître en production : seules les requêtes qui
  portent un cookie de session sont contrôlées, si bien qu'une connexion
  Google réussit et que tout ce qui suit échoue (changer d'organisation, se
  déconnecter…). `src/lib/trusted-origins.ts` accepte donc les domaines Vercel
  du projet et `BETTER_AUTH_TRUSTED_ORIGINS`. Le client
  (`src/lib/auth-client.ts`) ne fixe volontairement aucune `baseURL` : il
  vise l'origine de la page, sans quoi les previews Vercel échouent en CORS,
  silencieusement.

- **Une Server Action qui lève une erreur perd son message en production.**
  React remplace le message par « Minified React error #441 » : en
  développement tout s'affiche, en production le client ne voit qu'un code.
  Les actions renvoient donc un résultat (`runAction` dans
  `src/lib/run-action.ts`, erreurs destinées au client levées en
  `ActionError`) et le composant appelle `unwrap()` de
  `src/lib/action-result.ts`, qui relance le message côté client.

- **`npm ci` en CI, `npm install` sur Vercel.** Un lockfile peut satisfaire
  `npm ci` et être refusé par `npm install`, qui rejoue la résolution et
  bloque sur un conflit de peer dependency. La CI vérifie donc aussi
  `npm install --dry-run`.

- **Dossiers préfixés `_` dans l'App Router.** Ils sont privés : aucune route
  n'est créée, l'URL renvoie la page 404.

## Skills recommandées

Skills du plugin officiel (disponibles globalement dans Claude Code) :
- **frontend-design** — refonte visuelle UI/UX (site public, composants dashboard/admin)
- **feature-dev** — nouvelle fonctionnalité non triviale (recherche du code
  existant → questions de clarification → choix d'architecture → implémentation → revue)
- **code-review** (`/code-review ultra` ou l'alias `/ultrareview`) — revue
  multi-agent de la branche courante ou d'une PR GitHub
- **code-simplifier** — simplifier/refactorer du code existant sans changer son comportement
- **context7** — documentation à jour des librairies (Next.js, Prisma,
  better-auth, Stripe...) à préférer à la mémoire du modèle pour toute API récente
- **github** / **pr-review-toolkit** — travail lié aux PR/issues ; le dépôt
  est sur `nicolasna77/Noveris`, et la CI (`.github/workflows/ci.yml`) y joue
  types, lint, tests unitaires (Vitest), build et parcours de bout en bout
  (Playwright)
- **vercel** — déploiement et observabilité si l'app est hébergée sur Vercel

Skills installées spécifiquement pour ce projet (`.claude/skills/`, orientées
contenu/marketing du site public) : **landing-page-copywriter**,
**copywriting**, **copy-editing**, **ad-creative**, **ai-seo**,
**ab-testing**, **co-marketing** — pertinentes pour la page d'accueil,
`/contact`, les pages `/prestations/[slug]` et toute itération marketing.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
