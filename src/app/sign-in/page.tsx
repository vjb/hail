import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { HailLogo } from "@/components/HailLogo";
import { currentUser, homeFor } from "@/lib/auth";
import { SignInForm } from "./SignInForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const user = await currentUser();
  if (user) redirect(homeFor(user.role));
  const { as } = await searchParams;
  const audience = as === "worker" ? "Sign in to find paid tasks near you." : as === "owner" ? "Sign in to manage your agent's tasks and balance." : "Agent owners and local earners sign in here.";
  return (
    <div className="public-wrap" style={{ maxWidth: 440 }}>
      <main id="main" className="stack" style={{ paddingTop: "var(--s-7)" }}>
        <Link href="/" aria-label="Hail home">
          <HailLogo height={40} />
        </Link>
        <div className="card stack">
          <div>
            <h1>Sign in</h1>
            <p className="muted">{audience}</p>
          </div>
          <SignInForm />
        </div>
        <p className="muted" style={{ fontSize: "var(--text-sm)" }}>
          Demo accounts for judges are listed in the project README.
        </p>
      </main>
    </div>
  );
}
