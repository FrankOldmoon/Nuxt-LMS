CREATE TABLE "showcase_users" (
	"showcase_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "showcase_users_showcase_id_user_id_pk" PRIMARY KEY("showcase_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "showcase_users" ADD CONSTRAINT "showcase_users_showcase_id_showcases_id_fk" FOREIGN KEY ("showcase_id") REFERENCES "public"."showcases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_showcase_users_user_id" ON "showcase_users" USING btree ("user_id");