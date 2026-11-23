/**
 * Annex E §E.2 — allowed verification_status transitions (server-side guard).
 * Audit log table comes in Phase 2; this is the transition matrix only.
 */

import type { VerificationStatus } from "./compliance-metadata";

const ALLOWED: Record<VerificationStatus, VerificationStatus[]> = {
  draft: ["submitted"],
  submitted: ["district_review", "rejected"],
  district_review: ["national_review", "rejected"],
  national_review: ["approved", "rejected"],
  approved: ["locked", "rejected"],
  locked: [],
  rejected: ["submitted"],
  superseded: [],
};

export class VerificationTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VerificationTransitionError";
  }
}

export function assertVerificationTransition(
  from: VerificationStatus,
  to: VerificationStatus
): void {
  if (from === to) return;
  const next = ALLOWED[from];
  if (!next?.includes(to)) {
    throw new VerificationTransitionError(
      `Transition not allowed: ${from} → ${to}`
    );
  }
}

export type TransitionPatch = {
  verification_status: VerificationStatus;
  verified_by?: string | null;
  verified_at?: string | null;
  reporting_period?: string | null;
  verification_comment?: string | null;
  district_note?: string | null;
  national_note?: string | null;
  rejection_reason?: string | null;
};

export function buildTransitionPatch(
  from: VerificationStatus,
  to: VerificationStatus,
  opts: {
    actor: string;
    comment?: string;
    reporting_period?: string | null;
    now?: string;
  }
): TransitionPatch {
  assertVerificationTransition(from, to);
  const now = opts.now ?? new Date().toISOString();

  if (to === "locked" && !opts.reporting_period) {
    throw new VerificationTransitionError(
      "reporting_period is required when locking for reporting"
    );
  }
  if (to === "rejected" && !opts.comment?.trim()) {
    throw new VerificationTransitionError(
      "comment (rejection reason) is required when rejecting"
    );
  }

  const patch: TransitionPatch = {
    verification_status: to,
    verified_by: opts.actor,
    verified_at: now,
  };

  if (to === "locked") {
    patch.reporting_period = opts.reporting_period ?? null;
  }
  if (to === "rejected") {
    patch.rejection_reason = opts.comment ?? null;
  }
  if (from === "district_review" && to === "national_review" && opts.comment) {
    patch.district_note = opts.comment;
  }
  if (from === "national_review" && to === "approved" && opts.comment) {
    patch.national_note = opts.comment;
  }
  if (to === "locked" && opts.comment) {
    patch.verification_comment = opts.comment;
  }

  return patch;
}