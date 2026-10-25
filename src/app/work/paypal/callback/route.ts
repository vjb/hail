import { cookies } from "next/headers";
import { db } from "@/db/client";
import { DomainError } from "@/domain/bounty/service";
import { connectPayPal } from "@/domain/work/work";
import { exchangeConnectCode, getConnectedProfile } from "@/integrations/paypal/client";
import { currentUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { STATE_COOKIE } from "@/lib/paypal-connect";

// PayPal sends the worker back here with a one-time code. We check the state, read the account's
// ID, email and verification status, and save it. The worker's PayPal token is not kept.
export async function GET(req: Request) {
  const base = env().APP_BASE_URL.replace(/\/$/, "");
  const back = (result: string) => Response.redirect(`${base}/work/settings?paypal=${result}`, 303);
  const user = await currentUser();
  if (!user || user.role !== "worker") return Response.redirect(`${base}/sign-in?as=worker`, 303);
  const url = new URL(req.url);
  const jar = await cookies();
  const expected = jar.get(STATE_COOKIE)?.value;
  jar.delete({ name: STATE_COOKIE, path: "/work/paypal" });
  const code = url.searchParams.get("code");
  if (!code) return back("cancelled");
  if (!expected || expected !== `${user.id}.${url.searchParams.get("state")}`) return back("expired");
  try {
    const token = await exchangeConnectCode(code);
    const profile = await getConnectedProfile(token);
    // Log only which fields PayPal sent (never their values) to confirm the profile shape.
    console.info("[paypal-connect] profile fields:", profile.fields.join(","));
    const r = await connectPayPal(db(), user.id, profile);
    return back(r.verified === false ? "connected-unverified" : "connected");
  } catch (e) {
    if (e instanceof DomainError) return back(e.message.includes("another Hail worker") ? "taken" : "failed");
    console.error("[paypal-connect] failed", e instanceof Error ? e.message : e);
    return back("failed");
  }
}
