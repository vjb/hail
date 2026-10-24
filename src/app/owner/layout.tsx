import Link from "next/link";
import { LogOut } from "lucide-react";
import { NavLink } from "@/components/client";
import { HailLogo } from "@/components/HailLogo";
import { Money } from "@/components/ui";
import { db } from "@/db/client";
import { getBalances } from "@/domain/ledger/ledger";
import { requireRole } from "@/lib/auth";
import { signOutAction } from "../sign-in/actions";

export default async function OwnerLayout({ children }: LayoutProps<"/owner">) {
  const user = await requireRole("owner");
  const bal = await getBalances(db(), user.id);
  return (
    <div className="owner-shell">
      <nav className="owner-nav" aria-label="Owner">
        <Link href="/owner" aria-label="Hail overview">
          <HailLogo height={32} />
        </Link>
        <ul>
          <li>
            <NavLink href="/owner" icon="LayoutDashboard" exact>
              Overview
            </NavLink>
          </li>
          <li>
            <NavLink href="/owner/tasks" icon="ClipboardList">
              Tasks
            </NavLink>
          </li>
          <li>
            <NavLink href="/owner/approvals" icon="Inbox">
              Approvals
            </NavLink>
          </li>
          <li>
            <NavLink href="/owner/balance" icon="Wallet">
              Balance
            </NavLink>
          </li>
          <li>
            <NavLink href="/owner/keys" icon="KeyRound">
              API keys
            </NavLink>
          </li>
          <li>
            <NavLink href="/owner/policy" icon="SlidersHorizontal">
              Policy
            </NavLink>
          </li>
          <li>
            <NavLink href="/owner/control-room" icon="Gauge">
              Control room
            </NavLink>
          </li>
        </ul>
      </nav>
      <div>
        <header className="owner-header">
          <div>
            <span className="role-pill">Agent owner</span>
            <div>{user.name}</div>
          </div>
          <div className="row">
            <dl className="header-balance" aria-label="Balance" style={{ margin: 0 }}>
              <div>
                <dt className="muted">Available</dt>
                <dd style={{ margin: 0 }}>
                  <strong>
                    <Money cents={bal.availableCents} />
                  </strong>
                </dd>
              </div>
              <div>
                <dt className="muted">Set aside</dt>
                <dd style={{ margin: 0 }}>
                  <strong>
                    <Money cents={bal.heldCents} />
                  </strong>
                </dd>
              </div>
            </dl>
            <form action={signOutAction}>
              <button type="submit" className="btn btn-quiet">
                <LogOut aria-hidden="true" width={18} /> Sign out
              </button>
            </form>
          </div>
        </header>
        <main id="main" className="owner-main">
          {children}
        </main>
      </div>
    </div>
  );
}
