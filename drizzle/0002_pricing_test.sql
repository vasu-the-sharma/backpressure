CREATE TABLE "price_exposure" (
	"visitor_id" text NOT NULL,
	"page" text NOT NULL,
	"day" integer NOT NULL,
	"arm" text NOT NULL,
	"segment" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "price_exposure_visitor_id_page_day_pk" PRIMARY KEY("visitor_id","page","day")
);
--> statement-breakpoint
CREATE TABLE "price_survey" (
	"id" text PRIMARY KEY NOT NULL,
	"visitor_id" text,
	"segment" text NOT NULL,
	"currency" text NOT NULL,
	"too_cheap" integer NOT NULL,
	"cheap" integer NOT NULL,
	"expensive" integer NOT NULL,
	"too_expensive" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "waitlist" ADD COLUMN "arm" text;--> statement-breakpoint
ALTER TABLE "waitlist" ADD COLUMN "segment" text;--> statement-breakpoint
ALTER TABLE "waitlist" ADD COLUMN "period" text;--> statement-breakpoint
ALTER TABLE "waitlist" ADD COLUMN "visitor_id" text;--> statement-breakpoint
CREATE INDEX "price_exposure_arm_idx" ON "price_exposure" USING btree ("segment","arm");