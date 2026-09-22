-- AlterTable
-- Le DEFAULT couvre les lignes deja en base ; Prisma renseigne ensuite la
-- colonne lui-meme a chaque ecriture (@updatedAt).
ALTER TABLE "service" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
