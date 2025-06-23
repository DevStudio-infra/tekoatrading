'use client';

import { useTranslations } from 'next-intl';

export default function HomeContent() {
  // Use the useTranslations hook on the client side
  const t = useTranslations('HomePage');

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">{t('title')}</h1>
      <p className="mb-4">{t('greeting')}</p>
      <p className="mb-6">{t('description')}</p>
      <a 
        href="/dashboard" 
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
      >
        {t('dashboardLinkText')}
      </a>
    </div>
  );
}
