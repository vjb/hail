"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { homeFor, signIn, signOut } from "@/lib/auth";
import { env } from "@/lib/env";
import { clear, clientIp, hit, isBlocked, LIMITS } from "@/lib/rate-limit";

export type SignInState = { error?: string; email?: string };

export async function signInAction(_prev: SignInState, form: FormData): Promise<SignInState> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password.", email };
  // Failed attempts are limited per email and per IP; a successful sign-in clears the email's count.
  const emailKey = `signin:${email.toLowerCase()}`;
  const ipKey = `signin-ip:${clientIp(await headers())}`;
  if (isBlocked(emailKey, LIMITS.signInPerEmail).blocked || isBlocked(ipKey, LIMITS.signInPerIp).blocked) {
    return { error: "Too many sign-in attempts. Wait a few minutes and try again.", email };
  }
  const user = await signIn(email, password);
  if (!user) {
    hit(emailKey, LIMITS.signInPerEmail);
    hit(ipKey, LIMITS.signInPerIp);
    return { error: "That email and password don't match an account.", email };
  }
  clear(emailKey);
  redirect(homeFor(user.role));
}

// One-tap demo sign-in: the server looks up the demo account's credentials, so no password ever
// reaches the browser. Owner and workers only; the admin account can reset the demo, so it's left out.
const DEMO_ACCOUNTS = {
  owner: ["DEMO_OWNER_EMAIL", "DEMO_OWNER_PASSWORD"],
  worker1: ["DEMO_WORKER1_EMAIL", "DEMO_WORKER1_PASSWORD"],
  worker2: ["DEMO_WORKER2_EMAIL", "DEMO_WORKER2_PASSWORD"],
  worker3: ["DEMO_WORKER3_EMAIL", "DEMO_WORKER3_PASSWORD"],
  worker4: ["DEMO_WORKER4_EMAIL", "DEMO_WORKER4_PASSWORD"],
} as const;

export async function demoSignInAction(form: FormData) {
  if (!env().DEMO_QUICK_SIGNIN) redirect("/sign-in");
  const which = String(form.get("account")) as keyof typeof DEMO_ACCOUNTS;
  const vars = DEMO_ACCOUNTS[which];
  const ipKey = `demo-signin-ip:${clientIp(await headers())}`;
  if (!vars || !hit(ipKey, LIMITS.signInPerIp).ok) redirect("/sign-in");
  const user = await signIn(process.env[vars[0]] ?? "", process.env[vars[1]] ?? "");
  redirect(user ? homeFor(user.role) : "/sign-in");
}

export async function signOutAction() {
  await signOut();
  redirect("/sign-in");
}
