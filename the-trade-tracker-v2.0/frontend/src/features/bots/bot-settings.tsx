"use client";

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

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

interface BotSettingsProps {
  bot: Bot;
}

const BotSettings = ({ bot }: BotSettingsProps) => {
  const t = useTranslations('Bots');
  // Using Sonner toast directly
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [botData, setBotData] = useState({
    name: bot.name,
    symbol: bot.symbol,
    timeframe: bot.timeframe,
    isActive: bot.isActive,
    isAiTradingActive: bot.isAiTradingActive
  });

  const handleToggleActive = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/bots/${bot.id}/toggle-active`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to toggle bot active state');
      }
      
      setBotData(prev => ({ ...prev, isActive: !prev.isActive }));
      toast.success(
        botData.isActive ? t('botDeactivated') : t('botActivated'),
        { description: t('success') }
      );
    } catch (error) {
      toast.error(t('failedToToggleBotState'));
    } finally {
      setIsLoading(false);
      router.refresh();
    }
  };

  const handleToggleAiTrading = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/bots/${bot.id}/toggle-ai-trading`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to toggle AI trading state');
      }
      
      setBotData(prev => ({ ...prev, isAiTradingActive: !prev.isAiTradingActive }));
      toast.success(
        botData.isAiTradingActive ? t('aiTradingDeactivated') : t('aiTradingActivated')
      );
    } catch (error) {
      toast.error(t('failedToToggleAiTradingState'));
    } finally {
      setIsLoading(false);
      router.refresh();
    }
  };

  const handleUpdateBot = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/bots/${bot.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: botData.name,
          symbol: botData.symbol,
          timeframe: botData.timeframe,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update bot');
      }
      
      toast.success(t('botUpdated'));
    } catch (error) {
      toast.error(t('failedToUpdateBot'));
    } finally {
      setIsLoading(false);
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('botConfiguration')}</CardTitle>
          <CardDescription>{t('configureYourTradingBot')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t('botName')}</Label>
            <Input
              id="name"
              value={botData.name}
              onChange={(e) => setBotData({ ...botData, name: e.target.value })}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="symbol">{t('tradingSymbol')}</Label>
            <Input
              id="symbol"
              value={botData.symbol}
              onChange={(e) => setBotData({ ...botData, symbol: e.target.value })}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="timeframe">{t('timeframe')}</Label>
            <Select
              value={botData.timeframe}
              onValueChange={(value) => setBotData({ ...botData, timeframe: value })}
            >
              <SelectTrigger id="timeframe">
                <SelectValue placeholder={t('selectTimeframe')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1m">1 {t('minute')}</SelectItem>
                <SelectItem value="5m">5 {t('minutes')}</SelectItem>
                <SelectItem value="15m">15 {t('minutes')}</SelectItem>
                <SelectItem value="30m">30 {t('minutes')}</SelectItem>
                <SelectItem value="1h">1 {t('hour')}</SelectItem>
                <SelectItem value="4h">4 {t('hours')}</SelectItem>
                <SelectItem value="1d">1 {t('day')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button 
            onClick={handleUpdateBot} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? t('updating') : t('updateBot')}
          </Button>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>{t('botStatus')}</CardTitle>
          <CardDescription>{t('manageYourBotStatus')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="bot-active">{t('botActive')}</Label>
              <p className="text-sm text-muted-foreground">
                {botData.isActive ? t('botIsCurrentlyActive') : t('botIsCurrentlyInactive')}
              </p>
            </div>
            <Switch
              id="bot-active"
              checked={botData.isActive}
              onCheckedChange={handleToggleActive}
              disabled={isLoading}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="ai-trading">{t('aiTrading')}</Label>
              <p className="text-sm text-muted-foreground">
                {botData.isAiTradingActive ? t('aiTradingIsEnabled') : t('aiTradingIsDisabled')}
              </p>
            </div>
            <Switch
              id="ai-trading"
              checked={botData.isAiTradingActive}
              onCheckedChange={handleToggleAiTrading}
              disabled={isLoading}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default BotSettings;
