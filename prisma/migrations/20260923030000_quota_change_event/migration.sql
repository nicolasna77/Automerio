-- AlterEnum
-- Le changement de volume rejoint l'historique d'une solution : tout ce qui
-- modifie ce que le client paie doit y laisser une trace datee.
ALTER TYPE "ServiceEventType" ADD VALUE 'QUOTA_CHANGED';
