/*
  Warnings:

  - You are about to drop the column `date_mode` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `matched_dates` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `priority` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `required_days` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `time_slots_afternoon` on the `user_schedules` table. All the data in the column will be lost.
  - You are about to drop the column `time_slots_fullday` on the `user_schedules` table. All the data in the column will be lost.
  - You are about to drop the column `time_slots_morning` on the `user_schedules` table. All the data in the column will be lost.
  - Added the required column `required_time_slots` to the `events` table without a default value. This is not possible if the table is not empty.
  - Made the column `period_end` on table `events` required. This step will fail if there are existing NULL values in that column.
  - Made the column `period_start` on table `events` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "events_priority_idx";

-- AlterTable
ALTER TABLE "events" DROP COLUMN "date_mode",
DROP COLUMN "matched_dates",
DROP COLUMN "priority",
DROP COLUMN "required_days",
ADD COLUMN     "matched_time_slots" TEXT,
ADD COLUMN     "required_time_slots" INTEGER NOT NULL,
ALTER COLUMN "period_end" SET NOT NULL,
ALTER COLUMN "period_start" SET NOT NULL;

-- AlterTable
ALTER TABLE "user_schedules" DROP COLUMN "time_slots_afternoon",
DROP COLUMN "time_slots_fullday",
DROP COLUMN "time_slots_morning",
ADD COLUMN     "time_slots_daytime" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "time_slots_evening" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "events_period_start_idx" ON "events"("period_start");

-- CreateIndex
CREATE INDEX "events_period_end_idx" ON "events"("period_end");
