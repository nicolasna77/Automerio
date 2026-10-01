import type { Trade } from "@/lib/trades";

// Pages « Automerio pour… » : une par métier. Chaque promesse correspond à ce
// que font réellement les solutions actives du catalogue ; aucun chiffre ni
// avis inventé (DESIGN.md, Ton des textes).
export const TRADES: Trade[] = [
  {
    slug: "tradespeople",
    name: "Artisans",
    audience: "artisans",
    metaTitle: "Standard téléphonique pour artisan : ne ratez plus un appel",
    metaDescription:
      "Plombiers, électriciens, chauffagistes : un assistant répond à vos appels pendant que vous êtes sur un chantier, vous transfère les urgences et prend vos rendez-vous.",
    title: "Vos appels sont pris pendant que vous êtes sur le chantier",
    lead: "Un assistant répond à votre place, vous transfère les urgences et note les demandes de devis. Vous rappelez quand vous avez les mains libres.",
    trades: "Plombiers, électriciens, chauffagistes, menuisiers, couvreurs",
    pains: [
      {
        title: "Le téléphone sonne au mauvais moment",
        description: "Les mains dans une chaudière ou en haut d'une échelle, vous ne pouvez pas décrocher. L'appelant compose le numéro suivant.",
      },
      {
        title: "Une urgence noyée parmi les devis",
        description: "Une fuite et une demande de devis arrivent de la même façon. Sans décrocher, impossible de savoir laquelle ne peut pas attendre.",
      },
      {
        title: "Les rappels du soir",
        description: "Le soir, vous rappelez les messages de la journée. Certains clients ont déjà trouvé quelqu'un d'autre.",
      },
    ],
    call: {
      company: "Plomberie Martin",
      turns: [
        { speaker: "assistant", text: "Bonjour, vous êtes bien chez Plomberie Martin. Je suis l'assistant virtuel de l'entreprise. Que puis-je faire pour vous ?" },
        { speaker: "caller", text: "J'ai une fuite sous l'évier, l'eau coule partout." },
        { speaker: "assistant", text: "C'est une urgence. Quelle est votre adresse ? Je vous mets en relation avec le technicien tout de suite." },
        { speaker: "caller", text: "12 rue des Lilas, à Villeurbanne." },
        { speaker: "assistant", text: "C'est noté. Je vous transfère." },
      ],
      result: "Appel transféré au technicien, adresse notée dans le résumé.",
    },
    solutions: [
      { slug: "standard-telephonique-ia", why: "Répond à chaque appel, vous transfère les urgences que vous avez choisies et prend un message pour le reste." },
      { slug: "prise-rdv-telephone", why: "Propose un créneau pour un devis ou un entretien et l'inscrit dans votre agenda." },
      { slug: "assistant-whatsapp", why: "Répond aux questions fréquentes reçues sur WhatsApp : zone d'intervention, horaires, devis." },
    ],
    faq: [
      {
        question: "Comment l'assistant reconnaît-il une urgence ?",
        answer: "Vous choisissez vous-même les motifs urgents, par exemple une fuite, un dégât des eaux ou une panne de chauffage, et le numéro vers lequel transférer. Pour ces motifs, l'assistant vous passe l'appel. Pour les autres, il prend un message.",
      },
      {
        question: "Je travaille seul, est-ce adapté ?",
        answer: "Oui. C'est même le cas le plus courant : l'assistant répond quand vous ne pouvez pas, et vous retrouvez chaque appel résumé dans votre tableau de bord.",
      },
      {
        question: "Les rendez-vous arrivent-ils dans mon agenda ?",
        answer: "Oui, avec Google Agenda, Cal.com ou Calendly. L'assistant propose un créneau libre et l'inscrit directement.",
      },
      {
        question: "Mes clients gardent-ils mon numéro habituel ?",
        answer: "Oui. Un renvoi d'appel passe votre ligne actuelle à l'assistant. Vos clients composent le même numéro qu'avant.",
      },
    ],
  },
  {
    slug: "hair-beauty",
    name: "Coiffure et beauté",
    audience: "salons de coiffure et instituts de beauté",
    metaTitle: "Prise de rendez-vous pour coiffeur et institut de beauté",
    metaDescription:
      "Un assistant prend les réservations par téléphone pendant vos prestations et répond aux messages Instagram et Messenger. Les rendez-vous arrivent dans votre agenda.",
    title: "Les réservations sont prises pendant que vous êtes avec une cliente",
    lead: "Un assistant répond au téléphone, propose un créneau libre et l'inscrit dans votre agenda. Vous ne lâchez plus les ciseaux pour décrocher.",
    trades: "Salons de coiffure, barbiers, instituts de beauté, esthéticiennes, ongleries",
    pains: [
      {
        title: "Décrocher en pleine prestation",
        description: "Une couleur à poser, une coupe en cours : répondre au téléphone interrompt la cliente qui est devant vous.",
      },
      {
        title: "Un appel manqué, une place vide",
        description: "La personne qui n'a pas pu réserver ne rappelle pas toujours. Le créneau reste libre.",
      },
      {
        title: "Les mêmes questions en message",
        description: "Les tarifs, les horaires, le parking : les mêmes questions reviennent sur Instagram et Messenger, souvent le soir.",
      },
    ],
    call: {
      company: "Salon Élégance",
      turns: [
        { speaker: "assistant", text: "Bonjour, bienvenue au Salon Élégance. Je suis l'assistant virtuel du salon. Que puis-je faire pour vous ?" },
        { speaker: "caller", text: "Je voudrais un rendez-vous pour une coupe samedi." },
        { speaker: "assistant", text: "J'ai un créneau samedi à 10 h 30. Cela vous convient ?" },
        { speaker: "caller", text: "Parfait." },
        { speaker: "assistant", text: "C'est réservé. À samedi." },
      ],
      result: "Rendez-vous inscrit dans l'agenda du salon.",
    },
    solutions: [
      { slug: "prise-rdv-telephone", why: "Prend les réservations au téléphone, vérifie votre agenda et inscrit le rendez-vous sur un créneau libre." },
      { slug: "assistant-instagram", why: "Répond aux messages privés de votre compte Instagram : tarifs, horaires, adresse." },
      { slug: "assistant-facebook", why: "Répond aux messages envoyés à votre page Facebook, avec les mêmes informations." },
    ],
    faq: [
      {
        question: "L'assistant connaît-il mes prestations ?",
        answer: "Oui. Vous indiquez vos prestations, la durée d'un créneau et vos horaires dans les réglages. L'assistant vérifie votre agenda et ne propose que des créneaux libres.",
      },
      {
        question: "Et si une cliente veut annuler ?",
        answer: "L'assistant prend le message et vous le retrouvez dans votre tableau de bord, pour libérer le créneau.",
      },
      {
        question: "Les messages Instagram permettent-ils de réserver ?",
        answer: "Non. Sur Instagram et Messenger, l'assistant répond aux questions avec les informations que vous lui donnez. Pour réserver, il peut orienter vers le téléphone si vous le lui indiquez.",
      },
      {
        question: "Quel agenda puis-je utiliser ?",
        answer: "Google Agenda, Cal.com ou Calendly. Les réservations s'y inscrivent directement.",
      },
    ],
  },
  {
    slug: "coaches",
    name: "Coachs",
    audience: "coachs",
    metaTitle: "Assistant téléphonique pour coach et thérapeute",
    metaDescription:
      "Pendant vos séances, un assistant répond aux appels, note ce que la personne recherche et répond aux messages Instagram et WhatsApp. Vous rappelez entre deux rendez-vous.",
    title: "Les demandes sont prises en charge pendant vos séances",
    lead: "Un assistant répond aux appels et aux messages, note ce que la personne recherche et vous transmet un résumé. Vous restez concentré sur la séance en cours.",
    trades: "Coachs, thérapeutes, sophrologues, praticiens bien-être, formateurs",
    pains: [
      {
        title: "Le téléphone coupé pendant la séance",
        description: "Vous ne décrochez pas pendant une séance, et c'est normal. Mais un nouveau client qui tombe sur la messagerie hésite à rappeler.",
      },
      {
        title: "Des messages sur trois applications",
        description: "Instagram, WhatsApp, le téléphone : les premières questions arrivent partout, à toute heure.",
      },
      {
        title: "Du temps passé à répéter",
        description: "Le déroulé d'une séance découverte, les tarifs, les horaires : vous réexpliquez les mêmes choses plusieurs fois par semaine.",
      },
    ],
    call: {
      company: "Clara Coaching",
      turns: [
        { speaker: "assistant", text: "Bonjour, vous êtes bien chez Clara Coaching. Je suis son assistant virtuel. Que puis-je faire pour vous ?" },
        { speaker: "caller", text: "Je pense à une reconversion et j'aimerais être accompagnée." },
        { speaker: "assistant", text: "C'est l'un des accompagnements proposés. Puis-je noter votre nom et un numéro pour que Clara vous rappelle ?" },
        { speaker: "caller", text: "Camille Fournier, au 06 12 34 56 78." },
        { speaker: "assistant", text: "C'est noté. Clara vous rappelle après sa séance." },
      ],
      result: "Message pris avec le besoin de la personne. À rappeler.",
    },
    solutions: [
      { slug: "standard-telephonique-ia", why: "Répond aux appels pendant vos séances, présente votre accompagnement et note ce que la personne recherche." },
      { slug: "assistant-instagram", why: "Répond aux messages privés reçus sur Instagram : séance découverte, tarifs, déroulé." },
      { slug: "assistant-whatsapp", why: "Répond aux questions de vos clients sur WhatsApp, même le soir." },
    ],
    faq: [
      {
        question: "Mes clients déjà suivis peuvent-ils me joindre directement ?",
        answer: "Oui. Vous pouvez créer un motif de transfert, par exemple « client déjà suivi », avec votre numéro. L'assistant leur passe l'appel.",
      },
      {
        question: "L'assistant donne-t-il des conseils à ma place ?",
        answer: "Non. Il présente votre activité, répond aux questions pratiques avec les informations que vous lui donnez et prend un message. L'accompagnement reste le vôtre.",
      },
      {
        question: "Que deviennent les informations des personnes qui appellent ?",
        answer: "Elles servent à faire fonctionner votre solution et ne sont pas revendues. Vous pouvez les exporter ou les supprimer depuis votre profil.",
      },
    ],
  },
  {
    slug: "restaurants",
    name: "Restaurants",
    audience: "restaurants",
    metaTitle: "Prise de commande par téléphone pour restaurant et pizzeria",
    metaDescription:
      "Pendant le service, un assistant prend les commandes à emporter et les réservations par téléphone, avec votre menu et vos prix. Les commandes arrivent dans votre tableau de bord.",
    title: "Les commandes sont prises au téléphone, même en plein service",
    lead: "Un assistant répond aux appels, prend les commandes avec votre menu et vos prix, et note l'heure de retrait. L'équipe reste en cuisine et en salle.",
    trades: "Restaurants, pizzerias, traiteurs, boulangeries, food trucks",
    pains: [
      {
        title: "Le téléphone sonne en plein coup de feu",
        description: "Entre midi et deux ou le soir, personne n'a le temps de décrocher. Les commandes partent ailleurs.",
      },
      {
        title: "Des commandes mal notées",
        description: "Une commande prise à la volée dans le bruit, c'est un plat oublié ou une mauvaise heure de retrait.",
      },
      {
        title: "Toujours les mêmes questions",
        description: "Vous livrez dans quel quartier ? Vous êtes ouverts le dimanche ? Ces appels occupent la ligne pendant le service.",
      },
    ],
    call: {
      company: "Pizzeria Napoli",
      turns: [
        { speaker: "assistant", text: "Bonjour, bienvenue à la Pizzeria Napoli. Je suis l'assistant virtuel du restaurant. Une commande ou une réservation ?" },
        { speaker: "caller", text: "Une commande à emporter : deux Reine et une limonade." },
        { speaker: "assistant", text: "Deux Reine et une limonade. Pour quelle heure ?" },
        { speaker: "caller", text: "19 h 30." },
        { speaker: "assistant", text: "C'est noté pour 19 h 30, à votre nom. À tout à l'heure." },
      ],
      result: "Commande notée avec l'heure de retrait, visible dans le tableau de bord.",
    },
    solutions: [
      { slug: "prise-rdv-telephone", why: "Prend les commandes avec votre menu et vos prix, ou les réservations de table, et donne l'adresse de retrait." },
      { slug: "assistant-facebook", why: "Répond aux messages de votre page Facebook : horaires, zone de livraison, plats végétariens." },
      { slug: "assistant-instagram", why: "Répond aux messages privés de votre compte Instagram avec les mêmes informations." },
    ],
    faq: [
      {
        question: "Comment l'assistant connaît-il mon menu ?",
        answer: "Vous saisissez votre menu et vos prix dans les réglages, ou vous l'importez. L'assistant ne propose que ce qui y figure.",
      },
      {
        question: "Gère-t-il la livraison ?",
        answer: "Il note si la commande est à emporter ou à livrer. Si vous livrez, vous indiquez votre zone de livraison et il la donne aux clients.",
      },
      {
        question: "Où voir les commandes prises ?",
        answer: "Dans votre tableau de bord, avec le détail de la commande, le nom, le numéro du client et l'heure de retrait.",
      },
      {
        question: "Peut-il aussi prendre des réservations de table ?",
        answer: "Oui. Vous choisissez dans les réglages s'il prend des commandes, des réservations, ou les deux.",
      },
    ],
  },
  {
    slug: "professional-services",
    name: "Cabinets et TPE",
    audience: "cabinets et TPE",
    metaTitle: "Secrétariat téléphonique automatisé pour cabinet et TPE",
    metaDescription:
      "Avocats, experts-comptables, agences : un assistant répond à vos appels, oriente les clients vers la bonne personne et répond aux messages. Sans secrétariat à plein temps.",
    title: "Un accueil téléphonique professionnel, sans secrétariat à plein temps",
    lead: "Un assistant répond à chaque appel, oriente les clients vers la bonne personne et prend un message pour les nouvelles demandes. Vos clients ne tombent plus sur la messagerie.",
    trades: "Cabinets d'avocats, experts-comptables, agences immobilières, agences, petites entreprises",
    pains: [
      {
        title: "Pas de secrétariat, ou pas tout le temps",
        description: "En rendez-vous client ou en déplacement, personne ne répond au standard. L'image du cabinet en pâtit.",
      },
      {
        title: "Des appels pour la mauvaise personne",
        description: "Un client qui veut parler à son conseiller tombe sur un collègue, qui doit noter et transmettre.",
      },
      {
        title: "Des demandes sur plusieurs canaux",
        description: "Téléphone, Messenger, WhatsApp : les questions arrivent de partout et personne n'a la vue d'ensemble.",
      },
    ],
    call: {
      company: "Cabinet Durand",
      turns: [
        { speaker: "assistant", text: "Bonjour, vous êtes bien au Cabinet Durand, expertise comptable. Je suis l'assistant virtuel du cabinet. Que puis-je faire pour vous ?" },
        { speaker: "caller", text: "Je suis client, je voudrais parler à mon conseiller au sujet de ma TVA." },
        { speaker: "assistant", text: "Je vous mets en relation avec votre conseiller." },
      ],
      result: "Client du cabinet, appel transféré à la bonne personne.",
    },
    solutions: [
      { slug: "standard-telephonique-ia", why: "Répond à chaque appel, transfère selon le motif que vous avez défini et prend un message pour le reste." },
      { slug: "assistant-facebook", why: "Répond aux messages de votre page Facebook : premier rendez-vous, adresse, horaires." },
      { slug: "assistant-whatsapp", why: "Répond aux questions de vos clients sur WhatsApp et les oriente." },
    ],
    faq: [
      {
        question: "Peut-on transférer vers plusieurs personnes ?",
        answer: "Oui. Chaque motif d'appel a son numéro de transfert : un associé pour les clients du cabinet, un autre pour les urgences, par exemple.",
      },
      {
        question: "L'assistant donne-t-il des conseils juridiques ou comptables ?",
        answer: "Non. Il présente le cabinet, répond aux questions pratiques et oriente. Le conseil reste celui de vos équipes.",
      },
      {
        question: "Retrouve-t-on tous les appels au même endroit ?",
        answer: "Oui. Chaque appel est résumé dans votre tableau de bord, avec le motif, le nom de l'appelant et la suite à donner.",
      },
    ],
  },
];
