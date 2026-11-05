-- 会话分享给老师：生成只读令牌（手写迁移，带 IF NOT EXISTS 便于重复执行）
ALTER TABLE "chat_conversations" ADD COLUMN IF NOT EXISTS "share_token" varchar(64);
ALTER TABLE "chat_conversations" ADD COLUMN IF NOT EXISTS "shared_at" timestamp with time zone;
CREATE UNIQUE INDEX IF NOT EXISTS "idx_chat_conversations_share_token"
  ON "chat_conversations" ("share_token");
