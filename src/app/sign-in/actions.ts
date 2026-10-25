"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { homeFor, signIn, signOut } from "@/lib/auth";
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

export async function signOutAction() {
  await signOut();
  redirect("/sign-in");
}
