CREATE TABLE "game_info" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" varchar(50) DEFAULT '玩家',
	"cfg" jsonb DEFAULT '{}'::jsonb,
	"gold" integer DEFAULT 300,
	"inventory" jsonb DEFAULT '{}'::jsonb,
	"equipped" jsonb DEFAULT '{}'::jsonb,
	"x" integer DEFAULT 1600,
	"y" integer DEFAULT 1248,
	"facing" integer DEFAULT 2,
	"mode" varchar(20) DEFAULT 'idle',
	"zone" varchar(20) DEFAULT 'world',
	"hp" integer DEFAULT 100,
	"max_hp" integer DEFAULT 100,
	"hunger" integer DEFAULT 100,
	"max_hunger" integer DEFAULT 100,
	"xp" integer DEFAULT 0,
	"level" integer DEFAULT 1,
	"tasks" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone,
	CONSTRAINT "game_info_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE INDEX "idx_game_info_user_id" ON "game_info" USING btree ("user_id");