"use client";

import React, { useEffect, useState } from "react";
import type { FeedbackEntry } from "@/app/api/support/feedback/route";

const FAQ_ITEMS = [
  {
    q: "How is SDG Indicator 15.3.1 (Proportion of degraded land) calculated?",
    a: "Zimbabwe follows UNCCD Good Practice Guidance (GPG v2) using the One-Out-All-Out (1OAO) rule across three sub-indicators: Land Cover change (7-class transition matrix), Land Productivity Dynamics (LPD), and Soil Organic Carbon (SOC) stocks (0–30 cm). If any sub-indicator shows degradation in a reporting unit, that unit is classified as degraded.",
  },
  {
    q: "Which field records are eligible for official UNCCD PRAIS 4 submission?",
    a: "Only field records that have completed the Annex E verification workflow (Submitted → District Review → National Review → Approved → Locked) and are assigned to the active reporting cycle are included in locked PRAIS 4 export packages.",
  },
  {
    q: "How do mobile field submissions appear on the National Platform?",
    a: "Officers capture Land Cover, Soil Cores, Degradation Pressures, Restoration (SO4) polygons, or Drylands assessments offline in the EMA Mobile Field Suite. When connectivity returns, tapping Sync uploads records to POST /api/submit/modular, making them immediately visible in the Evidence Registry, Verification Queue, and Spatial Layers map.",
  },
  {
    q: "Why are Illegal Mining layers hidden for some users?",
    a: "Illegal mining observations are tagged as restricted national compliance data. They are only visible to authorized National Reporting Officers, GIS Leads, and ICT Administrators, and are automatically masked from Public / Donor read-only views.",
  },
  {
    q: "How are EMA Laboratory Soil Organic Carbon (SOC %) results linked to field cores?",
    a: "Each soil core captured in the mobile app records a Lab Bag Tag (sample_ref) and optional EMA Lab Number. Laboratory assay spreadsheets are imported via the Tier-2 SOC ingestion pipeline and joined directly into SO1-3 analytics.",
  },
];

