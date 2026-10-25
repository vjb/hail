import { expect, test } from "@playwright/test";
import { expectAccessible, signInAs } from "./helpers";

test.describe("sign-in per role", () => {
  test("landing page explains who Hail is for and is accessible", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("hails a human");
    await expect(page.getByText("For agent owners")).toBeVisible();
    await expect(page.getByText("For local earners")).toBeVisible();
    await expectAccessible(page);
  });

  test("wrong password shows a clear error", async ({ page }) => {
    await page.goto("/sign-in");
    await expectAccessible(page);
    await page.getByLabel("Email").fill("nobody@hail-demo.test");
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("That email and password don't match an account.")).toBeVisible();
  });

  test("owner lands on the owner overview", async ({ page }) => {
    await signInAs(page, "owner");
    await expect(page).toHaveURL(/\/owner$/);
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Owner" })).toBeVisible();
    await expect(page.getByRole("banner").getByText("Available")).toBeVisible();
    await expectAccessible(page);
    // Owners can't open worker or admin pages.
    await page.goto("/work");
    await expect(page).toHaveURL(/\/owner$/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/owner$/);
  });

  test("worker lands on tasks, phone-sized", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signInAs(page, "worker1");
    await expect(page).toHaveURL(/\/work$/);
    await expect(page.getByRole("heading", { name: "Tasks near you" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Worker" })).toBeVisible();
    await expectAccessible(page);
    await page.goto("/owner");
    await expect(page).toHaveURL(/\/work$/);
  });

  test("admin lands on admin", async ({ page }) => {
    await signInAs(page, "admin");
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: "Demo admin" })).toBeVisible();
    await expectAccessible(page);
  });

  test("signed-out visitors are sent to sign-in", async ({ page }) => {
    for (const path of ["/owner", "/owner/balance", "/work", "/work/earnings", "/admin"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/sign-in$/);
    }
  });

  test("sign out ends the session", async ({ page }) => {
    await signInAs(page, "owner");
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/sign-in$/);
    await page.goto("/owner");
    await expect(page).toHaveURL(/\/sign-in$/);
  });
});

test("one-tap demo sign-in, without any password in the page", async ({ page }) => {
  await page.goto("/sign-in");
  const html = await page.content();
  for (const v of ["DEMO_OWNER_PASSWORD", "DEMO_WORKER1_PASSWORD", "DEMO_WORKER2_PASSWORD", "DEMO_ADMIN_PASSWORD"]) {
    expect(html.includes(process.env[v]!), `${v} must not appear in the page`).toBe(false);
  }
  await expect(page.getByRole("button", { name: /admin/i })).toHaveCount(0);
  await page.getByRole("button", { name: "Worker: Sam" }).click();
  await expect(page).toHaveURL(/\/work$/);
  await page.goto("/work/settings");
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.getByRole("button", { name: "Agent owner: Dana" }).click();
  await expect(page).toHaveURL(/\/owner$/);
});
