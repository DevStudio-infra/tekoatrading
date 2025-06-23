import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";
import { Providers } from "./providers";
import Navigation from "../components/ui/navigation";
import { FloatingDockNav } from "../components/ui/floating-dock-nav";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Tekoa Trading",
  description: "Next-Generation AI Trading Platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <Navigation />
          <main className="min-h-screen">{children}</main>
          <FloatingDockNav />
        </Providers>
      </body>
    </html>
  );
}
