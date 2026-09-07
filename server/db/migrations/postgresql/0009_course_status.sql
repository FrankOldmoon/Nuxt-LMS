CREATE TYPE "course_status" AS ENUM ('published', 'draft', 'archived');
--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "status" "course_status" DEFAULT 'published' NOT NULL;