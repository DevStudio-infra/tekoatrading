"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BarChart2, Settings, Activity } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';

// Import components from the index file
import { BotSettings, BotEvaluations } from '.';

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

interface BotDetailProps {
  bot: Bot;
}

export function BotDetail({ bot }: BotDetailProps) {
  const t = useTranslations('Bots');
  const router = useRouter();
  const pathname = usePathname();
  
  // Extract locale from the pathname
  const locale = pathname.split('/')[1];
  
  console.log('[BotDetail] Current locale:', locale);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">{bot.name}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('botDetails')}</CardTitle>
          <CardDescription>{t('viewAndManageYourBot')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="settings">
            <TabsList className="mb-4">
              <TabsTrigger value="settings">
                <Settings className="mr-2 h-4 w-4" />
                {t('settings')}
              </TabsTrigger>
              <TabsTrigger value="evaluations" onClick={() => router.push(`/${locale}/bots/${bot.id}/evaluations`)}>
                <Activity className="mr-2 h-4 w-4" />
                {t('evaluations')}
              </TabsTrigger>
              <TabsTrigger value="statistics">
                <BarChart2 className="mr-2 h-4 w-4" />
                {t('statistics')}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="settings">
              <BotSettings bot={bot} />
            </TabsContent>
            <TabsContent value="evaluations">
              {/* We'll redirect to the dedicated page instead of showing evaluations inline */}
              <div className="p-4 text-center">
                <p>Redirecting to evaluations page...</p>
              </div>
            </TabsContent>
            <TabsContent value="statistics">
              <div className="p-4 text-center">
                <p>{t('statisticsComingSoon')}</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default BotDetail;
