"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import React from "react";
import { Globe, Moon, Clock, CreditCard, Settings, User, Bell, Shield, ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

// Interface for setting items
interface SettingItem {
  icon: React.ReactNode;
  title: string;
  description: string;
  path: string;
}

export default function SettingsPage() {
  const t = useTranslations("settings");
  const pathname = usePathname();
  const locale = pathname.split("/")[1]; // Extract locale from path

  // Get the setting items with translations
  const settingItems: SettingItem[] = [
    {
      icon: <Globe className="h-5 w-5" />,
      title: t("language"),
      description: "Change your preferred language",
      path: `/${locale}/settings/language`,
    },
    {
      icon: <Moon className="h-5 w-5" />,
      title: t("theme"),
      description: "Light, dark, or system theme",
      path: `/${locale}/settings/theme`,
    },
    {
      icon: <Clock className="h-5 w-5" />,
      title: "Timezone",
      description: "Set your local timezone",
      path: `/${locale}/settings/timezone`,
    },
    {
      icon: <CreditCard className="h-5 w-5" />,
      title: "Currency",
      description: "Set your preferred currency",
      path: `/${locale}/settings/currency`,
    },
    {
      icon: <User className="h-5 w-5" />,
      title: "Account",
      description: "Manage your account details",
      path: `/${locale}/settings/account`,
    },
    {
      icon: <Shield className="h-5 w-5" />,
      title: "Security",
      description: "Configure security settings",
      path: `/${locale}/settings/security`,
    },
    {
      icon: <Bell className="h-5 w-5" />,
      title: t("notifications"),
      description: "Manage notifications and alerts",
      path: `/${locale}/settings/notifications`,
    },
  ];

  // Animation variants for staggered animations
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="mb-8 flex items-center gap-3">
          <Settings className="h-6 w-6" />
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
            <CardDescription>Manage your application preferences and settings</CardDescription>
          </CardHeader>

          <CardContent>
            <motion.div className="space-y-2" variants={container} initial="hidden" animate="show">
              {settingItems.map((settingItem, index) => (
                <React.Fragment key={settingItem.title}>
                  <motion.div variants={itemVariants}>
                    <Link href={settingItem.path} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-background">{settingItem.icon}</div>
                        <div>
                          <p className="font-medium">{settingItem.title}</p>
                          <p className="text-sm text-muted-foreground">{settingItem.description}</p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  </motion.div>
                  {index < settingItems.length - 1 && <Separator className="my-2" />}
                </React.Fragment>
              ))}
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
