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
  name: string;
  src: string;
};

export const SERVICE_BRANDS: Record<string, ServiceBrand> = {
  "assistant-whatsapp": { name: "WhatsApp", src: "/brands/whatsapp.svg" },
  "assistant-facebook": { name: "Messenger", src: "/brands/messenger.svg" },
  "assistant-instagram": { name: "Instagram", src: "/brands/instagram.png" },
};
