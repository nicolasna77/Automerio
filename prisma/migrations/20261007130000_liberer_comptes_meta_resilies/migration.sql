-- Une solution résiliée libère désormais son numéro WhatsApp, sa page
-- Facebook et son compte Instagram (index uniques) : on libère aussi ceux des
-- solutions résiliées avant ce correctif, pour qu'ils puissent être
-- reconnectés à une nouvelle solution.
UPDATE "client_service"
SET "whatsappPhoneNumberId" = NULL,
    "whatsappBusinessAccountId" = NULL,
    "whatsappAccessToken" = NULL,
    "whatsappDisplayNumber" = NULL,
    "facebookPageId" = NULL,
    "facebookPageAccessToken" = NULL,
    "facebookPageName" = NULL,
    "instagramAccountId" = NULL,
    "instagramAccessToken" = NULL,
    "instagramTokenExpiresAt" = NULL,
    "instagramUsername" = NULL
WHERE "status" = 'CANCELED'
  AND ("whatsappPhoneNumberId" IS NOT NULL
    OR "whatsappBusinessAccountId" IS NOT NULL
    OR "whatsappAccessToken" IS NOT NULL
    OR "whatsappDisplayNumber" IS NOT NULL
    OR "facebookPageId" IS NOT NULL
    OR "facebookPageAccessToken" IS NOT NULL
    OR "facebookPageName" IS NOT NULL
    OR "instagramAccountId" IS NOT NULL
    OR "instagramAccessToken" IS NOT NULL
    OR "instagramTokenExpiresAt" IS NOT NULL
    OR "instagramUsername" IS NOT NULL);
