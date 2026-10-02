import type { MessagingChannel } from "@prisma/client";
import { getValidInstagramToken, sendInstagramMessage } from "@/lib/instagram";
import { sendMessengerMessage } from "@/lib/messenger";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

type ChannelAccount = {
  id: string;
  whatsappPhoneNumberId: string | null;
  whatsappAccessToken: string | null;
  facebookPageId: string | null;
  facebookPageAccessToken: string | null;
  instagramAccountId: string | null;
};

// Envoie un message au contact par le canal de la conversation. Renvoie false
// si le compte n'est plus connecté (le client l'a déconnecté entre-temps).
export async function sendToContact(
  account: ChannelAccount,
  channel: MessagingChannel,
  contactId: string,
  text: string
): Promise<boolean> {
  switch (channel) {
    case "WHATSAPP": {
      if (!account.whatsappPhoneNumberId) return false;
      await sendWhatsAppMessage(account.whatsappPhoneNumberId, contactId, text, account.whatsappAccessToken);
      return true;
    }
    case "MESSENGER": {
      if (!account.facebookPageId || !account.facebookPageAccessToken) return false;
      await sendMessengerMessage(account.facebookPageId, contactId, text, account.facebookPageAccessToken);
      return true;
    }
    case "INSTAGRAM": {
      if (!account.instagramAccountId) return false;
      const accessToken = await getValidInstagramToken(account.id);
      if (!accessToken) return false;
      await sendInstagramMessage(account.instagramAccountId, contactId, text, accessToken);
      return true;
    }
  }
}
