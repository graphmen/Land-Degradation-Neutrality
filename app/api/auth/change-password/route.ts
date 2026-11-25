import { NextResponse } from "next/server";
import {
  appendAccessLog,
  getSessionUser,
  hashPassword,
  loadUsers,
  saveUsers,
  verifyPassword,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  try {
    const body = (await req.json()) as {
      currentPassword?: string;
      newPassword?: string;
    };
    const currentPassword = String(body.currentPassword ?? "");
    const newPassword = String(body.newPassword ?? "");

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const users = await loadUsers();
    const target = users.find((u) => u.id === session.id);
    if (!target || !verifyPassword(currentPassword, target.password_hash)) {
      return NextResponse.json(
        { error: "Current password is incorrect." },
        { status: 400 }
      );
    }

    target.password_hash = hashPassword(newPassword);
    await saveUsers(users);
    await appendAccessLog({
      action: "password_changed",
      actor_email: session.email,
      actor_role: session.role,
      detail: "Officer updated their own password",
    });

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to update password" },
      { status: 500 }
    );
  }
}
