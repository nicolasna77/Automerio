# 01 · PRD : ce que fait Automerio

Règle : **une fonctionnalité absente de ce document n'existe pas.** Si elle
semble manquer, la noter dans `.claude/rules/a-discuter.md` au lieu de la coder.
Décrit l'état du code en octobre 2026.

## Le produit en trois phrases

- Automerio vend des assistants IA prêts à l'emploi aux artisans, coachs,
  indépendants et TPE/PME en France.
- Ils ratent des appels et des messages pendant qu'ils travaillent ; l'assistant
  décroche, répond sur WhatsApp, Messenger et Instagram, prend les rendez-vous
  et les commandes.
- Différence : l'équipe installe et met en service ; le client paie au mois,
  sans engagement, et suit tout dans un tableau de bord.

## Les utilisateurs

| Qui | Ce qu'il veut faire |
|---|---|
| Visiteur | Comprendre l'offre, entendre l'assistant (appel de démonstration), s'inscrire |
| Client responsable (`owner`, `admin` de l'organisation) | Activer et payer des solutions, les configurer, suivre appels et messages, mettre en pause, résilier, gérer l'équipe |
| Client membre (`member`) | Consulter, configurer, répondre aux conversations ; jamais la facturation |
| Équipe Automerio (`ADMIN`) | Mettre en service, superviser les clients, gérer catalogue, codes promo, aide, marketing |

Un client a une ou plusieurs entreprises (organisations) et peut activer la même
solution plusieurs fois (deux boutiques).

## Fonctionnalités

Priorité : **V1** = indispensable (en production), **Souhaitable**, **Plus tard**.

### Découvrir et s'inscrire
- **V1** Découvrir l'offre : accueil, pages solution, pages métier, tarifs, FAQ.
- **V1** Recevoir un appel de démonstration de l'assistant depuis le site
  (limité par numéro et par IP).
- **V1** Créer un compte (e-mail et mot de passe, ou Google), se connecter,
  réinitialiser son mot de passe, double authentification.
- **V1** S'inscrire sur la liste d'attente quand le site est en mode liste
  d'attente (`WAITLIST_MODE`).
- **V1** Écrire à l'équipe depuis la page Contact.

### Activer et payer une solution
- **V1** Choisir une solution dans le catalogue, la nommer, préciser son besoin,
  choisir le volume (téléphonie), appliquer un code promo, payer par Stripe.
  Le montant est toujours lu côté serveur dans la table `Service`.
- **V1** Compléter la mise en service : informations, horaires, numéro de
  téléphone, connexion du compte WhatsApp, Messenger ou Instagram, agenda.
- **V1** Être prévenu quand l'équipe met la solution en service.

### Faire travailler l'assistant
- **V1** Décrocher les appels : renseigner, prendre un rendez-vous, une commande,
  un message, transférer selon les règles du client.
- **V1** Réglage « Langue » : français uniquement (par défaut) ou langue de
  l'appelant (l'assistant commence en français puis la suit) ; le résumé de
  l'appel reste en français.
- **V1** Répondre aux messages WhatsApp, Messenger, Instagram.
- **V1** Répondre en message privé aux commentaires des publications
  Instagram (réglage par solution, désactivé par défaut), une fois par
  commentaire. Ouvert seulement après accord de Meta sur la permission
  `instagram_business_manage_comments` (`INSTAGRAM_COMMENT_REPLIES=on`).
- **V1** Réserver dans l'agenda du client (Google Agenda, Cal.com, Calendly).
- **V1** Annuler ou déplacer un rendez-vous au téléphone : l'assistant ne
  retrouve que les rendez-vous à venir pris au numéro qui appelle (numéro
  présenté par l'opérateur, jamais un numéro dicté), annule ou déplace dans
  l'agenda relié, et l'appelant reçoit un SMS. Un rendez-vous annulé
  disparaît du calendrier.
- **V1** Passer un appel d'essai à sa propre solution.
- **V1** Envoyer un SMS à l'appelant : confirmation d'un rendez-vous ou d'une
  commande pris au téléphone, puis rappel la veille du rendez-vous. Réglage
  « SMS à vos clients » par solution, activé par défaut.
- **V1** Repérer un appel urgent (fuite, panne, danger) : badge « Urgent » dans
  les appels et SMS immédiat au « Mobile pour les alertes urgentes » choisi
  par le client (nom, numéro, motif).
- **V1** Noter une demande de devis (standard téléphonique, réglage « Demandes
  de devis ») : nature des travaux, adresse, urgence, créneau souhaité, sans
  donner de prix ; visible dans le détail de l'appel, SMS récapitulatif à
  l'appelant.
- **V1** Garder le contact quand l'assistant ne décroche pas (pause, forfait
  épuisé) : SMS à l'appelant « nous vous rappelons », une fois par appelant
  toutes les 6 heures, vers un mobile, sauf si les SMS sont coupés. L'appel
  apparaît « Appel non décroché » dans les appels et la vue d'ensemble, à
  rappeler, sans compter dans le forfait.
- Les SMS envoyés aux clients finaux sont inclus dans l'abonnement : ni
  refacturés, ni décomptés du forfait.

