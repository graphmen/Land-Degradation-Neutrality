"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  EMA_ROLE_META,
  useGovPlatform,
  type EmaRole,
  type ReportingPeriodOption,
  type SessionUser,
} from "@/components/GovPlatformContext";
import type { AccessLogEvent } from "@/lib/auth";

type TabId = "account" | "users" | "permissions" | "audit";

const ZIM_PROVINCES = [
  "Harare",
  "Bulawayo",
  "Manicaland",
  "Mashonaland Central",
  "Mashonaland East",
  "Mashonaland West",
  "Masvingo",
  "Matabeleland North",
  "Matabeleland South",
  "Midlands",
];

const TEST_ACCOUNTS = [
  { email: "admin@ema.co.zw", pass: "EmaAdmin@2026", role: "ICT / DBA (Full Admin)" },
  { email: "reporting@ema.co.zw", pass: "EmaReport@2026", role: "National Reporting Officer" },
  { email: "gis@ema.co.zw", pass: "EmaGis@2026", role: "GIS Lead" },
  { email: "district@ema.co.zw", pass: "EmaDistrict@2026", role: "District Verifier" },
];

export default function AccessAndSettingsPage() {
  const { period, setPeriod, user, role, setRole, permissions, refreshSession, logout } =
    useGovPlatform();

  const [activeTab, setActiveTab] = useState<TabId>("account");
  const [notice, setNotice] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Sign-in form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);

  // Change password state
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwBusy, setPwBusy] = useState(false);

  // Admin: User directory state
  const [users, setUsers] = useState<SessionUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [newFullName, setNewFullName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<EmaRole>("district_verifier");
  const [newProvince, setNewProvince] = useState("Harare");
  const [newStation, setNewStation] = useState("EMA Provincial Office");
  const [newUserPw, setNewUserPw] = useState("");
  const [creatingUser, setCreatingUser] = useState(false);

  // Admin: Audit log state
  const [auditEvents, setAuditEvents] = useState<AccessLogEvent[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const isRealAdmin = user?.role === "ict_dba";

  const flash = (type: "ok" | "err", text: string) => {
    setNotice({ type, text });
  };

  const loadUsers = useCallback(async () => {
    if (!isRealAdmin) return;
    setUsersLoading(true);
    try {
      const res = await fetch("/api/admin/users", { cache: "no-store" });
      if (res.ok) {
        const json = (await res.json()) as { users?: SessionUser[] };
        setUsers(json.users ?? []);
      }
    } finally {
      setUsersLoading(false);
    }
  }, [isRealAdmin]);

  const loadAudit = useCallback(async () => {
    if (!isRealAdmin) return;
    setAuditLoading(true);
    try {
      const res = await fetch("/api/admin/access-log", { cache: "no-store" });
      if (res.ok) {
        const json = (await res.json()) as { events?: AccessLogEvent[] };
        setAuditEvents(json.events ?? []);
      }
    } finally {
      setAuditLoading(false);
    }
  }, [isRealAdmin]);

  useEffect(() => {
    if (activeTab === "users" && isRealAdmin) loadUsers();
    if (activeTab === "audit" && isRealAdmin) loadAudit();
  }, [activeTab, isRealAdmin, loadUsers, loadAudit]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const json = (await res.json()) as { error?: string; user?: SessionUser };
      if (!res.ok) {
        flash("err", json.error ?? "Sign-in failed.");
        return;
      }
      setLoginPassword("");
      await refreshSession();
      flash("ok", `Signed in as ${json.user?.full_name} (${EMA_ROLE_META[json.user?.role ?? "public_donor"].label}).`);
    } catch (err: unknown) {
      flash("err", err instanceof Error ? err.message : "Network error during sign-in.");
    } finally {
      setLoginBusy(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: curPw, newPassword: newPw }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        flash("err", json.error ?? "Could not change password.");
        return;
      }
      setCurPw("");
      setNewPw("");
      flash("ok", "Password updated.");
    } finally {
      setPwBusy(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingUser(true);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: newFullName,
          email: newEmail,
          role: newRole,
          province: newProvince,
          station: newStation,
          password: newUserPw,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        flash("err", json.error ?? "Failed to create officer account.");
        return;
      }
      setNewFullName("");
      setNewEmail("");
      setNewUserPw("");
      flash("ok", "New EMA officer account created.");
      await loadUsers();
    } finally {
      setCreatingUser(false);
    }
  };

  const handleUpdateUser = async (id: string, patch: Record<string, unknown>, successMsg: string) => {
    setNotice(null);
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) {
      flash("err", json.error ?? "Update failed.");
      return;
    }
    flash("ok", successMsg);
    await loadUsers();
  };

  const handleDeleteUser = async (u: SessionUser) => {
    if (!window.confirm(`Remove officer account ${u.full_name} (${u.email})?`)) return;
    setNotice(null);
    const res = await fetch(`/api/admin/users?id=${encodeURIComponent(u.id)}`, {
      method: "DELETE",
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) {
      flash("err", json.error ?? "Delete failed.");
      return;
    }
    flash("ok", `Removed ${u.email}.`);
    await loadUsers();
  };

  const handleResetPasswordPrompt = async (u: SessionUser) => {
    const temp = window.prompt(`Enter new temporary password (min 8 chars) for ${u.email}:`);
    if (!temp) return;
    if (temp.length < 8) {
      flash("err", "Temporary password must be at least 8 characters.");
      return;
    }
    await handleUpdateUser(u.id, { reset_password: temp }, `Password reset for ${u.email}.`);
  };

  return (
    <>
      <div className="gov-page-header">
        <div>
          <div className="gov-page-kicker">System &amp; Support</div>
          <h1 className="gov-page-title">Access &amp; Settings</h1>
          <p className="gov-page-subtitle">
            EMA officer authentication, role-based access control, user directory, and security audit trail.
          </p>
        </div>
        {user && (
          <div className="gov-page-actions">
            <span className="gov-badge gov-badge-green">
              Signed in: {user.email}
            </span>
            <button
              type="button"
              className="gov-btn"
              onClick={async () => {
                await logout();
                flash("ok", "Signed out. Platform reverted to Public / Donor read-only access.");
              }}
            >
              Sign Out
            </button>
          </div>
        )}
      </div>

      {/* Editorial Underlined Tabs */}
      <div
        style={{
          display: "flex",
          gap: 24,
          borderBottom: "1px solid #dcdfe2",
          marginTop: -6,
        }}
      >
        {(
          [
            { id: "account", label: user ? "My Account" : "Officer Sign In" },
            { id: "users", label: "User Directory & Roles" },
            { id: "permissions", label: "Permissions & Platform Settings" },
            { id: "audit", label: "Security Audit Log" },
          ] as Array<{ id: TabId; label: string }>
        ).map((t) => {
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setActiveTab(t.id);
                setNotice(null);
              }}
              style={{
                background: "none",
                border: "none",
                borderBottom: active ? "2px solid #005a2b" : "2px solid transparent",
                padding: "10px 2px",
                fontSize: 13,
                fontWeight: active ? 700 : 500,
                color: active ? "#005a2b" : "#52606d",
                cursor: "pointer",
                marginBottom: -1,
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {notice && (
        <div className={`gov-alert ${notice.type === "ok" ? "gov-alert-green" : "gov-alert-red"}`}>
          {notice.text}
        </div>
      )}

      {/* TAB 1: ACCOUNT & SIGN IN */}
      {activeTab === "account" && (
        <div className="gov-grid-2">
          {!user ? (
            <>
              <section className="gov-card">
                <div className="gov-card-header">
                  <h2 className="gov-card-title">EMA Officer Sign In</h2>
                  <span className="gov-badge gov-badge-slate">HttpOnly Session</span>
                </div>
                <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <label className="gov-kv-label" style={{ display: "block", marginBottom: 4 }}>
                      Official EMA Email
                    </label>
                    <input
                      type="email"
                      className="gov-input"
                      style={{ width: "100%" }}
                      placeholder="name@ema.co.zw"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="gov-kv-label" style={{ display: "block", marginBottom: 4 }}>
                      Password
                    </label>
                    <input
                      type="password"
                      className="gov-input"
                      style={{ width: "100%" }}
                      placeholder="Enter password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <button type="submit" className="gov-btn gov-btn-primary" disabled={loginBusy}>
                      {loginBusy ? "Verifying…" : "Sign In"}
                    </button>
                  </div>
                </form>
              </section>

              <section>
                <div className="gov-card-header" style={{ borderBottom: "2px solid #1a1f24", marginBottom: 0 }}>
                  <h2 className="gov-card-title">Provisioned EMA Test Accounts</h2>
                </div>
                <table className="gov-table" style={{ border: "1px solid #dcdfe2", borderTop: "none" }}>
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TEST_ACCOUNTS.map((acc) => (
                      <tr key={acc.email}>
                        <td className="gov-mono">{acc.email}</td>
                        <td>{acc.role}</td>
                        <td>
                          <button
                            type="button"
                            className="gov-btn gov-btn-sm"
                            onClick={() => {
                              setLoginEmail(acc.email);
                              setLoginPassword(acc.pass);
                            }}
                          >
                            Fill
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ fontSize: 12, color: "#52606d", marginTop: 8 }}>
                  Passwords are hashed with <code>scrypt</code> and verified server-side. Sessions use signed <code>HttpOnly</code> cookies.
                </div>
              </section>
            </>
          ) : (
            <>
              <section className="gov-card">
                <div className="gov-card-header">
                  <h2 className="gov-card-title">Authenticated Officer Profile</h2>
                  <span className="gov-badge gov-badge-green">Active Session</span>
                </div>
                <div className="gov-kv-grid">
                  <div>
                    <div className="gov-kv-label">Full Name</div>
                    <div className="gov-kv-val">{user.full_name}</div>
                  </div>
                  <div>
                    <div className="gov-kv-label">Official Email</div>
                    <div className="gov-kv-val gov-mono">{user.email}</div>
                  </div>
                  <div>
                    <div className="gov-kv-label">Assigned Role</div>
                    <div className="gov-kv-val">{EMA_ROLE_META[user.role].label}</div>
                  </div>
                  <div>
                    <div className="gov-kv-label">Station / Province</div>
                    <div className="gov-kv-val">
                      {user.station} ({user.province})
                    </div>
                  </div>
                  <div>
                    <div className="gov-kv-label">Last Sign In</div>
                    <div className="gov-kv-val">
                      {user.last_login_at ? new Date(user.last_login_at).toLocaleString() : "Current session"}
                    </div>
                  </div>
                </div>

                {isRealAdmin && (
                  <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid #e8ecef" }}>
                    <label className="gov-kv-label" style={{ display: "block", marginBottom: 4 }}>
                      Administrator Role Preview (Test UI as another role)
                    </label>
                    <select
                      className="gov-select"
                      style={{ width: "100%" }}
                      value={role}
                      onChange={(e) => setRole(e.target.value as EmaRole)}
                    >
                      {(Object.keys(EMA_ROLE_META) as EmaRole[]).map((k) => (
                        <option key={k} value={k}>
                          {EMA_ROLE_META[k].label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </section>

              <section className="gov-card">
                <div className="gov-card-header">
                  <h2 className="gov-card-title">Change Password</h2>
                </div>
                <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <label className="gov-kv-label" style={{ display: "block", marginBottom: 4 }}>
                      Current Password
                    </label>
                    <input
                      type="password"
                      className="gov-input"
                      style={{ width: "100%" }}
                      value={curPw}
                      onChange={(e) => setCurPw(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="gov-kv-label" style={{ display: "block", marginBottom: 4 }}>
                      New Password (minimum 8 characters)
                    </label>
                    <input
                      type="password"
                      className="gov-input"
                      style={{ width: "100%" }}
                      minLength={8}
                      value={newPw}
                      onChange={(e) => setNewPw(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <button type="submit" className="gov-btn gov-btn-primary" disabled={pwBusy}>
                      {pwBusy ? "Updating…" : "Update Password"}
                    </button>
                  </div>
                </form>
              </section>
            </>
          )}
        </div>
      )}

      {/* TAB 2: USER DIRECTORY & ROLES (ADMIN) */}
      {activeTab === "users" && (
        !isRealAdmin ? (
          <div className="gov-alert gov-alert-amber">
            Sign in with an <strong>ICT / DBA</strong> administrator account (<code>admin@ema.co.zw</code>) to manage EMA officer accounts and roles.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Create Officer Form */}
            <section className="gov-card">
              <div className="gov-card-header">
                <h2 className="gov-card-title">Provision New EMA Officer Account</h2>
              </div>
              <form
                onSubmit={handleCreateUser}
                style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}
              >
                <div>
                  <label className="gov-kv-label" style={{ display: "block", marginBottom: 4 }}>Full Name *</label>
                  <input
                    type="text"
                    className="gov-input"
                    style={{ width: "100%" }}
                    placeholder="e.g. R. Ncube"
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="gov-kv-label" style={{ display: "block", marginBottom: 4 }}>EMA Email *</label>
                  <input
                    type="email"
                    className="gov-input"
                    style={{ width: "100%" }}
                    placeholder="rncube@ema.co.zw"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="gov-kv-label" style={{ display: "block", marginBottom: 4 }}>Temporary Password *</label>
                  <input
                    type="password"
                    className="gov-input"
                    style={{ width: "100%" }}
                    minLength={8}
                    placeholder="Min 8 characters"
                    value={newUserPw}
                    onChange={(e) => setNewUserPw(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="gov-kv-label" style={{ display: "block", marginBottom: 4 }}>Role</label>
                  <select
                    className="gov-select"
                    style={{ width: "100%" }}
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as EmaRole)}
                  >
                    {(Object.keys(EMA_ROLE_META) as EmaRole[]).map((k) => (
                      <option key={k} value={k}>{EMA_ROLE_META[k].label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="gov-kv-label" style={{ display: "block", marginBottom: 4 }}>Province</label>
                  <select
                    className="gov-select"
                    style={{ width: "100%" }}
                    value={newProvince}
                    onChange={(e) => setNewProvince(e.target.value)}
                  >
                    {ZIM_PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="gov-kv-label" style={{ display: "block", marginBottom: 4 }}>Office / Station</label>
                  <input
                    type="text"
                    className="gov-input"
                    style={{ width: "100%" }}
                    value={newStation}
                    onChange={(e) => setNewStation(e.target.value)}
                  />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <button type="submit" className="gov-btn gov-btn-primary" disabled={creatingUser}>
                    {creatingUser ? "Creating…" : "Create Officer Account"}
                  </button>
                </div>
              </form>
            </section>

            {/* User Directory Table */}
            <section>
              <div className="gov-card-header" style={{ borderBottom: "2px solid #1a1f24", marginBottom: 0 }}>
                <h2 className="gov-card-title">EMA User Directory ({users.length})</h2>
                <button type="button" className="gov-btn gov-btn-sm" onClick={loadUsers} disabled={usersLoading}>
                  Refresh
                </button>
              </div>
              <div className="gov-table-wrap" style={{ borderTop: "none", borderRadius: "0 0 4px 4px" }}>
                <table className="gov-table">
                  <thead>
                    <tr>
                      <th>Officer</th>
                      <th>Station / Province</th>
                      <th>Assigned Role</th>
                      <th>Status</th>
                      <th>Last Sign In</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <strong>{u.full_name}</strong>
                          <div className="gov-mono" style={{ fontSize: 11, color: "#52606d" }}>{u.email}</div>
                        </td>
                        <td>
                          {u.station}
                          <div style={{ fontSize: 11, color: "#52606d" }}>{u.province}</div>
                        </td>
                        <td>
                          <select
                            className="gov-select"
                            style={{ padding: "4px 8px", fontSize: 12 }}
                            value={u.role}
                            disabled={u.id === user?.id}
                            onChange={(e) =>
                              handleUpdateUser(u.id, { role: e.target.value }, `Updated role for ${u.email}.`)
                            }
                          >
                            {(Object.keys(EMA_ROLE_META) as EmaRole[]).map((k) => (
                              <option key={k} value={k}>{EMA_ROLE_META[k].label}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <span className={`gov-badge ${u.active ? "gov-badge-green" : "gov-badge-red"}`}>
                            {u.active ? "Active" : "Suspended"}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, color: "#52606d" }}>
                          {u.last_login_at ? new Date(u.last_login_at).toLocaleString() : "Never"}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <button
                              type="button"
                              className="gov-btn gov-btn-sm"
                              onClick={() => handleResetPasswordPrompt(u)}
                            >
                              Reset Password
                            </button>
                            {u.id !== user?.id && (
                              <>
                                <button
                                  type="button"
                                  className="gov-btn gov-btn-sm"
                                  onClick={() =>
                                    handleUpdateUser(
                                      u.id,
                                      { active: !u.active },
                                      `${u.active ? "Suspended" : "Reactivated"} ${u.email}.`
                                    )
                                  }
                                >
                                  {u.active ? "Suspend" : "Activate"}
                                </button>
                                <button
                                  type="button"
                                  className="gov-btn gov-btn-sm gov-btn-danger"
                                  onClick={() => handleDeleteUser(u)}
                                >
                                  Remove
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )
      )}

      {/* TAB 3: PERMISSIONS MATRIX & PLATFORM SETTINGS */}
      {activeTab === "permissions" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <section>
            <div className="gov-card-header" style={{ borderBottom: "2px solid #1a1f24", marginBottom: 0 }}>
              <h2 className="gov-card-title">EMA Role-Based Access Control (RBAC) Matrix</h2>
              <span className="gov-badge gov-badge-slate">
                Active Role: {EMA_ROLE_META[role].label}
              </span>
            </div>
            <div className="gov-table-wrap" style={{ borderTop: "none", borderRadius: "0 0 4px 4px" }}>
              <table className="gov-table">
                <thead>
                  <tr>
                    <th>Role</th>
                    <th>District Verify</th>
                    <th>National Lock</th>
                    <th>Restricted Mining</th>
                    <th>PRAIS 4 Desk</th>
                    <th>System Admin</th>
                  </tr>
                </thead>
                <tbody>
                  {(Object.keys(EMA_ROLE_META) as EmaRole[]).map((k) => {
                    const m = EMA_ROLE_META[k];
                    const isCurrent = k === role;
                    return (
                      <tr key={k} style={{ background: isCurrent ? "#f4f9f6" : undefined }}>
                        <td>
                          <strong>{m.label}</strong>
                          {isCurrent && (
                            <span className="gov-badge gov-badge-green" style={{ marginLeft: 8 }}>
                              Current
                            </span>
                          )}
                        </td>
                        <td>{m.canVerifyDistrict ? "Yes" : "—"}</td>
                        <td>{m.canApproveOrLock ? "Yes" : "—"}</td>
                        <td>{m.canViewRestrictedLayers ? "Yes" : "Masked"}</td>
                        <td>{m.canAccessReportingDesk ? "Yes" : "—"}</td>
                        <td>{m.canAccessAdmin ? "Yes" : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="gov-card">
            <div className="gov-card-header">
              <h2 className="gov-card-title">Reporting Cycle &amp; Mobile Integration Settings</h2>
            </div>
            <div className="gov-grid-2">
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
              <div className="gov-kv-grid">
                <div>
                  <div className="gov-kv-label">Modular Mobile Endpoint</div>
                  <div className="gov-kv-val gov-mono">POST /api/submit/modular</div>
                </div>
                <div>
                  <div className="gov-kv-label">Android App ID</div>
                  <div className="gov-kv-val gov-mono">gov.zw.ema.ldn</div>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* TAB 4: SECURITY AUDIT LOG (ADMIN) */}
      {activeTab === "audit" && (
        !isRealAdmin ? (
          <div className="gov-alert gov-alert-amber">
            Sign in with an <strong>ICT / DBA</strong> administrator account (<code>admin@ema.co.zw</code>) to inspect the security and access audit log.
          </div>
        ) : (
          <section>
            <div className="gov-card-header" style={{ borderBottom: "2px solid #1a1f24", marginBottom: 0 }}>
              <h2 className="gov-card-title">Security &amp; Access Audit Log ({auditEvents.length})</h2>
              <button type="button" className="gov-btn gov-btn-sm" onClick={loadAudit} disabled={auditLoading}>
                Refresh
              </button>
            </div>
            <div className="gov-table-wrap" style={{ borderTop: "none", borderRadius: "0 0 4px 4px" }}>
              <table className="gov-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Event</th>
                    <th>Actor</th>
                    <th>Role</th>
                    <th>Target</th>
                    <th>Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {auditEvents.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: 20, color: "#52606d" }}>
                        No security events logged yet.
                      </td>
                    </tr>
                  ) : (
                    auditEvents.map((ev) => (
                      <tr key={ev.id}>
                        <td className="gov-mono" style={{ fontSize: 11 }}>
                          {new Date(ev.timestamp).toLocaleString()}
                        </td>
                        <td>
                          <span
                            className={`gov-badge ${
                              ev.action === "login_failed" || ev.action === "user_deleted"
                                ? "gov-badge-red"
                                : ev.action === "login_success" || ev.action === "user_created"
                                  ? "gov-badge-green"
                                  : "gov-badge-slate"
                            }`}
                          >
                            {ev.action}
                          </span>
                        </td>
                        <td className="gov-mono">{ev.actor_email}</td>
                        <td>{ev.actor_role}</td>
                        <td className="gov-mono">{ev.target ?? "—"}</td>
                        <td>{ev.detail}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )
      )}
    </>
  );
}
