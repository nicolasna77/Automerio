import { getOpenAIClient } from "@/lib/openai";
import type { Configuration } from "@/lib/catalog";
import { buildSystemPrompt } from "@/lib/voice-agent/prompt";
import { getToolDefinitions, runTool } from "@/lib/voice-agent/tools";

const CHAT_MODEL = "gpt-5-mini";

export async function generateMessagingReply(
  clientService: {
    id: string;
    configuration: unknown;
    service: { slug: string };
    organization: { name: string };
  },
  incomingText: string
): Promise<string> {
  const configuration = (clientService.configuration ?? {}) as Configuration;
  const systemPrompt = buildSystemPrompt(clientService.service.slug, configuration, {
    calendarConnected: false,
    companyName: clientService.organization.name,
  });
  const tools = getToolDefinitions(clientService.service.slug, configuration, false);

  const completion = await getOpenAIClient().chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: incomingText },
    ],
    tools: tools.length > 0 ? tools : undefined,
  });

  const choice = completion.choices[0];
  const toolCalls = choice.message.tool_calls ?? [];

  const functionCalls = toolCalls.filter((call) => call.type === "function");
  if (functionCalls.length === 0) {
    return choice.message.content ?? "";
  }

  const toolResults = await Promise.all(
    functionCalls.map(async (call) => ({
      tool_call_id: call.id,
      output: await runTool(
        call.function.name,
        JSON.parse(call.function.arguments || "{}"),
        { clientServiceId: clientService.id, callId: null, configuration }
      ),
    }))
  );

  const followUp = await getOpenAIClient().chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: incomingText },
      choice.message,
      ...toolResults.map((r) => ({
        role: "tool" as const,
        tool_call_id: r.tool_call_id,
        content: r.output,
      })),
    ],
  });
  return followUp.choices[0].message.content ?? "";
}
