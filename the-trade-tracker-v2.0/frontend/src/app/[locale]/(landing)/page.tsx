"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { IconArrowRight, IconChevronRight } from "@tabler/icons-react";
import { AnimatedGradientBackground } from "@/components/ui/animated-gradient-background";
import { GlassCard } from "@/components/ui/glass-card";
import { FloatingElement } from "@/components/ui/floating-element";
import { Sparkles } from "@/components/ui/sparkles";

export default function LandingPage() {
  const t = useTranslations('landing');

  return (
    <AnimatedGradientBackground className="min-h-screen">
      {/* Hero Section */}
      <section className="pt-20 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="container mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 dark:text-white leading-tight">
                <Sparkles color="#3B82F6">
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
                    {t('hero.highlight')}
                  </span>
                </Sparkles> <br />
                {t('hero.title')}
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 max-w-xl">
                {t('hero.subtitle')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link 
                  href="/dashboard" 
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-base font-medium transition-colors flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-blue-500/20"
                >
                  {t('hero.cta')}
                  <IconArrowRight className="h-5 w-5" />
                </Link>
                <Link 
                  href="#features" 
                  className="px-6 py-3 bg-white/20 dark:bg-gray-800/20 hover:bg-white/30 dark:hover:bg-gray-800/30 text-gray-900 dark:text-gray-100 backdrop-blur-sm border border-white/20 dark:border-gray-700/30 rounded-md text-base font-medium transition-colors flex items-center justify-center"
                >
                  {t('hero.secondaryCta')}
                </Link>
              </div>
            </div>
            <div className="relative">
              <FloatingElement amplitude={15} duration={5}>
                <GlassCard className="w-full h-[450px] p-4 overflow-hidden">
                  {/* You can add an image or illustration here if needed */}
                  <div className="absolute -top-12 -left-12 w-24 h-24 bg-blue-500/20 rounded-full blur-xl"></div>
                </GlassCard>
              </FloatingElement>
            </div>
          </div>
        </div>
      </section>
      {/* Additional sections (features, testimonials, etc.) can be added here and internationalized as needed */}
    </AnimatedGradientBackground>
  );
}
