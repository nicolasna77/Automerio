-- AlterTable
-- Le DEFAULT n'a servi qu'a remplir les lignes existantes lors de l'ajout de la
-- colonne. Le schema ne le declare pas — la convention du projet etant
-- `updatedAt DateTime @updatedAt` seul — on le retire pour que la base et le
-- schema coincident.
ALTER TABLE "service" ALTER COLUMN "updatedAt" DROP DEFAULT;
