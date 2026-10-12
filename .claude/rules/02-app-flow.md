# 02 · App flow : les pages et ce qui se passe au clic

Routes sous `src/app/[locale]` (français par défaut, sans préfixe).

## Les pages et qui y accède

| Adresse | Accès |
|---|---|
| `/`, `/services/[slug]`, `/industries/[slug]`, `/contact` | Tous |
| `/privacy`, `/terms`, `/legal-notice`, `/cookies` | Tous |
| `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/login/verification` | Non connecté |
| `/invitation/[invitationId]` | Invité (connexion demandée si besoin) |
| `/dashboard` (vue d'ensemble) | Client connecté |
| `/dashboard/services` (mes solutions), `/dashboard/services/catalog` | Client |
| `/dashboard/services/activate/[slug]` | Client |
| `/dashboard/services/[id]`, `/dashboard/services/[id]/configuration` | Membre de l'organisation de la solution |
| `/dashboard/services/[id]/publications` | Membre de l'organisation ; solution Instagram payée |
| `/dashboard/calendar`, `/dashboard/help`, `/dashboard/profile` | Client |
| `/dashboard/subscriptions`, `/dashboard/payments` | Client ; actions réservées aux responsables |
| `/dashboard/organization` | Client ; inviter et changer les rôles : responsables |
| `/admin/*` (users, services, promo-codes, calendar, help, waitlist, marketing, audit-log) | Rôle `ADMIN` |

## Règles de navigation

- Non connecté sur `/dashboard/*` ou `/admin/*` : redirigé vers
  `/login?next=<page demandée>` (`src/proxy.ts`), puis renvoyé sur la page
  demandée après connexion (`src/lib/safe-redirect.ts`, jamais vers un autre
  site).
- Après connexion sans `next` : `/dashboard`.
- Non `ADMIN` sur `/admin` : refusé dans le layout et dans chaque Server Action.
- Solution d'une autre organisation : page 404 (`notFound()`).
- Mode liste d'attente : les pages fermées renvoient vers l'accueil.
- Une Server Action n'est jamais redirigée par le proxy : elle vérifie la
  session elle-même.

## Parcours

### S'inscrire
Accueil → « Créer mon compte » → `/signup` : nom, e-mail, mot de passe,
entreprise → valider
- succès → `/dashboard`, première organisation créée
- e-mail déjà pris ou mot de passe trop court → message sous le champ, rien n'est envoyé
- double clic → bouton en chargement, une seule requête

### Se connecter
`/login` → e-mail, mot de passe → valider
- 2FA activée → `/login/verification` (code ou code de secours)
- identifiants faux → message d'erreur, champs conservés
- trop d'essais → message de limite (Upstash)

### Activer une solution
`/dashboard/services/catalog` → carte → « Activer » →
`/dashboard/services/activate/[slug]` : nom, besoin, volume (téléphonie),
récapitulatif, code promo → « Payer » → Stripe Checkout
- paiement réussi → retour `?checkout=success` ; `CheckoutNotice` attend le
  webhook → statut `CONFIGURING`, étape suivante proposée
- paiement abandonné → `?checkout=canceled`, solution `PENDING_PAYMENT`,
  bouton « Reprendre le paiement »
- code promo invalide → message sous le champ
- même nom déjà utilisé dans l'organisation → message sous le champ
- solution retirée du catalogue (`isActive = false`) → refusée, même par un
  appel direct à l'action

### Mettre en service
Page de la solution → carte de mise en service → étape à faire (choisir un
numéro, connecter WhatsApp, Messenger, Instagram, agenda)
- membre non responsable → explication à la place du bouton
- connexion Meta ou Google refusée → retour avec `?instagram=error` ou
  `?calendar=error`, alerte rouge
- compte Meta déjà relié ailleurs → `?instagram=in-use`, alerte dédiée

### Suivre une solution (page `/dashboard/services/[id]`)
- En-tête : nom, description, bouton « Réglages » en haut à droite.
- Quota de la période (solution active) et bloc « Assistant » côte à côte,
  sans carte ; l'un sous l'autre quand la place manque.
- Pas encore active → frise Payé / En configuration / Actif.
- Appels reçus, calendrier, conversations selon le type de solution.
- Téléphonie avec numéro : carte « Activité des 30 derniers jours » (chiffres
  clés, appels par heure, motifs) ; sans appel, une phrase l'annonce.
- Vide : « aucun appel ce mois-ci », état vide du calendrier, des conversations.
- Chargement : squelettes (`loading.tsx`).
- Suggestion d'agenda (téléphonie avec rendez-vous, sans agenda) : refermable,
  reste fermée (cookie).

### Désactiver l'assistant
Bloc « Assistant » ou interrupteur du tableau → bascule
- succès → toast, état « Désactivé » ; appels et messages ne reçoivent plus de réponse
- non responsable → pas d'interrupteur, état affiché
- solution non payée ou hors téléphonie / messagerie → interrupteur absent
- erreur serveur → toast d'erreur, l'interrupteur revient à l'état réel

### Changer le volume, le dépassement, résilier
Page de la solution → « Réglages » → onglet Abonnement
- « Modifier le volume » → fenêtre, nouveau prix, confirmer
- interrupteur Dépassement → appliqué tout de suite, toast
- « Se désabonner » → fenêtre de confirmation → solution `CANCELED`, numéro et
  comptes Meta libérés, e-mail envoyé
- Stripe refuse la résiliation → message d'erreur, la solution reste active
  (rien n'est marqué résilié tant que le prélèvement n'est pas arrêté)
- Aussi depuis `/dashboard/subscriptions`.

### Envoyer vers ses outils (webhook)
Page de la solution → « Réglages » → onglet Intégrations → adresse https →
« Enregistrer »
- adresse non https, invalide ou vers un réseau privé → message sous le champ,
  focus sur le champ
- enregistrée → secret de signature affiché (masqué, copiable), « Envoyer un
  test » → toast avec le statut reçu, ou message qui dit quoi vérifier
- « Retirer » → fenêtre de confirmation → plus aucun envoi
- membre non responsable → état affiché, explication à la place du formulaire

### Préparer une publication Instagram
Page d'une solution Instagram → « Publications » (en-tête) →
`/dashboard/services/[id]/publications` : onglet Légende, Carrousel, Hashtags
ou Planning → sujet, objectif, précisions (facultatives) → « Rédiger »
- sujet manquant → message sous le champ, focus sur le champ, rien n'est envoyé
- rédigé → le brouillon s'affiche en tête de l'historique, bouton « Copier » ;
  un chiffre absent des précisions est signalé « à vérifier »
- 30 brouillons dans la journée → message, rien n'est rédigé
- OpenAI indisponible → toast d'erreur, rien n'est enregistré
- historique : les 20 derniers, « Copier », « Supprimer » (confirmé)
- solution non payée, résiliée ou autre qu'Instagram → page 404

### Conversations
Page d'une solution de messagerie → fil → reprendre la main → répondre
- hors fenêtre de 24 h Meta → envoi désactivé avec explication
- échec d'envoi Meta → toast d'erreur, message non enregistré comme envoyé

### Équipe
`/dashboard/organization` → « Inviter » → e-mail et rôle → envoyer
- invité déjà membre → message ; invitation expirée → page d'invitation l'indique

### Contacter l'équipe (prospect)
En-tête (lien « Contact ») ou pied de page → `/contact` : nom, e-mail, métier
(facultatif), demande → « Envoyer ma demande »
- champ manquant ou e-mail invalide → message sous le champ, focus sur le
  premier champ à corriger, rien n'est envoyé
- trop d'envois → message au-dessus du bouton
- envoyé → confirmation avec l'adresse saisie, puis « Écouter l'assistant »
  (si l'appel de démonstration est disponible) ou « Voir les solutions »
- encadré : appel de démonstration, FAQ, aide du tableau de bord pour un client

### Aide
`/dashboard/help` → nouvelle demande (sujet, message, solution liée) → envoyer
- l'équipe répond depuis `/admin/help` → notification et e-mail au client
- objet de plus de 200 caractères ou message de plus de 5 000 → message, rien
  n'est envoyé ; plus de 10 demandes (30 réponses) par heure → limite atteinte

### Parcours techniques (sans écran)
- **Appel** : Twilio → `/api/voice/incoming` (solution non payée ou résiliée,
  en pause ou quota épuisé → message et raccroché ; en pause ou quota épuisé,
  SMS « nous vous rappelons » à l'appelant, `src/lib/missed-call-sms.ts`, et
  ligne `usage_event` de type `missed_call`, à rappeler, hors forfait,
  `src/lib/missed-calls.ts` ; numéro sans solution →
  « indisponible » ; sinon SIP vers OpenAI) → `/api/voice/openai-webhook` (même
  contrôle, `voice-agent/call-gate.ts`, sinon appel refusé ; outils :
  disponibilités, rendez-vous, commande, transfert, message) → fin : usage,
  résumé, alertes de quota. Résumé « urgent » → SMS au mobile d'alerte de la
  solution (`src/lib/urgent-alert.ts`), sans lui rien ne part. Outil
  `take_quote_request` (si « Demandes de devis » est activé) → réservation de
  type `quote`, rattachée à l'appel par `metadata.callId`, affichée dans le
  détail de l'appel ; SMS récapitulatif à l'appelant.
- **Langue** : `callerLanguage` = `auto` → consigne « réponds dans sa langue »
  et transcription sans langue imposée (`src/lib/voice-agent/voice.ts`) ;
  sinon français imposé.
- **Commentaire Instagram** (si `INSTAGRAM_COMMENT_REPLIES=on` et réglage
  activé) : webhook champ `comments` → commentaires de premier niveau d'un
  tiers (`src/lib/instagram-comments.ts`) → même chaîne que les messages
  (`decideAiReply`, quota) → réponse privée adressée au commentaire.
- **Message** : webhook Meta → 200 immédiat → `decideAiReply` (pause, limite par
  expéditeur, plafond quotidien, quota) → réponse OpenAI → envoi Meta.
- **Paiement** : webhooks Stripe via better-auth (`/api/auth/stripe/webhook`) →
  `src/lib/stripe-webhooks.ts` (paiement, échec, facture, résiliation).
- **Bilan hebdomadaire** : cron Vercel, lundi 7 h, `/api/cron/weekly-digest`.
- **SMS à l'appelant** : rendez-vous ou commande pris pendant un vrai appel
  (pas un appel d'essai, pas la messagerie) → SMS de confirmation
  (`src/lib/booking-sms.ts`), seulement vers un mobile français et si le
  réglage n'est pas coupé. Rappel : cron Vercel chaque jour à 16 h UTC,
  `/api/cron/booking-reminders`, pour les rendez-vous du lendemain ; chaque
  rappel envoyé est daté (`reminderSentAt`), une tâche rejouée n'en renvoie pas.

## États à toujours prévoir

Vide, chargement (squelette), erreur (message qui dit comment s'en sortir),
succès (toast), double clic (bouton `loading`), retour arrière (le navigateur
revient à la page précédente, pas de formulaire perdu sans prévenir).
