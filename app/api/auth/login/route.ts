import { NextResponse } from "next/server";
import {
  appendAccessLog,
  buildSessionCookieHeader,
  createSessionToken,
  loadUsers,
  saveUsers,
  toPublicUser,
  verifyPassword,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { email?: string; password?: string };
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const users = await loadUsers();
    const user = users.find((u) => u.email.toLowerCase() === email);

    if (!user || !verifyPassword(password, user.password_hash)) {
      await appendAccessLog({
        action: "login_failed",
        actor_email: email,
        actor_role: user?.role ?? "unknown",
        detail: "Invalid credentials",
      });
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    if (!user.active) {
      await appendAccessLog({
        action: "login_failed",
        actor_email: email,
        actor_role: user.role,
        detail: "Account is suspended",
      });
      return NextResponse.json(
        { error: "This officer account is suspended. Contact EMA ICT Administration." },
        { status: 403 }
      );
    }

    user.last_login_at = new Date().toISOString();
    await saveUsers(users);

    const token = createSessionToken(user);
    await appendAccessLog({
      action: "login_success",
      actor_email: user.email,
      actor_role: user.role,
      detail: `Signed in from ${user.station}`,
    });

    const res = NextResponse.json({
      authenticated: true,
      user: toPublicUser(user),
    });
    res.cookies.set(buildSessionCookieHeader(token));
    return res;
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Authentication failed" },
      { status: 500 }
    );
  }
}
