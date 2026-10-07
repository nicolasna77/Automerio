# DESIGN.md

Règles visuelles et rédactionnelles d'Automerio. Tout changement d'interface les
respecte. Un choix absent d'ici y est ajouté avant d'être appliqué.

## Direction

Technique et précis : un outil fiable pour des artisans, des coachs et des TPE.
On montre le produit, ses écrans et ses données, étape par étape, sans décor.

Références retenues :
- [Volubile](https://www.volubile.ai/fr/creez-votre-agent-vocal-ia) : le parcours
  expliqué en étapes, puis les cas d'usage.
- [fonio.ai](https://www.fonio.ai/fr) : le produit montré plutôt que décrit.

## Couleurs

Toujours par les jetons CSS de `src/app/globals.css`, jamais de couleur écrite en
dur. `src/lib/brand-palette.ts` en garde la copie hexadécimale pour les e-mails
et les images de partage (un test vérifie qu'elles concordent).

| Rôle | Jeton | Clair | Sombre |
|---|---|---|---|
| Principale (vert Automerio) | `--primary` | `#15803d` | `#2fbc5b` |
| Texte sur principale | `--primary-foreground` | `#ffffff` | `#0e1013` |
| Accent (à traiter, attention) | `--attention` | `#b45309` | `#f59e0b` |
| Fond | `--background` | `#f8f9fb` | `#0e1013` |
| Surface (cartes) | `--card` | `#ffffff` | `#15181c` |
| Neutre doux (zones, survol) | `--muted`, `--accent` | `#eef0f3` | `#1d2126` |
| Texte | `--foreground` | `#111418` | `#eef0f3` |
| Texte secondaire | `--muted-foreground` | `#4a5160` | `#9aa1ab` |
| Filets | `--border` | `#dfe3e8` | `#2a2f36` |
| Erreur | `--destructive` | `#b91c1c` | `#f87171` |

Le vert d'origine `#00a33d` passe à `#15803d`, assez foncé pour un texte blanc
lisible (contraste 5 : 1). Le logo, le favicon et les boutons utilisent ce même
vert, en aplat.

Aucun dégradé, aucun halo, aucune trame décorative.

Seule exception, le hero de l'accueil : une trame de lignes fines (1 px, couleur
`--border`) avec un point à chaque croisement, et la capture du produit qui
s'efface vers le bas par un masque de transparence (pas de dégradé de couleur).
Des traits fins (1 px, vert de la marque, dégradé vers le transparent) y
descendent lentement le long des lignes verticales de la trame.
Nulle part ailleurs.

## Typographie

Deux polices de la même famille, chargées par `next/font` :
- **IBM Plex Sans** (400, 500, 600) pour les titres et le texte ;
- **IBM Plex Mono** (400, 500), classe `font-mono`, seulement pour les données :
  prix, durées, horaires, numéros de téléphone, codes, numéros d'étape.

Les chiffres de données sont tabulaires (`tabular-nums`). Pas de petites
étiquettes en capitales espacées.

| Usage | Taille | Graisse |
|---|---|---|
| Titre de page (`h1`), site public | 36 px, 48 px dès `sm` | 600 |
| Titre de page (`h1`), tableau de bord et admin (`PageHeader`) | 24 px | 600 |
| Titre du hero de l'accueil | 36 px, 48 px dès `sm`, 60 px dès `lg`, deux lignes au plus | 600 |
| Titre de section (`h2`) | 30 px, 36 px dès `sm` | 600 |
| Sous-titre (`h3`) | 18 à 20 px | 600 |
| Texte courant | 16 px, 18 px pour les chapeaux | 400 |
| Donnée (Plex Mono) | taille du texte voisin | 400 ou 500 |
| Légende, aide | 14 px | 400 |
| Mention légale, note | 13 px | 400 |

Pas de compression manuelle des lettres (`font-stretch`, `tracking` négatif fort).

## Formes

- **Un seul rayon d'arrondi : 8 px** (`--radius: 0.5rem`). Toutes les classes
  `rounded-*` du thème en valent la même valeur.
- Seule exception : les éléments de moins de 16 px (case à cocher, repère de
  graphique, flèche d'infobulle) gardent un arrondi de 2 à 5 px.
- Cercle (`rounded-full`) seulement pour ce qui est rond par nature : avatar,
  pastille d'état, numéro d'étape. Jamais pour un bouton, un badge ou un champ.
- Espacements sur la grille de 4 px de Tailwind ; sections de 80 px, 96 px dès
  `sm` (`py-20 sm:py-24`).
- Boutons : un style principal plein (`default`), un secondaire à filet
  (`outline`). Les autres variantes restent pour l'application (`ghost` dans les
  menus, `destructive` pour supprimer).

## Icônes

Un seul jeu : **lucide-react**, trait par défaut, 16 px dans le texte et les
boutons, 20 px en tête de bloc. Aucun emoji dans l'interface. Les logos de
tiers (WhatsApp, Messenger, Instagram, Google) restent leurs logos officiels.

## Composants

Primitives dans `src/components/ui` (shadcn sur Base UI), composants de
l'application dans `src/components`. On compose avec eux plutôt que de
recréer un bouton, un badge ou un séparateur.

**Boutons (`Button`)**

| Variante | Quand |
|---|---|
| `default` (plein, vert) | L'action principale d'un écran, une seule par zone |
| `outline` (filet) | Action secondaire à côté de la principale |
| `ghost` | Menus, barres d'outils, boutons d'icône |
| `destructive` | Supprimer, résilier, bannir ; toujours confirmé |
| `link` | Action dans une phrase |
| `secondary` | Réservé à l'application, pour une action neutre sans filet |

Pendant une requête, `loading` : le bouton se désactive, porte `aria-busy`
et affiche l'indicateur qui tourne. Le libellé reste celui de l'action, ou
sa forme en cours (« Envoi… »). Jamais d'indicateur ajouté à la main. Un
bouton d'icône seule a toujours un `aria-label`.

**Badges (`Badge`)** : `default` (vert) pour ce qui est actif ou réussi,
`attention` pour ce qui attend le client (à rappeler, à finaliser),
`destructive` pour une erreur, `secondary` ou `outline` pour une information
neutre. Les statuts d'une solution passent par `StatusBadge`, qui choisit la
variante. Un badge porte toujours un mot : la couleur seule ne suffit pas.

**Séparateur (`Separator`)** : filet de 1 px en couleur `--border`,
horizontal par défaut ; vertical dans la barre du haut, entre le bouton de la
barre latérale et le fil d'Ariane.

**En-tête de page** : le titre et sa description par `PageHeader`. Le fil
d'Ariane s'affiche dans la barre du haut (`HeaderBreadcrumbs`), déduit de
l'adresse ; une page dont le titre vient des données (une solution, un
utilisateur) le fournit par `PageBreadcrumbs`. Jamais de fil d'Ariane dans
le contenu de la page.

**Onglets (`Tabs`)** : filet vert sous l'onglet actif ; un onglet désactivé
passe à 50 % d'opacité et ne réagit plus.

**Formulaires** : chaque champ a son `Label`. Une erreur de saisie s'affiche
sous le champ (`aria-invalid`, `aria-describedby`) et le champ reçoit le
focus ; une erreur qui ne vise pas un champ va dans une notification, qui
reste affichée jusqu'à ce qu'on la ferme.

**États vides** : `EmptyState`, avec une phrase qui dit quoi faire.

## Images

- On montre de **vraies captures de l'application**, pas des photos de banque
  d'images ni des visuels générés. Elles viennent de `npm run screenshots`
  (`scripts/capture-screenshots.ts`), qui remplit le compte de démonstration
  local puis capture le tableau de bord en clair et en sombre (WebP, dans
  `public/screenshots/`).
- Exception : les pages par métier (`/industries/…`) montrent une
  photo du métier, issue d'Unsplash (licence libre, usage commercial
  autorisé), recadrée en 4:3 et enregistrée en WebP dans
  `public/industries/`. Elle porte le nom du photographe en légende.
  Les cartes « Pour qui » de l'accueil reprennent ces mêmes photos, recadrées
  dans la carte, avec les noms des photographes réunis sous la grille.
