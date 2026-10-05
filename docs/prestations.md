# Prestations Automerio

État au 5 octobre 2026. Les prix sont ceux de la production
(`https://automerio.com/pricing.md`, lus dans la table `Service`), TVA 20 %
incluse, hors taxes entre parenthèses.

Conditions communes à toutes les prestations :

- abonnement mensuel, sans engagement de durée ;
- aucun frais de mise en place : l'équipe installe, connecte et teste ;
- remboursement sur simple demande dans les 30 jours suivant le premier
  paiement ;
- paiement par Stripe, une Checkout Session par prestation ;
- une même prestation peut être activée plusieurs fois (deux boutiques, deux
  lignes), chaque activation est facturée séparément.

## Vue d'ensemble

| Prestation | Prix mensuel | Inclus | Connecteurs |
|---|---|---|---|
| Standard téléphonique automatisé | 79 € TTC (65,83 € HT) | 150 min d'appel | Numéro Twilio, renvoi d'appel, agent vocal OpenAI |
| Prise de rendez-vous / commande par téléphone | 49 € TTC (40,83 € HT) | 150 min d'appel | Numéro Twilio, renvoi d'appel, agent vocal OpenAI, Google Agenda, Cal.com ou Calendly |
| Réponses automatiques sur WhatsApp | 59 € TTC (49,17 € HT) | Pas de quota affiché | WhatsApp Business (Meta) |
| Réponses automatiques sur Messenger | 59 € TTC (49,17 € HT) | Pas de quota affiché | Page Facebook (Meta) |
| Réponses automatiques sur Instagram | 59 € TTC (49,17 € HT) | Pas de quota affiché | Compte Instagram professionnel |

## Communication client automatisée

### Standard téléphonique automatisé

L'assistant décroche chaque appel, comprend la demande, transfère les
urgences selon les motifs choisis par le client et prend un message pour le
reste. Chaque appel est résumé dans le tableau de bord et par e-mail.

**Prix**

- Abonnement : 79 € TTC (65,83 € HT) par mois
- Inclus : 150 minutes d'appel par mois
- Au-delà : 0,30 € TTC (0,25 € HT) la minute
- Volume ajustable à l'avance jusqu'à 500 min par mois, à 0,20 € TTC
  (0,17 € HT) la minute ajoutée

**Connecteurs**

- **Numéro de téléphone français (Twilio)** : un numéro est acheté et
  attribué à l'assistant, compris dans l'abonnement. Le client le choisit
  depuis la page de la solution (« Rechercher un numéro »).
- **Renvoi d'appel depuis la ligne actuelle** : le client garde son numéro
  et renvoie ses appels vers celui de l'assistant. Un guide pas à pas est
  fourni pour Orange (Livebox), SFR, Bouygues Telecom (Bbox), Free (Freebox)
  et les autres opérateurs ; le renvoi se désactive à tout moment.
- **Agent vocal (OpenAI Realtime, via SIP)** : décroche, converse, transfère
  et rédige le résumé de l'appel.
- **Transfert d'appel** : vers le numéro choisi, pour les motifs marqués
  comme urgents.
- **E-mails (Resend)** : résumé de chaque appel, bilan de la semaine,
  alertes de forfait.

**Réglages côté client** : numéro existant à dévier, horaires d'ouverture,
message d'accueil, redirections selon le motif d'appel, consignes pour
l'assistant, voix, débit et ton.

### Prise de rendez-vous / commande par téléphone

Même assistant vocal que le standard, orienté vers la prise de rendez-vous
(créneaux libres de l'agenda) ou la prise de commandes (menu ou catalogue de
produits, adresse de retrait, zone de livraison).

**Prix**

- Abonnement : 49 € TTC (40,83 € HT) par mois
- Inclus : 150 minutes d'appel par mois
- Au-delà : 0,30 € TTC (0,25 € HT) la minute
- Volume ajustable à l'avance jusqu'à 500 min par mois, à 0,20 € TTC
  (0,17 € HT) la minute ajoutée

**Connecteurs**

- **Numéro Twilio, renvoi d'appel, agent vocal OpenAI, e-mails** : comme
  pour le standard téléphonique.
- **Agenda, au choix** :
  - **Google Agenda** : connexion OAuth depuis la page de la solution ;
  - **Cal.com** : clé API (Paramètres, Développeur, Clés API), à créer sans
    date d'expiration ;
  - **Calendly** : jeton d'accès personnel (Intégrations et applications,
    API et webhooks). Une offre Calendly payante (Standard ou plus) est
    nécessaire pour qu'un assistant réserve.
