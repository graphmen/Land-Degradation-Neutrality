"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
  isCollapsed: boolean;
}

export default function Sidebar({ isCollapsed }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === "/") {
      return pathname === "/";
    }
    return pathname?.startsWith(path);
  };

  return (
    <nav className={`global-sidebar ${isCollapsed ? "collapsed" : ""}`}>
      <div className="sidebar-menu">
        {/* Operations Section */}
        <div className="sidebar-section">
          {!isCollapsed && <div className="sidebar-section-title">Operations</div>}
          <Link href="/" className={`nav-item ${isActive("/") && pathname === "/" ? "active" : ""}`} title="Dashboard">
            <span className="nav-icon">📊</span>
            {!isCollapsed && <span className="nav-label">Dashboard</span>}
          </Link>

          <Link href="/ldn" className={`nav-item ${isActive("/ldn") ? "active" : ""}`} title="LDN Monitoring">
            <span className="nav-icon">🌳</span>
            {!isCollapsed && <span className="nav-label">LDN Monitoring</span>}
          </Link>
          <Link href="/soil" className={`nav-item ${isActive("/soil") ? "active" : ""}`} title="Soil Samples">
            <span className="nav-icon">🧪</span>
            {!isCollapsed && <span className="nav-label">Soil Samples</span>}
          </Link>
          <Link href="/interventions" className={`nav-item ${isActive("/interventions") ? "active" : ""}`} title="Interventions Hub">
            <span className="nav-icon">🛠️</span>
            {!isCollapsed && <span className="nav-label">Interventions Hub</span>}
          </Link>
          <Link href="/drylands" className={`nav-item ${isActive("/drylands") ? "active" : ""}`} title="Drylands Hub">
            <span className="nav-icon">🏜️</span>
            {!isCollapsed && <span className="nav-label">Drylands Hub</span>}
          </Link>
          <Link href="/database" className={`nav-item ${isActive("/database") ? "active" : ""}`} title="Database Explorer">
            <span className="nav-icon">🗄️</span>
            {!isCollapsed && <span className="nav-label">Database Explorer</span>}
          </Link>

          <Link href="/download" className={`nav-item ${isActive("/download") ? "active" : ""}`} title="Downloads & Info">
            <span className="nav-icon">📲</span>
            {!isCollapsed && <span className="nav-label">Downloads & Info</span>}
          </Link>
        </div>
      </div>
      <div id="sidebar-export-container" className="sidebar-export-container" />
    </nav>
  );
}
