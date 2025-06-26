import React from "react";
import FloatingDockDemo from "@/features/shared/components/floating-dock-demo";
import { Navigation } from "@/features/shared/components/navigation";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="pb-24">{children}</main>
      <FloatingDockDemo />
    </div>
  );
}
