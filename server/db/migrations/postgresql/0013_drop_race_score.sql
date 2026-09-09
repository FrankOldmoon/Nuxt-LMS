-- 移除 race_score：先将既有抢答分并入 question_score，再删除列
UPDATE "user_courses" SET "question_score" = COALESCE("question_score", 0) + COALESCE("race_score", 0) WHERE COALESCE("race_score", 0) <> 0;
--> statement-breakpoint
ALTER TABLE "user_courses" DROP COLUMN "race_score";