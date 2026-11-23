import { loadReconciledLdnRecords } from "@/lib/local-record-reconcile";
import { rowsToCsv } from "@/lib/exp-so1-field-export";
import reportingConfig from "@/public/reporting-period-config.json";

export const EXP_PHOTOS_COLUMNS = [
  "submission_id",
  "uuid",
  "collect_earth_id",
  "verification_status",
  "attachment_uid",
  "download_url",
  "mimetype",
  "question_xpath",
  "source",
] as const;

type AttachmentRow = Record<string, unknown>;

function attachmentsFromRecord(record: Record<string, unknown>): AttachmentRow[] {
  const raw = (record.raw_data as Record<string, unknown>) || {};
  const subs = Array.isArray(raw._attachments) ? raw._attachments : [];
  const rows: AttachmentRow[] = [];

  for (const att of subs) {
    if (!att || typeof att !== "object") continue;
    const a = att as Record<string, unknown>;
    if (a.is_deleted === true) continue;
    rows.push({
      submission_id: record.kobo_id ?? record.id ?? raw._id,
      uuid: record.uuid ?? raw._uuid,
      collect_earth_id: record.ceid ?? raw.ceid,
      verification_status: record.verification_status ?? "submitted",
      attachment_uid: a.uid,
      download_url: a.download_url,
      mimetype: a.mimetype,
      question_xpath: a.question_xpath,
      source: "kobo_attachment",
    });
  }

  if (rows.length === 0 && raw.im) {
    rows.push({
      submission_id: record.kobo_id ?? record.id ?? raw._id,
      uuid: record.uuid ?? raw._uuid,
      collect_earth_id: record.ceid ?? raw.ceid,
      verification_status: record.verification_status ?? "submitted",
      attachment_uid: null,
      download_url: null,
      mimetype: "image/jpeg",
      question_xpath: "im",
      source: "filename_only",
      filename: raw.im,
    });
  }

  return rows;
}

export type ExpPhotosPackage = {
  package_id: "EXP-PHOTOS";
  reporting_period: string | null;
  generated_at: string;
  rows: AttachmentRow[];
  csv: string;
  stats: { ldn_records: number; rows_with_attachment: number; manifest_rows: number };
  metadata: Record<string, unknown>;
};

export async function buildExpPhotosPackage(opts?: {
  reporting_period?: string | null;
  locked_only?: boolean;
}): Promise<ExpPhotosPackage> {
  const reporting_period =
    opts?.reporting_period ??
    reportingConfig.periods?.find((p) => p.is_active)?.reporting_period ??
    null;

  let records = await loadReconciledLdnRecords();
  if (opts?.locked_only) {
    records = records.filter((r) => r.verification_status === "locked");
  }

  const rows: AttachmentRow[] = [];
  let withAtt = 0;
  for (const rec of records) {
    const part = attachmentsFromRecord(rec);
    if (part.length) withAtt += 1;
    rows.push(...part);
  }

  const generated_at = new Date().toISOString();

  return {
    package_id: "EXP-PHOTOS",
    reporting_period,
    generated_at,
    rows,
    csv: rowsToCsv(EXP_PHOTOS_COLUMNS, rows),
    stats: {
      ldn_records: records.length,
      rows_with_attachment: withAtt,
      manifest_rows: rows.length,
    },
    metadata: {
      package_id: "EXP-PHOTOS",
      title: "Field photo manifest (LDN legacy Kobo attachments)",
      generated_at,
      reporting_period,
      proxy_note: "Use /api/media?url= for authenticated Kobo fetch",
      stats: {
        ldn_records: records.length,
        manifest_rows: rows.length,
      },
    },
  };
}