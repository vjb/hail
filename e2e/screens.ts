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
  { slug: "owner-tasks", name: "Owner — tasks", description: "Every task the owner's agents have posted, with status and pay.", role: "owner", path: "/owner/tasks" },
  {
    slug: "owner-task-detail",
    name: "Owner — task detail with history",
    description: "One task: what the worker must do, the safety screen's explanation, and each step so far.",
    role: "owner",
    path: "/owner/tasks",
    prepare: async (page) => {
      const first = page.locator("table a").first();
      if (await first.count()) {
        await first.click();
        await page.waitForURL(/\/owner\/tasks\/bty_/);
      }
    },
  },
  { slug: "owner-approvals", name: "Owner — approvals", description: "Tasks the safety screen held for the owner to approve or decline.", role: "owner", path: "/owner/approvals" },
  { slug: "owner-keys", name: "Owner — API keys", description: "The owner creates and revokes keys for their agents.", role: "owner", path: "/owner/keys" },
  { slug: "owner-policy", name: "Owner — policy", description: "The owner sets the approval threshold and limits.", role: "owner", path: "/owner/policy" },
  { slug: "worker-tasks-empty", name: "Worker — tasks near you (none open)", description: "A local earner opens the app and there are no open tasks.", role: "worker1", path: "/work" },
  { slug: "worker-my-task-empty", name: "Worker — my task (nothing claimed)", description: "The earner hasn't claimed a task yet.", role: "worker1", path: "/work/my-task" },
  { slug: "worker-earnings-empty", name: "Worker — earnings (none yet)", description: "The earner's payout history before their first task.", role: "worker1", path: "/work/earnings" },
  { slug: "admin", name: "Admin", description: "The demo administrator's page.", role: "admin", path: "/admin" },
];
