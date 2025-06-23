'use client';

import { useTranslations } from 'next-intl';
import { UserProfile } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { dark } from "@clerk/themes";
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function ProfilePage() {
  const t = useTranslations('profile');
  const { resolvedTheme } = useTheme();
  const pathname = usePathname();
  const locale = pathname.split('/')[1]; // Extract locale from path
  
  return (
    <div className="container mx-auto py-8 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="icon" asChild className="mr-2">
            <Link href={`/${locale}/dashboard`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
        </div>
        
        <div className="max-w-4xl mx-auto bg-card border rounded-xl p-6 shadow-sm">
          <UserProfile 
            appearance={{
              baseTheme: resolvedTheme === "dark" ? dark : undefined,
              elements: {
                card: "shadow-none bg-transparent",
                navbar: "hidden",
                pageScrollBox: "p-0",
              }
            }}
          />
        </div>
      </motion.div>
    </div>
  );
}
