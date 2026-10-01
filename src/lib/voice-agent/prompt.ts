import {
  asRuleRows,
  asStringArray,
  readAppointmentTypes,
  WEEK_DAYS,
  WEEK_DAY_LABELS,
  type Configuration,
  type WeeklyHours,
} from "@/lib/catalog";
import {
  countCatalogItems,
  formatCatalogForAgent,
  readProductCatalog,
} from "@/lib/product-catalog";
import { asWeeklyHours, isOpenAt } from "@/lib/business-hours";
import { toneInstructionOf } from "@/lib/voice-agent/voice";

function asString(value: Configuration[string] | undefined): string {
  return typeof value === "string" ? value : "";
}

function formatWeeklyHours(hours: WeeklyHours | null): string {
  if (!hours) return "non précisés";
  return WEEK_DAYS.filter((day) => !hours[day].closed)
    .map((day) => `${WEEK_DAY_LABELS[day]} ${hours[day].open}-${hours[day].close}`)
    .join(", ") || "fermé toute la semaine";
}

// Règles communes aux assistants téléphoniques : la voix impose des phrases
// courtes et des confirmations que l'écrit n'exige pas.
function phoneStyle(configuration: Configuration): string[] {
  return [
    "## Façon de parler",
    `- ${toneInstructionOf(configuration)}`,
    "- Vouvoie toujours l'appelant. Phrases courtes, une seule question à la fois.",
    "- Ne lis jamais de longue liste : propose deux ou trois choix, puis demande ce qui convient.",
    "- Relis les numéros de téléphone chiffre par chiffre, et fais épeler les noms difficiles.",
    "- Avant de raccrocher, résume en une phrase ce qui a été noté ou réservé.",
  ];
}

function companyInstructions(configuration: Configuration): string[] {
  const callInstructions = asString(configuration.callInstructions).trim();
  return callInstructions
    ? [
        "## Consignes de l'entreprise",
        "Applique-les, sauf si elles contredisent la section « Limites et règles strictes » ci-dessous : celle-ci prime toujours.",
        callInstructions,
      ]
    : [];
}

// Placées après les consignes de l'entreprise, qu'elles priment : ce que
// l'assistant ne peut pas faire (faute d'outil, d'agenda ou de carte) ne doit
// jamais être promis, même si un modèle de consignes en parle.
function strictRules(limits: string[]): string[] {
  return [
    "## Limites et règles strictes",
    ...limits.map((limit) => `- ${limit}`),
    "- Ne confirme jamais une réservation, un rendez-vous ou une commande que tu n'as pas enregistré avec un outil.",
    "- N'invente jamais de prix, de disponibilité, de délai ni d'information absente de ces consignes.",
    "- Si tu ne sais pas répondre, dis-le simplement et propose de prendre un message.",
    "- Ne donne aucun avis médical, juridique ou financier.",
  ];
}

