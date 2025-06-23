"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import BotEvaluations from './bot-evaluations';

// Define Bot type locally until Prisma client is properly set up
interface Bot {
  id: string;
  name: string;
  symbol: string;
  timeframe: string;
  isActive: boolean;
  isAiTradingActive: boolean;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface BotEvaluationsPageProps {
  bot: Bot;
}

export function BotEvaluationsPage({ bot }: BotEvaluationsPageProps) {
  const t = useTranslations('Bots');
  const router = useRouter();
  const pathname = usePathname();
  
  // Extract locale from the pathname
  const locale = pathname.split('/')[1];
  
  // Log the bot information to help with debugging
  console.log('[BotEvaluationsPage] Rendering with bot:', bot);
  console.log('[BotEvaluationsPage] Current locale:', locale);

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">{bot.name} - {t('evaluations')}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('botEvaluations')}</CardTitle>
          <CardDescription>{t('viewBotEvaluationHistory')}</CardDescription>
        </CardHeader>
        <CardContent>
          <BotEvaluations 
            botId={bot.id} 
            botName={bot.name} 
            onBack={() => router.push(`/${locale}/bots/${bot.id}`)} 
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default BotEvaluationsPage;
