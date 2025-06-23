"use client";

import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { locales } from '@/i18n';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { motion } from 'framer-motion';

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  // Ensure component only renders on client
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Remove the locale prefix from pathname
  const pathnameWithoutLocale = pathname.replace(/^\/[^\/]+/, '');
  
  const handleLocaleChange = (newLocale: string) => {
    // Navigate to the same page but with new locale
    router.push(`/${newLocale}${pathnameWithoutLocale || ''}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative z-10"
    >
      <Select
        value={locale}
        onValueChange={handleLocaleChange}
      >
        <SelectTrigger className="w-[120px] bg-background/50 backdrop-blur-sm border-primary/20">
          <SelectValue placeholder="Language" />
        </SelectTrigger>
        <SelectContent>
          {locales.map((loc: string) => (
            <SelectItem key={loc} value={loc}>
              {loc === 'en' ? '🇺🇸 English' : 
               loc === 'es' ? '🇪🇸 Español' : 
               loc === 'pt' ? '🇧🇷 Português' : loc}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </motion.div>
  );
}
