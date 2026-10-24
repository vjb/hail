import type { Metadata } from "next";
import { LogOut } from "lucide-react";
import { HailLogo } from "@/components/HailLogo";
import { EmptyState } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { signOutAction } from "../sign-in/actions";

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
        <EmptyState title="Demo reset">Resetting the demo data will be available here.</EmptyState>
      </main>
    </div>
  );
}
