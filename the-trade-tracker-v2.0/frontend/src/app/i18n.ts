import {getRequestConfig} from 'next-intl/server';

export default getRequestConfig(async ({locale}) => {
  return {
    messages: (await import(`../../messages/${locale}/index.json`)).default,
    locale: locale as string
  };
});
