CREATE TABLE "chat_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"path" varchar(500) NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"mime" varchar(100),
	"size" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "tool_calls" text;--> statement-breakpoint
CREATE INDEX "idx_chat_files_conversation_id" ON "chat_files" USING btree ("conversation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_chat_files_conv_path" ON "chat_files" USING btree ("conversation_id","path");