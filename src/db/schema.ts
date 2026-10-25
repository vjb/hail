import { sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  check,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => "bytea" });
const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
const createdAt = () => ts("created_at").notNull().defaultNow();

export const roleEnum = pgEnum("role", ["owner", "worker", "admin"]);

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  role: roleEnum("role").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  paypalEmail: text("paypal_email"),
  // Set by Connect PayPal (Log in with PayPal): one PayPal account per worker; payouts go to it.
  paypalPayerId: text("paypal_payer_id").unique(),
  paypalVerified: boolean("paypal_verified"),
  paypalConnectedAt: ts("paypal_connected_at"),
  // A worker whose proof was found fake can't claim tasks until the suspension is lifted.
  suspendedAt: ts("suspended_at"),
  suspendedReason: text("suspended_reason"),
  suspendedBountyId: text("suspended_bounty_id"),
  createdAt: createdAt(),
});

export const apiKeys = pgTable(
  "api_keys",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull().references(() => users.id),
    name: text("name").notNull(),
    keyHash: text("key_hash").notNull().unique(),
    prefix: text("prefix").notNull(),
    dailyCapCents: integer("daily_cap_cents").notNull(),
    createdAt: createdAt(),
    lastUsedAt: ts("last_used_at"),
    revokedAt: ts("revoked_at"),
  },
  (t) => [index("api_keys_owner_idx").on(t.ownerId), check("api_keys_cap_positive", sql`${t.dailyCapCents} > 0`)],
);

export const ownerPolicies = pgTable("owner_policies", {
  ownerId: text("owner_id").primaryKey().references(() => users.id),
  approvalThresholdCents: integer("approval_threshold_cents").notNull().default(5000),
  maxOpenBounties: integer("max_open_bounties").notNull().default(20),
  maxBountiesPerHour: integer("max_bounties_per_hour").notNull().default(30),
  allowedCategories: text("allowed_categories").array().notNull().default(sql`'{}'::text[]`),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

// Per-owner accounts plus platform accounts tracked per owner, so every owner's entries net to zero.
export const ledgerAccountEnum = pgEnum("ledger_account", ["available", "held", "paypal_clearing", "payouts_sent"]);
export const ledgerKindEnum = pgEnum("ledger_kind", ["topup", "hold", "release", "payout", "withdraw"]);

export const ledgerEntries = pgTable(
  "ledger_entries",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    createdAt: createdAt(),
    ownerId: text("owner_id").notNull().references(() => users.id),
    // All entries of one double-entry transaction share txn_key; the pair (txn_key, account) is unique,
    // which makes every ledger write idempotent.
    txnKey: text("txn_key").notNull(),
    account: ledgerAccountEnum("account").notNull(),
    amountCents: integer("amount_cents").notNull(),
    kind: ledgerKindEnum("kind").notNull(),
    bountyId: text("bounty_id"),
    paypalRef: text("paypal_ref"),
    memo: text("memo"),
  },
  (t) => [
    uniqueIndex("ledger_txn_account_uq").on(t.txnKey, t.account),
    index("ledger_owner_account_idx").on(t.ownerId, t.account),
    index("ledger_bounty_idx").on(t.bountyId),
    check("ledger_nonzero", sql`${t.amountCents} <> 0`),
  ],
);

export const topupStatusEnum = pgEnum("topup_status", ["created", "captured", "failed"]);

export const topups = pgTable(
  "topups",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull().references(() => users.id),
    paypalOrderId: text("paypal_order_id").notNull().unique(),
    captureId: text("capture_id").unique(),
    amountCents: integer("amount_cents").notNull(),
    refundedCents: integer("refunded_cents").notNull().default(0),
    status: topupStatusEnum("status").notNull().default("created"),
    createdAt: createdAt(),
    capturedAt: ts("captured_at"),
  },
  (t) => [
    index("topups_owner_idx").on(t.ownerId),
    check("topups_amount_positive", sql`${t.amountCents} > 0`),
    check("topups_refund_bounds", sql`${t.refundedCents} >= 0 AND ${t.refundedCents} <= ${t.amountCents}`),
  ],
);

export const withdrawalStatusEnum = pgEnum("withdrawal_status", ["pending", "completed", "failed"]);

export const withdrawals = pgTable("withdrawals", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull().references(() => users.id),
  amountCents: integer("amount_cents").notNull(),
  status: withdrawalStatusEnum("status").notNull().default("pending"),
  refunds: jsonb("refunds").$type<Array<{ topupId: string; captureId: string; amountCents: number; refundId?: string; status?: string }>>().notNull().default([]),
  error: text("error"),
  createdAt: createdAt(),
});

export const bountyStatusEnum = pgEnum("bounty_status", [
  "created",
  "screening",
  "pending_approval",
  "blocked",
  "rejected_by_owner",
  "open",
  "claimed",
  "verifying",
  "needs_owner_review",
  "rejected",
  "appealed",
  "approved",
  "paying",
  "paid",
  "expired",
  "cancelled",
]);

