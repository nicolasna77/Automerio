# 03 · Design : à quoi ressemble Automerio

Résumé opérationnel. La référence complète est `DESIGN.md` (racine) : en cas
d'écart, `DESIGN.md` gagne, et ce fichier est mis à jour.

## Direction

Technique et précis : un outil fiable pour artisans, coachs et TPE. On montre le
produit (vraies captures, vraies données de démonstration), sans décor.
Références : Volubile (parcours en étapes), fonio.ai (produit montré).

## Couleurs

Toujours par les jetons CSS de `src/app/globals.css`, jamais en dur.

| Rôle | Jeton | Clair | Sombre |
|---|---|---|---|
| Principale (vert) | `--primary` | `#15803d` | `#2fbc5b` |
| Texte sur principale | `--primary-foreground` | `#ffffff` | `#0e1013` |
| Attention (à traiter) | `--attention` | `#b45309` | `#f59e0b` |
| Fond | `--background` | `#f8f9fb` | `#0e1013` |
| Surface (cartes) | `--card` | `#ffffff` | `#15181c` |
| Neutre doux | `--muted`, `--accent` | `#eef0f3` | `#1d2126` |
| Texte | `--foreground` | `#111418` | `#eef0f3` |
| Texte secondaire | `--muted-foreground` | `#4a5160` | `#9aa1ab` |
| Filets | `--border` | `#dfe3e8` | `#2a2f36` |
| Erreur | `--destructive` | `#b91c1c` | `#f87171` |

Pas de dégradé, de halo ni de trame, sauf la trame du hero de l'accueil et,
sur le site public, des halos discrets de `--primary` (14 % au plus) derrière
certaines sections et des bandes `bg-primary/5` (`SectionGlow`). Jamais sur
un composant ni dans le tableau de bord.
Thème clair et sombre (next-themes).

## Polices

- **DM Sans** (400, 500, 600), titres et texte, via `next/font`.
- **DM Mono** (400, 500), classe `font-mono`, seulement pour les données : prix,
  durées, horaires, numéros, codes. Chiffres `tabular-nums`.
- Tailles : `h1` public 36 px (48 dès `sm`) ; `h1` tableau de bord 24 px ;
  `h2` 30 px (36 dès `sm`) ; texte 16 px ; aide 14 px ; mentions 13 px.
- Jamais Inter ni Geist. Pas de petites étiquettes en capitales espacées.

## Composants

- **Rayon unique 8 px** (`--radius: 0.5rem`) ; cercle seulement pour avatar,
  pastille, numéro d'étape, interrupteur.
- Primitives `src/components/ui` (shadcn « base-luma » sur **Base UI**, pas
  Radix). `nativeButton={false}` quand un `Button` rend un `<Link>`.
- **Bouton** : `default` plein vert, une seule action principale par zone ;
  `outline` secondaire ; `ghost` menus et icônes ; `destructive` toujours
  confirmé. `loading` pendant une requête. Bouton d'icône seul : `aria-label`.
- **Badge** : porte toujours un mot. Statuts par `StatusBadge`.
- **Carte** : `Card` (ombre légère, anneau 5 %), `size="sm"` pour les blocs compacts.
- **Formulaire** : un `Label` par champ ; erreur sous le champ (`aria-invalid`,
  `aria-describedby`) et focus sur le champ.
- **Interrupteur de l'assistant** : piste verte « Activé » / neutre
  « Désactivé » (tableau) ; poignée à coche / croix (bloc Assistant).
- **États vides** : `EmptyState`, une phrase qui dit quoi faire.
- **Icônes** : lucide-react uniquement, 16 px dans le texte, 20 px en tête de bloc.
  Aucun emoji. Logos officiels pour WhatsApp, Messenger, Instagram, Google.

## Allure des pages

- **Largeur** du site public : en-tête, pied de page et contenu jusqu'à 1280 px (`max-w-[80rem]`,
  marges de 16 puis 24 px), alignés sur les mêmes bords, comme fonio.ai.

- **Accueil** : hero (titre deux lignes au plus, un bouton principal, capture
  pleine du tableau de bord effacée vers le bas, trame et traits lumineux),
  puis fragments de l'interface en onglets, étapes, métiers, tarifs, FAQ.
- **Page solution publique** : bénéfices, cas d'usage, prix en fiche technique
  (libellé à gauche, valeur DM Mono à droite), FAQ.
- **En-tête du site** : menu « Solutions » en panneau large (catégories sur deux
  colonnes, icône, nom, accroche), « Pour qui ? », ouverts au survol, puis
  « Tarifs », « FAQ » et « Contact ».
- **Tableau de bord** : barre latérale, fil d'Ariane dans la barre du haut
  (jamais dans la page), `PageHeader` (titre 24 px, description).
- **Liste des solutions** : tableau Solution / Statut / Quota / Tarif / Réglages.
- **Page d'une solution** : en-tête (nom, description, « Réglages » en haut à
  droite), quota et bloc Assistant côte à côte, sans carte, puis activité ; colonne
  latérale seulement pour l'appel d'essai.
- **Réglages** : onglets à gauche, fiches « libellé / valeur / action ».

## Mouvement

Transitions de couleur et d'opacité (150 ms), ouverture des menus, chargement,
traits du hero, défilement doux vers une section de la même page (lien
`/#…`). Pas d'animation déclenchée par le défilement. « Réduire les
animations » coupe tout.

## Ton

- Vouvoiement, phrases courtes (20 mots au plus), une idée par phrase.
- On dit ce que fait la solution, pour qui, ce que le client y gagne.
- Pas de tiret long comme ponctuation.
- Aucun chiffre, avis ou logo non vérifiable.
- Mots interdits : transformer, révolutionner, booster, tout-en-un, clé en main,
  sans effort, puissant, magique, innovant, seamless, « en quelques clics ».
- **Aucun texte en dur** : toute chaîne visible passe par `messages/fr.json`
  (test `src/no-hardcoded-text.test.ts`).
