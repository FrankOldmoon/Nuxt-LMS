ALTER TABLE "game_info" RENAME COLUMN "zone" TO "map_id";
--> statement-breakpoint
ALTER TABLE "game_info" ALTER COLUMN "map_id" SET DEFAULT 'world';