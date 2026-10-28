# 06 · Plan d'implémentation : quoi construire, dans quel ordre

## Comment l'utiliser

- **Une étape par session**, jamais plus. Avant de commencer : résumer en cinq
  lignes ce qui sera fait et ce qui ne sera pas touché.
- Respecter `01-prd.md` à la lettre ; une fonctionnalité qui semble manquer va
  dans `.claude/rules/a-discuter.md`, pas dans le code.
- Une étape = une branche et une PR **vers `preview`**, jamais directement
  vers `main` ; revue (`code-review`, et `interface-review` si l'interface
  change) ; CI verte avant de fusionner. `preview` sert à la preview Vercel
  (automerio-git-preview-netgenius.vercel.app) ; `main` (production) ne
  reçoit `preview` que sur demande explicite.
- Les étapes terminées sont **figées** : changer une chose finie passe par une
  nouvelle étape.
- Les documents changent **avant** le code : on met à jour `01` à `05`, puis ce
  plan, puis on code.

## Déjà construit (figé)

Socle, design system, authentification (2FA, Google), organisations et rôles,
catalogue et activation avec Stripe, téléphonie (Twilio + OpenAI Realtime),
messageries Meta, agendas (Google, Cal.com, Calendly), conversations et reprise
en main, quota et dépassement, pause manuelle, tableau de bord, réglages,
facturation, aide, notifications, bilan hebdomadaire, espace admin, audit,
marketing, pages légales, accueil et pages solution.

## Étapes à venir

### 1. Mise en production sûre des jetons chiffrés
- Définir `TOKEN_ENCRYPTION_KEY` sur Vercel ; lancer
  `npx tsx scripts/encrypt-integration-tokens.ts --dry-run`, puis pour de vrai.
- Activer la 2FA sur les comptes `ADMIN`.
- **Vérif** : une solution WhatsApp existante répond toujours à un message ; en
  base, le jeton n'est plus lisible en clair.

### 2. Préproduction à accès restreint
- Choisir : lien Vercel partageable, ou `staging.automerio.com` avec mot de
  passe applicatif dans `src/proxy.ts` [À CONFIRMER : option retenue].
- **Vérif** : la préproduction s'ouvre avec le lien ou le mot de passe, et
  refuse sans.

### 3. Conformité RGPD (PR #170, brouillon)
- Compléter l'hébergeur et la région de la base dans `src/lib/legal.ts`.
- Purge automatique des messages de contact et de la liste d'attente à 3 ans.
- Corriger les écarts listés dans la PR.
- **Vérif** : la page `/privacy` ne contient plus « à compléter » ; une entrée de
  test de plus de 3 ans disparaît après le passage du cron.

### 4. PR ouvertes à trancher
- #150 statut « À finaliser » et volume dans le récapitulatif ; #162 quota du
  catalogue pour les anciens abonnements de messagerie ; #164 prix de référence
  dans la documentation [À CONFIRMER : fusionner, reprendre ou fermer].
- **Vérif** : chaque PR est fusionnée avec CI verte, ou fermée avec sa raison.

### 5. Organisation : logo et description (PR #182)
- Téléversement du logo (colonne `organization.logo` déjà présente), description
  de l'activité ; réservé aux responsables ; logo dans le sélecteur
  d'organisation et dans l'admin.
- Mettre à jour `05-backend.md` (stockage du fichier, région) avant le code.
- **Vérif** : je téléverse un logo, il apparaît dans la barre latérale ; un
  membre simple ne voit pas le formulaire.

### 6. Page Profil (PR #184)
- Sections Profil / Sécurité / Notifications / Données ; photo de profil ;
  sessions actives et déconnexion des autres appareils.
- **Vérif** : je change ma photo, je déconnecte une autre session ; un compte
  Google sans mot de passe n'a pas de champ « mot de passe actuel ».

### 7. Solutions « Plus tard » du catalogue
- Une à la fois, dans l'ordre décidé [À CONFIRMER] : réponses aux e-mails,
  prise de rendez-vous en ligne, résumés PDF et réunions, OCR.
- Chacune commence par son PRD (`01-prd.md`), son parcours (`02-app-flow.md`) et
  ses données (`05-backend.md`).
- **Vérif** : définie au moment de l'étape, testable dans le navigateur.

## Ce qu'on ne touche pas sans étape dédiée

- La stack (`04-trd.md`) et la logique de facturation (`src/lib/overage-billing.ts`,
  `src/lib/usage-cap.ts`, `src/lib/stripe-webhooks.ts`).
- Les règles d'accès (`src/lib/client-service-access.ts`, layouts admin).
- La vérification des signatures de webhooks.
- `DESIGN.md` et les jetons de `globals.css`.

## Vérifications communes à chaque étape

- `npx tsc --noEmit`, `npm run lint`, `npm test`.
- Interface : build de production (`npx next build`, puis `next start --port
  3100`), car `next dev` sert parfois des styles périmés ; contrôle à 390 px et
  1280 px, thème clair et sombre.
- Parcours touchés : `npx playwright test <fichier> --workers=1`.
