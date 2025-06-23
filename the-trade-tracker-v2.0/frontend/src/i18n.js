import { createSharedPathnamesNavigation } from 'next-intl/navigation';
import { locales } from './config';

export const { Link, redirect, usePathname, useRouter } = createSharedPathnamesNavigation({ locales });

export const getTranslations = async (locale) => {
  try {
    return (await import(`../messages/${locale}/index.json`)).default;
  } catch (error) {
    console.error(`Error loading translations for locale ${locale}:`, error);
    return {};
  }
};
