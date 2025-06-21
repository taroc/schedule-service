/*
  Warnings:

  - Made the column `deadline` on table `events` required. This step will fail if there are existing NULL values in that column.

*/
-- Update existing NULL deadlines to a default value (1 week from now)
UPDATE "events" SET "deadline" = NOW() + INTERVAL '7 days' WHERE "deadline" IS NULL;

-- AlterTable
ALTER TABLE "events" ALTER COLUMN "deadline" SET NOT NULL;