function buildPriseRdvPrompt(
  configuration: Configuration,
  companyName: string,
  calendarConnected: boolean,
  collectsEmail: boolean,
  fixedDurationMinutes: number | null = null
): string {
  const objectives = asStringArray(configuration.objectives);
  const canBookAppointments = objectives.includes("appointment") && calendarConnected;
  const takesOrders = objectives.includes("order");

  const lines = [
    "## Rôle",
    `Tu es l'assistant virtuel de ${companyName}, au téléphone. Tu réponds en français.`,
    `Commence l'appel en présentant ${companyName} en une phrase, puis présente-toi comme son assistant virtuel.`,
    `Horaires d'ouverture : ${formatWeeklyHours(asWeeklyHours(configuration.businessHours))}.`,
    ...phoneStyle(configuration),
    "## Déroulé de l'appel",
  ];

  if (canBookAppointments) {
    const appointmentTypes = readAppointmentTypes(configuration.appointmentTypes);
    const slotDuration = asString(configuration.slotDuration);
    const defaultMinutes = Number.parseInt(slotDuration, 10) || null;
    const durationOf = (minutes: number | null) => minutes ?? defaultMinutes;
    lines.push(
      "Rendez-vous : demande le motif, puis le jour et le moment qui conviennent. Vérifie le",
      "créneau avec check_availability avant de le proposer. Une fois l'appelant d'accord,",
      "demande son nom et son numéro de téléphone, puis réserve avec book_appointment.",
      collectsEmail
        ? "Propose-lui de donner son adresse e-mail pour recevoir la confirmation ; ce n'est pas obligatoire. Fais-la épeler et relis-la."
        : "",
      // Avec Cal.com ou Calendly, la durée est celle du type d'événement : on
      // ne promet pas une durée par prestation que l'agenda n'appliquerait pas.
      fixedDurationMinutes
        ? [
            appointmentTypes.length > 0
              ? `Prestations proposées : ${appointmentTypes.map((type) => type.name).join(", ")}.`
              : "",
            `Chaque rendez-vous dure ${fixedDurationMinutes} minutes : c'est la durée réglée dans l'agenda.`,
          ]
            .filter(Boolean)
            .join(" ")
        : appointmentTypes.length > 0
          ? `Prestations proposées : ${appointmentTypes
              .map((type) => (durationOf(type.minutes) ? `${type.name} (${durationOf(type.minutes)} min)` : type.name))
              .join(", ")}. Demande quelle prestation est souhaitée, et utilise sa durée dans check_availability et book_appointment.`
          : "",
      !fixedDurationMinutes && defaultMinutes
        ? appointmentTypes.length > 0
          ? `Pour une autre demande, compte ${defaultMinutes} minutes.`
          : `Durée d'un rendez-vous : ${defaultMinutes} minutes.`
        : ""
    );
  }

  if (takesOrders) {
    const catalog = readProductCatalog(configuration.productCatalog);
    const businessAddress = asString(configuration.businessAddress);
    const deliveryZone = asString(configuration.deliveryZone);
    if (countCatalogItems(catalog) > 0) {
      lines.push(
        "Commande : note les articles et les quantités, puis demande s'il s'agit d'un retrait",
        "ou d'une livraison, et pour quelle heure. Relis la commande complète, puis demande le",
        "nom et le numéro de téléphone, et enregistre-la avec take_order. Ne propose que les",
        "produits du catalogue, aux prix indiqués.",
        `Catalogue :\n${formatCatalogForAgent(catalog)}`
      );
    } else {
      lines.push(
        "La carte n'est pas encore renseignée : ne prends aucune commande. Note le",
        "nom, le numéro et la demande de l'appelant avec l'outil take_message, et",
        "indique-lui que l'entreprise le rappellera."
      );
    }
    lines.push(
      businessAddress ? `Adresse (retrait) : ${businessAddress}` : "",
      deliveryZone ? `Zone de livraison : ${deliveryZone}` : ""
    );
  }

  const wantsAppointments = objectives.includes("appointment");
  if (wantsAppointments && !canBookAppointments) {
    lines.push(
      "Aucun agenda n'est encore connecté pour les rendez-vous : si l'appelant en",
      "demande un, note ses coordonnées et indique qu'il sera rappelé."
    );
  }

  const limits = [
    !wantsAppointments
      ? "Tu ne prends ni rendez-vous ni réservation : propose de noter la demande pour un rappel."
      : !canBookAppointments
        ? "Aucun agenda n'est connecté : tu ne peux confirmer aucun rendez-vous, seulement noter la demande."
        : "",
    !takesOrders
      ? "Tu ne prends pas de commande : propose de noter la demande pour un rappel."
      : countCatalogItems(readProductCatalog(configuration.productCatalog)) === 0
        ? "La carte n'est pas renseignée : ne prends aucune commande."
        : "",
  ].filter(Boolean);

  lines.push(...companyInstructions(configuration), ...strictRules(limits));
  return lines.filter(Boolean).join("\n");
}

