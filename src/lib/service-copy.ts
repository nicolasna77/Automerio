import type { Faq } from "@/lib/site";

export type ServiceBenefit = { title: string; description: string };

export type ServiceUseCase = { audience: string; scenario: string };

export type ServiceCopy = {
  intro: string;
  benefits: ServiceBenefit[];
  useCases?: ServiceUseCase[];
  faq: Faq[];
};

/**
 * Le texte de vente des pages `/prestations/[slug]`. Il vit dans le depot et
 * non dans la table `Service`, qui porte ce que l'admin change seul (nom,
 * description courte, prix, plafond) : cette copie-ci se relit, se versionne
 * et se teste avec le site. Une solution sans entree ici rend une page sans
 * ces sections, jamais une page cassee.
 */
export const SERVICE_COPY: Record<string, ServiceCopy> = {
  "standard-telephonique-ia": {
    intro:
      "Vous êtes sur un chantier, en rendez-vous ou en pleine prestation : le téléphone sonne, et personne ne peut décrocher. L'assistant répond dès la première sonnerie, à toute heure, renseigne vos horaires, votre adresse et vos délais, puis vous transfère l'appel quand le motif l'exige. Chaque appel vous est ensuite résumé dans votre tableau de bord.",
    benefits: [
      {
        title: "Plus un seul appel qui sonne dans le vide",
        description:
          "Un appelant qui tombe sur une messagerie rappelle rarement : il compose le numéro suivant. Là, il obtient une réponse à midi, à 21 h et le dimanche.",
      },
      {
        title: "Vous n'êtes dérangé que pour ce qui le mérite",
        description:
          "Horaires, adresse, tarifs : l'assistant répond seul. Vous décidez des motifs qui justifient un transfert, et seuls ceux-là arrivent jusqu'à vous.",
      },
      {
        title: "Vous rappelez en sachant déjà de quoi il s'agit",
        description:
          "Le numéro, le motif, ce qui a été dit : tout est noté. Vous préparez votre rappel en dix secondes au lieu de repartir de zéro.",
      },
    ],
    useCases: [
      {
        audience: "Plomberie",
        scenario:
          "Un client appelle pour une fuite pendant que vous êtes sous un évier : l'assistant relève l'adresse et la nature du problème, et vous passe l'appel si vous avez classé « urgence » comme motif de transfert.",
      },
      {
        audience: "Cabinet paramédical",
        scenario:
          "Entre 12 h et 14 h, les appels ne finissent plus sur le répondeur : ils sont traités, et vous les retrouvez classés en reprenant les consultations.",
      },
      {
        audience: "Commerce en période de fêtes",
        scenario:
          "Dix personnes appellent en même temps pour connaître vos horaires : chacune obtient sa réponse, sans file d'attente ni musique.",
      },
    ],
    faq: [
      {
        question: "Est-ce que je garde mon numéro actuel ?",
        answer:
          "Oui. Un numéro dédié est attribué à l'assistant, et vous activez un renvoi d'appel depuis votre ligne actuelle : vos clients continuent de composer le numéro qu'ils connaissent. Le renvoi se désactive quand vous le souhaitez, sans portabilité ni coupure.",
      },
      {
        question: "Que se passe-t-il si je dépasse les minutes incluses ?",
        answer:
          "Les minutes au-delà du forfait sont facturées au tarif affiché sur cette page, à la minute. Votre consommation et le dépassement estimé sont visibles dans votre tableau de bord, page Abonnements, avant le prélèvement.",
      },
      {
        question: "Mes clients savent-ils qu'ils parlent à un assistant ?",
        answer:
          "L'assistant se présente avec le message d'accueil que vous écrivez à l'activation, et vous pouvez le modifier ensuite depuis votre tableau de bord. Rien n'est dit en votre nom sans que vous l'ayez validé.",
      },
    ],
  },

  "prise-rdv-telephone": {
    intro:
      "Prendre un rendez-vous au téléphone, c'est trois minutes d'échange, un agenda à ouvrir et une note à ne pas perdre — multiplié par le nombre d'appels de la journée. L'assistant propose vos créneaux réellement libres et inscrit le rendez-vous dans votre agenda. Il peut aussi prendre les commandes, à partir de votre carte et de vos prix.",
    benefits: [
      {
        title: "Votre agenda se remplit pendant que vous travaillez",
        description:
          "L'assistant lit vos disponibilités réelles, propose un créneau et l'inscrit. Vous ouvrez votre journée déjà organisée.",
      },
      {
        title: "Des commandes prises sans erreur de note",
        description:
          "Vos produits, vos prix, votre zone de livraison : l'assistant s'y tient, et récapitule la commande à l'appelant avant de la valider.",
      },
      {
        title: "Jamais deux clients sur le même créneau",
        description:
          "Le rendez-vous est écrit dans votre agenda pendant l'appel : le créneau disparaît aussitôt des propositions suivantes.",
      },
    ],
    useCases: [
      {
        audience: "Pizzeria",
        scenario:
          "Entre 19 h et 21 h, les appels s'enchaînent : les commandes sont prises et récapitulées pendant que vous êtes au four.",
      },
      {
        audience: "Coach sportif",
        scenario:
          "Un prospect appelle pendant une séance : il repart avec un créneau d'essai réservé, au lieu d'un répondeur.",
      },
      {
        audience: "Salon de coiffure",
        scenario:
          "Deux clientes appellent pendant une couleur : les deux rendez-vous sont posés sans interrompre la prestation en cours.",
      },
    ],
    faq: [
      {
        question: "Avec quel agenda est-ce que ça fonctionne ?",
        answer:
          "Votre agenda Google se connecte depuis votre tableau de bord, et les rendez-vous s'y écrivent pendant l'appel. Si vous utilisez un autre outil de réservation, vous renseignez son lien à l'activation.",
      },
      {
        question: "Peut-il prendre des commandes en plus des rendez-vous ?",
        answer:
          "Oui, les deux objectifs se combinent : l'assistant identifie la demande de l'appelant. Pour les commandes, il travaille à partir de la carte, des prix et de la zone de livraison que vous renseignez.",
      },
      {
        question: "Combien de temps d'appel est compris ?",
        answer:
          "Le forfait mensuel inclut le volume de minutes indiqué sur cette page ; au-delà, chaque minute est facturée au tarif affiché. Vous suivez la consommation dans votre tableau de bord.",
      },
    ],
  },

  "assistant-whatsapp": {
    intro:
      "Sur WhatsApp, un client qui pose une question attend une réponse dans la minute, pas le lendemain soir. L'assistant répond à votre place aux questions que vous avez renseignées — horaires, tarifs, délais, disponibilités — et les conversations restent dans votre compte WhatsApp Business, où vous reprenez la main quand vous le voulez.",
    benefits: [
      {
        title: "Une réponse en quelques secondes, à toute heure",
        description:
          "Le message de 22 h n'attend plus le lendemain matin : votre client obtient son information pendant qu'il y pense, donc pendant qu'il hésite encore.",
      },
      {
        title: "Vos questions fréquentes traitées une fois pour toutes",
        description:
          "Vous écrivez vos réponses une fois à l'activation. L'assistant les sert ensuite à chaque demande, sans que vous retapiez la même phrase.",
      },
      {
        title: "L'assistant ne dit que ce que vous avez validé",
        description:
          "Il répond à partir de vos réponses : aucune improvisation sur vos prix ni sur vos délais.",
      },
    ],
    useCases: [
      {
        audience: "Artisan",
        scenario:
          "Un client demande un samedi matin si vous intervenez dans sa commune : il a la réponse avant même que vous ayez ouvert le message.",
      },
      {
        audience: "Institut de beauté",
        scenario:
          "« Vous avez de la place cette semaine ? », posé quinze fois par jour, n'occupe plus personne à l'accueil.",
      },
      {
        audience: "Restaurant",
        scenario:
          "Les questions d'horaires, d'adresse et d'allergènes reçoivent toujours la même réponse : celle que vous avez écrite.",
      },
    ],
    faq: [
      {
        question: "Faut-il un compte WhatsApp Business ?",
        answer:
          "Oui. Vous indiquez votre numéro WhatsApp Business à l'activation, et l'équipe Automerio se charge de la connexion. Vous n'avez aucun outil technique à installer.",
      },
      {
        question: "Puis-je répondre moi-même à un client ?",
        answer:
          "À tout moment. Les conversations restent dans votre compte WhatsApp Business : vous les relisez et vous reprenez la main dès qu'un échange mérite votre voix.",
      },
      {
        question: "Qui décide de ce que l'assistant répond ?",
        answer:
          "Vous. Il répond à partir des questions fréquentes que vous renseignez, et vous pouvez les modifier depuis votre tableau de bord une fois la solution active.",
      },
    ],
  },

  "assistant-facebook": {
    intro:
      "Les messages de votre Page arrivent le soir, le week-end, pendant que vous servez un client. L'assistant y répond dès leur arrivée à partir de vos questions fréquentes, et les conversations restent dans la boîte de réception de votre Page, où vous pouvez reprendre la main.",
    benefits: [
      {
        title: "Les messages de votre Page ne dorment plus",
        description:
          "Un visiteur qui écrit à deux entreprises retient celle qui répond la première. Là, c'est vous, même à 23 h.",
      },
      {
        title: "Vos réponses types, servies sans vous",
        description:
          "Tarifs, horaires, zone d'intervention : vous les renseignez une fois, l'assistant les redonne à chaque demande.",
      },
      {
        title: "Vous gardez la main sur la conversation",
        description:
          "Tout reste dans la messagerie de votre Page : vous relisez les échanges et reprenez la discussion quand elle mérite votre voix.",
      },
    ],
    useCases: [
      {
        audience: "Garage",
        scenario:
          "« Vous faites le changement de pneus sans rendez-vous ? », envoyé un dimanche, trouve sa réponse tout de suite.",
      },
      {
        audience: "Salle de sport",
        scenario:
          "Les demandes de tarifs arrivées pendant un cours reçoivent le détail des formules sans attendre la fin de la séance.",
      },
      {
        audience: "Fleuriste",
        scenario:
          "À l'approche d'une fête, les questions sur les horaires et les livraisons sont absorbées sans mobiliser la boutique.",
      },
    ],
    faq: [
      {
        question: "Qu'est-ce qu'il faut de mon côté ?",
        answer:
          "Le nom de votre Page Facebook, et rien d'autre : la connexion est faite par l'équipe Automerio depuis votre tableau de bord. Aucun logiciel à installer.",
      },
      {
        question: "Les conversations restent-elles dans ma Page ?",
        answer:
          "Oui, tout se passe dans la messagerie de votre Page. Vous relisez les échanges et vous reprenez la discussion quand vous le souhaitez.",
      },
      {
        question: "Puis-je changer les réponses après l'installation ?",
        answer:
          "Oui. Vos questions fréquentes se modifient depuis votre tableau de bord, et l'assistant s'appuie sur la nouvelle version dès l'enregistrement.",
      },
    ],
  },

  "assistant-instagram": {
    intro:
      "Une publication qui marche, ce sont trente messages privés dans la foulée — et presque toujours les trois mêmes questions. L'assistant y répond à partir de ce que vous avez renseigné, et les conversations restent dans votre compte, où vous reprenez la main dès qu'un échange le mérite.",
    benefits: [
      {
        title: "Vos messages privés suivent le rythme de vos publications",
        description:
          "Une story qui fonctionne ne vous laisse plus trente messages à traiter le lendemain : ils ont déjà une réponse.",
      },
      {
        title: "Toujours les mêmes questions, plus jamais à retaper",
        description:
          "Prix, disponibilités, adresse : l'assistant donne la réponse que vous avez écrite, à toute heure.",
      },
      {
        title: "Un intérêt capté ne refroidit plus",
        description:
          "Entre le message et votre réponse, il ne s'écoule plus une journée : votre interlocuteur est encore là.",
      },
    ],
    useCases: [
      {
        audience: "Tatoueur",
        scenario:
          "Les demandes de devis arrivées la nuit repartent avec vos tarifs et votre délai de prise de rendez-vous.",
      },
      {
        audience: "Coach",
        scenario:
          "Après une story sur une nouvelle offre, chaque message privé reçoit le détail des formules sans que vous quittiez votre séance.",
      },
      {
        audience: "Boutique",
        scenario:
          "« C'est encore disponible ? » trouve une réponse immédiate, avec vos horaires d'ouverture.",
      },
    ],
    faq: [
      {
        question: "Mon compte Instagram doit-il être professionnel ?",
        answer:
          "Oui, la messagerie automatisée passe par un compte professionnel — c'est le cas de la plupart des comptes d'entreprise. L'équipe vérifie ce point avec vous à l'activation.",
      },
      {
        question: "L'assistant répond-il aussi aux commentaires publics ?",
        answer:
          "Non, il traite les messages privés. Vos publications et leurs commentaires restent entièrement entre vos mains.",
      },
      {
        question: "Et si un message sort de ce que j'ai prévu ?",
        answer:
          "L'assistant s'en tient à ce que vous avez renseigné : il n'improvise ni sur vos prix, ni sur vos délais. La conversation vous attend dans votre compte.",
      },
    ],
  },

  "reponses-emails": {
    intro:
      "Une boîte mail de TPE, c'est cent messages par semaine dont dix comptent vraiment. Le tri se fait selon vos règles, les messages qui comptent remontent, et des brouillons de réponse vous attendent. Rien ne part sans vous : vous relisez, vous corrigez, vous envoyez.",
    benefits: [
      {
        title: "Votre boîte est déjà triée quand vous l'ouvrez",
        description:
          "Les messages arrivent classés selon vos règles : une facture part au comptable, une demande de devis remonte en tête.",
      },
      {
        title: "La réponse est écrite, il reste à la relire",
        description:
          "Les demandes récurrentes ont leur brouillon prêt, dans vos mots. Répondre devient une relecture de trente secondes.",
      },
      {
        title: "Vous gardez le dernier mot",
        description:
          "Aucun e-mail n'est envoyé à votre place : l'assistant prépare, vous décidez.",
      },
    ],
    useCases: [
      {
        audience: "Artisan",
        scenario:
          "Les demandes de devis sont isolées du reste et attendent en haut de la pile, avec un brouillon de réponse.",
      },
      {
        audience: "Cabinet de conseil",
        scenario:
          "Les pièces comptables partent directement au bon interlocuteur, sans transfert manuel chaque semaine.",
      },
      {
        audience: "Boutique en ligne",
        scenario:
          "« Où en est ma commande ? », posé dix fois par jour, a sa réponse prête à envoyer.",
      },
    ],
    faq: [
      {
        question: "L'assistant envoie-t-il des e-mails à ma place ?",
        answer:
          "Non. Il trie, il priorise et il prépare des brouillons. C'est vous qui relisez, corrigez et envoyez : rien ne part sans votre geste.",
      },
      {
        question: "Avec quelle messagerie ça marche ?",
        answer:
          "Gmail ou Outlook. La connexion de votre boîte est finalisée par l'équipe Automerio, vous n'avez pas de paramétrage technique à faire.",
      },
      {
        question: "Qui définit les règles de tri ?",
        answer:
          "Vous, à l'activation — par exemple : un message qui contient « facture » part au comptable. Les règles se modifient ensuite depuis votre tableau de bord.",
      },
    ],
  },

  "prise-rdv-automatique": {
    intro:
      "Trouver une date par messages interposés prend trois allers-retours et deux jours. Là, votre client voit vos disponibilités réelles et réserve lui-même ; le rendez-vous s'inscrit dans votre agenda, à la durée que vous avez fixée.",
    benefits: [
      {
        title: "Des rendez-vous pris pendant que vous dormez",
        description:
          "La réservation reste ouverte jour et nuit — y compris le dimanche soir, le moment où beaucoup de gens s'occupent enfin de ce genre de choses.",
      },
      {
        title: "Plus d'aller-retour pour caler une date",
        description:
          "« Vous êtes dispo jeudi ? » disparaît : votre client choisit dans ce que vous avez ouvert, et c'est réglé.",
      },
      {
        title: "Votre agenda reste la seule référence",
        description:
          "Les créneaux proposés sont ceux qui sont réellement libres. Ce que vous bloquez n'est jamais proposé.",
      },
    ],
    useCases: [
      {
        audience: "Kinésithérapeute",
        scenario:
          "Les patients réservent leur séance de suivi sans appeler, sur les créneaux que vous avez ouverts.",
      },
      {
        audience: "Consultant",
        scenario:
          "Un prospect pose lui-même son premier rendez-vous depuis votre page, à la durée que vous avez fixée.",
      },
      {
        audience: "Toiletteur",
        scenario:
          "Le planning du samedi se remplit dans la semaine, sans un appel pendant les rendez-vous.",
      },
    ],
    faq: [
      {
        question: "Quelle différence avec la prise de rendez-vous par téléphone ?",
        answer:
          "Ici, votre client réserve lui-même en ligne sur vos créneaux libres. L'autre solution décroche le téléphone à votre place. Les deux se cumulent si vos clients utilisent les deux canaux.",
      },
      {
        question: "Un créneau déjà occupé peut-il être réservé ?",
        answer:
          "Non. Votre agenda connecté fait foi : ce qui y est bloqué n'est jamais proposé, et un créneau réservé disparaît aussitôt.",
      },
      {
        question: "Puis-je fixer la durée des rendez-vous ?",
        answer:
          "Oui : 15, 30, 45 ou 60 minutes, avec les plages horaires que vous ouvrez jour par jour. Tout se règle à l'activation et se modifie ensuite.",
      },
    ],
  },

  "resume-pdf": {
    intro:
      "Un contrat de quarante pages, un rapport d'expertise, un devis fournisseur : vous les recevez, vous n'avez pas le temps de les lire, et ils finissent lus trop tard. Déposez-les dans le dossier convenu ; vous recevez l'essentiel, en points clés ou en synthèse détaillée selon ce que vous avez choisi.",
    benefits: [
      {
        title: "Quarante pages tiennent en quelques lignes",
        description:
          "Vous savez ce que contient le document avant de décider s'il mérite une lecture complète.",
      },
      {
        title: "Vous récupérez vos soirées",
        description:
          "Les documents reçus dans la journée sont résumés sans que vous ayez à les rouvrir après la fermeture.",
      },
      {
        title: "Le niveau de détail que vous voulez",
        description:
          "Points clés pour trancher vite, synthèse détaillée quand l'enjeu le mérite : c'est un réglage, pas une prestation supplémentaire.",
      },
    ],
    useCases: [
      {
        audience: "Entreprise du bâtiment",
        scenario:
          "Les pièces d'un marché sont ramenées à leurs délais, pénalités et obligations avant que vous décidiez d'y répondre.",
      },
      {
        audience: "Dirigeant de TPE",
        scenario:
          "Un contrat d'assurance ou de prestataire est résumé avant signature, garanties et durée d'engagement en tête.",
      },
      {
        audience: "Consultant",
        scenario:
          "Les rapports reçus d'un client sont lus pour vous, et vous arrivez en réunion en sachant ce qu'ils disent.",
      },
    ],
    faq: [
      {
        question: "Comment est-ce que je transmets mes documents ?",
        answer:
          "Vous les déposez dans le dossier convenu à l'activation — Drive, Dropbox ou une boîte mail dédiée. Le résumé revient sans autre manipulation.",
      },
      {
        question: "Quelle longueur fait un résumé ?",
        answer:
          "Celle que vous choisissez : points clés pour trancher vite, ou synthèse détaillée quand l'enjeu le mérite. C'est un réglage, modifiable à tout moment.",
      },
      {
        question: "Que deviennent mes documents ?",
        answer:
          "Ils restent dans vos outils et vos dossiers. Nous ne les revendons ni ne les partageons avec des tiers.",
      },
    ],
  },

  "resume-reunions": {
    intro:
      "Prendre des notes en réunion, c'est écouter à moitié. L'enregistrement ou la transcription part dans l'automatisation, et le compte-rendu revient structuré : ce qui a été décidé, ce qui reste à faire, et par qui. Le consentement des participants est demandé à l'activation — une réunion ne s'enregistre pas à leur insu.",
    benefits: [
      {
        title: "Vous suivez la réunion au lieu de la transcrire",
        description:
          "Vous écoutez, vous répondez, vous négociez. Le compte-rendu, lui, s'écrit tout seul.",
      },
      {
        title: "Un compte-rendu prêt le jour même",
        description:
          "Plus de notes qui dorment sur un carnet : le document part pendant que la réunion est encore fraîche dans les têtes.",
      },
      {
        title: "Ce qui a été décidé est écrit noir sur blanc",
        description:
          "Deux mois plus tard, la version écrite tranche les « on avait dit » — avec un client comme avec une équipe.",
      },
    ],
    useCases: [
      {
        audience: "Bureau d'études",
        scenario:
          "Le compte-rendu de réunion de chantier est diffusé le soir même, avec les points à lever et leurs responsables.",
      },
      {
        audience: "Coach",
        scenario:
          "Chaque séance laisse une trace écrite, que la personne accompagnée retrouve entre deux rendez-vous.",
      },
      {
        audience: "PME",
        scenario:
          "Le point hebdomadaire produit une liste de décisions, sans mobiliser quelqu'un pour la rédiger.",
      },
    ],
    faq: [
      {
        question: "Faut-il prévenir les participants ?",
        answer:
          "Oui, et c'est vérifié : l'activation reste bloquée tant que vous n'avez pas confirmé le consentement des participants. Une réunion ne s'enregistre pas à leur insu.",
      },
      {
        question: "Quels outils de visioconférence sont acceptés ?",
        answer:
          "Zoom, Teams et Meet, ou le dépôt manuel de vos enregistrements dans un dossier si vous préférez garder la main.",
      },
      {
        question: "Que contient le compte-rendu ?",
        answer:
          "Ce qui a été décidé, ce qui reste à faire et par qui — en points clés ou en compte-rendu détaillé, selon le format que vous avez choisi.",
      },
    ],
  },

  "ocr-lecture-automatique": {
    intro:
      "Une facture scannée, un bon de livraison photographié : les données sont là, mais il faut encore les retaper dans votre outil de gestion. L'automatisation les lit et les transmet à l'outil que vous utilisez déjà, pour les types de documents que vous avez déclarés prioritaires.",
    benefits: [
      {
        title: "La ressaisie s'arrête",
        description:
          "Montants, dates, numéros, fournisseur : les champs partent directement dans votre outil de gestion.",
      },
      {
        title: "Une erreur de recopie coûte plus cher qu'elle n'en a l'air",
        description:
          "Un chiffre inversé se paie en rapprochement bancaire ou en relance client. Les données transmises sont celles du document.",
      },
      {
        title: "Vos documents papier redeviennent exploitables",
        description:
          "Un scan devient une ligne dans votre outil, et non plus un PDF dans un dossier que personne ne rouvre.",
      },
    ],
    useCases: [
      {
        audience: "Entreprise du bâtiment",
        scenario:
          "Les bons de livraison photographiés sur le chantier remontent dans la gestion sans passer par le bureau.",
      },
      {
        audience: "Commerce",
        scenario:
          "Les factures fournisseurs reçues en PDF sont saisies au fil de l'eau, pas la veille de la clôture.",
      },
      {
        audience: "TPE de services",
        scenario:
          "Les notes de frais photographiées arrivent classées, avec leurs montants, sans ressaisie en fin de mois.",
      },
    ],
    faq: [
      {
        question: "Avec quel outil de gestion ça fonctionne ?",
        answer:
          "Vous indiquez le vôtre à l'activation : l'équipe met en place la connexion, ou la remise des données dans le format qu'il attend. Vous ne changez pas d'outil.",
      },
      {
        question: "Une photo prise au téléphone suffit-elle ?",
        answer:
          "Oui, dès lors que le document est lisible : un scan ou une photo nette déposée dans le dossier de réception fait l'affaire.",
      },
      {
        question: "Quels documents sont traités ?",
        answer:
          "Ceux que vous déclarez prioritaires à l'activation — factures fournisseurs, bons de livraison, notes de frais. La liste se complète ensuite.",
      },
    ],
  },

  "support-prioritaire": {
    intro:
      "Chaque solution inclut déjà son suivi mensuel et son support. Cet abonnement y ajoute un accompagnement dédié : vos demandes passent devant, et votre interlocuteur connaît votre installation sans que vous ayez à la réexpliquer.",
    benefits: [
      {
        title: "Vos demandes traitées en priorité",
        description:
          "Quand quelque chose coince un lundi matin, vous ne prenez pas votre tour dans la file.",
      },
      {
        title: "Un interlocuteur qui connaît votre installation",
        description:
          "Vos automatisations, vos outils, vos habitudes : aucun contexte à réexpliquer à chaque échange.",
      },
      {
        title: "Des ajustements sans attendre le point mensuel",
        description:
          "Un horaire qui change, un message d'accueil à reformuler, une règle de tri à revoir : c'est fait au fil de l'eau.",
      },
    ],
    faq: [
      {
        question: "Le support n'est-il pas déjà inclus ?",
        answer:
          "Si. Chaque solution inclut son support et son suivi mensuel. Cet abonnement y ajoute un traitement prioritaire de vos demandes et un interlocuteur qui suit votre installation.",
      },
      {
        question: "Y a-t-il un engagement ou des frais d'installation ?",
        answer:
          "Ni l'un ni l'autre : c'est un abonnement mensuel, sans frais de mise en place, résiliable à tout moment depuis votre tableau de bord.",
      },
      {
        question: "Qui me répond ?",
        answer:
          "L'équipe qui a installé vos automatisations, et qui connaît vos outils et vos réglages — pas un support générique à qui tout réexpliquer.",
      },
    ],
  },
};

export function getServiceCopy(slug: string): ServiceCopy | null {
  return SERVICE_COPY[slug] ?? null;
}
