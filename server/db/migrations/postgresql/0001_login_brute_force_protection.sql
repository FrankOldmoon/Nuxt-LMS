ALTER TABLE "users" ADD COLUMN "failed_attempts" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "locked_until" timestamp;