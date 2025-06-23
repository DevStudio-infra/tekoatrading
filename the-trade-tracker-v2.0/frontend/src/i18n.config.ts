// Define types for route pathnames
type Pathnames<T extends readonly string[]> = {
  [key: string]: {
    [locale in T[number]]?: string
  } | string
};

export const locales = ['en', 'es', 'pt'] as const;
export const defaultLocale = 'en' as const;

export const pathnames = {
  '/': '/',
  '/dashboard': '/dashboard',
  '/settings': '/settings',
} satisfies Pathnames<typeof locales>;

export type AppLocale = (typeof locales)[number];
