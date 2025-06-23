// Import from the parent directory
import { locales, defaultLocale } from '../i18n';

// Export for client-side usage
export { locales, defaultLocale };
export type Locale = typeof locales[number];

// Note: In next-intl 4.1.0, these utilities are imported from next-intl
export { useTranslations, useLocale } from 'next-intl';

// For navigation, we use the standard Next.js navigation
export { useRouter, usePathname } from 'next/navigation';
