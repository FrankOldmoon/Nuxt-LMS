ALTER TABLE "activities" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "activities" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "activities" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "activities" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "activities" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp with time zone USING "deleted_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "announcements" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "announcements" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "announcements" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "announcements" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "announcements" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp with time zone USING "deleted_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "bags" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "bags" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "bags" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "bags" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "bags" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp with time zone USING "deleted_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "categories" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "categories" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "categories" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "categories" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "categories" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp with time zone USING "deleted_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "chapter_versions" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "chapter_versions" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "chapter_versions" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "chapter_versions" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "chapter_versions" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp with time zone USING "deleted_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "chapters" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "chapters" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "chapters" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "chapters" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "chapters" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp with time zone USING "deleted_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "class_chapters" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "class_chapters" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "class_chapters" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "class_chapters" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "class_chapters" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp with time zone USING "deleted_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "class_courses" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "class_courses" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "class_courses" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "class_courses" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "class_courses" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp with time zone USING "deleted_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "class_races" ALTER COLUMN "last_question_started_at" SET DATA TYPE timestamp with time zone USING "last_question_started_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "class_races" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "class_races" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "class_races" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "class_races" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "class_races" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp with time zone USING "deleted_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "classes" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "classes" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "classes" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "classes" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "classes" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp with time zone USING "deleted_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "comments" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "comments" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "comments" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "comments" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "comments" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp with time zone USING "deleted_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "configs" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "configs" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "configs" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "configs" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "configs" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp with time zone USING "deleted_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "course_versions" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "course_versions" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "course_versions" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "course_versions" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "course_versions" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp with time zone USING "deleted_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "courses" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "courses" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "courses" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "courses" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "courses" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp with time zone USING "deleted_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "feedbacks" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "feedbacks" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "feedbacks" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "feedbacks" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "feedbacks" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp with time zone USING "deleted_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "files" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "files" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "files" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "files" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "files" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp with time zone USING "deleted_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "goods" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "goods" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "goods" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "goods" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "goods" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp with time zone USING "deleted_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "homeworks" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "homeworks" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "homeworks" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "homeworks" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "homeworks" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp with time zone USING "deleted_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "medals" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "medals" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "medals" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "medals" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "medals" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp with time zone USING "deleted_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "read_at" SET DATA TYPE timestamp with time zone USING "read_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp with time zone USING "deleted_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "read_at" SET DATA TYPE timestamp with time zone USING "read_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp with time zone USING "deleted_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "permissions" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "permissions" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "permissions" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "permissions" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "permissions" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp with time zone USING "deleted_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "questions" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "questions" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "questions" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "questions" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "questions" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp with time zone USING "deleted_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "quizzes" ALTER COLUMN "start_at" SET DATA TYPE timestamp with time zone USING "start_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "quizzes" ALTER COLUMN "end_at" SET DATA TYPE timestamp with time zone USING "end_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "quizzes" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "quizzes" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "quizzes" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "quizzes" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "quizzes" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp with time zone USING "deleted_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "races" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "races" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "races" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "races" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "races" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp with time zone USING "deleted_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "role_permissions" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "role_permissions" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "role_permissions" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "role_permissions" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "role_permissions" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp with time zone USING "deleted_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "roles" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "roles" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "roles" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "roles" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "roles" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp with time zone USING "deleted_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "tokens" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "tokens" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "tokens" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "tokens" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "tokens" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp with time zone USING "deleted_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "user_chapters" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "user_chapters" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "user_chapters" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "user_chapters" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "user_chapters" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp with time zone USING "deleted_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "user_classes" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "user_classes" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "user_classes" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "user_classes" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "user_classes" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp with time zone USING "deleted_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "user_comments" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "user_comments" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "user_comments" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "user_comments" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "user_comments" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp with time zone USING "deleted_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "user_courses" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "user_courses" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "user_courses" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "user_courses" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "user_courses" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp with time zone USING "deleted_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "user_homeworks" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "user_homeworks" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "user_homeworks" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "user_homeworks" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "user_homeworks" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp with time zone USING "deleted_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "user_medals" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "user_medals" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "user_medals" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "user_medals" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "user_medals" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp with time zone USING "deleted_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "user_questions" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "user_questions" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "user_questions" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "user_questions" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "user_questions" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp with time zone USING "deleted_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "user_quizzes" ALTER COLUMN "started_at" SET DATA TYPE timestamp with time zone USING "started_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "user_quizzes" ALTER COLUMN "submited_at" SET DATA TYPE timestamp with time zone USING "submited_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "user_quizzes" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "user_quizzes" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "user_quizzes" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "user_quizzes" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "user_quizzes" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp with time zone USING "deleted_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "user_races" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "user_races" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "user_races" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "user_races" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "user_races" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp with time zone USING "deleted_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "user_roles" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "user_roles" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "user_roles" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "user_roles" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "user_roles" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp with time zone USING "deleted_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "birthday" SET DATA TYPE timestamp with time zone USING "birthday" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "login_at" SET DATA TYPE timestamp with time zone USING "login_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "verify_at" SET DATA TYPE timestamp with time zone USING "verify_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "locked_until" SET DATA TYPE timestamp with time zone USING "locked_until" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'Asia/Shanghai';--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp with time zone USING "deleted_at" AT TIME ZONE 'Asia/Shanghai';