export type Deliverable = { type: "photo" | "text" | "location"; description: string };
export type BountyLocation = { address?: string; lat?: number; lng?: number; radius_m?: number };
export type BountyProduct = {
  title: string;
  image_url?: string;
  price_cents?: number;
  retailer?: string;
  attributes?: Record<string, string>;
};

export const bounties = pgTable(
  "bounties",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull().references(() => users.id),
    apiKeyId: text("api_key_id").references(() => apiKeys.id),
    title: text("title").notNull(),
    instructions: text("instructions").notNull(),
    deliverables: jsonb("deliverables").$type<Deliverable[]>().notNull(),
    acceptanceChecklist: jsonb("acceptance_checklist").$type<string[]>().notNull(),
    rewardCents: integer("reward_cents").notNull(),
    spots: integer("spots").notNull().default(1),
    location: jsonb("location").$type<BountyLocation>(),
    productQuery: text("product_query"),
    product: jsonb("product").$type<BountyProduct>(),
    category: text("category"),
    agentContext: text("agent_context"),
    expiresAt: ts("expires_at").notNull(),
    status: bountyStatusEnum("status").notNull().default("created"),
    callbackUrl: text("callback_url"),
    createdAt: createdAt(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("bounties_owner_status_idx").on(t.ownerId, t.status),
    index("bounties_status_expires_idx").on(t.status, t.expiresAt),
    check("bounties_reward_range", sql`${t.rewardCents} BETWEEN 100 AND 20000`),
    check("bounties_spots_range", sql`${t.spots} BETWEEN 1 AND 10`),
  ],
);

export const screeningLayerEnum = pgEnum("screening_layer", ["rules", "ai", "final"]);
export const screeningDecisionEnum = pgEnum("screening_decision", ["allow", "needs_owner_approval", "block"]);

export const screenings = pgTable(
  "screenings",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    bountyId: text("bounty_id").notNull().references(() => bounties.id),
    layer: screeningLayerEnum("layer").notNull(),
    decision: screeningDecisionEnum("decision").notNull(),
    category: text("category").notNull(),
    rationale: text("rationale").notNull(),
    confidence: real("confidence"),
    model: text("model"),
    promptVersion: text("prompt_version"),
    createdAt: createdAt(),
  },
  (t) => [index("screenings_bounty_idx").on(t.bountyId)],
);

export const claimStatusEnum = pgEnum("claim_status", ["active", "submitted", "expired", "released"]);

export const claims = pgTable(
  "claims",
  {
    id: text("id").primaryKey(),
    bountyId: text("bounty_id").notNull().references(() => bounties.id),
    workerId: text("worker_id").notNull().references(() => users.id),
    claimedAt: ts("claimed_at").notNull().defaultNow(),
    expiresAt: ts("expires_at").notNull(),
    status: claimStatusEnum("status").notNull().default("active"),
    extensions: integer("extensions").notNull().default(0),
  },
  (t) => [
    // At most one active claim per bounty.
    uniqueIndex("claims_one_active_uq").on(t.bountyId).where(sql`${t.status} = 'active'`),
    index("claims_worker_idx").on(t.workerId),
  ],
);

export const submissions = pgTable("submissions", {
  id: text("id").primaryKey(),
  claimId: text("claim_id").notNull().references(() => claims.id),
  bountyId: text("bounty_id").notNull().references(() => bounties.id),
  workerId: text("worker_id").notNull().references(() => users.id),
  photoIds: text("photo_ids").array().notNull().default(sql`'{}'::text[]`),
  notes: text("notes"),
  location: jsonb("location").$type<{ lat: number; lng: number; accuracy_m?: number }>(),
  createdAt: createdAt(),
});

export const verificationResultEnum = pgEnum("verification_result", ["pass", "fail", "uncertain"]);
export type ChecklistResult = { item: string; passed: boolean | null; reason: string; confidence?: number; cause?: "item" | "proof" | null };
/** Proof checks from the verifier (verify-v2): per photo, plus whether the photos agree, plus doubts. */
export type ProofChecks = {
  photos: Array<{
    code: "matches" | "missing" | "different" | "unreadable" | "not_requested";
    screen: boolean;
    generatedOrEdited: boolean;
    source: "camera" | "file" | null;
    credentials?: ContentCredentials | null;
  }>;
  sameScene: boolean | null;
  concerns: string[];
};

export const verifications = pgTable("verifications", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  submissionId: text("submission_id").notNull().references(() => submissions.id),
  result: verificationResultEnum("result").notNull(),
  checklistResults: jsonb("checklist_results").$type<ChecklistResult[]>().notNull(),
  proofChecks: jsonb("proof_checks").$type<ProofChecks>(),
  rationale: text("rationale").notNull(),
  confidence: real("confidence"),
  model: text("model"),
  promptVersion: text("prompt_version"),
  createdAt: createdAt(),
});

export const appeals = pgTable("appeals", {
  id: text("id").primaryKey(),
  submissionId: text("submission_id").notNull().unique().references(() => submissions.id),
  bountyId: text("bounty_id").notNull().references(() => bounties.id),
  reason: text("reason").notNull(),
  decision: text("decision"),
  decidedBy: text("decided_by"),
  decidedAt: ts("decided_at"),
  createdAt: createdAt(),
});

