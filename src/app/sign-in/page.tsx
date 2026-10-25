import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { HailLogo } from "@/components/HailLogo";
import { currentUser, homeFor } from "@/lib/auth";
import { env } from "@/lib/env";
import { demoSignInAction } from "./actions";
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
        {env().DEMO_QUICK_SIGNIN && (
          <section className="card stack-sm" aria-labelledby="demo-heading">
            <h2 id="demo-heading" style={{ fontSize: "var(--text-lg)", margin: 0 }}>
              Try the demo
            </h2>
            <p className="muted" style={{ margin: 0, fontSize: "var(--text-sm)" }}>
              One tap signs you in to a demo account. Everything runs in the PayPal sandbox; no real money moves.
            </p>
            <form action={demoSignInAction} className="stack-sm">
              <button type="submit" name="account" value="owner" className="btn btn-secondary btn-block">
                Agent owner: Dana
              </button>
              <button type="submit" name="account" value="worker1" className="btn btn-secondary btn-block">
                Worker: Sam
              </button>
              <button type="submit" name="account" value="worker2" className="btn btn-secondary btn-block">
                Worker: Alex
              </button>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}
