import { Navigation } from "../../../features/shared/components/navigation";

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="flex-1">{children}</main>
    </div>
  );
}
