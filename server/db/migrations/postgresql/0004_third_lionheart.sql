CREATE TABLE "peer_review_configs" (
	"course_id" integer NOT NULL,
	"cid" integer NOT NULL,
	"name" varchar(255),
	"options" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone,
	CONSTRAINT "peer_review_configs_course_id_cid_pk" PRIMARY KEY("course_id","cid")
);
--> statement-breakpoint
CREATE TABLE "peer_reviews" (
	"course_id" integer NOT NULL,
	"cid" integer NOT NULL,
	"from_user_id" integer NOT NULL,
	"target_user_id" integer NOT NULL,
	"scores" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone,
	CONSTRAINT "peer_reviews_course_id_cid_from_user_id_target_user_id_pk" PRIMARY KEY("course_id","cid","from_user_id","target_user_id")
);
--> statement-breakpoint
ALTER TABLE "user_courses" ADD COLUMN "peer_score" numeric(10, 2) DEFAULT '0';--> statement-breakpoint
CREATE INDEX "idx_peer_reviews_target" ON "peer_reviews" USING btree ("course_id","cid","target_user_id");