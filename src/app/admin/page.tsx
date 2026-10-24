import type { Metadata } from "next";
import { LogOut } from "lucide-react";
import { HailLogo } from "@/components/HailLogo";
import { requireRole } from "@/lib/auth";
import { signOutAction } from "../sign-in/actions";
import { ResetDemo } from "./ResetDemo";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  const user = await requireRole("admin");
  return (
    <div className="public-wrap">
      <header className="spread">
        <HailLogo height={32} />
        <form action={signOutAction}>
          <button type="submit" className="btn btn-quiet">
            <LogOut aria-hidden="true" width={18} /> Sign out
          </button>
        </form>
      </header>
      <main id="main" className="stack" style={{ paddingTop: "var(--s-6)" }}>
        <div>
          <span className="role-pill">Admin</span>
          <h1>Demo admin</h1>
          <p className="muted">Signed in as {user.name}.</p>
        </div>
        <section className="card stack" aria-labelledby="reset-heading">
          <h2 id="reset-heading">Reset the demo</h2>
          <p className="muted" style={{ margin: 0 }}>
            Restores the demo story: a funded owner, three paid tasks, one blocked attempt, one waiting for approval, one proof to review, and two open tasks, including the espresso machine inspection.
          </p>
          <ResetDemo />
        </section>
      </main>
    </div>
  );
}
