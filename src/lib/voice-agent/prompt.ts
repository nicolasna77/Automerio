import {
  asRuleRows,
  asStringArray,
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

function asString(value: Configuration[string] | undefined): string {
  return typeof value === "string" ? value : "";
}

function formatWeeklyHours(hours: WeeklyHours | null): string {
  if (!hours) return "non précisés";
  return WEEK_DAYS.filter((day) => !hours[day].closed)
    .map((day) => `${WEEK_DAY_LABELS[day]} ${hours[day].open}-${hours[day].close}`)
    .join(", ") || "fermé toute la semaine";
}

function buildPriseRdvPrompt(configuration: Configuration, companyName: string, calendarConnected: boolean): string {
  const objectives = asStringArray(configuration.objectives);
  const canBookAppointments = objectives.includes("appointment") && calendarConnected;
  const takesOrders = objectives.includes("order");

  const lines = [
    `Tu es l'assistant téléphonique de ${companyName}. Tu réponds en français, de façon`,
    `chaleureuse, concise, et tu vouvoies l'appelant.`,
    `Horaires d'ouverture : ${formatWeeklyHours(asWeeklyHours(configuration.businessHours))}.`,
  ];

  const callInstructions = asString(configuration.callInstructions);
  if (callInstructions) lines.push(`Consignes particulières : ${callInstructions}`);

  if (canBookAppointments) {
    const appointmentTypes = asStringArray(configuration.appointmentTypes);
    const slotDuration = asString(configuration.slotDuration);
    lines.push(
      "Tu peux prendre un rendez-vous avec l'outil book_appointment, après avoir",
      "vérifié un créneau disponible avec check_availability. Demande le nom, le",
      "numéro de téléphone de l'appelant, et le motif du rendez-vous avant de",
      "réserver.",
      appointmentTypes.length > 0
        ? `Types de rendez-vous proposés : ${appointmentTypes.join(", ")}.`
        : "",
      slotDuration ? `Durée standard d'un créneau : ${slotDuration} minutes.` : ""
    );
  }

  if (takesOrders) {
    const catalog = readProductCatalog(configuration.productCatalog);
    const businessAddress = asString(configuration.businessAddress);
    const deliveryZone = asString(configuration.deliveryZone);
    if (countCatalogItems(catalog) > 0) {
      lines.push(
        "Tu peux enregistrer une commande avec l'outil take_order, après avoir",
        "confirmé les articles, le nom et le numéro de téléphone de l'appelant, et",
        "s'il souhaite un retrait ou une livraison. Ne propose que les produits du",
        "catalogue, aux prix indiqués.",
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

  return lines.filter(Boolean).join("\n");
}

function buildStandardTelephoniquePrompt(configuration: Configuration, companyName: string): string {
  const openingHours = asWeeklyHours(configuration.openingHours);
  const greetingMessage = asString(configuration.greetingMessage);
  const callRouting = asRuleRows(configuration.callRouting);
  const open = isOpenAt(openingHours, new Date());

  const lines = [
    `Tu es le standard téléphonique de ${companyName}. Tu réponds en français,`,
    `de façon chaleureuse, concise, et tu vouvoies l'appelant.`,
    greetingMessage
      ? `Commence l'appel en disant exactement : « ${greetingMessage} »`
      : `Commence l'appel par une salutation brève, en te présentant comme l'assistant de ${companyName}.`,
    `Horaires d'ouverture : ${formatWeeklyHours(openingHours)}.`,
    open
      ? "L'entreprise est actuellement ouverte."
      : "L'entreprise est actuellement fermée — informe-en l'appelant, mais reste utile : tu peux toujours transférer un motif urgent ou prendre un message.",
  ];

  if (callRouting.length > 0) {
    lines.push(
      "Tu disposes de l'outil transfer_call pour transférer l'appel — uniquement",
      "pour l'un de ces motifs précis (pas d'autres, pas de numéro inventé) :",
      callRouting.map((rule) => `« ${rule.trigger} »`).join(", ") + ".",
      "Dès que tu décides de transférer, appelle immédiatement l'outil",
      "transfer_call — ne dis jamais à l'appelant que tu transfères sans avoir",
      "réellement appelé l'outil au même tour de parole."
    );
  }

  lines.push(
    "Pour toute autre demande, ou si l'appelant refuse d'être transféré, utilise",
    "l'outil take_message pour noter son nom, son numéro et le motif de son",
    "appel — indique-lui que l'entreprise le rappellera."
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
  options: { calendarConnected: boolean; companyName: string }
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
      return buildPriseRdvPrompt(configuration, companyName, options.calendarConnected);
  }
}
