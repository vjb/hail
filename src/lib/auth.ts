import "server-only";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { env } from "@/lib/env";

export type Role = "owner" | "worker" | "admin";
type SessionData = { userId?: string; role?: Role };

export type CurrentUser = { id: string; role: Role; name: string; email: string; paypalEmail: string | null };

const sessionOptions = () => ({
  password: env().SESSION_SECRET,
  cookieName: "hail_session",
  ttl: 60 * 60 * 24 * 7,
  cookieOptions: { httpOnly: true, sameSite: "lax" as const, secure: env().APP_BASE_URL.startsWith("https://"), path: "/" },
});

async function session() {
  return getIronSession<SessionData>(await cookies(), sessionOptions());
}

export const hashPassword = (pw: string) => bcrypt.hash(pw, 10);

/** Returns the signed-in user, or null. The DB row is the source of truth for role. */
export async function currentUser(): Promise<CurrentUser | null> {
  const s = await session();
  if (!s.userId) return null;
  const [u] = await db()
    .select({ id: users.id, role: users.role, name: users.name, email: users.email, paypalEmail: users.paypalEmail })
    .from(users)
    .where(eq(users.id, s.userId));
  return u ?? null;
}

export const homeFor = (role: Role) => (role === "worker" ? "/work" : role === "admin" ? "/admin" : "/owner");

/** Gate a page or action to one or more roles. Signed-out users go to sign-in; wrong roles go home. */
export async function requireRole(...roles: Role[]): Promise<CurrentUser> {
  const u = await currentUser();
  if (!u) redirect("/sign-in");
  if (!roles.includes(u.role)) redirect(homeFor(u.role));
  return u;
}

// Constant-time-ish failure path: always run bcrypt even for unknown emails.
const DUMMY_HASH = "$2b$10$CwTycUXWue0Thq9StjUM0uJ8.e6kq6Q2Lx9I0J1yYzH6c8Pq2Jx7S";

export async function signIn(email: string, password: string): Promise<CurrentUser | null> {
  const [u] = await db().select().from(users).where(eq(users.email, email.trim().toLowerCase()));
  const ok = await bcrypt.compare(password, u?.passwordHash ?? DUMMY_HASH);
  if (!u || !ok) return null;
  const s = await session();
  s.userId = u.id;
  s.role = u.role;
  await s.save();
  return { id: u.id, role: u.role, name: u.name, email: u.email, paypalEmail: u.paypalEmail };
}

export async function signOut() {
  const s = await session();
  s.destroy();
}
