"use client";

import React from "react";
import { SiteHeader } from "@/components/layout/site-header";
import { FloatingDockNav } from "@/components/layout/floating-dock-nav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 pb-32">{children}</main>
      <FloatingDockNav />
    </div>
  );
}
