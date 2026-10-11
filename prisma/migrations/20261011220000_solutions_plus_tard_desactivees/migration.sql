-- Solutions « Plus tard » (01-prd.md) : présentes au catalogue mais sans
-- automatisation derrière. Elles étaient en vente ; elles sortent du
-- catalogue public et du tableau de bord, et ne peuvent plus être activées
-- (activateService vérifie isActive). Les solutions déjà souscrites, s'il y
-- en a, ne sont pas touchées. L'équipe peut les réactiver depuis
-- /admin/services le moment venu.
UPDATE "service"
SET "isActive" = false
WHERE "slug" IN (
  'reponses-emails',
  'prise-rdv-automatique',
  'resume-pdf',
  'resume-reunions',
  'ocr-lecture-automatique',
  'support-prioritaire'
);
