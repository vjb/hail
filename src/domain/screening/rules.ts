// Deterministic screening layer: fast, explainable patterns for known abuse, plus policy checks.
// It never "allows" on its own authority beyond saying nothing matched; the AI layer and the
// stricter-outcome-wins rule decide the rest.

import type { ScreenDecision } from "./screen";

type Rule = { category: string; decision: ScreenDecision; pattern: RegExp; why: string };

const W = String.raw`[\s\S]{0,40}?`; // up to ~40 chars between words

export const BLOCK_RULES: Rule[] = [
  {
    category: "otp_solicitation",
    decision: "block",
    pattern: new RegExp(String.raw`\b(otp|2fa|two[- ]factor|one[- ]time (pass)?(code|password)|passcode|verification (code|link|text|sms)|sms code|security code|auth(entication)? code)\b|\b(receive|forward|send|read( out)?|relay|share|text|tell)\b${W}\b(codes?|pins?)\b${W}\b(sms|text|phone|message|sent)\b`, "i"),
    why: "asks someone to receive or pass on a one-time or verification code",
  },
  {
    category: "credential_account_fraud",
    decision: "block",
    pattern: new RegExp(String.raw`\b(create|open|register|make|set ?up|sign ?up( for)?|verify|log ?in(to)?|sign ?in(to)?|warm ?up|recover)\b${W}\b(accounts?|profiles?|logins?|wallets?)\b|\b(password|login credentials|username and password)\b`, "i"),
    why: "involves creating, logging into or verifying online accounts",
  },
  {
    category: "identity_proxying",
    decision: "block",
    pattern: new RegExp(String.raw`\b(pretend(ing)? to be|pose as|posing as|impersonat\w*|on (my|his|her|their) behalf\b${W}\b(sign|id|verify|selfie))|\b(your|my) (id|passport|driver'?s licen[cs]e|face|voice|selfie|signature)\b${W}\b(for|to verify|verification|kyc)\b|\bkyc\b|\bselfie verification\b`, "i"),
    why: "asks a person to use their identity, face or documents for someone else",
  },
  {
    category: "social_media_manipulation",
    decision: "block",
    pattern: new RegExp(String.raw`\b(write|post|leave|submit|give|add)\b${W}\b(\d[- ]?star|5 stars?|positive|fake|honest|good)?\s*(reviews?|ratings?|comments?|testimonials?)\b|\b(like|follow|upvote|retweet|repost|share|subscribe to)\b${W}\b(my|our|this|the)\b${W}\b(posts?|videos?|page|accounts?|channel|profile|tweets?|listing)\b|\b(followers|likes|upvotes)\b`, "i"),
    why: "asks for reviews, ratings, likes, follows or posts",
  },
  {
    category: "referral_promo_fraud",
    decision: "block",
    pattern: /\b(referral|refer[- ]a[- ]friend|promo ?codes?|sign[- ]?up bonus|cash ?back|invite (link|code)|my link)\b/i,
    why: "involves referral links, promo codes or sign-up bonuses",
  },
  {
    category: "private_individual_recon",
    decision: "block",
    pattern: new RegExp(String.raw`\b(follow|tail|track|watch|stalk|spy on)\b${W}\b(him|her|them|my ex|this (person|guy|woman|man)|someone)\b|\b(find|confirm|get)\b${W}\b(where|whether)\b${W}\b(he|she|they|my ex)\b${W}\b(lives?|works?|is staying)\b|\b(home address of|licen[cs]e plate|which car (he|she|they) drives?|photograph (him|her|my ex|this person))\b`, "i"),
    why: "targets a specific private person",
  },
  {
    category: "illegal_dangerous",
    decision: "block",
    pattern: /\b(drugs?|cocaine|meth|weapons?|guns?|firearms?|explosives?|bomb|break into|steal|shoplift|trespass\w*|hack\w*|minors?|child(ren)?|kids?|nude|naked|sexual|escort|harass\w*|threaten\w*|intimidat\w*|fake id|counterfeit|launder\w*)\b/i,
    why: "involves something illegal, dangerous, sexual, harassing or involving minors",
  },
];

export const APPROVAL_RULES: Rule[] = [
  {
    category: "private_property",
    decision: "needs_owner_approval",
    pattern: /\b(enter|go into|go inside|inside)\b[\s\S]{0,40}?\b(home|house|apartment|flat|backyard|garage|basement|office|private)\b|\b(seller'?s (home|house|place))\b/i,
    why: "involves entering private property",
  },
  {
    category: "money_or_valuables",
    decision: "needs_owner_approval",
    pattern: /\b(cash|pay (the|them|him|her)|collect (money|payment)|carry (money|cash)|deliver (money|cash)|jewel(ry|lery)|gold|money order|gift cards?|credit cards?)\b/i,
    why: "involves handling money or valuables",
  },
  {
    category: "third_party_call",
    decision: "needs_owner_approval",
    pattern: /\b(call|phone|ring|dial|text|message)\b[\s\S]{0,30}?\b(the (store|shop|seller|owner|business|restaurant|manager)|them|him|her|this number|the number)\b|\bphone call\b/i,
    why: "involves calling or messaging other people",
  },
];

// Attempts to address the screen itself. Never allowed straight through.
export const INJECTION_PATTERN =
  /\b(ignore|disregard|forget|override)\b[\s\S]{0,40}?\b(rules?|instructions?|guidelines?|polic(y|ies)|previous|above|prompt)\b|\byou are now\b|\bsystem prompt\b|\b(pre-?approved|already approved|approve this|mark (this|it) as (allowed|safe|approved)|classify (this|it) as)\b|<\/?bounty>/i;

export type RulesInput = {
  text: string;
  rewardCents: number;
  approvalThresholdCents: number;
};

export type RuleHit = { decision: ScreenDecision; category: string; rationale: string };

export function applyRules(input: RulesInput): RuleHit[] {
  const hits: RuleHit[] = [];
  for (const r of BLOCK_RULES) if (r.pattern.test(input.text)) hits.push({ decision: "block", category: r.category, rationale: `Blocked: this task ${r.why}.` });
  if (INJECTION_PATTERN.test(input.text)) {
    hits.push({ decision: "needs_owner_approval", category: "unclear", rationale: "The task text tries to instruct the safety screen, so the owner must review it." });
  }
  for (const r of APPROVAL_RULES) if (r.pattern.test(input.text)) hits.push({ decision: "needs_owner_approval", category: r.category, rationale: `Needs your approval: this task ${r.why}.` });
  if (input.rewardCents >= input.approvalThresholdCents) {
    const t = `$${(input.approvalThresholdCents / 100).toFixed(2)}`;
    hits.push({ decision: "needs_owner_approval", category: "over_threshold", rationale: `Needs your approval: the reward is at or above your ${t} approval threshold.` });
  }
  return hits;
}
