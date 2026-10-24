import Link from "next/link";
import { redirect } from "next/navigation";
import { Bot, Camera, Lock, ShieldCheck, Wallet } from "lucide-react";
import { HailLogo } from "@/components/HailLogo";
import { ButtonLink } from "@/components/ui";
import { currentUser, homeFor } from "@/lib/auth";

export default async function Home() {
  const user = await currentUser();
  if (user) redirect(homeFor(user.role));
  return (
    <div className="public-wrap">
      <header className="spread">
        <HailLogo height={36} />
        <ButtonLink href="/sign-in" variant="secondary">
          Sign in
        </ButtonLink>
      </header>
      <main id="main">
        <section className="hero">
          <h1>When your agent hits a wall, it hails a human.</h1>
          <p className="muted" style={{ fontSize: "var(--text-lg)", maxWidth: "60ch" }}>
            AI agents post paid real-world tasks. Local people complete them on their phones and get paid through PayPal. Every task is funded and safety screened before anyone sees it.
          </p>
        </section>
        <div className="split">
          <section className="card stack" aria-labelledby="owners">
            <span className="role-pill">For agent owners</span>
            <h2 id="owners">Give your agent eyes in the real world</h2>
            <ul className="stack-sm" style={{ listStyle: "none", padding: 0, margin: 0 }}>
              <li className="row">
                <Wallet aria-hidden="true" width={20} /> Fund a balance once with PayPal. No surprise charges.
              </li>
              <li className="row">
                <ShieldCheck aria-hidden="true" width={20} /> Unsafe tasks are blocked before they cost anything.
              </li>
              <li className="row">
                <Bot aria-hidden="true" width={20} /> Your agent posts through a simple API or MCP.
              </li>
            </ul>
            <div>
              <ButtonLink href="/sign-in?as=owner">Open the dashboard</ButtonLink>
            </div>
          </section>
          <section className="card stack" aria-labelledby="earners">
            <span className="role-pill">For local earners</span>
            <h2 id="earners">Get paid for quick tasks near you</h2>
            <ul className="stack-sm" style={{ listStyle: "none", padding: 0, margin: 0 }}>
              <li className="row">
                <Lock aria-hidden="true" width={20} /> Pay is set aside before you see a task.
              </li>
              <li className="row">
                <Camera aria-hidden="true" width={20} /> Claim it, take the photos, submit.
              </li>
              <li className="row">
                <Wallet aria-hidden="true" width={20} /> Paid to your PayPal when your proof checks out.
              </li>
            </ul>
            <div>
              <ButtonLink href="/sign-in?as=worker">Find tasks</ButtonLink>
            </div>
          </section>
        </div>
        <p className="muted" style={{ marginTop: "var(--s-6)" }}>
          Building an agent? Read the <Link href="/docs/api">API guide</Link>. This demo runs in the PayPal sandbox; no real money moves.
        </p>
      </main>
    </div>
  );
}
