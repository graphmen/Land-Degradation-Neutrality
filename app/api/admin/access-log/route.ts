import { NextResponse } from "next/server";
import { getSessionUser, listAccessLog } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (session.role !== "ict_dba") {
    return NextResponse.json(
      { error: "Forbidden: ICT / System Administrator role required." },
      { status: 403 }
    );
  }
  const events = await listAccessLog(120);
  return NextResponse.json({ count: events.length, events });
}
