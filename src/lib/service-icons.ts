import {
  Camera,
  CalendarCheck,
  CalendarClock,
  FileArchive,
  FileSearch,
  FileSignature,
  FileText,
  LifeBuoy,
  Mail,
  MessageCircle,
  MessageSquare,
  Mic,
  Phone,
  PhoneCall,
  ScanText,
  ScrollText,
  type LucideIcon,
} from "lucide-react";

export const SERVICE_ICONS: Record<string, LucideIcon> = {
  "standard-telephonique-ia": PhoneCall,
  "prise-rdv-telephone": Phone,
  "assistant-whatsapp": MessageCircle,
  "assistant-facebook": MessageSquare,
  "assistant-instagram": Camera,
  "reponses-emails": Mail,
  "prise-rdv-automatique": CalendarCheck,
  "devis-factures-bons-commande": FileText,
  "contrats-courriers-administratifs": ScrollText,
  "relance-impayes": CalendarClock,
  "signature-electronique": FileSignature,
  "archivage-intelligent": FileArchive,
  "resume-pdf": FileSearch,
  "resume-reunions": Mic,
  "ocr-lecture-automatique": ScanText,
  "support-prioritaire": LifeBuoy,
};

export type ServiceBrand = {
  /** Le nom de la marque, ecrit comme son proprietaire l'impose. */
  name: string;
  src: string;
};

/**
 * Logos officiels de Meta (voir public/brands/README.md). Ils indiquent sur
 * quelle plateforme la solution fonctionne, rien de plus : Meta interdit de
 * les recolorer, de les combiner a notre marque, d'en faire l'element le plus
 * visible, ou de laisser croire a un partenariat. `ServiceGlyph` s'en charge.
 */
export const SERVICE_BRANDS: Record<string, ServiceBrand> = {
  "assistant-whatsapp": { name: "WhatsApp", src: "/brands/whatsapp.svg" },
  "assistant-facebook": { name: "Messenger", src: "/brands/messenger.svg" },
  "assistant-instagram": { name: "Instagram", src: "/brands/instagram.png" },
};
