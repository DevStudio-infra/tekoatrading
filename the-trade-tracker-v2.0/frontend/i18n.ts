import {getRequestConfig} from 'next-intl/server';

export default getRequestConfig(async ({locale}) => {
  // Validate that the incoming `locale` parameter is valid
  if (!['en', 'es', 'pt'].includes(locale as string)) {
    // Optionally, you can throw an error or default to a specific locale
    console.warn(`Unsupported locale: ${locale}. Supported locales are: en, es, pt.`);
  }

  return {
    messages: (await import(`./messages/${locale}/index.json`)).default,
    // This is required by next-intl
    locale: locale as string,
    timeZone: 'UTC'
  };
});
