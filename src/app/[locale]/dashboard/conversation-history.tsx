import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getConversationDays, getConversations } from "@/lib/conversations";
import { ConversationInbox } from "@/app/[locale]/dashboard/conversation-inbox";

export async function ConversationHistory({ clientServiceId }: { clientServiceId: string }) {
  const [conversations, days] = await Promise.all([
    getConversations(clientServiceId),
    getConversationDays(clientServiceId),
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2" className="text-base">
          Conversations
        </CardTitle>
        {conversations.length > 0 && (
          <CardDescription>
            L&apos;assistant répond à vos clients. Reprenez la main sur une conversation pour répondre vous-même.
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <ConversationInbox clientServiceId={clientServiceId} initialConversations={conversations} initialDays={days} />
      </CardContent>
    </Card>
  );
}
