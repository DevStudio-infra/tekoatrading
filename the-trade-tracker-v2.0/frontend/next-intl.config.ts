import { getRequestConfig } from 'next-intl/server';

// Define the supported locales
const locales = ['en', 'es', 'pt'];

export default getRequestConfig(async ({ locale }) => {
  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as string)) {
    console.warn(`Unsupported locale: ${locale}. Supported locales are: ${locales.join(', ')}`);
  }

  return {
    locale: locale as string,
    messages: (await import(`./messages/${locale}/index.json`)).default
  };
});
