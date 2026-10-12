-- Rappel SMS de la veille d'un rendez-vous : la date d'envoi empêche un
-- second envoi si la tâche planifiée est rejouée. L'index sur startAt sert
-- la recherche des rendez-vous du lendemain.
ALTER TABLE "booking" ADD COLUMN "reminderSentAt" TIMESTAMP(3);
CREATE INDEX "booking_startAt_idx" ON "booking"("startAt");
