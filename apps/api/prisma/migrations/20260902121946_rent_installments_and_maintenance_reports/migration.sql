/*
  Warnings:

  - A unique constraint covering the columns `[maintenanceReportToken]` on the table `contracts` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "contracts" ADD COLUMN     "maintenanceReportToken" TEXT;

-- CreateTable
CREATE TABLE "rent_installments" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rent_installments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_reports" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "reportedByCustomer" BOOLEAN NOT NULL DEFAULT true,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenance_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rent_installments_contractId_idx" ON "rent_installments"("contractId");

-- CreateIndex
CREATE INDEX "maintenance_reports_contractId_idx" ON "maintenance_reports"("contractId");

-- CreateIndex
CREATE INDEX "maintenance_reports_companyId_idx" ON "maintenance_reports"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_maintenanceReportToken_key" ON "contracts"("maintenanceReportToken");

-- AddForeignKey
ALTER TABLE "rent_installments" ADD CONSTRAINT "rent_installments_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_reports" ADD CONSTRAINT "maintenance_reports_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_reports" ADD CONSTRAINT "maintenance_reports_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
