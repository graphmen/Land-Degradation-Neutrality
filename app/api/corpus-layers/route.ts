import { NextResponse } from "next/server";
import {
  buildCorpusManifest,
  validateManifestF1,
  type CorpusLayerRow,
} from "@/lib/corpus-manifest";
import { EXP_META_COLUMNS } from "@/lib/exp-meta-export";
import { rowsToCsv } from "@/lib/exp-so1-field-export";

export const dynamic = "force-dynamic";

function toCsvRow(row: CorpusLayerRow): Record<string, unknown> {
  return {
    layer_id: row.layer_id,
    title: row.title,
    custodian: row.custodian,
    vintage: row.vintage,
    geometry_type: row.geometry_type,
    feature_count: row.feature_count,
    crs: row.crs,
    data_tier: row.data_tier,
    confidence: row.confidence,
    import_status: row.import_status,
    so_uses: row.so_uses.join(";"),
    doc_path: row.doc_path,
  };
}

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") ?? "json";
    const layers = buildCorpusManifest();
    const validation = validateManifestF1(layers);

    const payload = {
      package_id: "CORPUS-LAYERS",
      layer_count: layers.length,
      generated_at: new Date().toISOString(),
      layers,
      validation,
      hint: "R2 National layers hub; same rows as GET /api/export/meta",
    };

    if (format === "csv") {
      const csv = rowsToCsv(
        EXP_META_COLUMNS,
        layers.map((r) => toCsvRow(r)) as unknown as Record<string, unknown>[]
      );
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="corpus-layers.csv"',
        },
      });
    }

    return NextResponse.json(payload);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}