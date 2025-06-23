"use client";

import React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { LandingNav } from "@/components/layout/landing-nav";
import {
  IconChartLine,
  IconBrandOpenai,
  IconChartBar,
  IconSettings,
  IconArrowRight,
  IconRobot,
  IconChevronRight,
  IconShield,
  IconDeviceAnalytics,
  IconBuildingBank,
  IconCoin,
  IconBolt,
  IconZoomCode
} from "@tabler/icons-react";
import { AnimatedGradientBackground } from "@/components/ui/animated-gradient-background";
import { GlassCard } from "@/components/ui/glass-card";
import { FloatingElement } from "@/components/ui/floating-element";
import { Sparkles } from "@/components/ui/sparkles";

export default function FeaturesPage() {
  const t = useTranslations('features');

  const featureCategories = [
    {
      title: t('intelligentTrading.title'),
      description: t('intelligentTrading.description'),
      icon: <IconBrandOpenai className="h-8 w-8" />,
      features: [
        {
          title: t('intelligentTrading.aiMarketAnalysis.title'),
          description: t('intelligentTrading.aiMarketAnalysis.description'),
          icon: <IconZoomCode className="h-6 w-6" />,
        },
        {
          title: t('intelligentTrading.predictiveIndicators.title'),
          description: t('intelligentTrading.predictiveIndicators.description'),
          icon: <IconDeviceAnalytics className="h-6 w-6" />,
        },
        {
          title: t('intelligentTrading.automatedPatternRecognition.title'),
          description: t('intelligentTrading.automatedPatternRecognition.description'),
          icon: <IconChartLine className="h-6 w-6" />,
        }
      ]
    },
    {
      title: t('automation.title'),
      description: t('automation.description'),
      icon: <IconRobot className="h-8 w-8" />,
      features: [
        {
          title: t('automation.botTrading.title'),
          description: t('automation.botTrading.description'),
          icon: <IconSettings className="h-6 w-6" />,
        },
        {
          title: t('automation.strategyBacktesting.title'),
          description: t('automation.strategyBacktesting.description'),
          icon: <IconChartBar className="h-6 w-6" />,
        },
        {
          title: t('automation.performanceAnalytics.title'),
          description: t('automation.performanceAnalytics.description'),
          icon: <IconDeviceAnalytics className="h-6 w-6" />,
        }
      ]
    },
    {
      title: t('security.title'),
      description: t('security.description'),
      icon: <IconShield className="h-8 w-8" />,
      features: [
        {
          title: t('security.secureAPIs.title'),
          description: t('security.secureAPIs.description'),
          icon: <IconBolt className="h-6 w-6" />,
        },
        {
          title: t('security.encryptedStorage.title'),
          description: t('security.encryptedStorage.description'),
          icon: <IconBuildingBank className="h-6 w-6" />,
        },
        {
          title: t('security.privacyFirst.title'),
          description: t('security.privacyFirst.description'),
          icon: <IconCoin className="h-6 w-6" />,
        }
      ]
    }
  ];

  return (
    <AnimatedGradientBackground>
      <LandingNav />
      <div className="relative min-h-screen flex flex-col items-center justify-center py-16 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-5xl w-full space-y-10"
        >
          <h1 className="text-4xl font-extrabold text-center text-gray-900 dark:text-white">
            {t('title')}
          </h1>
          <p className="mt-2 text-lg text-center text-gray-600 dark:text-gray-300">
            {t('subtitle')}
          </p>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {featureCategories.map((category, idx) => (
              <GlassCard key={idx} className="p-6 flex flex-col items-center text-center">
                <div className="mb-4">{category.icon}</div>
                <h2 className="text-xl font-bold mb-2">{category.title}</h2>
                <p className="text-gray-600 dark:text-gray-300 mb-4">{category.description}</p>
                <ul className="space-y-3 w-full">
                  {category.features.map((feature, fidx) => (
                    <li key={fidx} className="flex items-start gap-3">
                      <span>{feature.icon}</span>
                      <div className="flex flex-col items-start">
                        <span className="font-medium text-base">{feature.title}</span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">{feature.description}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </GlassCard>
            ))}
          </div>
        </motion.div>
        <FloatingElement className="absolute bottom-8 right-8">
          <Sparkles />
        </FloatingElement>
      </div>
    </AnimatedGradientBackground>
  );
}
