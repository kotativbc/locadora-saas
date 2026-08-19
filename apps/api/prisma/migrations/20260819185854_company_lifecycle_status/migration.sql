/*
  Warnings:

  - You are about to drop the column `active` on the `companies` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "companies" DROP COLUMN "active",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN     "statusReason" TEXT;

-- CreateTable
CREATE TABLE "company_status_events" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "reason" TEXT,
    "changedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_status_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "company_status_events_companyId_idx" ON "company_status_events"("companyId");

-- AddForeignKey
ALTER TABLE "company_status_events" ADD CONSTRAINT "company_status_events_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