export const payoutStatusEnum = pgEnum("payout_status", ["pending", "sent", "succeeded", "failed", "unclaimed", "returned", "blocked"]);

export const payouts = pgTable("payouts", {
  id: text("id").primaryKey(),
  // Exactly one payout per bounty, enforced by the database.
  bountyId: text("bounty_id").notNull().unique().references(() => bounties.id),
  workerId: text("worker_id").notNull().references(() => users.id),
  receiverEmail: text("receiver_email").notNull(),
  senderBatchId: text("sender_batch_id").notNull().unique(),
  batchId: text("batch_id"),
  itemId: text("item_id"),
  amountCents: integer("amount_cents").notNull(),
  status: payoutStatusEnum("status").notNull().default("pending"),
  lastError: text("last_error"),
  createdAt: createdAt(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const bountyEvents = pgTable(
  "bounty_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    bountyId: text("bounty_id").notNull().references(() => bounties.id),
    fromStatus: bountyStatusEnum("from_status"),
    toStatus: bountyStatusEnum("to_status").notNull(),
    actor: text("actor").notNull(),
    detail: jsonb("detail").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [index("bounty_events_bounty_idx").on(t.bountyId, t.createdAt)],
);

export const webhookEvents = pgTable("webhook_events", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  paypalEventId: text("paypal_event_id").notNull().unique(),
  type: text("type").notNull(),
  payload: jsonb("payload").notNull(),
  verified: boolean("verified").notNull(),
  receivedAt: ts("received_at").notNull().defaultNow(),
  processedAt: ts("processed_at"),
  processingError: text("processing_error"),
});

export const callbackDeliveries = pgTable(
  "callback_deliveries",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    bountyId: text("bounty_id").notNull().references(() => bounties.id),
    event: text("event").notNull(),
    status: text("status").notNull(),
    url: text("url").notNull(),
    payload: jsonb("payload").notNull(),
    attempts: integer("attempts").notNull().default(0),
    lastStatus: integer("last_status"),
    nextAttemptAt: ts("next_attempt_at").notNull().defaultNow(),
    deliveredAt: ts("delivered_at"),
    createdAt: createdAt(),
  },
  (t) => [index("callbacks_due_idx").on(t.deliveredAt, t.nextAttemptAt)],
);

export type ContentCredentials = { issuer: string | null; generator: string | null; signedAt: string | null; validation: string; aiGenerated: boolean };

export type PhotoCheck = { usable: boolean; problems: string[]; retakeHint: string; model?: string };

// A fresh code shown when the worker opens the camera for one photo slot. The photo must include it
// (written on paper) and be uploaded before the challenge expires. Each challenge is used once.
export const proofChallenges = pgTable(
  "proof_challenges",
  {
    id: text("id").primaryKey(),
    claimId: text("claim_id").notNull().references(() => claims.id),
    slot: integer("slot").notNull(),
    code: text("code").notNull(),
    issuedAt: ts("issued_at").notNull().defaultNow(),
    expiresAt: ts("expires_at").notNull(),
    usedAt: ts("used_at"),
  },
  (t) => [index("proof_challenges_claim_idx").on(t.claimId, t.slot)],
);

export const captureSourceEnum = pgEnum("capture_source", ["camera", "file"]);

export const photos = pgTable(
  "photos",
  {
    id: text("id").primaryKey(),
    ownerUserId: text("owner_user_id").notNull().references(() => users.id),
    // Set while a worker captures proof for a claim: which claim and which deliverable slot.
    claimId: text("claim_id").references(() => claims.id),
    slot: integer("slot"),
    // Proof photos carry the challenge they answered and how they were captured (null for seeded history).
    challengeId: text("challenge_id"),
    captureSource: captureSourceEnum("capture_source"),
    // Content Credentials (C2PA) read from the original upload, if it carried any.
    contentCredentials: jsonb("content_credentials").$type<ContentCredentials>(),
    check: jsonb("check").$type<PhotoCheck>(),
    mime: text("mime").notNull(),
    width: integer("width"),
    height: integer("height"),
    bytes: bytea("bytes").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("photos_claim_idx").on(t.claimId, t.slot)],
);

// Public API idempotency: (api_key, Idempotency-Key) → stored response.
export const idempotencyRecords = pgTable(
  "idempotency_records",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    apiKeyId: text("api_key_id").notNull().references(() => apiKeys.id),
    key: text("key").notNull(),
    requestHash: text("request_hash").notNull(),
    responseStatus: integer("response_status"),
    responseBody: jsonb("response_body"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("idem_key_uq").on(t.apiKeyId, t.key)],
);

export const aiCalls = pgTable(
  "ai_calls",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    purpose: text("purpose").notNull(),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    latencyMs: integer("latency_ms"),
    costMicros: integer("cost_micros"),
    outcome: text("outcome"),
    promptVersion: text("prompt_version"),
    bountyId: text("bounty_id"),
    submissionId: text("submission_id"),
    error: text("error"),
    createdAt: createdAt(),
  },
  (t) => [index("ai_calls_purpose_idx").on(t.purpose, t.createdAt)],
);
