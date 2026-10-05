# Spécification : une page d'accueil pour toutes les automatisations

État : exigences P0 réalisées sur la branche `accueil-multi-automatisations`
(5 octobre 2026) ; P1 et P2 à faire. Rédigée le 5 octobre 2026. Offre de référence :
`docs/prestations.md`. Contraintes : `DESIGN.md`.

## Problème

La page d'accueil vend un standard téléphonique. Le titre du hero
(« Plus aucun appel manqué ») et la carte superposée (« Appel en cours ») ne
parlent que d'appels. L'avant/après raconte un appel manqué. Sur 12 questions
de la FAQ, seule celle sur l'agenda sort du téléphone ; aucune ne cite
WhatsApp, Messenger ou Instagram.

Or trois des cinq prestations actives sont des messageries (WhatsApp,
Messenger, Instagram), et une quatrième prend des rendez-vous et des
commandes. Un coach, un salon ou un restaurant qui reçoit surtout des
messages ne se reconnaît pas dans la page : il la quitte en pensant
qu'Automerio est un répondeur.

## Objectifs

1. Dès le hero, un visiteur comprend qu'Automerio répond **aux appels et aux
   messages** et **remplit l'agenda**, sans faire défiler la page.
2. Chaque prestation active est citée au moins une fois au-dessus de la
   section Solutions, avec le canal qu'elle couvre.
3. Les solutions de messagerie gagnent en visibilité : part des clics vers
   les pages WhatsApp, Messenger et Instagram depuis l'accueil (voir
   Mesure).
4. La page reste fidèle à `DESIGN.md` : mêmes sections, même ton, aucune
   donnée inventée.

## Hors périmètre

- **Nouvelles prestations.** Seules les cinq actives en production sont
  présentées ; les six inactives restent absentes.
- **Prix.** Ils viennent de la table `Service`. L'écart entre dépôt et
  production (`docs/prestations.md`) se règle à part.
- **Refonte visuelle.** Mise en page, couleurs et ordre des sections restent
  ceux de la refonte #151 ; seuls les textes et les illustrations changent.
- **Pages métier et pages de solution.** Elles ciblent déjà un canal ;
  elles seront revues dans un second temps si besoin.
- **Nouvelle capture des conversations.** Utile, mais elle demande des
  données de démonstration de messagerie (P1).

## Récits utilisateur

- En tant que **coach qui reçoit ses demandes sur Instagram**, je veux voir
  dès le haut de page qu'Automerio répond aux messages, pour ne pas croire
  que c'est seulement un standard téléphonique.
- En tant que **gérante de salon**, je veux comprendre qu'un client peut
  réserver par téléphone ou par message et que le rendez-vous arrive dans mon
  agenda, pour savoir quelle solution choisir.
- En tant que **restaurateur**, je veux voir que les commandes passées au
  téléphone sont prises avec mon menu et mes prix.
- En tant qu'**artisan**, je veux toujours trouver la promesse sur les appels
  et les urgences, qui reste mon besoin principal.
- En tant que **visiteur qui hésite**, je veux trouver dans la FAQ sur quels
  canaux l'assistant répond, et ce que je dois connecter.

## Exigences

### P0 : indispensables

1. **Hero multi-canal.** Le titre et le chapeau citent les appels, les
   messages et l'agenda.
   - [ ] Titre de 2 lignes au plus sur ordinateur (60 px), 45 caractères au
     plus.
   - [ ] Chapeau de 20 mots au plus, qui nomme au moins un canal de
     messagerie.
   - [ ] La carte superposée montre trois événements de types différents
     (appel, message, rendez-vous), en illustration masquée aux lecteurs
     d'écran, comme aujourd'hui.
2. **Avant/après par canal.** Le scénario devient « la même demande », et
   la section propose trois cas : un appel, un message WhatsApp, une demande
   de rendez-vous.
   - [ ] Sélection du cas par onglets accessibles (rôle `tablist`,
     flèches gauche et droite), ou trois blocs empilés si les onglets
     compliquent trop.
   - [ ] Aucun chiffre ni résultat inventé.
3. **Pour qui : un canal par métier.** Chaque carte cite le canal le plus
   courant du métier (artisan : appels ; coach : Instagram et WhatsApp ;
   restaurant : commandes au téléphone ; salon : réservations ; cabinet :
   tous les canaux).
4. **FAQ.** Ajout de « Sur quels canaux l'assistant répond-il ? ».
   Généralisation des questions écrites pour le seul téléphone (« Puis-je
   reprendre la main pendant un appel ? » couvre aussi les conversations
   écrites).
5. **Méthode.** L'illustration de mise en service montre la ligne, l'agenda
   et une messagerie connectés, plus seulement le numéro.

### P1 : souhaitables

6. Capture du tableau de bord des conversations (WhatsApp, Messenger,
   Instagram) à côté de celle des appels, via `npm run screenshots`.
7. Description du site (`Site.description`) et image de partage alignées
   sur le hero.

### P2 : plus tard

8. Variante du hero selon le métier d'arrivée (paramètre de campagne).
9. Revue des pages métier pour y ajouter les canaux secondaires.

## Mesure

Aucun outil d'analyse d'événements n'est branché en dehors de Vercel
Analytics. Indicateurs proposés :

- **Rapide (2 semaines)** : part des visites de `/services/assistant-*`
  dont l'accueil est la page précédente, avant et après (Vercel Analytics,
  pages référentes).
- **Lent (2 mois)** : part des activations de solutions de messagerie dans
  le total des activations (table `ClientService`).

Cible : la part des activations de messagerie progresse ; le volume
d'activations téléphoniques ne baisse pas.

## Questions ouvertes

- **Prix affichés (bloquant pour la section Solutions, pas pour ce
  chantier)** : production ou dépôt ? Réponse attendue de l'équipe.
- **Ordre des canaux dans le hero** (non bloquant) : appels d'abord, parce
  que c'est la solution la plus vendue, ou messages d'abord, pour marquer le
  changement ? Proposition : appels, messages, agenda.
- **Onglets ou blocs empilés pour l'avant/après** (non bloquant, design) :
  les onglets cachent deux cas sur trois ; les blocs allongent la page.
  Proposition : onglets, avec l'appel affiché par défaut.

## Calendrier

Un seul lot : textes (`messages/fr.json`), carte du hero, avant/après,
illustration de la méthode, FAQ. Pas de dépendance externe ; la capture des
conversations (P1) peut suivre séparément.
