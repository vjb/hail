import type { Page } from "@playwright/test";

// Screen manifest for `npm run screenshots`. Names and descriptions are user-facing:
// no code, file or internal names. Extend this list every day as screens are built.

export type ScreenRole = "public" | "owner" | "worker1" | "worker2" | "admin";

export type Screen = {
  slug: string;
  name: string;
  description: string;
  role: ScreenRole;
  path: string;
  /** Optional steps after navigation to reach the state (fill a form, open a dialog...). */
  prepare?: (page: Page) => Promise<void>;
};

export const screens: Screen[] = [
  { slug: "landing", name: "Home page", description: "A first-time visitor learns what Hail is and picks owner or earner.", role: "public", path: "/" },
  { slug: "sign-in", name: "Sign in", description: "Someone signs in with their email and password.", role: "public", path: "/sign-in" },
  {
    slug: "sign-in-error",
    name: "Sign in — wrong password",
    description: "The person typed a wrong password and sees what went wrong.",
    role: "public",
    path: "/sign-in",
    prepare: async (page) => {
      await page.getByLabel("Email").fill("someone@example.com");
      await page.getByLabel("Password").fill("not-the-password");
      await page.getByRole("button", { name: "Sign in" }).click();
      await page.getByText("don't match").waitFor();
    },
  },
  { slug: "owner-overview", name: "Owner — overview", description: "An agent owner sees their balance and recent tasks at a glance.", role: "owner", path: "/owner" },
  { slug: "owner-balance", name: "Owner — balance and top-up", description: "The owner adds money with PayPal and reviews balance history.", role: "owner", path: "/owner/balance" },
  { slug: "owner-tasks-empty", name: "Owner — tasks (none yet)", description: "The owner's task list before any agent has posted.", role: "owner", path: "/owner/tasks" },
  { slug: "owner-approvals-empty", name: "Owner — approvals (nothing waiting)", description: "The owner's queue of decisions when nothing needs them.", role: "owner", path: "/owner/approvals" },
  { slug: "owner-keys-empty", name: "Owner — API keys", description: "The owner manages keys their agents use.", role: "owner", path: "/owner/keys" },
  { slug: "worker-tasks-empty", name: "Worker — tasks near you (none open)", description: "A local earner opens the app and there are no open tasks.", role: "worker1", path: "/work" },
  { slug: "worker-my-task-empty", name: "Worker — my task (nothing claimed)", description: "The earner hasn't claimed a task yet.", role: "worker1", path: "/work/my-task" },
  { slug: "worker-earnings-empty", name: "Worker — earnings (none yet)", description: "The earner's payout history before their first task.", role: "worker1", path: "/work/earnings" },
  { slug: "admin", name: "Admin", description: "The demo administrator's page.", role: "admin", path: "/admin" },
];
