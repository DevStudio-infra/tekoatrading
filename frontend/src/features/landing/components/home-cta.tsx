"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { Button } from "../../shared/components/ui/button";
import { useAuth } from "../../auth/components/auth-wrapper";

export function HomeCTA() {
  const t = useTranslations("home");
  const { isSignedIn } = useAuth();

  if (isSignedIn) {
    return null; // Don't show CTA if user is already signed in
  }

  return (
    <div className="relative z-10 py-20">
      <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-foreground mb-4">{t("cta.title")}</h2>
        <p className="text-xl text-muted-foreground mb-8">{t("cta.subtitle")}</p>
        <Button asChild size="lg">
          <Link href="/sign-up">{t("cta.createAccount")}</Link>
        </Button>
      </div>
    </div>
  );
}
