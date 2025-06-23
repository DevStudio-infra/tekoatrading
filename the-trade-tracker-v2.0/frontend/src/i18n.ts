import { getRequestConfig } from 'next-intl/server';

export const locales = ['en', 'es', 'pt'];
export const defaultLocale = 'en';

export default getRequestConfig(async ({locale}) => {
  // Ensure locale is defined and valid, fallback to defaultLocale if not
  const validLocale = locale && locales.includes(locale as string) ? locale : defaultLocale;
  
  try {
    return {
      messages: (await import(`../messages/${validLocale}/index.json`)).default,
      locale: validLocale as string,
      timeZone: 'UTC'
    };
  } catch (error) {
    console.error(`Error loading messages for locale ${validLocale}:`, error);
    
    // If we can't load the requested locale, try to load the default locale as fallback
    if (validLocale !== defaultLocale) {
      try {
        return {
          messages: (await import(`../messages/${defaultLocale}/index.json`)).default,
          locale: defaultLocale,
          timeZone: 'UTC'
        };
      } catch (fallbackError) {
        console.error(`Error loading fallback messages for locale ${defaultLocale}:`, fallbackError);
      }
    }
    
    // Last resort fallback
    return {
      messages: {},
      locale: validLocale as string,
      timeZone: 'UTC'
    };
  }
});
