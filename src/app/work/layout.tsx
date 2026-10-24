import Link from "next/link";
import { NavLink } from "@/components/client";
import { HailLogo } from "@/components/HailLogo";
import { requireRole } from "@/lib/auth";

export default async function WorkerLayout({ children }: LayoutProps<"/work">) {
  await requireRole("worker");
  return (
    <div className="worker-shell">
      <header className="worker-top">
        <Link href="/work" aria-label="Hail tasks">
          <HailLogo height={30} />
        </Link>
        <Link href="/work/settings" className="btn btn-quiet">
          Account
        </Link>
      </header>
      <main id="main" className="worker-main">
        {children}
      </main>
      <nav className="worker-nav" aria-label="Worker">
        <ul>
          <li>
            <NavLink href="/work" icon="ListTodo" exact>
              Tasks
            </NavLink>
          </li>
          <li>
            <NavLink href="/work/my-task" icon="ClipboardCheck">
              My task
            </NavLink>
          </li>
          <li>
            <NavLink href="/work/earnings" icon="Wallet">
              Earnings
            </NavLink>
          </li>
        </ul>
      </nav>
    </div>
  );
}
