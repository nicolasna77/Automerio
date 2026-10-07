import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import OpenAI from "openai";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { buildSystemPrompt } from "../src/lib/voice-agent/prompt";
import { createToolSession, getToolDefinitions, runTool } from "../src/lib/voice-agent/tools";
import type { Configuration } from "../src/lib/catalog";

const SUPPORTED_SLUGS = new Set(["standard-telephonique-ia", "prise-rdv-telephone"]);

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const model = process.env.OPENAI_VOICE_MODEL ?? "gpt-4o-mini";

async function main() {
  const clientServiceId = process.argv[2];
  if (!clientServiceId) {
    console.error("Usage: npx tsx scripts/test-voice-agent.ts <clientServiceId>");
    process.exit(1);
  }

  const clientService = await db.clientService.findUnique({
    where: { id: clientServiceId },
    include: { service: true, calendarConnection: true, organization: true },
  });
  if (!clientService) {
    console.error(`Aucune ClientService avec l'id ${clientServiceId}.`);
    process.exit(1);
  }
  if (!SUPPORTED_SLUGS.has(clientService.service.slug)) {
    console.error(
      `Cette ClientService correspond à « ${clientService.service.name} », pas à un service téléphonique (standard-telephonique-ia / prise-rdv-telephone).`
    );
    process.exit(1);
  }

  const configuration = (clientService.configuration ?? {}) as Configuration;
  const calendarConnected = !!clientService.calendarConnection;
  const systemPrompt = buildSystemPrompt(clientService.service.slug, configuration, {
    calendarConnected,
    companyName: clientService.organization.name,
  });
  const tools = getToolDefinitions(clientService.service.slug, configuration, calendarConnected);
  const session = createToolSession(tools);

  console.log(`--- Prompt système ---\n${systemPrompt}\n`);
  console.log(`--- Tools disponibles : ${tools.map((t) => t.function.name).join(", ") || "aucun"} ---\n`);
  console.log("Tapez comme un appelant ; Ctrl+C pour quitter.\n");

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
  ];

  const rl = createInterface({ input: stdin, output: stdout });
  for (;;) {
    let userInput: string;
    try {
      userInput = await rl.question("Appelant> ");
    } catch {
      break;
    }
    messages.push({ role: "user", content: userInput });

    for (;;) {
      const completion = await openai.chat.completions.create({
        model,
        messages,
        tools: tools.length > 0 ? tools : undefined,
      });
      const choice = completion.choices[0].message;
      messages.push(choice);

      if (!choice.tool_calls || choice.tool_calls.length === 0) {
        console.log(`Agent> ${choice.content}\n`);
        break;
      }

      for (const call of choice.tool_calls) {
        if (call.type !== "function") continue;
        const args = JSON.parse(call.function.arguments || "{}");
        console.log(`  [tool] ${call.function.name}(${call.function.arguments})`);
        const result = await runTool(call.function.name, args, {
          clientServiceId,
          callId: null,
          configuration,
          session,
        });
        console.log(`  [tool result] ${result}`);
        messages.push({ role: "tool", tool_call_id: call.id, content: result });
      }
    }
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