### Suivre et piloter
- **V1** Voir les appels reçus avec transcription, motif, résumé et suite à
  donner ; marquer un appel traité.
- **V1** Voir les rendez-vous dans un calendrier.
- **V1** Compléter les réponses de l'assistant téléphonique : chaque question
  à laquelle il n'a pas su répondre (repérée dans le résumé de l'appel, trois
  au plus par appel) apparaît dans « Questions à compléter » sur la page de la
  solution. Une réponse ajoutée par un membre sert dès l'appel suivant ;
  « Ignorer » retire la question ; une réponse enregistrée se supprime.
- **V1** Voir l'activité des 30 derniers jours d'une solution téléphonique :
  appels reçus, part avec rendez-vous ou commande, part hors horaires,
  appels par heure, motifs les plus fréquents.
- **V1** Lire les conversations, reprendre la main, répondre soi-même (dans les
  24 h du dernier message du contact, règle Meta).
- **V1** Suivre le quota de la période ; accepter ou refuser le dépassement ;
  changer de volume.
- **V1** Désactiver ou réactiver l'assistant (pause manuelle).
- **V1** Résilier une solution depuis ses réglages ou la page Abonnements.
- **V1** Consulter abonnements et factures, gérer le moyen de paiement.
- **V1** Envoyer chaque appel terminé et chaque réservation vers ses outils
  (Zapier, Make, CRM) par un webhook signé : onglet « Intégrations » des
  réglages, réservé aux responsables, avec un envoi de test.
- **V1** Recevoir notifications et e-mails (selon ses préférences) et un bilan
  hebdomadaire le lundi.

### Organisation et compte
- **V1** Créer et changer d'organisation, inviter des membres, changer un rôle.
- **V1** Exporter ses données, supprimer son compte.
- **V1** Demander de l'aide à l'équipe et suivre la réponse.
- **Souhaitable** Logo et description de l'organisation (PR #182, brouillon).
- **Souhaitable** Page Profil restructurée, photo, sessions actives (PR #184,
  brouillon).

### Espace équipe
- **V1** Utilisateurs : rôle, bannissement, réinitialisation, sessions.
- **V1** Solutions des clients : statut, numéro, note de l'équipe.
- **V1** Catalogue (activer, prix), codes promo, calendrier global, centre
  d'aide, liste d'attente, journal d'audit.
- **V1** Préparer des publications marketing (brouillon, validation).

### Plus tard
- **Plus tard** Réponses automatiques aux e-mails, prise de rendez-vous en ligne,
  résumé de PDF, résumé de réunions, OCR, support prioritaire : désactivés
  (`isActive = false`), invisibles et impossibles à activer. Chacun sera
  réactivé depuis `/admin/services` une fois construit (étape 7 de
  `06-plan.md`) [À CONFIRMER : périmètre réel de chacun].

## Règles métier

- Statuts d'une solution : `PENDING_PAYMENT` → `CONFIGURING` (payée, mise en
  service en cours) → `ACTIVE` → `CANCELED`.
- Quota : forfait mensuel par solution facturée à l'usage. Au-delà, dépassement
  facturé si accepté et tarifé, sinon l'assistant se met en pause jusqu'à la
  période suivante. Alertes à 80 % et 100 %.
- Pause manuelle : plus d'appel décroché ni de message répondu, facturation
  inchangée ; levée à la résiliation.
- Paiement refusé : période de grâce, l'assistant continue.
- Résiliation immédiate ; remboursement sur demande dans les 30 jours suivant le
  premier paiement.

## Catalogue (prix TTC par mois)

| Solution | Prix | Forfait | Hors forfait |
|---|---|---|---|
| Standard téléphonique automatisé | 25 € | 150 min | 0,14 €/min |
| Prise de rendez-vous / commande par téléphone | 25 € | 150 min | 0,14 €/min |
| Réponses automatiques WhatsApp / Messenger / Instagram | 8 € chacune | 3 000 réponses | 0,25 € |
| Réponses aux e-mails | 49 € | — | — |
| Prise de rendez-vous automatique | 29 € | — | — |
| Résumé de PDF / de réunions | 19 € / 24 € | — | — |
| OCR | 39 € | — | — |
| Support prioritaire | 99 € | — | — |

Source : `src/lib/catalog-data.ts`. Les cinq dernières lignes sont les
solutions « Plus tard », désactivées. Téléphonie : volume ajustable jusqu'à
6 000 min, par paliers de 50.

## Hors périmètre

- Portabilité de numéro (le client garde le sien et active un renvoi d'appel).
- Modèle d'IA hébergé par Automerio (l'agent passe par OpenAI).
- Application mobile native.
- Engagement de durée.

## Ce qui prouve que ça marche

- Un appel entrant est décroché et apparaît résumé dans le tableau de bord
  [À CONFIRMER : délai cible].
- Un client paie et sa solution passe en `CONFIGURING` sans intervention
  manuelle ; mise en service en [À CONFIRMER : délai cible].
- Zéro donnée d'une organisation visible depuis une autre.
