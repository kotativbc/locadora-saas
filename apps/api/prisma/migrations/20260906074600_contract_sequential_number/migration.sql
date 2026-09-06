/*
  Warnings:

  - A unique constraint covering the columns `[companyId,number]` on the table `contracts` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "nextContractNumber" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "contracts" ADD COLUMN     "number" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "contracts_companyId_number_key" ON "contracts"("companyId", "number");
