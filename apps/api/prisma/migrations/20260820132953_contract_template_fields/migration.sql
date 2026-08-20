-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "addressCity" TEXT,
ADD COLUMN     "addressComplement" TEXT,
ADD COLUMN     "addressNeighborhood" TEXT,
ADD COLUMN     "addressNumber" TEXT,
ADD COLUMN     "addressState" TEXT,
ADD COLUMN     "addressStreet" TEXT,
ADD COLUMN     "addressZipCode" TEXT;

-- AlterTable
ALTER TABLE "contracts" ADD COLUMN     "cautionAmountSnapshot" DECIMAL(10,2),
ADD COLUMN     "extraKmRateSnapshot" DECIMAL(10,2),
ADD COLUMN     "monthlyKmLimitSnapshot" INTEGER,
ADD COLUMN     "templateType" TEXT NOT NULL DEFAULT 'standard';

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "bankAccount" TEXT,
ADD COLUMN     "bankAgency" TEXT,
ADD COLUMN     "bankName" TEXT,
ADD COLUMN     "pixKey" TEXT;

-- AlterTable
ALTER TABLE "rate_plans" ADD COLUMN     "cautionAmount" DECIMAL(10,2),
ADD COLUMN     "kmAllowancePerMonth" INTEGER;

-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN     "fipeValue" DECIMAL(10,2),
ADD COLUMN     "maintenanceIntervalKm" INTEGER;
