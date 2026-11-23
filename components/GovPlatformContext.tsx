"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type EmaRole =
  | "national_reporting_officer"
  | "district_verifier"
  | "gis_lead"
  | "ict_dba"
  | "public_donor";

export type ReportingPeriodOption = "2020-2023" | "2000-2015" | "2022-2025";

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
    canVerifyDistrict: false,
    canApproveOrLock: false,
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
  role: EmaRole;
  setRole: (r: EmaRole) => void;
  permissions: (typeof EMA_ROLE_META)[EmaRole];
}

const GovPlatformContext = createContext<GovPlatformContextValue>({
  period: "2020-2023",
  setPeriod: () => {},
  role: "national_reporting_officer",
  setRole: () => {},
  permissions: EMA_ROLE_META.national_reporting_officer,
});

export function GovPlatformProvider({ children }: { children: React.ReactNode }) {
  const [period, setPeriodState] = useState<ReportingPeriodOption>("2020-2023");
  const [role, setRoleState] = useState<EmaRole>("national_reporting_officer");

  useEffect(() => {
    try {
      const savedPeriod = window.localStorage.getItem("ema_ldn_period") as ReportingPeriodOption | null;
      const savedRole = window.localStorage.getItem("ema_ldn_role") as EmaRole | null;
      if (savedPeriod && ["2020-2023", "2000-2015", "2022-2025"].includes(savedPeriod)) {
        setPeriodState(savedPeriod);
      }
      if (savedRole && savedRole in EMA_ROLE_META) {
        setRoleState(savedRole);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const setPeriod = (p: ReportingPeriodOption) => {
    setPeriodState(p);
    try {
      window.localStorage.setItem("ema_ldn_period", p);
    } catch {
      // ignore
    }
  };

  const setRole = (r: EmaRole) => {
    setRoleState(r);
    try {
      window.localStorage.setItem("ema_ldn_role", r);
    } catch {
      // ignore
    }
  };

  return (
    <GovPlatformContext.Provider
      value={{
        period,
        setPeriod,
        role,
        setRole,
        permissions: EMA_ROLE_META[role],
      }}
    >
      {children}
    </GovPlatformContext.Provider>
  );
}

export function useGovPlatform() {
  return useContext(GovPlatformContext);
}
