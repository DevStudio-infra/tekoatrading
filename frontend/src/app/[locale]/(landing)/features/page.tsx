"use client";

import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/features/shared/components/ui/card";
import { Badge } from "@/features/shared/components/ui/badge";
import { Button } from "@/features/shared/components/ui/button";
import {
  Brain,
  Shield,
  Clock,
  TrendingUp,
  BarChart3,
  Zap,
  Target,
  Users,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Bot,
  Eye,
  Calculator,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function FeaturesPage() {
  const t = useTranslations("features");
  const commonT = useTranslations("common");
  const params = useParams();
  const locale = params.locale || "en";

  // Define href values as variables to avoid TypeScript template literal issues
  const signUpHref = `/${locale}/sign-up`;
  const dashboardHref = `/${locale}/dashboard`;

  const professionalFeatures = [
    {
      icon: Users,
      title: t("committee.title"),
      description: t("committee.description"),
      badge: t("committee.badge"),
      benefits: [
        t("committee.benefits.technical"),
        t("committee.benefits.risk"),
        t("committee.benefits.timing"),
        t("committee.benefits.consensus"),
      ],
    },
    {
      icon: Brain,
      title: t("aiDecisions.title"),
      description: t("aiDecisions.description"),
      badge: t("aiDecisions.badge"),
      benefits: [
        t("aiDecisions.benefits.contextAware"),
        t("aiDecisions.benefits.adaptable"),
        t("aiDecisions.benefits.learning"),
        t("aiDecisions.benefits.professional"),
      ],
    },
    {
      icon: Shield,
      title: t("riskManagement.title"),
      description: t("riskManagement.description"),
      badge: t("riskManagement.badge"),
      benefits: [
        t("riskManagement.benefits.institutional"),
        t("riskManagement.benefits.realTime"),
        t("riskManagement.benefits.drawdown"),
        t("riskManagement.benefits.sizing"),
      ],
    },
  ];

  const advancedFeatures = [
    {
      icon: Eye,
      title: t("positionAwareness.title"),
      description: t("positionAwareness.description"),
      color: "bg-blue-500",
    },
    {
      icon: Clock,
      title: t("temporalReasoning.title"),
      description: t("temporalReasoning.description"),
      color: "bg-purple-500",
    },
    {
      icon: BarChart3,
      title: t("marketIntelligence.title"),
      description: t("marketIntelligence.description"),
      color: "bg-green-500",
    },
    {
      icon: Calculator,
      title: t("professionalSizing.title"),
      description: t("professionalSizing.description"),
      color: "bg-orange-500",
    },
    {
      icon: TrendingUp,
      title: t("realTimeSync.title"),
      description: t("realTimeSync.description"),
      color: "bg-red-500",
    },
    {
      icon: Zap,
      title: t("instantExecution.title"),
      description: t("instantExecution.description"),
      color: "bg-yellow-500",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Hero Section */}
      <section className="relative py-20 px-4 text-center">
        <div className="max-w-6xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            {t("hero.badge")}
          </div>

          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            {t("hero.title")}
          </h1>

          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
            {t("hero.subtitle")}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={signUpHref as any}>
              <Button size="lg" className="gap-2">
                {t("hero.getStarted")}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href={dashboardHref as any}>
              <Button variant="outline" size="lg" className="gap-2">
                <Bot className="w-4 h-4" />
                {t("hero.viewDemo")}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Professional Committee Section */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">{t("professionalSection.title")}</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              {t("professionalSection.subtitle")}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {professionalFeatures.map((feature, index) => (
              <Card
                key={index}
                className="relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:scale-105"
              >
                <CardHeader>
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-full bg-primary/10">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {feature.badge}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                  <CardDescription className="text-base">{feature.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {feature.benefits.map((benefit, benefitIndex) => (
                      <li key={benefitIndex} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Advanced Features Grid */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">{t("advancedSection.title")}</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              {t("advancedSection.subtitle")}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {advancedFeatures.map((feature, index) => (
              <Card
                key={index}
                className="relative group hover:shadow-lg transition-all duration-300"
              >
                <CardHeader className="pb-4">
                  <div className={`inline-flex p-3 rounded-lg ${feature.color} w-fit mb-3`}>
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-lg group-hover:text-primary transition-colors">
                    {feature.title}
                  </CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">{t("benefits.title")}</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              {t("benefits.subtitle")}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/20">
                  <Target className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">{t("benefits.precision.title")}</h3>
                  <p className="text-muted-foreground">{t("benefits.precision.description")}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                  <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">{t("benefits.protection.title")}</h3>
                  <p className="text-muted-foreground">{t("benefits.protection.description")}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/20">
                  <Brain className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">{t("benefits.intelligence.title")}</h3>
                  <p className="text-muted-foreground">{t("benefits.intelligence.description")}</p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl p-8 border">
                <div className="text-center space-y-4">
                  <div className="inline-flex p-4 rounded-full bg-primary/10">
                    <Users className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold">{t("benefits.stats.title")}</h3>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-3xl font-bold text-primary">5</div>
                      <div className="text-sm text-muted-foreground">
                        {t("benefits.stats.agents")}
                      </div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-primary">24/7</div>
                      <div className="text-sm text-muted-foreground">
                        {t("benefits.stats.monitoring")}
                      </div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-primary">99.9%</div>
                      <div className="text-sm text-muted-foreground">
                        {t("benefits.stats.uptime")}
                      </div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-primary">&lt;1s</div>
                      <div className="text-sm text-muted-foreground">
                        {t("benefits.stats.execution")}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">{t("cta.title")}</h2>
          <p className="text-xl text-muted-foreground mb-8">{t("cta.subtitle")}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={signUpHref as any}>
              <Button size="lg" className="gap-2">
                {t("cta.start")}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href={dashboardHref as any}>
              <Button variant="outline" size="lg">
                {t("cta.explore")}
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
