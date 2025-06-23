import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TrpcProvider } from "./providers";
import Navigation from "../components/ui/navigation";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Tekoa Trading",
  description: "Next-Generation AI Trading Platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <TrpcProvider>
          <Navigation />
          <main>{children}</main>
        </TrpcProvider>
      </body>
    </html>
  );
}
