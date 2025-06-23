import { useTranslations } from 'next-intl';
import { setRequestLocale, getMessages } from 'next-intl/server';
import { locales } from '@/config';
import { notFound } from 'next/navigation';
import HomeContent from './home-content';

export default async function HomePage({ params }: { params: { locale: string } }) {
  // Use Promise.resolve to properly await params
  const { locale } = await Promise.resolve(params);
  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as any)) {
    console.error(`[HomePage] Locale '${locale}' not found in supported locales: ${locales.join(', ')}`);
    notFound();
  }

  // Enable static rendering
  setRequestLocale(locale);
  
  // Get translations for the HomePage (assuming a 'HomePage' namespace in your message files)
  try {
    // Load messages for the current locale
    await getMessages();
    console.log(`[HomePage] Successfully loaded messages for /${locale}.`);
  } catch (error) {
    console.error(`[HomePage] Failed to load messages for /${locale}:`, error);
    // If messages fail to load, treat as not found
    notFound();
  }
  
  // Use the useTranslations hook on the client side
  const t = (key: string, params?: any) => key; // Server-side placeholder

  console.log(`[HomePage] Rendering content for /${locale} (setRequestLocale in page is ACTIVE)`);

  // Use the client component for rendering with translations
  return <HomeContent />;
}
