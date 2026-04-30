-- AlterTable
ALTER TABLE "attendances" ADD COLUMN     "accuracy" DOUBLE PRECISION,
ADD COLUMN     "deviceHash" TEXT,
ADD COLUMN     "ipAddress" TEXT;

-- CreateIndex
CREATE INDEX "attendances_sessionId_deviceHash_idx" ON "attendances"("sessionId", "deviceHash");
