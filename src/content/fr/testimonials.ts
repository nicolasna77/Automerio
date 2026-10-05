// Avis de clients réels, affichés sur l'accueil. DESIGN.md interdit tout avis
// inventé : un avis n'entre ici qu'avec l'accord écrit du client, daté, et la
// trace de cet accord (e-mail, formulaire). Tant que la liste est vide, la
// section ne s'affiche pas.
export type Testimonial = {
  // Citation telle que le client l'a validée, 220 caractères au plus.
  quote: string;
  name: string;
  // Métier et ville, par exemple « Plombier à Lyon ».
  role: string;
  company: string;
  // Date de l'accord écrit, au format AAAA-MM-JJ.
  consentDate: string;
  // Où retrouver cet accord : fil d'e-mail, demande d'aide, formulaire.
  consentSource: string;
};

export const TESTIMONIALS: Testimonial[] = [];
