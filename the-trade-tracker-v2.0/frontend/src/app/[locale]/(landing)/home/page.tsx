"use client";

import React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { AnimatedGradientBackground } from "@/components/ui/animated-gradient-background";
import { IconArrowRight, IconChevronRight, IconCheck } from "@tabler/icons-react";

export default function HomePage() {
  const t = useTranslations("HomePage");

  const pricingTiers = [
    {
      name: t("pricing.starter.name"),
      price: 29,
      description: t("pricing.starter.description"),
      features: [
        t("pricing.starter.features.credits"),
        t("pricing.starter.features.basicAnalysis"),
        t("pricing.starter.features.oneBot"),
        t("pricing.starter.features.capitalIntegration"),
        t("pricing.starter.features.emailSupport"),
      ],
      highlighted: false,
      delay: 0.1,
    },
    {
      name: t("pricing.pro.name"),
      price: 79,
      description: t("pricing.pro.description"),
      features: [
        t("pricing.pro.features.credits"),
        t("pricing.pro.features.advancedAnalysis"),
        t("pricing.pro.features.fiveBots"),
        t("pricing.pro.features.capitalIntegration"),
        t("pricing.pro.features.aiRecommendations"),
        t("pricing.pro.features.prioritySupport"),
        t("pricing.pro.features.analytics"),
      ],
      highlighted: true,
      delay: 0.2,
    },
  ];

  return (
    <AnimatedGradientBackground>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }} className="min-h-screen flex flex-col items-center justify-center py-24 px-4">
        <h1 className="text-5xl md:text-7xl font-extrabold text-center text-gray-900 dark:text-white mb-6 tracking-tight" style={{ letterSpacing: "-0.03em" }}>
          {t("hero.title")}
        </h1>
        <p className="mt-2 text-lg md:text-2xl text-center text-gray-600 dark:text-gray-300 mb-10 font-light">{t("hero.subtitle")}</p>
        <div className="flex justify-center gap-4 mb-16">
          <Link href="/sign-up" className="inline-flex items-center px-6 py-3 bg-blue-600 text-white text-lg font-semibold rounded-md hover:bg-blue-700 transition">
            {t("hero.cta")}
            <IconArrowRight className="ml-2 h-5 w-5" />
          </Link>
          <Link
            href="/features"
            className="inline-flex items-center px-6 py-3 border border-blue-600 text-blue-600 dark:text-blue-400 text-lg font-semibold rounded-md hover:bg-blue-50 dark:hover:bg-gray-800 transition">
            {t("hero.secondaryCta")}
            <IconChevronRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
        {/* Minimalist Pricing Section */}
        <div className="w-full max-w-2xl space-y-10">
          {pricingTiers.map((tier, idx) => (
            <div
              key={idx}
              className={`p-8 flex flex-col items-center text-center border rounded-xl bg-white/80 dark:bg-gray-900/80 ${
                tier.highlighted ? "border-blue-600" : "border-gray-200 dark:border-gray-800"
              }`}>
              <h2 className="text-xl font-bold mb-1">{tier.name}</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-3 text-base">{tier.description}</p>
              <div className="text-3xl font-extrabold text-blue-600 mb-2">
                ${tier.price}
                <span className="text-base font-normal">/mo</span>
              </div>
              <ul className="space-y-2 w-full mb-4 text-sm text-gray-700 dark:text-gray-300">
                {tier.features.map((feature, fidx) => (
                  <li key={fidx} className="flex items-center gap-2 justify-center">
                    <IconCheck className="h-4 w-4 text-green-500" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link href="/sign-up" className="mt-2 inline-flex justify-center items-center px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition">
                {t("pricing.cta")}
                <IconArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>
      </motion.div>
    </AnimatedGradientBackground>
  );
}
