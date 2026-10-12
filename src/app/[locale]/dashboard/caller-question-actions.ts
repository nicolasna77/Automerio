"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { assertCanReadClientService } from "@/lib/client-service-access";
import { actionError, runAction } from "@/lib/run-action";
import { ANSWER_MAX } from "@/lib/caller-questions";

// « Questions à compléter » : tout membre de l'organisation de la solution
// peut répondre, ignorer une question ou retirer une réponse.
async function requireQuestion(questionId: string) {
  const session = await requireUser();
  const question = await db.callerQuestion.findUnique({
    where: { id: questionId },
    select: { id: true, clientServiceId: true },
  });
  if (!question || !(await assertCanReadClientService(question.clientServiceId, session.user.id))) {
    throw actionError("notYourService");
  }
  return { question, userId: session.user.id };
}

function revalidate(clientServiceId: string) {
  revalidatePath(`/dashboard/services/${clientServiceId}`);
}

export async function answerCallerQuestion(questionId: string, answer: string) {
  return runAction(async () => {
    const { question, userId } = await requireQuestion(questionId);
    const trimmed = answer.trim();
    if (!trimmed) throw actionError("callerAnswerRequired");
    if (trimmed.length > ANSWER_MAX) throw actionError("callerAnswerTooLong", { max: ANSWER_MAX });

    await db.callerQuestion.update({
      where: { id: question.id },
      data: { answer: trimmed, answeredById: userId, answeredAt: new Date(), dismissedAt: null },
    });
    revalidate(question.clientServiceId);
  });
}

export async function dismissCallerQuestion(questionId: string) {
  return runAction(async () => {
    const { question } = await requireQuestion(questionId);
    await db.callerQuestion.update({
      where: { id: question.id },
      data: { dismissedAt: new Date() },
    });
    revalidate(question.clientServiceId);
  });
}

// La réponse n'est plus donnée à l'assistant ; la question ne revient pas
// dans la liste à compléter.
export async function removeCallerAnswer(questionId: string) {
  return runAction(async () => {
    const { question } = await requireQuestion(questionId);
    await db.callerQuestion.update({
      where: { id: question.id },
      data: { answer: null, answeredById: null, answeredAt: null, dismissedAt: new Date() },
    });
    revalidate(question.clientServiceId);
  });
}
