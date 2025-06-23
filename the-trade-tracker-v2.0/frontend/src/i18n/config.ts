export const locales = ['en', 'es', 'pt'] as const;
export const defaultLocale = 'en' as const;

export type Locale = (typeof locales)[number];

export const pathnames = {
  '/': '/',
  '/dashboard': '/dashboard',
  '/settings': '/settings',
} as const;
