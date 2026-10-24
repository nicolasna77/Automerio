// Logo « Écoute » (DESIGN.md, Logo) : un A ouvert à bouts ronds et une
// pastille en son cœur, tracés en contours pleins sur une grille de 256.
// Coupe renforcée (traits plus épais, pastille plus grosse), celle qui reste
// lisible dans la tuile, du favicon de 16 px à l'icône Apple.
export const LOGO_MARK_PATH =
  "M27.38 197.82L107.38 35.82A23 23 0 0 1 148.62 35.82L228.62 197.82A23 23 0 0 1 187.38 218.18L128 97.94L68.62 218.18A23 23 0 0 1 27.38 197.82ZM104 172a24 24 0 1 0 48 0a24 24 0 1 0 -48 0Z";

// Place le A dans sa tuile de 256 : 60 % de la tuile, centré un peu au-dessus
// du milieu (centre optique, la pastille alourdit le bas).
export const LOGO_MARK_TRANSFORM = "translate(128 123) scale(0.6) translate(-128 -128)";

// Coins de la tuile : 9/32 du côté, comme l'ancien logo.
export const LOGO_TILE_RADIUS = 72;
