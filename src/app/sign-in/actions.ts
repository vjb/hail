"use server";

import { redirect } from "next/navigation";
import { homeFor, signIn, signOut } from "@/lib/auth";

export type SignInState = { error?: string; email?: string };

export async function signInAction(_prev: SignInState, form: FormData): Promise<SignInState> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password.", email };
  const user = await signIn(email, password);
  if (!user) return { error: "That email and password don't match an account.", email };
  redirect(homeFor(user.role));
}

export async function signOutAction() {
  await signOut();
  redirect("/sign-in");
}
