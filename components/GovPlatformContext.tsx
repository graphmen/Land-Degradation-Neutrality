"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export type EmaRole =
  | "national_reporting_officer"
  | "district_verifier"
  | "gis_lead"
  | "ict_dba"
  | "public_donor";

export type ReportingPeriodOption = "2020-2023" | "2000-2015" | "2022-2025";

export type SessionUser = {
  id: string;
  email: string;
  full_name: string;
  role: EmaRole;
  station: string;
  province: string;
  active: boolean;
  created_at: string;
  last_login_at: string | null;
};

export const EMA_ROLE_META: Record<
  EmaRole,
  {
    label: string;
    canVerifyDistrict: boolean;
    canApproveOrLock: boolean;
    canViewRestrictedLayers: boolean;
    canAccessReportingDesk: boolean;
    canAccessAdmin: boolean;
  }
> = {
  national_reporting_officer: {
    label: "National Reporting Officer",
    canVerifyDistrict: true,
    canApproveOrLock: true,
    canViewRestrictedLayers: true,
    canAccessReportingDesk: true,
    canAccessAdmin: false,
  },
  district_verifier: {
    label: "District Verifier",
    canVerifyDistrict: true,
    canApproveOrLock: false,
    canViewRestrictedLayers: false,
    canAccessReportingDesk: false,
    canAccessAdmin: false,
  },
  gis_lead: {
    label: "GIS Lead",
    canVerifyDistrict: false,
    canApproveOrLock: false,
    canViewRestrictedLayers: true,
    canAccessReportingDesk: true,
    canAccessAdmin: false,
  },
  ict_dba: {
    label: "ICT / DBA",
    canVerifyDistrict: true,
    canApproveOrLock: true,
    canViewRestrictedLayers: true,
    canAccessReportingDesk: true,
    canAccessAdmin: true,
  },
  public_donor: {
    label: "Public / Donor (Read-only)",
    canVerifyDistrict: false,
    canApproveOrLock: false,
    canViewRestrictedLayers: false,
    canAccessReportingDesk: false,
    canAccessAdmin: false,
  },
};

interface GovPlatformContextValue {
  period: ReportingPeriodOption;
  setPeriod: (p: ReportingPeriodOption) => void;
  user: SessionUser | null;
  authLoading: boolean;
  role: EmaRole;
  setRole: (r: EmaRole) => void;
  permissions: (typeof EMA_ROLE_META)[EmaRole];
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
}

const GovPlatformContext = createContext<GovPlatformContextValue>({
  period: "2020-2023",
  setPeriod: () => {},
  user: null,
  authLoading: true,
  role: "public_donor",
  setRole: () => {},
  permissions: EMA_ROLE_META.public_donor,
  refreshSession: async () => {},
  logout: async () => {},
});

export function GovPlatformProvider({ children }: { children: React.ReactNode }) {
  const [period, setPeriodState] = useState<ReportingPeriodOption>("2020-2023");
  const [user, setUser] = useState<SessionUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [previewRole, setPreviewRole] = useState<EmaRole | null>(null);

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session", { cache: "no-store" });
      if (res.ok) {
        const json = (await res.json()) as { authenticated?: boolean; user?: SessionUser | null };
        setUser(json.authenticated && json.user ? json.user : null);
        if (!json.authenticated) setPreviewRole(null);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    try {
      const savedPeriod = window.localStorage.getItem("ema_ldn_period") as ReportingPeriodOption | null;
      if (savedPeriod && ["2020-2023", "2000-2015", "2022-2025"].includes(savedPeriod)) {
        setPeriodState(savedPeriod);
      }
    } catch {
      // ignore storage errors
    }
    refreshSession();
  }, [refreshSession]);

  const setPeriod = (p: ReportingPeriodOption) => {
    setPeriodState(p);
    try {
      window.localStorage.setItem("ema_ldn_period", p);
    } catch {
      // ignore
    }
  };

  // Only ICT Administrators may preview another role; otherwise effective role strictly equals authenticated user's role (or public_donor).
  const setRole = (r: EmaRole) => {
    if (user?.role === "ict_dba") {
      setPreviewRole(r === user.role ? null : r);
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
      setPreviewRole(null);
    }
  };

  const effectiveRole: EmaRole =
    user?.role === "ict_dba" && previewRole
      ? previewRole
      : user?.role ?? "public_donor";

  return (
    <GovPlatformContext.Provider
      value={{
        period,
        setPeriod,
        user,
        authLoading,
        role: effectiveRole,
        setRole,
        permissions: EMA_ROLE_META[effectiveRole],
        refreshSession,
        logout,
      }}
    >
      {children}
    </GovPlatformContext.Provider>
  );
}

export function useGovPlatform() {
  return useContext(GovPlatformContext);
}
