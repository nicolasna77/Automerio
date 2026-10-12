-- Urgence détectée dans le résumé d'un appel : un SMS d'alerte part vers le
-- mobile choisi par le client. Les appels déjà résumés restent non urgents.
ALTER TABLE "call_summary" ADD COLUMN "urgent" BOOLEAN NOT NULL DEFAULT false;
