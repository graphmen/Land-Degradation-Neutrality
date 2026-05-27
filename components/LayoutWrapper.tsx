"use client";

import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="app-layout">
      {/* Top Header Row */}
      <Header isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      
      {/* Body Area */}
      <div className="app-body">
        <Sidebar isCollapsed={isCollapsed} />
        <main className="app-content">
          {children}
        </main>
      </div>
    </div>
  );
}
