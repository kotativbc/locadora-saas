-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "claimId" TEXT;

-- CreateTable
CREATE TABLE "claims" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "contractId" TEXT,
    "type" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "description" TEXT NOT NULL,
    "policeReportNumber" TEXT,
    "thirdPartyInvolved" BOOLEAN NOT NULL DEFAULT false,
    "thirdPartyDescription" TEXT,
    "insuranceClaimNumber" TEXT,
    "estimatedCost" DECIMAL(10,2),
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fines" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "contractId" TEXT,
    "infractionDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "amount" DECIMAL(10,2) NOT NULL,
    "description" TEXT NOT NULL,
    "documentNumber" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "chargeToCustomer" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_positions" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "locationText" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedByUserId" TEXT,

    CONSTRAINT "vehicle_positions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "claims_companyId_idx" ON "claims"("companyId");

-- CreateIndex
CREATE INDEX "claims_vehicleId_idx" ON "claims"("vehicleId");

-- CreateIndex
CREATE INDEX "fines_companyId_idx" ON "fines"("companyId");

-- CreateIndex
CREATE INDEX "fines_vehicleId_idx" ON "fines"("vehicleId");

-- CreateIndex
CREATE INDEX "vehicle_positions_companyId_idx" ON "vehicle_positions"("companyId");

-- CreateIndex
CREATE INDEX "vehicle_positions_vehicleId_idx" ON "vehicle_positions"("vehicleId");

-- CreateIndex
CREATE INDEX "documents_claimId_idx" ON "documents"("claimId");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fines" ADD CONSTRAINT "fines_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fines" ADD CONSTRAINT "fines_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fines" ADD CONSTRAINT "fines_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_positions" ADD CONSTRAINT "vehicle_positions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_positions" ADD CONSTRAINT "vehicle_positions_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
