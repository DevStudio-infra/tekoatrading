"use client";

import React from "react";
import { LandingNav } from "@/components/layout/landing-nav";

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <LandingNav />
      <main className="flex-1">{children}</main>
    </div>
  );
}
