ALTER TABLE "claims" ADD COLUMN "extensions" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "photos" ADD COLUMN "claim_id" text;--> statement-breakpoint
ALTER TABLE "photos" ADD COLUMN "slot" integer;--> statement-breakpoint
ALTER TABLE "photos" ADD COLUMN "check" jsonb;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "photos_claim_idx" ON "photos" USING btree ("claim_id","slot");