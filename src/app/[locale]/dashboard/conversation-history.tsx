import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getConversationDays, getConversations } from "@/lib/conversations";
import { ConversationInbox } from "@/app/[locale]/dashboard/conversation-inbox";

export async function ConversationHistory({ clientServiceId }: { clientServiceId: string }) {
  const [conversations, days, t] = await Promise.all([
    getConversations(clientServiceId),
    getConversationDays(clientServiceId),
    getTranslations("Dashboard.conversations"),
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2" className="text-base">
          {t("title")}
        </CardTitle>
        {conversations.length > 0 && (
          <CardDescription>
            {t("description")}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <ConversationInbox clientServiceId={clientServiceId} initialConversations={conversations} initialDays={days} />
      </CardContent>
    </Card>
  );
}