export default function SupportAndFeedbackPage() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  const [entries, setEntries] = useState<FeedbackEntry[]>([]);
  const [category, setCategory] = useState("Data / Methodology Question");
  const [moduleName, setModuleName] = useState("National Platform");
  const [officerName, setOfficerName] = useState("");
  const [station, setStation] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const loadFeedback = async () => {
    try {
      const res = await fetch("/api/support/feedback", { cache: "no-store" });
      if (res.ok) {
        const json = (await res.json()) as { entries?: FeedbackEntry[] };
        setEntries(json.entries ?? []);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadFeedback();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSubmitting(true);
    setNotice(null);
    try {
      const res = await fetch("/api/support/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          module: moduleName,
          officer_name: officerName,
          station,
          message,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setMessage("");
      setNotice({ type: "ok", text: "Feedback logged with EMA LDN Support." });
      await loadFeedback();
    } catch (err: unknown) {
      setNotice({
        type: "err",
        text: err instanceof Error ? err.message : "Failed to submit feedback.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="gov-page-header">
        <div>
          <div className="gov-page-kicker">System &amp; Support</div>
          <h1 className="gov-page-title">Help, Q&amp;A &amp; Feedback</h1>
          <p className="gov-page-subtitle">
            UNCCD SDG 15.3.1 reporting guidance, mobile field sync reference, and officer issue reporting.
          </p>
        </div>
      </div>

      <div className="gov-grid-2">
        {/* Left: Q&A Accordion */}
        <section>
          <div className="gov-card-header" style={{ borderBottom: "2px solid #1a1f24", marginBottom: 0 }}>
            <h2 className="gov-card-title">Frequently Asked Questions (Q&amp;A)</h2>
          </div>

          <div style={{ border: "1px solid #dcdfe2", borderTop: "none", background: "#ffffff" }}>
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openIdx === idx;
              return (
                <div key={item.q} style={{ borderBottom: idx < FAQ_ITEMS.length - 1 ? "1px solid #e8ecef" : "none" }}>
                  <button
                    type="button"
                    onClick={() => setOpenIdx(isOpen ? null : idx)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      background: isOpen ? "#f8faf9" : "#ffffff",
                      border: "none",
                      padding: "13px 16px",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#11181c",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <span>{item.q}</span>
                    <span style={{ color: "#005a2b", fontWeight: 700, fontSize: 15 }}>
                      {isOpen ? "−" : "+"}
                    </span>
                  </button>
                  {isOpen && (
                    <div
                      style={{
                        padding: "0 16px 14px",
                        fontSize: 13,
                        color: "#3e4c59",
                        lineHeight: 1.55,
                        background: "#f8faf9",
                      }}
                    >
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Right: Officer Feedback & Issue Form */}
        <section className="gov-card">
          <div className="gov-card-header">
            <h2 className="gov-card-title">Submit Feedback or Report an Issue</h2>
          </div>

          {notice && (
            <div
              className={`gov-alert ${notice.type === "ok" ? "gov-alert-green" : "gov-alert-red"}`}
              style={{ marginBottom: 12 }}
            >
              {notice.text}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="gov-grid-2" style={{ gap: 10 }}>
              <div>
                <label className="gov-kv-label" style={{ display: "block", marginBottom: 4 }}>
                  Category
                </label>
                <select
                  className="gov-select"
                  style={{ width: "100%" }}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option>Data / Methodology Question</option>
                  <option>Bug / Technical Issue</option>
                  <option>New Mobile Module Request</option>
                  <option>PRAIS 4 Reporting Support</option>
                  <option>General Feedback</option>
                </select>
              </div>
              <div>
                <label className="gov-kv-label" style={{ display: "block", marginBottom: 4 }}>
                  Module / Area
                </label>
                <select
                  className="gov-select"
                  style={{ width: "100%" }}
                  value={moduleName}
                  onChange={(e) => setModuleName(e.target.value)}
                >
                  <option>National Platform</option>
                  <option>Mobile Field Suite</option>
                  <option>Evidence Registry &amp; Verification</option>
                  <option>Spatial Layers &amp; Maps</option>
                  <option>SDG 15.3.1 Analytics / PRAIS 4</option>
                </select>
              </div>
            </div>

            <div className="gov-grid-2" style={{ gap: 10 }}>
              <div>
                <label className="gov-kv-label" style={{ display: "block", marginBottom: 4 }}>
                  Officer Name
                </label>
                <input
                  type="text"
                  className="gov-input"
                  style={{ width: "100%" }}
                  placeholder="e.g. T. Moyo"
                  value={officerName}
                  onChange={(e) => setOfficerName(e.target.value)}
                />
              </div>
              <div>
                <label className="gov-kv-label" style={{ display: "block", marginBottom: 4 }}>
                  Province / Station
                </label>
                <input
                  type="text"
                  className="gov-input"
                  style={{ width: "100%" }}
                  placeholder="e.g. Masvingo Province"
                  value={station}
                  onChange={(e) => setStation(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="gov-kv-label" style={{ display: "block", marginBottom: 4 }}>
                Details *
              </label>
              <textarea
                className="gov-textarea"
                style={{ width: "100%", minHeight: 96, resize: "vertical" }}
                placeholder="Describe your question, feedback, or requested EMA module…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
            </div>

            <div>
              <button type="submit" className="gov-btn gov-btn-primary" disabled={submitting}>
                {submitting ? "Submitting…" : "Submit Feedback"}
              </button>
            </div>
          </form>
        </section>
      </div>

      {/* Logged Feedback Table */}
      <section>
        <div className="gov-card-header" style={{ borderBottom: "2px solid #1a1f24", marginBottom: 0 }}>
          <h2 className="gov-card-title">Logged Officer Feedback ({entries.length})</h2>
        </div>
        <div className="gov-table-wrap" style={{ borderTop: "none", borderRadius: "0 0 4px 4px" }}>
          <table className="gov-table">
            <thead>
              <tr>
                <th>Ref</th>
                <th>Date</th>
                <th>Category</th>
                <th>Module</th>
                <th>Officer / Station</th>
                <th>Message</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: 20, color: "#52606d" }}>
                    No feedback entries logged yet.
                  </td>
                </tr>
              ) : (
                entries.map((e) => (
                  <tr key={e.id}>
                    <td className="gov-mono">{e.id}</td>
                    <td>{new Date(e.created_at).toLocaleDateString()}</td>
                    <td>{e.category}</td>
                    <td>{e.module}</td>
                    <td>
                      {e.officer_name}
                      <div style={{ fontSize: 11, color: "#52606d" }}>{e.station}</div>
                    </td>
                    <td style={{ maxWidth: 360 }}>{e.message}</td>
                    <td>
                      <span className="gov-badge gov-badge-amber">{e.status}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
