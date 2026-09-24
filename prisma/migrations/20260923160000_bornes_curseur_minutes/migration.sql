-- Pose les bornes du curseur de minutes sur les solutions de telephonie.
--
-- La migration qui a cree ces trois colonnes les a laissees nulles, a raison :
-- une solution non personnalisable n'a pas de bornes. Mais aucun chemin ne
-- menait ensuite la valeur du catalogue jusqu'a une ligne deja en base — la
-- synchronisation ne reecrivait que `configFields`, et le formulaire de
-- l'espace admin n'expose pas ces champs. Les solutions creees avant l'ajout
-- des colonnes restaient donc sans bornes, et `readSubscriptionTier` rendant
-- `null` des qu'une borne manque, le curseur ne s'affichait nulle part.
--
-- Rattrapage ponctuel, joue par `prisma migrate deploy` au deploiement : la
-- source de verite reste `src/lib/catalog-data.ts`, que `npm run db:sync-catalog`
-- reporte desormais correctement. Les valeurs ci-dessous en sont la copie.
--
-- `IS NULL` protege ce qui aurait deja ete pose, par une synchronisation jouee
-- a la main ou un reglage ulterieur : la migration comble un vide, elle ne
-- remplace pas un choix.
UPDATE "service"
SET "maxUsageUnits" = 500,
    "usageStepUnits" = 10,
    "extraUnitPriceCents" = 20
WHERE "slug" IN ('standard-telephonique-ia', 'prise-rdv-telephone')
  AND "maxUsageUnits" IS NULL;
