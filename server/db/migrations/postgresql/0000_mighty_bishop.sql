CREATE TABLE "activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255),
	"content" jsonb,
	"type" varchar(50) DEFAULT 'question',
	"chapter_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"content" jsonb,
	"class_id" integer,
	"course_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "bags" (
	"user_id" integer NOT NULL,
	"good_id" integer NOT NULL,
	"course_id" integer NOT NULL,
	"quantity" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	CONSTRAINT "bags_user_id_good_id_course_id_pk" PRIMARY KEY("user_id","good_id","course_id")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(100),
	"order" integer DEFAULT 0,
	"orders" jsonb DEFAULT '[]',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "chapter_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"chapter_id" integer NOT NULL,
	"content" jsonb DEFAULT '{"content":{},"type":"doc"}',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "chapters" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(100),
	"content" jsonb DEFAULT '{"content":{},"type":"doc"}',
	"tags" jsonb DEFAULT '[]',
	"question_ids" jsonb DEFAULT '[]',
	"homework_ids" jsonb DEFAULT '[]',
	"quiz_ids" jsonb DEFAULT '[]',
	"comment_ids" jsonb DEFAULT '[]',
	"objectives" jsonb DEFAULT '[]',
	"tasks" jsonb DEFAULT '[]',
	"course_id" integer NOT NULL,
	"is_open" boolean DEFAULT false,
	"user_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "class_chapters" (
	"class_id" integer NOT NULL,
	"chapter_id" integer NOT NULL,
	"open" boolean DEFAULT false,
	"config" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	CONSTRAINT "class_chapters_class_id_chapter_id_pk" PRIMARY KEY("class_id","chapter_id")
);
--> statement-breakpoint
CREATE TABLE "class_courses" (
	"class_id" integer NOT NULL,
	"course_id" integer NOT NULL,
	"config" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	CONSTRAINT "class_courses_class_id_course_id_pk" PRIMARY KEY("class_id","course_id")
);
--> statement-breakpoint
CREATE TABLE "class_races" (
	"class_id" integer NOT NULL,
	"course_id" integer NOT NULL,
	"race_cid" integer NOT NULL,
	"current_index" integer DEFAULT 0,
	"last_question_started_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	CONSTRAINT "class_races_class_id_course_id_race_cid_pk" PRIMARY KEY("class_id","course_id","race_cid")
);
--> statement-breakpoint
CREATE TABLE "classes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	CONSTRAINT "classes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"course_id" integer NOT NULL,
	"cid" integer NOT NULL,
	"name" varchar(255),
	"code" varchar(100),
	"content" jsonb,
	"user_id" integer NOT NULL,
	"parent_id" integer,
	"tags" jsonb,
	"point" integer DEFAULT 1,
	"status" varchar(30) DEFAULT 'audit',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	CONSTRAINT "comments_course_id_cid_pk" PRIMARY KEY("course_id","cid")
);
--> statement-breakpoint
CREATE TABLE "configs" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"order" integer,
	"value" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "course_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"course_id" integer NOT NULL,
	"content" jsonb DEFAULT '{"content":{},"type":"doc"}',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(100),
	"category_id" integer NOT NULL,
	"content" jsonb DEFAULT '{"content":{},"type":"doc"}',
	"orders" jsonb DEFAULT '[]',
	"grade_criteria" jsonb,
	"tags" jsonb DEFAULT '[]',
	"config" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"hash" varchar(255) NOT NULL,
	"path" varchar(500) NOT NULL,
	"type" varchar(100),
	"user_id" integer,
	"size" integer,
	"group" varchar(100),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	CONSTRAINT "files_path_unique" UNIQUE("path")
);
--> statement-breakpoint
CREATE TABLE "goods" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"content" jsonb DEFAULT '{}',
	"course_id" integer DEFAULT 0,
	"price" integer DEFAULT 0,
	"sell_price" integer DEFAULT 0,
	"stock" integer DEFAULT -1,
	"type" varchar(50) DEFAULT 'item',
	"order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "homeworks" (
	"course_id" integer NOT NULL,
	"cid" integer NOT NULL,
	"name" varchar(255),
	"code" varchar(100),
	"content" jsonb,
	"submit_count" integer DEFAULT 0,
	"avg_point" numeric(10, 2) DEFAULT '0',
	"point" integer DEFAULT 10,
	"extra" jsonb,
	"tags" jsonb,
	"explanation" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	CONSTRAINT "homeworks_course_id_cid_pk" PRIMARY KEY("course_id","cid")
);
--> statement-breakpoint
CREATE TABLE "medals" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"content" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"content" jsonb,
	"sender_user_id" integer NOT NULL,
	"receiver_user_id" integer NOT NULL,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"content" jsonb,
	"data" jsonb,
	"user_id" integer NOT NULL,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	CONSTRAINT "permissions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"course_id" integer NOT NULL,
	"cid" integer NOT NULL,
	"name" varchar(255) DEFAULT 'question',
	"content" jsonb DEFAULT '{"content":{},"type":"doc"}',
	"options" jsonb DEFAULT '[]',
	"answer" jsonb DEFAULT '[]',
	"submit_count" integer DEFAULT 0,
	"correct_count" integer DEFAULT 0,
	"wrong_count" integer DEFAULT 0,
	"point" integer DEFAULT 1,
	"type" varchar(50) DEFAULT 'single',
	"difficulty" integer DEFAULT 1,
	"tags" jsonb DEFAULT '[]',
	"extra" jsonb,
	"explanation" jsonb DEFAULT '{"content":{},"type":"doc"}',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	CONSTRAINT "questions_course_id_cid_pk" PRIMARY KEY("course_id","cid")
);
--> statement-breakpoint
CREATE TABLE "quizzes" (
	"course_id" integer NOT NULL,
	"cid" integer NOT NULL,
	"name" varchar(255),
	"code" varchar(100),
	"content" jsonb,
	"questions" jsonb,
	"time_limit" integer DEFAULT 600,
	"submit_count" integer DEFAULT 0,
	"submit_limit" integer DEFAULT 1,
	"start_at" timestamp,
	"end_at" timestamp,
	"avg_point" numeric(10, 2) DEFAULT '0',
	"point" integer DEFAULT 100,
	"extra" jsonb,
	"tags" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	CONSTRAINT "quizzes_course_id_cid_pk" PRIMARY KEY("course_id","cid")
);
--> statement-breakpoint
CREATE TABLE "races" (
	"course_id" integer NOT NULL,
	"cid" integer NOT NULL,
	"name" varchar(255),
	"content" jsonb,
	"tags" jsonb,
	"point" integer,
	"question_ids" jsonb DEFAULT '[]',
	"gap_time" integer DEFAULT 10,
	"records" jsonb DEFAULT '[]',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	CONSTRAINT "races_course_id_cid_pk" PRIMARY KEY("course_id","cid")
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_id" integer NOT NULL,
	"permission_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	CONSTRAINT "role_permissions_role_id_permission_id_pk" PRIMARY KEY("role_id","permission_id")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	CONSTRAINT "roles_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255),
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "user_chapters" (
	"user_id" integer NOT NULL,
	"chapter_id" integer NOT NULL,
	"score" numeric(8, 2) DEFAULT '0',
	"self_score" jsonb,
	"task_status" jsonb,
	"is_pass" boolean DEFAULT false,
	"read_time" integer DEFAULT 0,
	"record" jsonb DEFAULT '[]',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	CONSTRAINT "user_chapters_user_id_chapter_id_pk" PRIMARY KEY("user_id","chapter_id")
);
--> statement-breakpoint
CREATE TABLE "user_classes" (
	"user_id" integer NOT NULL,
	"class_id" integer NOT NULL,
	"is_teacher" boolean,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	CONSTRAINT "user_classes_user_id_class_id_pk" PRIMARY KEY("user_id","class_id")
);
--> statement-breakpoint
CREATE TABLE "user_comments" (
	"user_id" integer NOT NULL,
	"course_id" integer NOT NULL,
	"comment_cid" integer NOT NULL,
	"like" boolean,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	CONSTRAINT "user_comments_user_id_course_id_comment_cid_pk" PRIMARY KEY("user_id","course_id","comment_cid")
);
--> statement-breakpoint
CREATE TABLE "user_courses" (
	"user_id" integer NOT NULL,
	"course_id" integer NOT NULL,
	"is_teacher" boolean,
	"is_editor" boolean,
	"grade" varchar(50),
	"score" numeric(10, 2) DEFAULT '0',
	"race_score" numeric(10, 2) DEFAULT '0',
	"marks_score" numeric(10, 2) DEFAULT '0',
	"question_score" numeric(10, 2) DEFAULT '0',
	"quiz_score" numeric(10, 2) DEFAULT '0',
	"homework_score" numeric(10, 2) DEFAULT '0',
	"comment_score" numeric(10, 2) DEFAULT '0',
	"extra_score" numeric(10, 2) DEFAULT '0',
	"abilities" jsonb,
	"records" jsonb,
	"number" varchar(100),
	"group" varchar(100),
	"exp" integer DEFAULT 0,
	"coin" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	CONSTRAINT "user_courses_user_id_course_id_pk" PRIMARY KEY("user_id","course_id")
);
--> statement-breakpoint
CREATE TABLE "user_homeworks" (
	"user_id" integer NOT NULL,
	"course_id" integer NOT NULL,
	"homework_cid" integer NOT NULL,
	"content" jsonb,
	"score" numeric(10, 2),
	"record" jsonb,
	"files" jsonb,
	"comment" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	CONSTRAINT "user_homeworks_user_id_course_id_homework_cid_pk" PRIMARY KEY("user_id","course_id","homework_cid")
);
--> statement-breakpoint
CREATE TABLE "user_medals" (
	"user_id" integer NOT NULL,
	"medal_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	CONSTRAINT "user_medals_user_id_medal_id_pk" PRIMARY KEY("user_id","medal_id")
);
--> statement-breakpoint
CREATE TABLE "user_questions" (
	"user_id" integer NOT NULL,
	"course_id" integer NOT NULL,
	"question_cid" integer NOT NULL,
	"score" numeric(8, 2) DEFAULT '0',
	"records" jsonb,
	"correct_rate" numeric(5, 2),
	"wrong_count" integer,
	"first_record" jsonb,
	"first_right" boolean DEFAULT false,
	"submit_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	CONSTRAINT "user_questions_user_id_course_id_question_cid_pk" PRIMARY KEY("user_id","course_id","question_cid")
);
--> statement-breakpoint
CREATE TABLE "user_quizzes" (
	"user_id" integer NOT NULL,
	"course_id" integer NOT NULL,
	"quiz_cid" integer NOT NULL,
	"records" jsonb,
	"score" numeric(10, 2),
	"submit_count" integer DEFAULT 0,
	"started_at" timestamp,
	"submited_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	CONSTRAINT "user_quizzes_user_id_course_id_quiz_cid_pk" PRIMARY KEY("user_id","course_id","quiz_cid")
);
--> statement-breakpoint
CREATE TABLE "user_races" (
	"user_id" integer NOT NULL,
	"course_id" integer NOT NULL,
	"race_cid" integer NOT NULL,
	"score" numeric(10, 2),
	"records" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	CONSTRAINT "user_races_user_id_course_id_race_cid_pk" PRIMARY KEY("user_id","course_id","race_cid")
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"user_id" integer NOT NULL,
	"role_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	CONSTRAINT "user_roles_user_id_role_id_pk" PRIMARY KEY("user_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"prefer_name" varchar(255),
	"avatar_img" varchar(500),
	"english_name" varchar(255),
	"gender" varchar(50),
	"roll_number" varchar(255),
	"email" varchar(255),
	"telephone" varchar(50),
	"strong_pwd" boolean DEFAULT false,
	"pwd_questions" jsonb,
	"class_id" integer,
	"default_class" jsonb,
	"default_locale" varchar(20) DEFAULT 'zh-CN',
	"birthday" timestamp,
	"login_at" timestamp,
	"verify_at" timestamp,
	"login_ip" varchar(50),
	"login_location" varchar(255),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bags" ADD CONSTRAINT "bags_good_id_goods_id_fk" FOREIGN KEY ("good_id") REFERENCES "public"."goods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapter_versions" ADD CONSTRAINT "chapter_versions_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_chapters" ADD CONSTRAINT "class_chapters_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_courses" ADD CONSTRAINT "class_courses_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_races" ADD CONSTRAINT "class_races_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_races" ADD CONSTRAINT "class_races_course_id_race_cid_races_course_id_cid_fk" FOREIGN KEY ("course_id","race_cid") REFERENCES "public"."races"("course_id","cid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_course_id_parent_id_comments_course_id_cid_fk" FOREIGN KEY ("course_id","parent_id") REFERENCES "public"."comments"("course_id","cid") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_versions" ADD CONSTRAINT "course_versions_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "msg_sender" FOREIGN KEY ("sender_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "msg_receiver" FOREIGN KEY ("receiver_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tokens" ADD CONSTRAINT "tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_classes" ADD CONSTRAINT "user_classes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_comments" ADD CONSTRAINT "user_comments_course_id_comment_cid_comments_course_id_cid_fk" FOREIGN KEY ("course_id","comment_cid") REFERENCES "public"."comments"("course_id","cid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_homeworks" ADD CONSTRAINT "user_homeworks_course_id_homework_cid_homeworks_course_id_cid_fk" FOREIGN KEY ("course_id","homework_cid") REFERENCES "public"."homeworks"("course_id","cid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_medals" ADD CONSTRAINT "user_medals_medal_id_medals_id_fk" FOREIGN KEY ("medal_id") REFERENCES "public"."medals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_questions" ADD CONSTRAINT "user_questions_course_id_question_cid_questions_course_id_cid_fk" FOREIGN KEY ("course_id","question_cid") REFERENCES "public"."questions"("course_id","cid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_quizzes" ADD CONSTRAINT "user_quizzes_course_id_quiz_cid_quizzes_course_id_cid_fk" FOREIGN KEY ("course_id","quiz_cid") REFERENCES "public"."quizzes"("course_id","cid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_races" ADD CONSTRAINT "user_races_course_id_race_cid_races_course_id_cid_fk" FOREIGN KEY ("course_id","race_cid") REFERENCES "public"."races"("course_id","cid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_activities_chapter_id" ON "activities" USING btree ("chapter_id");--> statement-breakpoint
CREATE INDEX "idx_activities_user_id" ON "activities" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_announcements_course_id" ON "announcements" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "idx_announcements_class_id" ON "announcements" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "idx_bags_user_id" ON "bags" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_bags_good_id" ON "bags" USING btree ("good_id");--> statement-breakpoint
CREATE INDEX "idx_chapter_versions_chapter_id" ON "chapter_versions" USING btree ("chapter_id");--> statement-breakpoint
CREATE INDEX "idx_chapters_course_id" ON "chapters" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "idx_chapters_user_id" ON "chapters" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_class_chapters_class_id" ON "class_chapters" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "idx_class_chapters_chapter_id" ON "class_chapters" USING btree ("chapter_id");--> statement-breakpoint
CREATE INDEX "idx_class_courses_class_id" ON "class_courses" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "idx_class_courses_course_id" ON "class_courses" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "idx_class_races_class_id" ON "class_races" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "idx_comments_user_id" ON "comments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_comments_parent" ON "comments" USING btree ("course_id","parent_id");--> statement-breakpoint
CREATE INDEX "idx_course_versions_course_id" ON "course_versions" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "idx_courses_category_id" ON "courses" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_files_user_id" ON "files" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_goods_course_id" ON "goods" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "idx_messages_sender" ON "messages" USING btree ("sender_user_id");--> statement-breakpoint
CREATE INDEX "idx_messages_receiver" ON "messages" USING btree ("receiver_user_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_user_id" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_questions_course_id" ON "questions" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "idx_questions_type" ON "questions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_tokens_user_id" ON "tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_chapters_user_id" ON "user_chapters" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_chapters_chapter_id" ON "user_chapters" USING btree ("chapter_id");--> statement-breakpoint
CREATE INDEX "idx_user_classes_user_id" ON "user_classes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_classes_class_id" ON "user_classes" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "idx_user_comments_user_id" ON "user_comments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_courses_user_id" ON "user_courses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_courses_course_id" ON "user_courses" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "idx_user_homeworks_user_id" ON "user_homeworks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_homeworks_homework" ON "user_homeworks" USING btree ("course_id","homework_cid");--> statement-breakpoint
CREATE INDEX "idx_user_medals_user_id" ON "user_medals" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_medals_medal_id" ON "user_medals" USING btree ("medal_id");--> statement-breakpoint
CREATE INDEX "idx_user_questions_user_id" ON "user_questions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_questions_question" ON "user_questions" USING btree ("course_id","question_cid");--> statement-breakpoint
CREATE INDEX "idx_user_quizzes_user_id" ON "user_quizzes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_races_user_id" ON "user_races" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_roles_user_role" ON "user_roles" USING btree ("user_id","role_id");--> statement-breakpoint
CREATE INDEX "idx_users_class_id" ON "users" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_users_username" ON "users" USING btree ("username");