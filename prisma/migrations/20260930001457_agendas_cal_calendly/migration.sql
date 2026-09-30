-- AlterTable
ALTER TABLE "booking" ADD COLUMN     "externalBookingId" TEXT;

-- CreateTable
CREATE TABLE "scheduling_connection" (
    "id" TEXT NOT NULL,
    "clientServiceId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "encryptedToken" TEXT NOT NULL,
    "accountLabel" TEXT NOT NULL,
    "eventTypeId" TEXT NOT NULL,
    "eventTypeName" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "location" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduling_connection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scheduling_connection_clientServiceId_key" ON "scheduling_connection"("clientServiceId");

-- AddForeignKey
ALTER TABLE "scheduling_connection" ADD CONSTRAINT "scheduling_connection_clientServiceId_fkey" FOREIGN KEY ("clientServiceId") REFERENCES "client_service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
