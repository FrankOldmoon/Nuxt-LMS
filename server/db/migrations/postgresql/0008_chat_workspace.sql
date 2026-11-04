-- /chat 对话工作台：会话 + 消息
-- 注：oauth_codes 的 nonce / code_challenge 已由 0007_oauth_nonce_pkce.sql 手动迁移，
-- 此处不再重复 ALTER（该列已存在，重复执行会报 duplicate column）。
CREATE TABLE "chat_conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" varchar(255) DEFAULT 'New chat' NOT NULL,
	"model" varchar(100),
	"pinned" boolean DEFAULT false NOT NULL,
	"message_count" integer DEFAULT 0 NOT NULL,
	"last_message_at" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"role" varchar(20) NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"reasoning" text,
	"model" varchar(100),
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "idx_chat_conversations_user_id" ON "chat_conversations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_chat_conversations_last_message_at" ON "chat_conversations" USING btree ("last_message_at");--> statement-breakpoint
CREATE INDEX "idx_chat_messages_conversation_id" ON "chat_messages" USING btree ("conversation_id");