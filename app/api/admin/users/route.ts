import crypto from "crypto";
import { NextResponse } from "next/server";
import {
  appendAccessLog,
  getSessionUser,
  hashPassword,
  loadUsers,
  saveUsers,
  toPublicUser,
  type EmaRole,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

const VALID_ROLES: EmaRole[] = [
  "national_reporting_officer",
  "district_verifier",
  "gis_lead",
  "ict_dba",
  "public_donor",
];

async function requireAdmin() {
  const session = await getSessionUser();
  if (!session) {
    return { error: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  }
  if (session.role !== "ict_dba") {
    return {
      error: NextResponse.json(
        { error: "Forbidden: ICT / System Administrator role required." },
        { status: 403 }
      ),
    };
  }
  return { session };
}

export async function GET() {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;
  const users = await loadUsers();
  return NextResponse.json({ count: users.length, users: users.map(toPublicUser) });
}

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const email = String(body.email ?? "").trim().toLowerCase();
    const fullName = String(body.full_name ?? "").trim();
    const role = String(body.role ?? "district_verifier") as EmaRole;
    const station = String(body.station ?? "EMA Zimbabwe").trim();
    const province = String(body.province ?? "Harare").trim();
    const password = String(body.password ?? "");

    if (!email || !fullName || password.length < 8) {
      return NextResponse.json(
        { error: "Full name, valid email, and password (min 8 chars) are required." },
        { status: 400 }
      );
    }
    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: "Invalid EMA role." }, { status: 400 });
    }

    const users = await loadUsers();
    if (users.some((u) => u.email.toLowerCase() === email)) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const created = {
      id: `usr-${crypto.randomBytes(4).toString("hex")}`,
      email,
      full_name: fullName,
      role,
      station,
      province,
      active: true,
      password_hash: hashPassword(password),
      created_at: new Date().toISOString(),
      last_login_at: null,
    };

    users.push(created);
    await saveUsers(users);
    await appendAccessLog({
      action: "user_created",
      actor_email: gate.session.email,
      actor_role: gate.session.role,
      target: email,
      detail: `Created ${fullName} (${role}) at ${station}`,
    });

    return NextResponse.json({ success: true, user: toPublicUser(created) }, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create user" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const id = String(body.id ?? "");
    if (!id) {
      return NextResponse.json({ error: "User id is required." }, { status: 400 });
    }

    const users = await loadUsers();
    const target = users.find((u) => u.id === id);
    if (!target) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const changes: string[] = [];

    if (typeof body.full_name === "string" && body.full_name.trim()) {
      target.full_name = body.full_name.trim();
      changes.push("name");
    }
    if (typeof body.station === "string" && body.station.trim()) {
      target.station = body.station.trim();
      changes.push("station");
    }
    if (typeof body.province === "string" && body.province.trim()) {
      target.province = body.province.trim();
      changes.push("province");
    }
    if (typeof body.role === "string" && VALID_ROLES.includes(body.role as EmaRole)) {
      if (target.id === gate.session.id && body.role !== "ict_dba") {
        return NextResponse.json(
          { error: "Cannot demote your own active ICT Administrator account." },
          { status: 400 }
        );
      }
      target.role = body.role as EmaRole;
      changes.push(`role=${body.role}`);
    }
    if (typeof body.active === "boolean") {
      if (target.id === gate.session.id && !body.active) {
        return NextResponse.json(
          { error: "Cannot suspend your own active session." },
          { status: 400 }
        );
      }
      target.active = body.active;
      changes.push(`active=${body.active}`);
    }
    if (typeof body.reset_password === "string" && body.reset_password.length >= 8) {
      target.password_hash = hashPassword(body.reset_password);
      await appendAccessLog({
        action: "password_reset",
        actor_email: gate.session.email,
        actor_role: gate.session.role,
        target: target.email,
        detail: "Administrator reset officer password",
      });
    }

    await saveUsers(users);
    if (changes.length > 0) {
      await appendAccessLog({
        action: "user_updated",
        actor_email: gate.session.email,
        actor_role: gate.session.role,
        target: target.email,
        detail: `Updated: ${changes.join(", ")}`,
      });
    }

    return NextResponse.json({ success: true, user: toPublicUser(target) });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id parameter required." }, { status: 400 });
  }
  if (id === gate.session.id) {
    return NextResponse.json({ error: "Cannot delete your own active account." }, { status: 400 });
  }

  const users = await loadUsers();
  const target = users.find((u) => u.id === id);
  if (!target) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const remaining = users.filter((u) => u.id !== id);
  await saveUsers(remaining);
  await appendAccessLog({
    action: "user_deleted",
    actor_email: gate.session.email,
    actor_role: gate.session.role,
    target: target.email,
    detail: `Removed account ${target.full_name}`,
  });

  return NextResponse.json({ success: true });
}
