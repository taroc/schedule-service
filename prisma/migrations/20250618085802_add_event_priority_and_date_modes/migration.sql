-- AlterTable
ALTER TABLE "events" ADD COLUMN     "date_mode" TEXT NOT NULL DEFAULT 'consecutive',
ADD COLUMN     "period_end" TIMESTAMP(3),
ADD COLUMN     "period_start" TIMESTAMP(3),
ADD COLUMN     "priority" TEXT NOT NULL DEFAULT 'medium',
ADD COLUMN     "reservation_status" TEXT NOT NULL DEFAULT 'open';

-- CreateIndex
CREATE INDEX "events_priority_idx" ON "events"("priority");

-- CreateIndex
CREATE INDEX "events_reservation_status_idx" ON "events"("reservation_status");
