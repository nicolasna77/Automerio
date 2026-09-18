import {
  FACEBOOK_SERVICE_SLUG,
  formatConfigField,
  INSTAGRAM_SERVICE_SLUG,
  TELEPHONY_SERVICE_SLUGS,
  WHATSAPP_SERVICE_SLUG,
  type ConfigField,
  type ConfigValue,
} from "@/lib/catalog";
import {
  FacebookPageIdEditor,
  InstagramAccountIdEditor,
  NoteEditor,
  PhoneNumberEditor,
  WhatsAppPhoneNumberEditor,
} from "./client-service-actions";

export type ClientServiceCellData = {
  id: string;
  status: string;
  configuration: unknown;
  adminNote: string | null;
  externalPhoneNumber: string | null;
  whatsappPhoneNumberId: string | null;
  facebookPageId: string | null;
  instagramAccountId: string | null;
  service: { slug: string };
};

export function configEntries(cs: {
  configuration: unknown;
  service: { configFields: unknown };
}): { key: string; label: string; value: string }[] {
  const config = (cs.configuration ?? {}) as Record<string, ConfigValue>;
  const fields = (cs.service.configFields as ConfigField[] | null) ?? [];
  return Object.entries(config)
    .filter(([, value]) => value)
    .map(([key, value]) => {
      const field = fields.find((f) => f.key === key);
      return { key, label: field?.label ?? key, value: formatConfigField(field, key, value) };
    });
}

const Dash = () => <span className="text-sm text-muted-foreground">—</span>;

export function NoteCell({ cs }: { cs: ClientServiceCellData }) {
  if (cs.status === "CANCELED") return <Dash />;
  return <NoteEditor clientServiceId={cs.id} initialNote={cs.adminNote ?? ""} />;
}

export function ConnectionCell({ cs }: { cs: ClientServiceCellData }) {
  if (cs.status === "CANCELED") return <Dash />;

  if (TELEPHONY_SERVICE_SLUGS.has(cs.service.slug)) {
    return (
      <PhoneNumberEditor
        clientServiceId={cs.id}
        initialPhoneNumber={cs.externalPhoneNumber ?? ""}
      />
    );
  }
  if (cs.service.slug === WHATSAPP_SERVICE_SLUG) {
    return (
      <WhatsAppPhoneNumberEditor
        clientServiceId={cs.id}
        initialPhoneNumberId={cs.whatsappPhoneNumberId ?? ""}
      />
    );
  }
  if (cs.service.slug === FACEBOOK_SERVICE_SLUG) {
    return (
      <FacebookPageIdEditor
        clientServiceId={cs.id}
        initialPageId={cs.facebookPageId ?? ""}
      />
    );
  }
  if (cs.service.slug === INSTAGRAM_SERVICE_SLUG) {
    return (
      <InstagramAccountIdEditor
        clientServiceId={cs.id}
        initialAccountId={cs.instagramAccountId ?? ""}
      />
    );
  }
  return <Dash />;
}
