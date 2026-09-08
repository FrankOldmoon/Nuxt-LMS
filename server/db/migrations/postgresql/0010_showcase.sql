CREATE TABLE "showcases" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"category" varchar(100),
	"cover" varchar(500),
	"content" jsonb,
	"files" jsonb,
	"status" varchar(30) DEFAULT 'pending',
	"like_count" integer DEFAULT 0,
	"approved_by" integer,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone
);--> statement-breakpoint
CREATE TABLE "showcase_likes" (
	"user_id" integer NOT NULL,
	"showcase_id" integer NOT NULL,
	"like" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "showcase_likes_user_id_showcase_id_pk" PRIMARY KEY("user_id","showcase_id")
);--> statement-breakpoint
CREATE TABLE "showcase_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"showcase_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"parent_id" integer,
	"content" jsonb,
	"status" varchar(30) DEFAULT 'published',
	"like_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone
);--> statement-breakpoint
ALTER TABLE "showcase_likes" ADD CONSTRAINT "showcase_likes_showcase_id_showcases_id_fk" FOREIGN KEY ("showcase_id") REFERENCES "public"."showcases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "showcase_comments" ADD CONSTRAINT "showcase_comments_showcase_id_showcases_id_fk" FOREIGN KEY ("showcase_id") REFERENCES "public"."showcases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "showcase_comments" ADD CONSTRAINT "showcase_comments_parent_id_showcase_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."showcase_comments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_showcases_user_id" ON "showcases" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_showcases_status" ON "showcases" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_showcases_category" ON "showcases" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_showcase_likes_user_id" ON "showcase_likes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_showcase_comments_showcase_id" ON "showcase_comments" USING btree ("showcase_id");--> statement-breakpoint
CREATE INDEX "idx_showcase_comments_user_id" ON "showcase_comments" USING btree ("user_id");