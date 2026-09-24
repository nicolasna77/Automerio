-- CreateEnum
CREATE TYPE "DemoCallStatus" AS ENUM ('REQUESTED', 'CALLING', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "demo_call" (
    "id" TEXT NOT NULL,
    "phoneHash" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "serviceSlug" TEXT NOT NULL,
    "status" "DemoCallStatus" NOT NULL DEFAULT 'REQUESTED',
    "twilioCallSid" TEXT,
    "openaiCallId" TEXT,
    "durationSec" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "demo_call_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "demo_call_phoneHash_key" ON "demo_call"("phoneHash");

-- CreateIndex
CREATE UNIQUE INDEX "demo_call_twilioCallSid_key" ON "demo_call"("twilioCallSid");

-- CreateIndex
CREATE UNIQUE INDEX "demo_call_openaiCallId_key" ON "demo_call"("openaiCallId");

-- CreateIndex
CREATE INDEX "demo_call_createdAt_idx" ON "demo_call"("createdAt");

