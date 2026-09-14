# Automerio

Site d'agence pour Automerio : déploiement d'automatisations d'intelligence
artificielle pour artisans, coachs, indépendants et TPE/PME. Landing page
publique, inscription/connexion, tableau de bord client (activation de
prestations avec paiement Stripe) et espace admin (supervision de tous les
clients).

## Stack

- **Next.js 16** (App Router, TypeScript, Turbopack)
- **shadcn/ui** (Base UI), thème par défaut, sans surcharge
- **Prisma 7** + **PostgreSQL** (adapter `@prisma/adapter-pg`)
- **Better Auth** (email/mot de passe) + **`@better-auth/stripe`** pour tous
  les paiements (abonnement et prestations ponctuelles), un seul webhook :
  `/api/auth/stripe/webhook`

## Prérequis

- Node.js ≥ 20.19 (ou ≥ 22.13)
- Docker (pour PostgreSQL local)
- [Stripe CLI](https://docs.stripe.com/stripe-cli) pour tester les paiements en local
- Un compte Stripe en mode test

## Installation

```bash
npm install
docker compose up -d          # démarre PostgreSQL sur le port 5433
```

Renseignez dans `.env` :

- `STRIPE_SECRET_KEY` : clé secrète de test (`sk_test_...`)
- `STRIPE_WEBHOOK_SECRET` : voir section Stripe CLI ci-dessous
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` : clé publique de test (`pk_test_...`)

Puis :

```bash
npm run db:migrate    # applique les migrations Prisma
npm run db:seed       # peuple le catalogue (18 prestations + maintenance)
npm run stripe:setup  # crée le produit/prix Stripe de l'abonnement Maintenance
                       # -> copiez le price_id affiché dans STRIPE_MAINTENANCE_PRICE_ID (.env)
npm run dev            # http://localhost:3000
```

## Créer un compte administrateur

Le rôle `ADMIN` ne peut jamais être choisi à l'inscription (champ non
exposable côté client dans Better Auth). Pour promouvoir un compte existant :

```bash
npm run make-admin -- admin@automerio.fr
```

## Tester les paiements Stripe en local

Dans un terminal séparé, lancez le webhook du plugin Better Auth Stripe avec
la Stripe CLI :

```bash
stripe login
npm run stripe:listen
```

La commande affiche un secret `whsec_...` : copiez-le dans
`STRIPE_WEBHOOK_SECRET` (`.env`) puis redémarrez `npm run dev`.

Utilisez une carte de test Stripe (`4242 4242 4242 4242`, toute date future,
tout CVC) pour valider un paiement depuis le tableau de bord client.

## Variables d'environnement

| Variable | Description |
|---|---|
| `DATABASE_URL` | Connexion PostgreSQL |
| `BETTER_AUTH_SECRET` | Secret de signature des sessions Better Auth |
| `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL` | URL de base de l'application |
| `STRIPE_SECRET_KEY` | Clé secrète Stripe (test) |
| `STRIPE_WEBHOOK_SECRET` | Secret du webhook (`stripe listen` ou dashboard) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Clé publique Stripe |
| `STRIPE_MAINTENANCE_PRICE_ID` | Price ID Stripe de l'abonnement Maintenance (`npm run stripe:setup`) |

## Modèle de données

- `User`, `Session`, `Account`, `Verification` — générés par Better Auth
- `Subscription` — généré par `@better-auth/stripe`, suit les abonnements
  (utilisé pour la Maintenance mensuelle)
- `Service` — catalogue des 18 prestations ponctuelles + l'abonnement
  Maintenance (nom, description, catégorie, prix, champs de configuration)
- `ClientService` — association client ↔ prestation activée (statut :
  `PENDING_PAYMENT` / `ACTIVE` / `CANCELED`, configuration en JSON, références
  Stripe)

Le schéma Prisma est régénéré pour les modèles Better Auth via :

```bash
npx @better-auth/cli generate --config src/lib/auth.ts --output prisma/schema.prisma
```

(`Service` et `ClientService` ont été ajoutés manuellement par-dessus et ne
doivent pas être écrasés par cette commande sans les reporter.)

## Paiements : ponctuels vs abonnement

- **Maintenance mensuelle** : plan Better Auth Stripe classique
  (`authClient.subscription.upgrade({ plan: "maintenance", ... })`), géré
  entièrement par le plugin.
- **Les 18 autres prestations** (paiement unique) : le plugin
  `@better-auth/stripe` est conçu pour des abonnements, sa gestion de
  paiement ponctuel dans cette version ne couvrait pas ce cas ; l'app crée
  donc directement une Checkout Session en mode `payment` via le
  `stripeClient` exposé par le plugin (`src/app/dashboard/actions.ts`), et
  s'appuie sur le **même** webhook centralisé du plugin
  (`onEvent` dans `src/lib/auth.ts`) pour marquer la prestation `ACTIVE` —
  aucune logique de paiement dupliquée en dehors de Better Auth.

## Routes

- `/` — landing page publique
- `/login`, `/signup` — authentification
- `/dashboard` — catalogue, activation, statuts (rôle `CLIENT`)
- `/admin` — KPIs globaux, liste des clients et de leurs prestations (rôle `ADMIN`, vérifié côté serveur)
