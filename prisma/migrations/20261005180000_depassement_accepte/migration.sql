-- AlterEnum
ALTER TYPE "ServiceEventType" ADD VALUE 'OVERAGE_ACCEPTED';
ALTER TYPE "ServiceEventType" ADD VALUE 'OVERAGE_REFUSED';

-- AlterTable
ALTER TABLE "client_service" ADD COLUMN     "overageAllowed" BOOLEAN NOT NULL DEFAULT false;
