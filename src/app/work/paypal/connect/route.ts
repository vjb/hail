import { cookies } from "next/headers";
import { randomToken } from "@/lib/ids";
import { currentUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { connectUrl } from "@/integrations/paypal/client";
import { connectCallbackUrl, STATE_COOKIE } from "@/lib/paypal-connect";


// Starts Connect PayPal: a one-time state in a short-lived cookie, then off to PayPal's login.
export async function GET() {
  const base = env().APP_BASE_URL.replace(/\/$/, "");
  const user = await currentUser();
  if (!user || user.role !== "worker") return Response.redirect(`${base}/sign-in?as=worker`, 303);
  if (!env().PAYPAL_LOGIN_ENABLED) return Response.redirect(`${base}/work/settings?paypal=unavailable`, 303);
  const state = randomToken(24);
  (await cookies()).set(STATE_COOKIE, `${user.id}.${state}`, { httpOnly: true, sameSite: "lax", secure: base.startsWith("https://"), path: "/work/paypal", maxAge: 600 });
  return Response.redirect(connectUrl(state, connectCallbackUrl()), 303);
}
