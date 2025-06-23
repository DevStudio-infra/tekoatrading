"use client";

import { SignUp } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
 
export default function SignUpPage() {
  // Using next-intl for internationalization support
  // Note: Clerk UI itself might need separate configuration for full i18n
  const t = useTranslations('auth');
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-950 dark:to-blue-950">
      <div className="w-full max-w-md p-6">
        <SignUp />
      </div>
    </div>
  );
}
