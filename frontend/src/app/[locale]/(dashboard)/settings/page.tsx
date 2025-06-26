"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { Card } from "@/features/shared/components/ui/card";
import { Button } from "@/features/shared/components/ui/button";
import { Shield, User, Settings, ChevronRight } from "lucide-react";

export default function SettingsPage() {
  const t = useTranslations("settings");

  const settingsOptions = [
    {
      title: "Account Settings",
      description: "Manage your account preferences and profile.",
      icon: User,
      href: "/settings/account",
      available: false,
    },
    {
      title: "Trading Preferences",
      description: "Configure your trading preferences and risk settings.",
      icon: Settings,
      href: "/settings/trading",
      available: false,
    },
    {
      title: "Broker Credentials",
      description: "Manage your broker API connections and credentials for automated trading.",
      icon: Shield,
      href: "/settings/broker-credentials",
      available: true,
    },
  ];

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure your trading preferences and account settings
        </p>
      </div>

      <div className="grid gap-6">
        {settingsOptions.map((option) => {
          const Icon = option.icon;

          if (!option.available) {
            return (
              <Card key={option.title} className="p-6 opacity-60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gray-100">
                      <Icon className="h-6 w-6 text-gray-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold mb-2">{option.title}</h2>
                      <p className="text-muted-foreground">{option.description}</p>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">Coming Soon</div>
                </div>
              </Card>
            );
          }

          return (
            <Link key={option.title} href={option.href}>
              <Card className="p-6 hover:bg-accent transition-colors cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold mb-2">{option.title}</h2>
                      <p className="text-muted-foreground">{option.description}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <Link href="/settings/broker-credentials">
            <Button variant="outline" className="flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span>Add Broker Credentials</span>
            </Button>
          </Link>
          <Button variant="outline" disabled className="flex items-center space-x-2">
            <User className="h-4 w-4" />
            <span>Update Profile</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
