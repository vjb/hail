CREATE TYPE "public"."bounty_status" AS ENUM('created', 'screening', 'pending_approval', 'blocked', 'rejected_by_owner', 'open', 'claimed', 'verifying', 'needs_owner_review', 'rejected', 'appealed', 'approved', 'paying', 'paid', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."claim_status" AS ENUM('active', 'submitted', 'expired', 'released');--> statement-breakpoint
CREATE TYPE "public"."ledger_account" AS ENUM('available', 'held', 'paypal_clearing', 'payouts_sent');--> statement-breakpoint
CREATE TYPE "public"."ledger_kind" AS ENUM('topup', 'hold', 'release', 'payout', 'withdraw');--> statement-breakpoint
CREATE TYPE "public"."payout_status" AS ENUM('pending', 'sent', 'succeeded', 'failed', 'unclaimed', 'returned', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('owner', 'worker', 'admin');--> statement-breakpoint
CREATE TYPE "public"."screening_decision" AS ENUM('allow', 'needs_owner_approval', 'block');--> statement-breakpoint
CREATE TYPE "public"."screening_layer" AS ENUM('rules', 'ai', 'final');--> statement-breakpoint
CREATE TYPE "public"."topup_status" AS ENUM('created', 'captured', 'failed');--> statement-breakpoint
CREATE TYPE "public"."verification_result" AS ENUM('pass', 'fail', 'uncertain');--> statement-breakpoint
CREATE TYPE "public"."withdrawal_status" AS ENUM('pending', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "ai_calls" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"purpose" text NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"latency_ms" integer,
	"cost_micros" integer,
	"outcome" text,
	"prompt_version" text,
	"bounty_id" text,
	"submission_id" text,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"key_hash" text NOT NULL,
	"prefix" text NOT NULL,
	"daily_cap_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "api_keys_key_hash_unique" UNIQUE("key_hash"),
	CONSTRAINT "api_keys_cap_positive" CHECK ("api_keys"."daily_cap_cents" > 0)
);
--> statement-breakpoint
CREATE TABLE "appeals" (
	"id" text PRIMARY KEY NOT NULL,
	"submission_id" text NOT NULL,
	"bounty_id" text NOT NULL,
	"reason" text NOT NULL,
	"decision" text,
	"decided_by" text,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "appeals_submission_id_unique" UNIQUE("submission_id")
);
--> statement-breakpoint
CREATE TABLE "bounties" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"api_key_id" text,
	"title" text NOT NULL,
	"instructions" text NOT NULL,
	"deliverables" jsonb NOT NULL,
	"acceptance_checklist" jsonb NOT NULL,
	"reward_cents" integer NOT NULL,
	"spots" integer DEFAULT 1 NOT NULL,
	"location" jsonb,
	"product_query" text,
	"product" jsonb,
	"category" text,
	"agent_context" text,
	"expires_at" timestamp with time zone NOT NULL,
	"status" "bounty_status" DEFAULT 'created' NOT NULL,
	"callback_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bounties_reward_range" CHECK ("bounties"."reward_cents" BETWEEN 100 AND 20000),
	CONSTRAINT "bounties_spots_range" CHECK ("bounties"."spots" BETWEEN 1 AND 10)
);
--> statement-breakpoint
CREATE TABLE "bounty_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"bounty_id" text NOT NULL,
	"from_status" "bounty_status",
	"to_status" "bounty_status" NOT NULL,
	"actor" text NOT NULL,
	"detail" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "callback_deliveries" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"bounty_id" text NOT NULL,
	"event" text NOT NULL,
	"status" text NOT NULL,
	"url" text NOT NULL,
	"payload" jsonb NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_status" integer,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "claims" (
	"id" text PRIMARY KEY NOT NULL,
	"bounty_id" text NOT NULL,
	"worker_id" text NOT NULL,
	"claimed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"status" "claim_status" DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idempotency_records" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"api_key_id" text NOT NULL,
	"key" text NOT NULL,
	"request_hash" text NOT NULL,
	"response_status" integer,
	"response_body" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ledger_entries" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"owner_id" text NOT NULL,
	"txn_key" text NOT NULL,
	"account" "ledger_account" NOT NULL,
	"amount_cents" integer NOT NULL,
	"kind" "ledger_kind" NOT NULL,
	"bounty_id" text,
	"paypal_ref" text,
	"memo" text,
	CONSTRAINT "ledger_nonzero" CHECK ("ledger_entries"."amount_cents" <> 0)
);
--> statement-breakpoint
CREATE TABLE "owner_policies" (
	"owner_id" text PRIMARY KEY NOT NULL,
	"approval_threshold_cents" integer DEFAULT 5000 NOT NULL,
	"max_open_bounties" integer DEFAULT 20 NOT NULL,
	"max_bounties_per_hour" integer DEFAULT 30 NOT NULL,
	"allowed_categories" text[] DEFAULT '{}'::text[] NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payouts" (
	"id" text PRIMARY KEY NOT NULL,
	"bounty_id" text NOT NULL,
	"worker_id" text NOT NULL,
	"receiver_email" text NOT NULL,
	"sender_batch_id" text NOT NULL,
	"batch_id" text,
	"item_id" text,
	"amount_cents" integer NOT NULL,
	"status" "payout_status" DEFAULT 'pending' NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payouts_bounty_id_unique" UNIQUE("bounty_id"),
	CONSTRAINT "payouts_sender_batch_id_unique" UNIQUE("sender_batch_id")
);
--> statement-breakpoint
CREATE TABLE "photos" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"mime" text NOT NULL,
	"width" integer,
	"height" integer,
	"bytes" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "screenings" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"bounty_id" text NOT NULL,
	"layer" "screening_layer" NOT NULL,
	"decision" "screening_decision" NOT NULL,
	"category" text NOT NULL,
	"rationale" text NOT NULL,
	"confidence" real,
	"model" text,
	"prompt_version" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"claim_id" text NOT NULL,
	"bounty_id" text NOT NULL,
	"worker_id" text NOT NULL,
	"photo_ids" text[] DEFAULT '{}'::text[] NOT NULL,
	"notes" text,
	"location" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "topups" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"paypal_order_id" text NOT NULL,
	"capture_id" text,
	"amount_cents" integer NOT NULL,
	"refunded_cents" integer DEFAULT 0 NOT NULL,
	"status" "topup_status" DEFAULT 'created' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"captured_at" timestamp with time zone,
	CONSTRAINT "topups_paypal_order_id_unique" UNIQUE("paypal_order_id"),
	CONSTRAINT "topups_capture_id_unique" UNIQUE("capture_id"),
	CONSTRAINT "topups_amount_positive" CHECK ("topups"."amount_cents" > 0),
	CONSTRAINT "topups_refund_bounds" CHECK ("topups"."refunded_cents" >= 0 AND "topups"."refunded_cents" <= "topups"."amount_cents")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"role" "role" NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"paypal_email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"submission_id" text NOT NULL,
	"result" "verification_result" NOT NULL,
	"checklist_results" jsonb NOT NULL,
	"rationale" text NOT NULL,
	"confidence" real,
	"model" text,
	"prompt_version" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"paypal_event_id" text NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"verified" boolean NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"processing_error" text,
	CONSTRAINT "webhook_events_paypal_event_id_unique" UNIQUE("paypal_event_id")
);
--> statement-breakpoint
CREATE TABLE "withdrawals" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"status" "withdrawal_status" DEFAULT 'pending' NOT NULL,
	"refunds" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appeals" ADD CONSTRAINT "appeals_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appeals" ADD CONSTRAINT "appeals_bounty_id_bounties_id_fk" FOREIGN KEY ("bounty_id") REFERENCES "public"."bounties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bounties" ADD CONSTRAINT "bounties_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bounties" ADD CONSTRAINT "bounties_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bounty_events" ADD CONSTRAINT "bounty_events_bounty_id_bounties_id_fk" FOREIGN KEY ("bounty_id") REFERENCES "public"."bounties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "callback_deliveries" ADD CONSTRAINT "callback_deliveries_bounty_id_bounties_id_fk" FOREIGN KEY ("bounty_id") REFERENCES "public"."bounties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_bounty_id_bounties_id_fk" FOREIGN KEY ("bounty_id") REFERENCES "public"."bounties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_worker_id_users_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idempotency_records" ADD CONSTRAINT "idempotency_records_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "owner_policies" ADD CONSTRAINT "owner_policies_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_bounty_id_bounties_id_fk" FOREIGN KEY ("bounty_id") REFERENCES "public"."bounties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_worker_id_users_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "screenings" ADD CONSTRAINT "screenings_bounty_id_bounties_id_fk" FOREIGN KEY ("bounty_id") REFERENCES "public"."bounties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_bounty_id_bounties_id_fk" FOREIGN KEY ("bounty_id") REFERENCES "public"."bounties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_worker_id_users_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topups" ADD CONSTRAINT "topups_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_calls_purpose_idx" ON "ai_calls" USING btree ("purpose","created_at");--> statement-breakpoint
