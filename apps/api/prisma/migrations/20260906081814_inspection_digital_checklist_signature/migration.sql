/*
  Warnings:

  - A unique constraint covering the columns `[token]` on the table `inspections` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "inspections" ADD COLUMN     "checklistItems" JSONB,
ADD COLUMN     "signatureImage" TEXT,
ADD COLUMN     "signedAt" TIMESTAMP(3),
ADD COLUMN     "signerIp" TEXT,
ADD COLUMN     "signerName" TEXT,
ADD COLUMN     "signerUserAgent" TEXT,
ADD COLUMN     "token" TEXT,
ADD COLUMN     "tokenExpiresAt" TIMESTAMP(3),
ALTER COLUMN "odometerKm" DROP NOT NULL,
ALTER COLUMN "fuelLevel" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "inspections_token_key" ON "inspections"("token");
