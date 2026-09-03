-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "addressCity" TEXT,
ADD COLUMN     "addressComplement" TEXT,
ADD COLUMN     "addressNeighborhood" TEXT,
ADD COLUMN     "addressNumber" TEXT,
ADD COLUMN     "addressState" TEXT,
ADD COLUMN     "addressStreet" TEXT,
ADD COLUMN     "addressZipCode" TEXT;

-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN     "acquisitionCost" DECIMAL(10,2);
