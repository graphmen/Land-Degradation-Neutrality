import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { cookies } from "next/headers";

export type EmaRole =
  | "national_reporting_officer"
  | "district_verifier"
  | "gis_lead"
  | "ict_dba"
  | "public_donor";

export type StoredUser = {
  id: string;
  email: string;
  full_name: string;
  role: EmaRole;
  station: string;
  province: string;
  active: boolean;
  password_hash: string; // "scrypt:<saltHex>:<derivedHex>"
  created_at: string;
  last_login_at: string | null;
};

export type PublicUser = Omit<StoredUser, "password_hash">;

export type AccessLogEvent = {
  id: string;
  timestamp: string;
  action:
    | "login_success"
    | "login_failed"
    | "logout"
    | "password_changed"
    | "user_created"
    | "user_updated"
    | "user_deleted"
    | "password_reset";
  actor_email: string;
  actor_role: string;
  target?: string;
  detail: string;
};

export const SESSION_COOKIE_NAME = "ema_ldn_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24; // 24 hours

const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "ema-users.json");
const ACCESS_LOG_FILE = path.join(DATA_DIR, "ema-access-log.json");

function getSessionSecret(): string {
  return (
    process.env.EMA_SESSION_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "ema-zw-ldn-prais4-local-session-secret-v1"
  );
}

export function hashPassword(plain: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(plain, salt, 64).toString("hex");
  return `scrypt:${salt}:${derived}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  const parts = stored.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, keyHex] = parts;
  const derived = crypto.scryptSync(plain, salt, 64);
  const keyBuf = Buffer.from(keyHex, "hex");
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

export function toPublicUser(u: StoredUser): PublicUser {
  const { password_hash: _omit, ...pub } = u;
  return pub;
}

type SessionPayload = {
  uid: string;
  email: string;
  role: EmaRole;
  exp: number;
};

export function createSessionToken(user: StoredUser): string {
  const payload: SessionPayload = {
    uid: user.id,
    email: user.email,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const b64 = Buffer.from(JSON.stringify(payload), "utf-8").toString("base64url");
  const sig = crypto
    .createHmac("sha256", getSessionSecret())
    .update(b64)
    .digest("base64url");
  return `${b64}.${sig}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [b64, sig] = parts;
  const expected = crypto
    .createHmac("sha256", getSessionSecret())
    .update(b64)
    .digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(b64, "base64url").toString("utf-8")) as SessionPayload;
    if (!parsed.uid || !parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

function buildSeedUsers(): StoredUser[] {
  const now = new Date().toISOString();
  return [
    {
      id: "usr-ema-admin",
      email: "admin@ema.co.zw",
      full_name: "EMA ICT Administrator",
      role: "ict_dba",
      station: "EMA Head Office — Harare",
      province: "Harare",
      active: true,
      password_hash: hashPassword("EmaAdmin@2026"),
      created_at: now,
      last_login_at: null,
    },
    {
      id: "usr-ema-reporting",
      email: "reporting@ema.co.zw",
      full_name: "National LDN Reporting Officer",
      role: "national_reporting_officer",
      station: "EMA National Focal Point — Harare",
      province: "Harare",
      active: true,
      password_hash: hashPassword("EmaReport@2026"),
      created_at: now,
      last_login_at: null,
    },
    {
      id: "usr-ema-gis",
      email: "gis@ema.co.zw",
      full_name: "National GIS & Remote Sensing Lead",
      role: "gis_lead",
      station: "EMA Geomatics Unit — Harare",
      province: "Harare",
      active: true,
      password_hash: hashPassword("EmaGis@2026"),
      created_at: now,
      last_login_at: null,
    },
    {
      id: "usr-ema-district",
      email: "district@ema.co.zw",
      full_name: "Masvingo District Verifier",
      role: "district_verifier",
      station: "EMA Provincial Office — Masvingo",
      province: "Masvingo",
      active: true,
      password_hash: hashPassword("EmaDistrict@2026"),
      created_at: now,
      last_login_at: null,
    },
  ];
}

export async function loadUsers(): Promise<StoredUser[]> {
  try {
    const raw = await fs.readFile(USERS_FILE, "utf-8");
    const parsed = JSON.parse(raw) as { users?: StoredUser[] };
    if (Array.isArray(parsed.users) && parsed.users.length > 0) {
      return parsed.users;
    }
  } catch {
    // seed on first run
  }
  await ensureDataDir();
  const seeded = buildSeedUsers();
  await saveUsers(seeded);
  return seeded;
}

export async function saveUsers(users: StoredUser[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(
    USERS_FILE,
    JSON.stringify({ updated_at: new Date().toISOString(), users }, null, 2),
    "utf-8"
  );
}

export async function appendAccessLog(
  event: Omit<AccessLogEvent, "id" | "timestamp">
): Promise<void> {
  await ensureDataDir();
  const existing = await listAccessLog(500);
  const next: AccessLogEvent = {
    id: `AUD-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString("hex")}`,
    timestamp: new Date().toISOString(),
    ...event,
  };
  const updated = [next, ...existing].slice(0, 500);
  await fs.writeFile(
    ACCESS_LOG_FILE,
    JSON.stringify({ updated_at: new Date().toISOString(), events: updated }, null, 2),
    "utf-8"
  );
}

export async function listAccessLog(limit = 100): Promise<AccessLogEvent[]> {
  try {
    const raw = await fs.readFile(ACCESS_LOG_FILE, "utf-8");
    const parsed = JSON.parse(raw) as { events?: AccessLogEvent[] };
    const list = Array.isArray(parsed.events) ? parsed.events : [];
    return list.slice(0, limit);
  } catch {
    return [];
  }
}

export async function getSessionUser(): Promise<PublicUser | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    const payload = verifySessionToken(token);
    if (!payload) return null;
    const users = await loadUsers();
    const user = users.find((u) => u.id === payload.uid && u.active);
    return user ? toPublicUser(user) : null;
  } catch {
    return null;
  }
}

export function buildSessionCookieHeader(token: string) {
  return {
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}
