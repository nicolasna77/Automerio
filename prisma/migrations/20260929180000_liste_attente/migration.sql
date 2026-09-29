CREATE TABLE "waitlist_entry" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "company" TEXT,
    "phone" TEXT,
    "wantsCallback" BOOLEAN NOT NULL DEFAULT false,
    "wantsNewsletter" BOOLEAN NOT NULL DEFAULT false,
    "newsletterConsentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "waitlist_entry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "waitlist_entry_email_key" ON "waitlist_entry"("email");

CREATE INDEX "waitlist_entry_createdAt_idx" ON "waitlist_entry"("createdAt");
