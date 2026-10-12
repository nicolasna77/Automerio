# 05 · Back-end : les données, où elles vivent, qui y accède

Source de vérité : `prisma/schema.prisma`. Ce fichier est mis à jour **avant**
toute nouvelle table ou colonne.

## Principes d'accès

- Le serveur seul lit et écrit la base (Prisma) ; aucun accès direct depuis le
  navigateur.
- Tableau de bord : toute lecture passe par l'organisation active
  (`requireActiveOrganization`) et `canReadClientService` ; les actions de
  facturation et de connexion exigent un responsable (`requireBillingRoleOn`).
- Admin : rôle `ADMIN` vérifié dans le layout **et** dans chaque Server Action.
- Webhooks : signature vérifiée avant toute écriture.
- Jetons tiers chiffrés (`TOKEN_ENCRYPTION_KEY`, `src/lib/encrypted-fields.ts`).

Abréviations des droits : **M** membre de l'organisation, **R** responsable
(owner, admin de l'organisation), **A** équipe `ADMIN`, **S** système
(webhook, cron).

## Tables

### Comptes et accès (better-auth)

| Table | Champs principaux | Lecture | Écriture |
|---|---|---|---|
| `user` | id, name, **email**, image, role (`CLIENT`/`ADMIN`), banned, notificationPreferences, twoFactorEnabled, stripeCustomerId | soi-même ; A | soi-même ; A (rôle, ban) |
| `session` | token, expiresAt, **ipAddress**, **userAgent**, activeOrganizationId, impersonatedBy | soi-même ; A | auth |
| `account` | providerId, accountId, password (haché), accessToken / refreshToken (chiffrés) | auth | auth |
| `verification` | identifier, value, expiresAt | auth | auth |
| `twoFactor` | secret, backupCodes, verified | auth | soi-même |
| `organization` | name, slug, logo, stripeCustomerId, lastWeeklyDigestAt | M | R ; A |
| `member` | organizationId, userId, role (`owner`/`admin`/`member`) | M | R |
| `invitation` | **email**, role, status, expiresAt, inviterId | M | R |
| `subscription` | plan, referenceId, stripeSubscriptionId, status, periodStart / periodEnd | M | S (Stripe) |

### Catalogue et solutions

| Table | Champs principaux | Lecture | Écriture |
|---|---|---|---|
| `service` | slug, name, description, category, monthlyPriceCents, includedUsageUnits, usageUnit, overageUnitPriceCents, maxUsageUnits, usageStepUnits, configFields, isActive | tous | A |
| `client_service` | organizationId, userId, serviceId, name, status, configuration (JSON), includedUsageUnits, overageAllowed, pausedAt, prix, ids Stripe, **externalPhoneNumber**, comptes WhatsApp / Facebook / Instagram (jetons chiffrés), webhookUrl et webhookSecret (chiffré), activatedAt, canceledAt, paymentFailedAt, adminNote | M ; A | M (configuration) ; R (pause, volume, dépassement, connexions, webhook, résiliation) ; A (statut, numéro, note) ; S |
| `service_event` | clientServiceId, type, message | M ; A | S |
| `calendar_connection` | **googleAccountEmail**, accessToken / refreshToken (chiffrés), calendarId | R | R |
| `scheduling_connection` | provider (calcom/calendly), encryptedToken, accountLabel, eventType | R | R |
| `booking` | kind (appointment, order, message, quote), **customerName**, **customerPhone**, startAt, endAt, notes, metadata (commande ; devis : callId, travaux, **adresse**, urgence, créneau), ids externes, reminderSentAt | M ; A | S (agent, rappel SMS) |

### Activité

| Table | Champs principaux | Lecture | Écriture |
|---|---|---|---|
| `usage_event` | clientServiceId, type, status, occurredAt, durationSec, externalId, metadata (**numéro appelant**), handledAt | M ; A | S ; M (traité) |
| `call_summary` | usageEventId, **transcript**, reason, summary, followUp, **callerName**, urgent | M ; A | S |
| `conversation` | clientServiceId, channel, **contactId**, lastInboundAt, humanTakeoverAt | M | S ; M (reprise en main) |
| `conversation_message` | direction, **text**, externalId, sentById | M | S ; M (réponse manuelle) |
| `test_call` | clientServiceId, requestedById, status, durationSec | M | M ; S |
| `demo_call` | **phoneHash**, **ipHash** (hachés), serviceSlug, status | A | S |

### Relation client et équipe

| Table | Champs principaux | Lecture | Écriture |
|---|---|---|---|
| `help_request` | organizationId, userId, clientServiceId, subject, message, status | M (la sienne) ; A | M ; A |
| `help_request_message` | body, fromTeam, authorId | M ; A | M ; A |
| `contact_message` | **name**, **email**, activity, message | A | tous (formulaire) |
| `waitlist_entry` | **email**, **name**, company, **phone**, wantsCallback, wantsNewsletter, newsletterConsentAt | A | tous (formulaire) |
| `audit_log` | actorId, action, target, detail | A | S (actions admin) |
| `marketing_post` | channel, status, angle, body, serviceId | A | A |

Liens clés : `organization` 1—n `client_service` ; `client_service` 1—n
`usage_event`, `booking`, `conversation`, `service_event` ; `usage_event` 1—1
`call_summary` ; `user` n—n `organization` par `member`. Une organisation ne
peut pas être supprimée tant qu'elle a des solutions (`onDelete: Restrict`).

## Données personnelles

| Donnée | Personne | Pourquoi | Peut-on s'en passer ? |
|---|---|---|---|
| Nom, e-mail, mot de passe (haché) | Client | Compte, connexion, notifications | Non |
| IP, navigateur (`session`) | Client | Sécurité des sessions | Non |
| Numéro et nom de l'appelant, transcription, résumé | Client final du client | Rappeler, traiter la demande | Non (c'est le service) |
| Nom et téléphone d'une réservation | Client final | Rendez-vous et commandes ; SMS de confirmation et de rappel (envoyés par Twilio) | Non ; le SMS se coupe par solution |
| Identifiant et messages WhatsApp / Messenger / Instagram | Client final | Répondre, historique | Non |
| E-mail Google relié, jetons d'agenda | Client | Réserver dans l'agenda | Oui si pas d'agenda |
| Numéro et IP de l'appel de démonstration | Visiteur | Anti-abus | Stockés **hachés** |
| Nom, e-mail, téléphone (contact, liste d'attente) | Prospect | Répondre, rappeler, newsletter (consentement daté) | Téléphone facultatif |

Automerio est **sous-traitant** pour les données des clients finaux (appels,
messages, réservations) et **responsable** pour les comptes clients.

## Où elles sont stockées

| Service | Données | Région |
|---|---|---|
| Base PostgreSQL | Toutes les tables | [À CONFIRMER : hébergeur et région ; `src/lib/legal.ts` porte encore « à compléter »] |
| Vercel | Application, journaux | [À CONFIRMER : région des fonctions] |
| Stripe | Paiements, factures, moyens de paiement | [À CONFIRMER] |
| Twilio, OpenAI | Appels, audio, transcription à la volée ; SMS aux clients finaux (Twilio) | [À CONFIRMER : région et clauses de transfert hors UE] |
| Meta, Google | Comptes reliés par le client | — |
| Resend | E-mails envoyés | [À CONFIRMER] |
| Upstash | Compteurs de limite (clés techniques) | [À CONFIRMER] |

Liste publiée dans la politique de confidentialité
(`src/content/fr/legal/privacy.tsx`).

## Conservation

| Donnée | Durée | À la fin |
|---|---|---|
| Compte et configuration | Tant que le compte existe | Effacés à la suppression du compte (`src/lib/account-deletion.ts`) |
| Appels, résumés, messages | Tant que le compte existe | Effacés avec le compte |
| Factures | 10 ans (Code de commerce) | Conservées par Stripe |
| Sessions | Jusqu'à expiration | Supprimées |
| Messages de contact sans suite | 3 ans | [À CONFIRMER : aucune purge automatique dans le code] |
| Liste d'attente | 3 ans ou désinscription | [À CONFIRMER : aucune purge automatique dans le code] |

Droits des personnes : export (`/dashboard/profile`, route `export`),
suppression du compte, demandes par l'aide ; réponse sous un mois.

## Sauvegardes et restauration

[À CONFIRMER : fréquence des sauvegardes de l'hébergeur de la base, durée de
rétention, procédure de restauration testée.]

## Migrations

- `prisma migrate dev` en local, puis `npx prisma generate`, puis redémarrer
  `next dev` (voir `CLAUDE.md`).
- En production, `npm run build` applique `prisma migrate deploy`.
- Une migration qui change un comportement existant le documente en
  commentaire SQL (exemple : `20261007150000_depassement_existants_acceptes`).
