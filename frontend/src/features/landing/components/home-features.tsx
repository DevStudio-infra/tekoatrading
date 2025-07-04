"use client";

import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../shared/components/ui/card";
import { Button } from "../../shared/components/ui/button";
import { Bot, TrendingUp, Shield, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export function HomeFeatures() {
  const t = useTranslations("home");
  const commonT = useTranslations("common");
  const params = useParams();
  const locale = params.locale || "en";

  const features = [
    {
      icon: Bot,
      title: t("features.aiPowered.title"),
      description: t("features.aiPowered.description"),
    },
    {
      icon: TrendingUp,
      title: t("features.realTimeAnalytics.title"),
      description: t("features.realTimeAnalytics.description"),
    },
    {
      icon: Shield,
      title: t("features.secureReliable.title"),
      description: t("features.secureReliable.description"),
    },
  ];

  return (
    <div className="relative z-10 py-20 bg-secondary/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center text-foreground mb-12">{t("whyChoose")}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <Card key={index} className="text-center">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 bg-primary rounded-full flex items-center justify-center mb-4">
                    <IconComponent className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* View All Features Button - Will be added later */}
      </div>
    </div>
  );
}
