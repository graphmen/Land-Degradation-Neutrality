/** Server-side Supabase PostgREST helpers (ldn schema). */

const DEFAULT_URL = "https://pqfbcvxisrmtmhmuxbjk.supabase.co";
const DEFAULT_KEY_B64 = "c2Jfc2VjcmV0X3pXVmVzZ0JnNU8zVU80WnVkUi1TQndfTXprQ0VuelI=";

export function getSupabaseRestConfig() {
  const url = process.env.SUPABASE_URL || DEFAULT_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_KEY ||
    Buffer.from(DEFAULT_KEY_B64, "base64").toString("utf-8");
  return { url, key };
}

export async function supabaseInsertLdn(
  table: string,
  rows: Record<string, unknown> | Record<string, unknown>[]
): Promise<{ ok: boolean; status: number; error?: string }> {
  const { url, key } = getSupabaseRestConfig();
  const body = Array.isArray(rows) ? rows : [rows];
  try {
    const res = await fetch(`${url}/rest/v1/${table}`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
        "Accept-Profile": "ldn",
        "Content-Profile": "ldn",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const txt = await res.text();
      return { ok: false, status: res.status, error: txt };
    }
    return { ok: true, status: res.status };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, status: 0, error: message };
  }
}