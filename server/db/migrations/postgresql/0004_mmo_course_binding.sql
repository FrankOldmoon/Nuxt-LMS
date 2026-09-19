ALTER TABLE "game_info" ADD COLUMN "course_id" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "game_info" ALTER COLUMN "map_id" SET DATA TYPE varchar(64);--> statement-breakpoint
ALTER TABLE "game_info" DROP COLUMN "hunger";--> statement-breakpoint
ALTER TABLE "game_info" DROP COLUMN "max_hunger";--> statement-breakpoint
ALTER TABLE "game_info" DROP CONSTRAINT IF EXISTS "game_info_user_id_unique";--> statement-breakpoint
ALTER TABLE "game_info" ADD CONSTRAINT "uniq_game_info_user_course" UNIQUE("user_id","course_id");
