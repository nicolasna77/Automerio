# 04 · TRD : la stack et les services

Stack **figée**. Changer un outil ou ajouter une dépendance passe par un accord
explicite, jamais en cours de route.

## Un outil par besoin

| Besoin | Outil | Pourquoi |
|---|---|---|
| Framework | **Next.js 16** (App Router, Turbopack, Server Components et Actions), React 19, TypeScript | Rendu serveur, actions sans API à écrire, hébergement Vercel natif |
| Base de données | **PostgreSQL** via **Prisma 7** (`@prisma/adapter-pg`) | Relations fortes (organisations, solutions, usage), migrations versionnées |
| Authentification | **better-auth 1.6.23** : e-mail / mot de passe, Google, plugins `admin`, `organization`, `twoFactor`, `@better-auth/stripe` | Rôles, organisations et facturation dans une seule librairie |
| Paiement | **Stripe** : une Checkout Session par solution, abonnements, portail client, codes promo | Facturation à l'usage (dépassement) et TVA |
| Téléphonie | **Twilio** : numéros français, routage des appels, appel de démonstration, SMS aux clients finaux (expéditeur alphanumérique), rappel en un clic (appel sortant mis en relation) | Achat de numéros, SIP et SMS |
| Agent vocal | **OpenAI Realtime API (SIP)** | Faible latence au téléphone |
| Réponses aux messages | **OpenAI** (`openai`) | Même fournisseur que la voix |
| Messageries | **Meta** : WhatsApp Cloud API, Messenger, Instagram (webhooks, Embedded Signup) | Canaux des clients |
| Agenda | **Google Calendar** (OAuth), **Cal.com**, **Calendly** (clé API) | Les trois outils des clients |
| E-mails | **Resend** + React Email | Transactionnels et bilan hebdomadaire |
| Limitation de débit | **Upstash Redis** (`@upstash/ratelimit`) | Anti-abus réparti entre fonctions |
| Interface | **Tailwind CSS v4**, **shadcn** (style base-luma) sur **Base UI**, lucide-react, sonner, next-themes, recharts, react-day-picker | Voir `03-design.md` |
| Traduction | **next-intl** (français par défaut) | Aucun texte en dur |
| Tests | **Vitest** (unitaires), **Playwright** (bout en bout) | CI GitHub |
| Hébergement | **Vercel** (Fluid Compute, cron, Analytics, Speed Insights) | Déploiement et previews par PR |

## Services externes et limites

| Service | Coût / limite |
|---|---|
| Vercel | [À CONFIRMER : offre et limites] |
| Base PostgreSQL | [À CONFIRMER : hébergeur, offre, région] |
| Stripe | Commission par transaction [À CONFIRMER : taux] |
| Twilio | Numéro mensuel + minutes + SMS, inclus dans l'abonnement du client (non refacturés) [À CONFIRMER : prix par SMS] |
| OpenAI | Facturé au token / à la minute audio [À CONFIRMER] |
| Resend | [À CONFIRMER : offre, e-mails par jour] |
| Upstash | [À CONFIRMER : offre, requêtes par jour] |
| Meta, Google, Cal.com, Calendly | Gratuit côté Automerio ; comptes du client |

## Variables d'environnement (noms seulement)

Les valeurs vivent dans `.env` (jamais commité, jamais collé dans une
conversation). Liste de référence : `.env.example` ; vérification au démarrage :
`src/lib/env.ts`.

- Base et auth : `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`,
  `BETTER_AUTH_TRUSTED_ORIGINS`, `NEXT_PUBLIC_APP_URL`, `TOKEN_ENCRYPTION_KEY`
- Stripe : `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
  `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- OpenAI : `OPENAI_API_KEY`, `OPENAI_SIP_URI`, `OPENAI_WEBHOOK_SECRET`
- Twilio : `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_API_KEY_SID`,
  `TWILIO_API_KEY_SECRET`, `TWILIO_SMS_SENDER`, `DEMO_CALLER_NUMBER`
- Google : `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
  `GOOGLE_OAUTH_REDIRECT_URI`, `GOOGLE_OAUTH_STATE_SECRET`
- Meta : `WHATSAPP_APP_SECRET`, `WHATSAPP_WEBHOOK_VERIFY_TOKEN`,
  `WHATSAPP_ACCESS_TOKEN`, `NEXT_PUBLIC_META_APP_ID`,
  `NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID`,
  `NEXT_PUBLIC_META_MESSENGER_CONFIG_ID`, `INSTAGRAM_APP_ID`,
  `INSTAGRAM_APP_SECRET`, `INSTAGRAM_OAUTH_REDIRECT_URI`,
  `INSTAGRAM_OAUTH_STATE_SECRET`, `INSTAGRAM_COMMENT_REPLIES`
- Autres : `RESEND_API_KEY`, `UPSTASH_REDIS_REST_URL`,
  `UPSTASH_REDIS_REST_TOKEN`, `USAGE_EVENTS_API_KEY`, `CRON_SECRET`,
  `WAITLIST_MODE`

## Contraintes

- **Mobile d'abord** : utilisable dès 320 px, sans défilement horizontal.
- **Langue** : français (next-intl prêt pour d'autres langues).
- **Accessibilité** : WCAG 2.2 AA (contraste, focus visible, clavier, noms
  accessibles, « réduire les animations »).
- **Sécurité** :
  - chaque webhook vérifie sa signature (Twilio, OpenAI, Meta, Stripe) ou son
    état OAuth ;
  - jetons tiers chiffrés en base (`src/lib/encrypted-fields.ts`,
    `src/lib/secret-box.ts`) ;
  - origines approuvées pour better-auth (`src/lib/trusted-origins.ts`) ;
  - limitation de débit sur les actions sensibles ;
  - webhook sortant (`src/lib/outgoing-webhook.ts`) : https seulement, adresse
    résolue et refusée si une IP est privée (revérifiée à chaque envoi), pas
    de redirection suivie, 5 s au plus, corps signé HMAC SHA-256.
- **Server Actions** : renvoient un résultat (`runAction`, `actionError`) ; le
  client appelle `unwrap()` (le message d'erreur survit en production).
- **Accès** : données du tableau de bord scopées par l'organisation active ;
  rôle `ADMIN` vérifié dans le layout et dans chaque action admin.
- **CI** (`.github/workflows/ci.yml`) : `npm ci`, `npm install --dry-run`,
  `prisma generate`, `next typegen`, `tsc`, lint, Vitest, build, seed, Playwright.

## Interdits

- Ajouter une dépendance sans accord.
- Changer de base, d'ORM, d'auth, de fournisseur d'IA ou d'hébergeur.
- Écrire une clé, un secret ou un montant de prix en dur dans le code.
- Transmettre un montant depuis le client : le prix est lu dans `Service`.
- Utiliser Radix ou une autre librairie de composants que Base UI.
- Écrire un texte visible hors de `messages/fr.json`.
- Lire une donnée du tableau de bord par le seul `userId`.
- Utiliser l'Edge runtime (Node.js par défaut sur Vercel).

## Pièges connus

Voir `CLAUDE.md` (client Prisma périmé dans `next dev`, `prisma generate` après
`migrate dev`, `generateStaticParams` avec session, origine refusée par
better-auth, `npm ci` contre `npm install`, dossiers préfixés `_`).
