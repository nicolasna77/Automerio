import { db } from "@/lib/db";

// Questions des appelants restées sans réponse (relevées dans le résumé de
// l'appel) et réponses que l'entreprise y apporte : l'assistant les reçoit
// dans ses consignes dès l'appel suivant.

export const QUESTION_MAX = 200;
export const ANSWER_MAX = 500;
export const QUESTIONS_PER_CALL = 3;
// Réponses données à l'assistant, les plus récentes d'abord.
export const LEARNED_ANSWERS_MAX = 30;

export type LearnedAnswer = { question: string; answer: string };

// Deux formulations qui ne diffèrent que par la casse, les accents, les
// espaces ou la ponctuation finale sont la même question.
export function questionKey(question: string): string {
  return question
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[\s?!.]+/g, " ")
    .trim();
}

export async function saveUnansweredQuestions(input: {
  clientServiceId: string;
  usageEventId: string;
  questions: string[];
}): Promise<number> {
  const questions = input.questions
    .map((q) => q.trim().slice(0, QUESTION_MAX))
    .filter(Boolean)
    .slice(0, QUESTIONS_PER_CALL);
  if (questions.length === 0) return 0;

  // Une question déjà posée (en attente, répondue ou ignorée) ne revient pas.
  const existing = await db.callerQuestion.findMany({
    where: { clientServiceId: input.clientServiceId },
    select: { question: true },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  const known = new Set(existing.map((row) => questionKey(row.question)));
  const fresh = questions.filter((question) => {
    const key = questionKey(question);
    if (known.has(key)) return false;
    known.add(key);
    return true;
  });
  if (fresh.length === 0) return 0;

  await db.callerQuestion.createMany({
    data: fresh.map((question) => ({
      clientServiceId: input.clientServiceId,
      usageEventId: input.usageEventId,
      question,
    })),
  });
  return fresh.length;
}

export async function loadLearnedAnswers(clientServiceId: string): Promise<LearnedAnswer[]> {
  const rows = await db.callerQuestion.findMany({
    where: { clientServiceId, answer: { not: null } },
    orderBy: { answeredAt: "desc" },
    take: LEARNED_ANSWERS_MAX,
    select: { question: true, answer: true },
  });
  return rows.flatMap((row) => (row.answer ? [{ question: row.question, answer: row.answer }] : []));
}
