-- Questions des appelants restées sans réponse (résumé d'appel), et les
-- réponses que l'entreprise y apporte pour les appels suivants.
CREATE TABLE "caller_question" (
    "id" TEXT NOT NULL,
    "clientServiceId" TEXT NOT NULL,
    "usageEventId" TEXT,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "answeredById" TEXT,
    "answeredAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "caller_question_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "caller_question_clientServiceId_createdAt_idx" ON "caller_question"("clientServiceId", "createdAt");

ALTER TABLE "caller_question" ADD CONSTRAINT "caller_question_clientServiceId_fkey" FOREIGN KEY ("clientServiceId") REFERENCES "client_service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "caller_question" ADD CONSTRAINT "caller_question_usageEventId_fkey" FOREIGN KEY ("usageEventId") REFERENCES "usage_event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "caller_question" ADD CONSTRAINT "caller_question_answeredById_fkey" FOREIGN KEY ("answeredById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