function buildStandardTelephoniquePrompt(configuration: Configuration, companyName: string): string {
  const openingHours = asWeeklyHours(configuration.openingHours);
  const greetingMessage = asString(configuration.greetingMessage);
  const callRouting = asRuleRows(configuration.callRouting);
  const open = isOpenAt(openingHours, new Date());

  const lines = [
    "## Rôle",
    `Tu es le standard téléphonique de ${companyName} : son assistant virtuel. Tu réponds en français.`,
    greetingMessage
      ? `Commence l'appel en disant exactement : « ${greetingMessage} » Si ce message ne le dit pas, précise ensuite que tu es un assistant virtuel.`
      : `Commence l'appel par une salutation brève : présente ${companyName} en une phrase, puis présente-toi comme son assistant virtuel.`,
    `Horaires d'ouverture : ${formatWeeklyHours(openingHours)}.`,
    open
      ? "L'entreprise est actuellement ouverte."
      : "L'entreprise est actuellement fermée : informe-en l'appelant, mais reste utile. Tu peux toujours transférer un motif urgent ou prendre un message.",
    ...phoneStyle(configuration),
    "## Déroulé de l'appel",
    "Écoute la demande, puis reformule-la en une phrase pour vérifier que tu as bien compris.",
  ];

  if (callRouting.length > 0) {
    lines.push(
      "Tu disposes de l'outil transfer_call pour transférer l'appel, uniquement",
      "pour l'un de ces motifs précis (pas d'autres, pas de numéro inventé) :",
      callRouting.map((rule) => `« ${rule.trigger} »`).join(", ") + ".",
      "Dès que tu décides de transférer, appelle immédiatement l'outil",
      "transfer_call : ne dis jamais à l'appelant que tu transfères sans avoir",
      "réellement appelé l'outil au même tour de parole."
    );
  }

  lines.push(
    "Pour toute autre demande, ou si l'appelant refuse d'être transféré, utilise",
    "l'outil take_message pour noter son nom, son numéro et le motif de son",
    "appel, puis indique-lui que l'entreprise le rappellera.",
    ...companyInstructions(configuration),
    ...strictRules([
      "Tu ne prends pas de rendez-vous, ni de réservation, ni de commande : propose de noter la demande pour un rappel, sans rien confirmer.",
    ])
  );

  return lines.join("\n");
}

function buildMessagingPrompt(
  configuration: Configuration,
  companyName: string,
  channelLabel: string
): string {
  const faq = asString(configuration.faq);
  const lines = [
    `Tu es l'assistant ${channelLabel} de ${companyName}. Tu réponds en`,
    `français, de façon chaleureuse et concise (quelques phrases maximum,`,
    `comme dans une vraie conversation), et tu vouvoies l'interlocuteur.`,
  ];
  lines.push(
    faq
      ? `Questions fréquentes et réponses à utiliser en priorité :\n${faq}`
      : "Aucune question fréquente n'a été renseignée — réponds du mieux que tu peux avec les informations disponibles."
  );
  lines.push(
    "Si tu ne peux pas répondre avec certitude, dis-le simplement et indique",
    "que l'entreprise reviendra vers la personne rapidement — n'invente jamais",
    "de prix, de disponibilité ni d'information que tu ne connais pas."
  );
  return lines.join("\n");
}

export function buildSystemPrompt(
  serviceSlug: string,
  configuration: Configuration,
  options: {
    calendarConnected: boolean;
    collectsEmail?: boolean;
    // Durée imposée par l'agenda (Cal.com, Calendly) : elle prime sur celle
    // des prestations.
    fixedDurationMinutes?: number | null;
    companyName: string;
  }
): string {
  const companyName = options.companyName || "cette entreprise";

  switch (serviceSlug) {
    case "standard-telephonique-ia":
      return buildStandardTelephoniquePrompt(configuration, companyName);
    case "assistant-whatsapp":
      return buildMessagingPrompt(configuration, companyName, "WhatsApp");
    case "assistant-facebook":
      return buildMessagingPrompt(configuration, companyName, "Messenger");
    case "assistant-instagram":
      return buildMessagingPrompt(configuration, companyName, "Instagram");
    case "prise-rdv-telephone":
    default:
      return buildPriseRdvPrompt(
        configuration,
        companyName,
        options.calendarConnected,
        options.collectsEmail ?? false,
        options.fixedDurationMinutes ?? null
      );
  }
}
