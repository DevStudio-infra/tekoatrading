import "../globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Tekoa Trading",
  description: "Next-generation AI trading platform",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">{children}</body>
    </html>
  );
}
