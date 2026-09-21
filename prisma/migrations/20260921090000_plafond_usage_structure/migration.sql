-- Le plafond d'usage n'etait qu'une phrase libre : impossible d'en tirer une
-- jauge. On le decoupe en trois champs, et on reprend les libelles existants
-- (« 150 min incluses, puis 0,30 € /min ») avant de supprimer la colonne.
CREATE TYPE "UsageUnit" AS ENUM ('CALL', 'MINUTE');

ALTER TABLE "service"
  ADD COLUMN "includedUsageUnits" INTEGER,
  ADD COLUMN "usageUnit" "UsageUnit",
  ADD COLUMN "overageUnitPriceCents" INTEGER;

-- Le premier nombre du libelle est la quantite incluse ; le premier nombre a
-- decimales, le prix du depassement.
UPDATE "service"
SET
  "includedUsageUnits" = (substring("usageCapLabel" FROM '([0-9]+)'))::int,
  "usageUnit" = CASE
    WHEN "usageCapLabel" ILIKE '%min%' THEN 'MINUTE'::"UsageUnit"
    ELSE 'CALL'::"UsageUnit"
  END,
  "overageUnitPriceCents" = COALESCE(
    (round(
      replace(substring("usageCapLabel" FROM '([0-9]+[,.][0-9]+)'), ',', '.')::numeric * 100
    ))::int,
    0
  )
WHERE "usageCapLabel" IS NOT NULL
  AND "usageCapLabel" ~ '[0-9]';

ALTER TABLE "service" DROP COLUMN "usageCapLabel";
