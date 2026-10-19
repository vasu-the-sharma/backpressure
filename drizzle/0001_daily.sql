CREATE TABLE "daily_result" (
	"day" integer NOT NULL,
	"user_id" text NOT NULL,
	"servers" integer NOT NULL,
	"p99_ms" integer NOT NULL,
	"error_rate" real NOT NULL,
	"solved_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "daily_result_day_user_id_pk" PRIMARY KEY("day","user_id")
);
--> statement-breakpoint
CREATE TABLE "waitlist" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"user_id" text,
	"plan" text NOT NULL,
	"source" text NOT NULL,
	"price_variant" text,
	"price_cents" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "daily_result" ADD CONSTRAINT "daily_result_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "daily_result_rank_idx" ON "daily_result" USING btree ("day","servers","p99_ms","solved_at");--> statement-breakpoint
CREATE UNIQUE INDEX "waitlist_email_plan_idx" ON "waitlist" USING btree ("email","plan");