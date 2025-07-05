/*
  Phase 1-4 Event Flexibility Features Migration
  
  Adds comprehensive event configuration options:
  - Phase 1: Matching strategy settings
  - Phase 2: Participant selection strategies  
  - Phase 3: Advanced matching conditions
  - Phase 4: Confirmation and notification systems
*/

-- AlterTable: Add Phase 1-4 fields with proper defaults for existing data
ALTER TABLE "events" ADD COLUMN     "allow_partial_matching" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "confirmation_deadline" TIMESTAMP(3),
ADD COLUMN     "confirmation_mode" TEXT NOT NULL DEFAULT 'creator_only',
ADD COLUMN     "confirmation_timeout" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "custom_messages" TEXT,
ADD COLUMN     "date_weights" TEXT,
-- Default Discord settings for existing events
ADD COLUMN     "discord_notification_settings" TEXT NOT NULL DEFAULT '{"enabled":true,"webhookUrl":"https://discord.com/api/webhooks/test/webhook","notifyOnMatching":true,"notifyOnDeadlineApproaching":true,"notifyOnConfirmationRequired":true,"notifyOnConfirmationReceived":true,"notifyOnCancellation":true,"mentionRoles":[],"channelOverrides":[]}',
ADD COLUMN     "fallback_strategy" TEXT,
ADD COLUMN     "grace_period" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "lottery_seed" INTEGER,
ADD COLUMN     "matching_strategy" TEXT NOT NULL DEFAULT 'consecutive',
ADD COLUMN     "max_participants" INTEGER,
ADD COLUMN     "max_suggestions" INTEGER,
-- Set min_participants to existing required_participants for existing events
ADD COLUMN     "min_participants" INTEGER,
-- Set minimum_confirmations to existing required_participants for existing events  
ADD COLUMN     "minimum_confirmations" INTEGER,
ADD COLUMN     "minimum_consecutive" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "minimum_time_slots" INTEGER,
ADD COLUMN     "optimal_participants" INTEGER,
ADD COLUMN     "participant_selection_strategy" TEXT NOT NULL DEFAULT 'first_come',
ADD COLUMN     "preferred_dates" TEXT,
ADD COLUMN     "reminder_schedule" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN     "require_all_participants" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "require_creator_confirmation" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "require_participant_confirmation" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "selection_deadline" TIMESTAMP(3),
ADD COLUMN     "suggest_multiple_options" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "time_slot_restriction" TEXT NOT NULL DEFAULT 'both';

-- Update existing events with proper values for required fields
UPDATE "events" SET 
  "min_participants" = "required_participants",
  "minimum_confirmations" = "required_participants"
WHERE "min_participants" IS NULL OR "minimum_confirmations" IS NULL;

-- Make the fields NOT NULL after setting values
ALTER TABLE "events" ALTER COLUMN "min_participants" SET NOT NULL;
ALTER TABLE "events" ALTER COLUMN "minimum_confirmations" SET NOT NULL;

-- CreateTable
CREATE TABLE "event_confirmations" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "confirmation_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "confirmed_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_confirmations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_state_history" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "previous_status" TEXT NOT NULL,
    "new_status" TEXT NOT NULL,
    "triggered_by" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "additional_data" TEXT,

    CONSTRAINT "event_state_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_confirmations_event_id_idx" ON "event_confirmations"("event_id");

-- CreateIndex
CREATE INDEX "event_confirmations_user_id_idx" ON "event_confirmations"("user_id");

-- CreateIndex
CREATE INDEX "event_confirmations_status_idx" ON "event_confirmations"("status");

-- CreateIndex
CREATE INDEX "event_confirmations_confirmation_type_idx" ON "event_confirmations"("confirmation_type");

-- CreateIndex
CREATE INDEX "event_confirmations_confirmed_at_idx" ON "event_confirmations"("confirmed_at");

-- CreateIndex
CREATE UNIQUE INDEX "event_confirmations_event_id_user_id_confirmation_type_key" ON "event_confirmations"("event_id", "user_id", "confirmation_type");

-- CreateIndex
CREATE INDEX "event_state_history_event_id_idx" ON "event_state_history"("event_id");

-- CreateIndex
CREATE INDEX "event_state_history_new_status_idx" ON "event_state_history"("new_status");

-- CreateIndex
CREATE INDEX "event_state_history_triggered_by_idx" ON "event_state_history"("triggered_by");

-- CreateIndex
CREATE INDEX "event_state_history_timestamp_idx" ON "event_state_history"("timestamp");

-- CreateIndex
CREATE INDEX "events_matching_strategy_idx" ON "events"("matching_strategy");

-- CreateIndex
CREATE INDEX "events_participant_selection_strategy_idx" ON "events"("participant_selection_strategy");

-- CreateIndex
CREATE INDEX "events_deadline_idx" ON "events"("deadline");

-- CreateIndex
CREATE INDEX "events_confirmation_deadline_idx" ON "events"("confirmation_deadline");

-- AddForeignKey
ALTER TABLE "event_confirmations" ADD CONSTRAINT "event_confirmations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_confirmations" ADD CONSTRAINT "event_confirmations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_state_history" ADD CONSTRAINT "event_state_history_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_state_history" ADD CONSTRAINT "event_state_history_triggered_by_fkey" FOREIGN KEY ("triggered_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
