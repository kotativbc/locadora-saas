-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "identityNumber" TEXT;

-- CreateTable
CREATE TABLE "caution_installments" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "caution_installments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "caution_installments_contractId_idx" ON "caution_installments"("contractId");

-- AddForeignKey
ALTER TABLE "caution_installments" ADD CONSTRAINT "caution_installments_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
