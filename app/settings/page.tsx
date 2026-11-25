"use client";

import React, { useEffect, useState } from "react";
import {
  EMA_ROLE_META,
  useGovPlatform,
  type EmaRole,
  type ReportingPeriodOption,
} from "@/components/GovPlatformContext";

type OfficerSession = {
  fullName: string;
  email: string;
  station: string;
  signedInAt: string;
};

const SESSION_KEY = "ema_ldn_officer_session_v1";

export default function AccessAndSettingsPage() {
  const { period, setPeriod, role, setRole, permissions } = useGovPlatform();

  const [session, setSession] = useState<OfficerSession | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [station, setStation] = useState("EMA Head Office — Harare");
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as OfficerSession;
        setSession(parsed);
        setFullName(parsed.fullName);
        setEmail(parsed.email);
        setStation(parsed.station);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) return;
    const next: OfficerSession = {
      fullName: fullName.trim(),
      email: email.trim(),
      station: station.trim() || "EMA Zimbabwe",
      signedInAt: new Date().toISOString(),
    };
    setSession(next);
    try {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
    setSavedNotice("Officer session updated.");
    window.setTimeout(() => setSavedNotice(null), 3000);
  };

  const handleSignOut = () => {
    setSession(null);
    setFullName("");
    setEmail("");
    try {
      window.localStorage.removeItem(SESSION_KEY);
    } catch {
      // ignore
    }
    setSavedNotice("Signed out of officer session.");
    window.setTimeout(() => setSavedNotice(null), 3000);
  };

  return (
    <>
      <div className="gov-page-header">
        <div>
          <div className="gov-page-kicker">System &amp; Support</div>
          <h1 className="gov-page-title">Access &amp; Settings</h1>
          <p className="gov-page-subtitle">
            Manage EMA officer sign-in, role-based access permissions, and UNCCD reporting cycle defaults.
          </p>
        </div>
      </div>

      {savedNotice && <div className="gov-alert gov-alert-green">{savedNotice}</div>}

      <div className="gov-grid-2">
        {/* Officer Sign-In / Account Session */}
        <section className="gov-card">
          <div className="gov-card-header">
            <h2 className="gov-card-title">EMA Officer Sign-In</h2>
            <span className={`gov-badge ${session ? "gov-badge-green" : "gov-badge-slate"}`}>
              {session ? "Signed In" : "Guest Session"}
            </span>
          </div>

          {session ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="gov-kv-grid">
                <div>
                  <div className="gov-kv-label">Officer Name</div>
                  <div className="gov-kv-val">{session.fullName}</div>
                </div>
                <div>
                  <div className="gov-kv-label">Official Email</div>
                  <div className="gov-kv-val">{session.email}</div>
                </div>
                <div>
                  <div className="gov-kv-label">Station / Office</div>
                  <div className="gov-kv-val">{session.station}</div>
                </div>
                <div>
                  <div className="gov-kv-label">Assigned Role</div>
                  <div className="gov-kv-val">{EMA_ROLE_META[role].label}</div>
                </div>
              </div>
              <div style={{ paddingTop: 8, borderTop: "1px solid #e8ecef" }}>
                <button type="button" className="gov-btn" onClick={handleSignOut}>
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSignIn} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label className="gov-kv-label" style={{ display: "block", marginBottom: 4 }}>
                  Officer Full Name *
                </label>
                <input
                  type="text"
                  className="gov-input"
                  style={{ width: "100%" }}
                  placeholder="e.g. T. Moyo"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="gov-kv-label" style={{ display: "block", marginBottom: 4 }}>
                  EMA Official Email *
                </label>
                <input
                  type="email"
                  className="gov-input"
                  style={{ width: "100%" }}
                  placeholder="e.g. tmoyo@ema.co.zw"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="gov-kv-label" style={{ display: "block", marginBottom: 4 }}>
                  Office / Provincial Station
                </label>
                <input
                  type="text"
                  className="gov-input"
                  style={{ width: "100%" }}
                  value={station}
                  onChange={(e) => setStation(e.target.value)}
                />
              </div>

              <div>
                <button type="submit" className="gov-btn gov-btn-primary">
                  Sign In to EMA Session
                </button>
              </div>
            </form>
          )}
        </section>

        {/* Reporting Cycle & RBAC Role Settings */}
        <section className="gov-card">
          <div className="gov-card-header">
            <h2 className="gov-card-title">Reporting Cycle &amp; Role Permissions</h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label className="gov-kv-label" style={{ display: "block", marginBottom: 4 }}>
                Active UNCCD Reporting Cycle
              </label>
              <select
                className="gov-select"
                style={{ width: "100%" }}
                value={period}
                onChange={(e) => setPeriod(e.target.value as ReportingPeriodOption)}
              >
                <option value="2020-2023">2020–2023 (PRAIS 4 Active)</option>
                <option value="2000-2015">2000–2015 (UNCCD Baseline)</option>
                <option value="2022-2025">2022–2025 (Next Cycle)</option>
              </select>
            </div>

            <div>
              <label className="gov-kv-label" style={{ display: "block", marginBottom: 4 }}>
                Active EMA Access Role
              </label>
              <select
                className="gov-select"
                style={{ width: "100%" }}
                value={role}
                onChange={(e) => setRole(e.target.value as EmaRole)}
              >
                {(Object.keys(EMA_ROLE_META) as EmaRole[]).map((key) => (
                  <option key={key} value={key}>
                    {EMA_ROLE_META[key].label}
                  </option>
                ))}
              </select>
            </div>

            <table className="gov-table" style={{ border: "1px solid #dcdfe2" }}>
              <thead>
                <tr>
                  <th>Capability</th>
                  <th style={{ textAlign: "right" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>District Verification Queue</td>
                  <td style={{ textAlign: "right" }}>
                    <span className={`gov-badge ${permissions.canVerifyDistrict ? "gov-badge-green" : "gov-badge-slate"}`}>
                      {permissions.canVerifyDistrict ? "Allowed" : "Read-only"}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>National Approval &amp; PRAIS Lock</td>
                  <td style={{ textAlign: "right" }}>
                    <span className={`gov-badge ${permissions.canApproveOrLock ? "gov-badge-green" : "gov-badge-slate"}`}>
                      {permissions.canApproveOrLock ? "Allowed" : "Restricted"}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>Restricted Layers (Illegal Mining)</td>
                  <td style={{ textAlign: "right" }}>
                    <span className={`gov-badge ${permissions.canViewRestrictedLayers ? "gov-badge-green" : "gov-badge-slate"}`}>
                      {permissions.canViewRestrictedLayers ? "Visible" : "Hidden"}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>PRAIS 4 Reporting Desk</td>
                  <td style={{ textAlign: "right" }}>
                    <span className={`gov-badge ${permissions.canAccessReportingDesk ? "gov-badge-green" : "gov-badge-slate"}`}>
                      {permissions.canAccessReportingDesk ? "Enabled" : "Restricted"}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>System Administration</td>
                  <td style={{ textAlign: "right" }}>
                    <span className={`gov-badge ${permissions.canAccessAdmin ? "gov-badge-green" : "gov-badge-slate"}`}>
                      {permissions.canAccessAdmin ? "Enabled" : "Restricted"}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Mobile Field Suite Connection Details */}
      <section className="gov-card">
        <div className="gov-card-header">
          <h2 className="gov-card-title">Mobile Field Suite Integration</h2>
        </div>
        <div className="gov-kv-grid">
          <div>
            <div className="gov-kv-label">Universal Modular Ingestion API</div>
            <div className="gov-kv-val gov-mono">POST /api/submit/modular</div>
          </div>
          <div>
            <div className="gov-kv-label">Supported Field Modules</div>
            <div className="gov-kv-val">
              Land Cover (SO1), Soil &amp; Lab SOC (SO1-3), Degradation Pressures, Restoration (SO4), Drylands (ILUP)
            </div>
          </div>
          <div>
            <div className="gov-kv-label">UNCCD Baseline Reference</div>
            <div className="gov-kv-val gov-mono">t0_end_2015 · GPG v2</div>
          </div>
          <div>
            <div className="gov-kv-label">Android Application ID</div>
            <div className="gov-kv-val gov-mono">gov.zw.ema.ldn</div>
          </div>
        </div>
      </section>
    </>
  );
}
