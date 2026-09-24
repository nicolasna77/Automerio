-- CreateTable
CREATE TABLE "call_summary" (
    "id" TEXT NOT NULL,
    "usageEventId" TEXT NOT NULL,
    "transcript" JSONB NOT NULL,
    "reason" TEXT,
    "summary" TEXT,
    "followUp" TEXT,
    "callerName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "call_summary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "call_summary_usageEventId_key" ON "call_summary"("usageEventId");

-- AddForeignKey
ALTER TABLE "call_summary" ADD CONSTRAINT "call_summary_usageEventId_fkey" FOREIGN KEY ("usageEventId") REFERENCES "usage_event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

