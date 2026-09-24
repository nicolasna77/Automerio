-- Les solutions ne se vendent plus qu'en abonnement mensuel : plus de frais
-- de mise en place. Les montants retires restent lisibles dans l'historique
-- Git de src/lib/catalog-data.ts.
ALTER TABLE "service" DROP COLUMN "setupFeeCents";
