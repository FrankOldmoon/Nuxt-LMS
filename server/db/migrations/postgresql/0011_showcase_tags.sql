ALTER TABLE "showcases" ADD COLUMN "tags" jsonb DEFAULT '[]';--> statement-breakpoint
ALTER TABLE "showcases" ALTER COLUMN "category" SET DEFAULT 'software';