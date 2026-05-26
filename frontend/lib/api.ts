// All API calls now go to Next.js internal API routes — no separate backend needed

export async function fetchSummary() {
  const res = await fetch("/api/summary", { cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchGeoJSON() {
  const res = await fetch("/api/geojson", { cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchData(limit = 300) {
  const res = await fetch(`/api/data?limit=${limit}`, { cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
