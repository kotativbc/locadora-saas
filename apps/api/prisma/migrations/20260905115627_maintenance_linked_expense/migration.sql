/*
  Warnings:

  - A unique constraint covering the columns `[expenseId]` on the table `maintenances` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "maintenances" ADD COLUMN     "expenseId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "maintenances_expenseId_key" ON "maintenances"("expenseId");

-- AddForeignKey
ALTER TABLE "maintenances" ADD CONSTRAINT "maintenances_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
