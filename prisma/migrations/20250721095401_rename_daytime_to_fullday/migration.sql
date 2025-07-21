/*
  Warnings:

  - You are about to drop the column `time_slots_daytime` on the `user_schedules` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "events" ALTER COLUMN "required_hours" DROP DEFAULT;

-- AlterTable
ALTER TABLE "user_schedules" DROP COLUMN "time_slots_daytime",
ADD COLUMN     "time_slots_fullday" BOOLEAN NOT NULL DEFAULT false;