- Toute capture porte la légende « Exemple avec des données de
  démonstration ». Les numéros affichés viennent des plages réservées à la
  fiction par l'ARCEP (01 99 00, 06 39 98) : personne ne peut être joint.
- Chaque image a un texte alternatif qui décrit ce qu'elle montre.
- Pas de faux cadre de navigateur (barre d'adresse, pastilles) autour d'une
  capture. Trois présentations, toutes par `ProductScreenshot` :
  - **hero** (`showcase`) : la page entière du tableau de bord, double filet,
    effacée vers le bas ; elle peut porter une carte superposée qui montre ce
    qu'une image fixe ne montre pas (un appel en cours), masquée sur mobile ;
  - **morceau** (`fragment`) : une zone précise de l'interface (un appel, un
    fil de messages), sur un fond uni `muted`, avec une ombre ; sur mobile, au
    moins 80 % de sa taille réelle, coupée à droite par le fond ;
  - **simple** : la capture dans un filet, sans fond.
- Une capture n'est jamais agrandie au-delà de sa taille réelle ; elle est
  servie en qualité 90 (le texte fin reste net).
- Les faits commerciaux (prix, engagement, garantie) se présentent en fiche
  technique : libellé à gauche, valeur en Plex Mono à droite, filets entre les
  lignes.
- Les maquettes dessinées (illustrations des pages solutions) restent pour ce
  qu'une capture ne peut pas montrer (un appel en cours, un message reçu).

## Mouvement

Seules animations autorisées :
- transition de couleur ou d'opacité au survol et au clic (150 ms) ;
- ouverture et fermeture des fenêtres et menus (fondu court) ;
- indicateur de chargement (rotation) et squelette de chargement ;
- traits lumineux de la trame du hero de l'accueil (descente lente, en boucle).

Pas d'animation au défilement, de parallaxe, de pulsation ni d'effet « radar ».
Le réglage système « réduire les animations » coupe tout mouvement.

## Ton des textes

- **Vouvoiement.**
- Phrases courtes : une idée par phrase, 20 mots au plus.
- On dit ce que fait la solution, pour qui, et ce que le client y gagne.
- Pas de tiret long (—) ni de tiret utilisé comme ponctuation : deux-points,
  virgule ou point.
- Aucun chiffre, avis, client ou logo qui ne soit réel et vérifiable. Les
  maquettes d'interface ne montrent pas de performance chiffrée.
- Les avis clients vivent dans `src/content/fr/testimonials.ts`, avec la date
  et la trace de l'accord écrit du client. Sans avis, la section de l'accueil
  ne s'affiche pas.

Mots et formules à ne jamais utiliser : transformer, révolutionner, booster,
libérer (votre potentiel), tout-en-un, clé en main, sans effort, puissant,
magique, intelligent (comme argument), innovant, de pointe, seamless,
« en quelques clics », « nouvelle ère », « passez au niveau supérieur ».
