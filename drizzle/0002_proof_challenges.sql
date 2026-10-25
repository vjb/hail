CREATE TYPE "public"."capture_source" AS ENUM('camera', 'file');--> statement-breakpoint
CREATE TABLE "proof_challenges" (
	"id" text PRIMARY KEY NOT NULL,
	"claim_id" text NOT NULL,
	"slot" integer NOT NULL,
	"code" text NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "photos" ADD COLUMN "challenge_id" text;--> statement-breakpoint
ALTER TABLE "photos" ADD COLUMN "capture_source" "capture_source";--> statement-breakpoint
ALTER TABLE "proof_challenges" ADD CONSTRAINT "proof_challenges_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "proof_challenges_claim_idx" ON "proof_challenges" USING btree ("claim_id","slot");