# Logos de plateformes

Ces fichiers sont les **assets officiels** de Meta, téléchargés au
[Meta Brand Resource Center](https://www.meta.com/brand/resources/). Ils ne
sont pas redessinés : Meta impose d'utiliser ses propres fichiers.

| Fichier | Source | Asset exact |
| --- | --- | --- |
| `whatsapp.svg` | [WhatsApp brand](https://www.meta.com/brand/resources/whatsapp/whatsapp-brand/) | `01_Glyph / 01_Digital RGB / 03_SVG / Digital_Glyph_Green_RGB_2026.svg`, intact |
| `messenger.svg` | [Messenger icon](https://www.meta.com/brand/resources/facebook/messenger-icon/) | `Messenger Icon / Primary Icon / Messenger_Icon_Primary_Blue.svg`, intact |
| `instagram.png` | [Instagram brand](https://www.meta.com/brand/resources/instagram/instagram-brand/) | `01 Static Glyph / 01 Gradient Glyph / Instagram_Glyph_Gradient.png`, **redimensionné** de 5000×5000 à 128×128 |

Le glyphe Instagram dégradé n'existe en SVG qu'avec un PNG de 10,9 Mo encapsulé
dedans : inutilisable sur une page. On part donc du PNG officiel, réduit. Le
redimensionnement est la seule transformation autorisée par les guidelines
(« Logo dimensions may be adjusted to fit layout needs »).

## Ce qu'on n'a pas le droit d'en faire

Les règles de Meta, reprises telles quelles :

- **Ne pas recolorer, déformer ni recadrer.** D'où `ServiceGlyph`
  (`src/components/service-glyph.tsx`), qui rend ces fichiers sans la pastille
  `bg-primary/10 text-primary` appliquée aux icônes maison.
- **Ne pas combiner** le logo avec le nôtre, un autre logo ou un terme
  générique.
- **Ne pas en faire l'élément le plus visible** de la page.
- **Ne rien laisser entendre** d'un partenariat, d'un parrainage ou d'un
  agrément. D'où la mention du pied de page (`src/components/site-footer.tsx`).
- **Ne pas employer la marque dans le nom d'une prestation.** Les prestations
  s'appellent donc « Réponses automatiques **sur** WhatsApp », pas « Assistant
  WhatsApp ».

Si Meta met ses assets à jour, remplacer les fichiers ici — ne pas les retoucher.
