import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ locale }) => {
  // Validate that the incoming `locale` parameter is valid
  if (!['en', 'es', 'pt'].includes(locale as string)) {
    console.warn(`Unsupported locale: ${locale}. Supported locales are: en, es, pt.`);
  }

  return {
    messages: (await import(`../../messages/${locale}/index.json`)).default,
    locale: locale as string,
    timeZone: 'UTC'
  };
});
