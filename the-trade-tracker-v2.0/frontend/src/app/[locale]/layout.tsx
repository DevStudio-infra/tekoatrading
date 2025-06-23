import { NextIntlClientProvider } from 'next-intl';
import { setRequestLocale, getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import Providers from "../providers";
import { locales } from '@/i18n';

export async function generateStaticParams() {
  return locales.map((locale: string) => ({ locale }));
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  // Use Promise.resolve to properly await params
  const { locale } = await Promise.resolve(params);

  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as any)) {
    console.error(`[LocaleLayout] Locale '${locale}' not found in supported locales: ${locales.join(', ')}`);
    notFound();
  }

  // Enable static rendering
  setRequestLocale(locale);

  // Receive messages provided in `i18n.ts`
  let messages;
  try {
    messages = await getMessages();
    console.log(`[LocaleLayout] Successfully loaded messages for /${locale}.`);
  } catch (error) {
    console.error(`[LocaleLayout] Failed to load messages for /${locale}:`, error);
    // If messages fail to load, treat as not found. This could happen if i18n.ts has an issue
    // or if the message file itself is missing/corrupt, though i18n.ts should catch that first.
    notFound();
  }

  console.log(`[LocaleLayout] Rendering for /${locale}. setRequestLocale in layout is ACTIVE.`);

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>
            {children}
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
