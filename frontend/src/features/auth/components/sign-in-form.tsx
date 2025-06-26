"use client";

import { SignIn } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Navigation } from "../../shared/components/navigation";
import { Button } from "../../shared/components/ui/button";

export function SignInForm() {
  const t = useTranslations("auth.signIn");

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <Navigation />

      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">{t("title")}</h1>
            <p className="text-muted-foreground">{t("subtitle")}</p>
          </div>

          <div className="flex justify-center">
            <SignIn />
          </div>

          <div className="text-center">
            <Button asChild variant="ghost" size="sm">
              <Link href="/">← Back to Home</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