CREATE INDEX "api_keys_owner_idx" ON "api_keys" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "bounties_owner_status_idx" ON "bounties" USING btree ("owner_id","status");--> statement-breakpoint
CREATE INDEX "bounties_status_expires_idx" ON "bounties" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX "bounty_events_bounty_idx" ON "bounty_events" USING btree ("bounty_id","created_at");--> statement-breakpoint
CREATE INDEX "callbacks_due_idx" ON "callback_deliveries" USING btree ("delivered_at","next_attempt_at");--> statement-breakpoint
CREATE UNIQUE INDEX "claims_one_active_uq" ON "claims" USING btree ("bounty_id") WHERE "claims"."status" = 'active';--> statement-breakpoint
CREATE INDEX "claims_worker_idx" ON "claims" USING btree ("worker_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idem_key_uq" ON "idempotency_records" USING btree ("api_key_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "ledger_txn_account_uq" ON "ledger_entries" USING btree ("txn_key","account");--> statement-breakpoint
CREATE INDEX "ledger_owner_account_idx" ON "ledger_entries" USING btree ("owner_id","account");--> statement-breakpoint
CREATE INDEX "ledger_bounty_idx" ON "ledger_entries" USING btree ("bounty_id");--> statement-breakpoint
CREATE INDEX "screenings_bounty_idx" ON "screenings" USING btree ("bounty_id");--> statement-breakpoint
CREATE INDEX "topups_owner_idx" ON "topups" USING btree ("owner_id");