"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { ClientEvaluationWrapper } from "@/components/evaluations/client-evaluation-wrapper";
import { ArrowUpRight, Calendar, BarChart, PieChart } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function BotEvaluationsPage() {
  const t = useTranslations("evaluations");

  return (
    <div className="container mx-auto px-4 py-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t("evaluationHistory")}</h1>
            <p className="text-muted-foreground mt-1">{t("evaluationHistoryDescription")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="gap-1 flex items-center">
              <Calendar className="h-3 w-3" />
              {new Date().toLocaleDateString()}
            </Badge>
            <Badge variant="secondary" className="gap-1 flex items-center">
              <BarChart className="h-3 w-3" />
              {t("aiPowered")}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t("totalEvaluations")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">320</div>
                <PieChart className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t("accuracyRate")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">78.5%</div>
                <ArrowUpRight className="h-4 w-4 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t("lastEvaluation")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2h ago</div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      <ClientEvaluationWrapper />
    </div>
  );
}
