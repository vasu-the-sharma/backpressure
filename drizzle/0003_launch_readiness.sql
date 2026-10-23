ALTER TABLE "waitlist" ADD COLUMN "ip_hash" text;--> statement-breakpoint
-- Keep each visitor's first survey answer before making visitor_id unique.
DELETE FROM "price_survey" a USING "price_survey" b
  WHERE a."visitor_id" IS NOT NULL AND a."visitor_id" = b."visitor_id" AND a.ctid > b.ctid;--> statement-breakpoint
CREATE UNIQUE INDEX "price_survey_visitor_idx" ON "price_survey" USING btree ("visitor_id");--> statement-breakpoint
CREATE INDEX "waitlist_ip_hash_idx" ON "waitlist" USING btree ("ip_hash","created_at");