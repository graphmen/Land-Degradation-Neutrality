import { NextResponse } from "next/server";
import { appendAccessLog, getSessionUser, SESSION_COOKIE_NAME } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  const user = await getSessionUser();
  if (user) {
    await appendAccessLog({
      action: "logout",
      actor_email: user.email,
      actor_role: user.role,
      detail: "Officer signed out",
    });
  }

  const res = NextResponse.json({ authenticated: false, user: null });
  res.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