- **Menu ou catalogue** : saisi dans les réglages ; une carte peut être
  transcrite automatiquement.

**Réglages côté client** : objectif de l'appel (rendez-vous ou commande,
obligatoire), agenda, prestations et durées, durée par défaut, menu ou
catalogue (obligatoire pour les commandes), adresse de retrait, horaires,
zone de livraison, consignes, voix, débit et ton.

### Réponses automatiques sur WhatsApp

Réponses instantanées aux messages reçus sur le compte WhatsApp Business :
questions fréquentes, devis, disponibilités.

**Prix**

- Abonnement : 59 € TTC (49,17 € HT) par mois
- Pas de quota de réponses affiché en production

**Connecteurs**

- **WhatsApp Business (Meta)** : connexion par l'inscription intégrée de
  Meta (Embedded Signup) depuis la page de la solution. Si la connexion est
  indisponible, le client est invité à contacter l'équipe.
- **Moteur de réponse (OpenAI)** : rédige les réponses à partir des
  questions fréquentes fournies par le client.

**Réglages côté client** : numéro WhatsApp Business (obligatoire), questions
fréquentes.

### Réponses automatiques sur Messenger

Réponses instantanées aux messages envoyés à la Page Facebook.

**Prix**

- Abonnement : 59 € TTC (49,17 € HT) par mois
- Pas de quota de réponses affiché en production

**Connecteurs**

- **Page Facebook (Meta Graph API)** : connexion Facebook depuis la page de
  la solution ; la Page est abonnée aux messages entrants.
- **Moteur de réponse (OpenAI)**.

**Réglages côté client** : nom de la Page Facebook (obligatoire), questions
fréquentes.

### Réponses automatiques sur Instagram

Réponses instantanées aux messages privés du compte Instagram professionnel.

**Prix**

- Abonnement : 59 € TTC (49,17 € HT) par mois
- Pas de quota de réponses affiché en production

**Connecteurs**

- **Compte Instagram professionnel** : connexion OAuth Instagram
  (« Connecter mon compte Instagram ») depuis la page de la solution.
- **Moteur de réponse (OpenAI)**.

**Réglages côté client** : nom d'utilisateur Instagram (obligatoire),
questions fréquentes.

## Au catalogue, non proposées

Présentes dans `src/lib/catalog-data.ts` mais inactives : elles n'apparaissent
ni sur le site ni dans le tableau de bord. Les prix ci-dessous sont les prix
par défaut du dépôt, pas ceux de la production, qui ne les affiche pas.

| Prestation | Prix par défaut (dépôt) | Connecteur prévu |
|---|---|---|
| Réponses automatiques aux e-mails | 49 € TTC | Boîte mail |
| Prise de rendez-vous automatique (en ligne) | 29 € TTC | Agenda (obligatoire) |
| Résumé automatique de fichiers PDF | 19 € TTC | Dossier source |
| Résumé automatique de réunions | 24 € TTC | Outil de visio ou dossier d'enregistrements |
| OCR : lecture automatique de documents scannés | 39 € TTC | Dossier de scans, outil de gestion cible |
| Support prioritaire | 99 € TTC | Aucun |

## Écarts entre le dépôt et la production

`npm run db:sync-catalog` ne met jamais à jour les prix (ils se gèrent dans
l'admin), seulement les réglages et le volume ajustable. Constaté le
5 octobre 2026 :

| Point | Production | Dépôt (`catalog-data.ts`) |
|---|---|---|
| Standard téléphonique | 79 € TTC | 25 € TTC |
| Prise de rendez-vous par téléphone | 49 € TTC | 25 € TTC |
| WhatsApp, Messenger, Instagram | 59 € TTC, sans quota | 8 € TTC, 3 000 réponses incluses, puis 0,25 € TTC les 100 |
| Dépassement téléphonie | 0,30 € TTC la minute | 0,14 € TTC la minute |
| Volume ajustable téléphonie | jusqu'à 500 min, 0,20 € TTC la minute | jusqu'à 6 000 min, 0,13 € TTC la minute |
| Dernière mise à jour du catalogue | 22 septembre 2026 | 29 septembre 2026 (#120) |

Le volume maximal de 500 min montre que la synchronisation n'a pas été jouée
en production depuis #120. Si les prix du dépôt sont les bons, il faut les
reporter dans l'admin ; s'ils ne le sont pas, c'est `catalog-data.ts` qu'il
faut corriger, pour que les nouvelles bases (préversions, développement)
partent des vrais tarifs.
