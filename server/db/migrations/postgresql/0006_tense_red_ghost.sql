CREATE TABLE "oauth_clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" varchar(64) NOT NULL,
	"client_secret" varchar(255) NOT NULL,
	"name" varchar(100) NOT NULL,
	"redirect_uris" jsonb NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone,
	CONSTRAINT "oauth_clients_client_id_unique" UNIQUE("client_id")
);
--> statement-breakpoint
CREATE TABLE "oauth_codes" (
	"code" varchar(128) PRIMARY KEY NOT NULL,
	"client_id" varchar(64) NOT NULL,
	"user_id" integer NOT NULL,
	"redirect_uri" varchar(500) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "oauth_codes" ADD CONSTRAINT "oauth_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_oauth_codes_expires" ON "oauth_codes" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_oauth_codes_client" ON "oauth_codes" USING btree ("client_id");