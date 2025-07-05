"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "../../shared/components/ui/button";
import { useAuth } from "../../auth/components/auth-wrapper";

export function HomeHero() {
  const t = useTranslations("home");
  const { isSignedIn } = useAuth();
  const params = useParams();
  const locale = params.locale || "en";

  return (
    <div className="relative z-10 pt-20 pb-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">{t("title")}</h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">{t("subtitle")}</p>

          {isSignedIn ? (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg">
                <Link href={`/${locale}/dashboard`}>Dashboard</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href={`/${locale}/bots`}>Trading Bots</Link>
              </Button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg">
                <Link href={`/${locale}/sign-up` as any}>{t("getStarted")}</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href={`/${locale}/sign-in` as any}>Sign In</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
