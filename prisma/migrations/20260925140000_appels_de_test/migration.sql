-- CreateTable
CREATE TABLE "test_call" (
    "id" TEXT NOT NULL,
    "clientServiceId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "status" "DemoCallStatus" NOT NULL DEFAULT 'REQUESTED',
    "twilioCallSid" TEXT,
    "openaiCallId" TEXT,
    "durationSec" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_call_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "test_call_twilioCallSid_key" ON "test_call"("twilioCallSid");

-- CreateIndex
CREATE UNIQUE INDEX "test_call_openaiCallId_key" ON "test_call"("openaiCallId");

-- CreateIndex
CREATE INDEX "test_call_clientServiceId_createdAt_idx" ON "test_call"("clientServiceId", "createdAt");

-- AddForeignKey
ALTER TABLE "test_call" ADD CONSTRAINT "test_call_clientServiceId_fkey" FOREIGN KEY ("clientServiceId") REFERENCES "client_service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_call" ADD CONSTRAINT "test_call_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

