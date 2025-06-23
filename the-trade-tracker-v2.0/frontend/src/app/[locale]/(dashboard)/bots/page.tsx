"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { BotsList, CreateBotDialog } from "@/features/bots";
import { toast } from "sonner";
import { fetchWithAuth } from "@/lib/fetch-with-auth";

export default function BotsPage() {
  const t = useTranslations("bots");

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [bots, setBots] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchBots();
  }, []);

  async function fetchBots() {
    setIsLoading(true);
    try {
      console.log("[Bot List] Fetching bots with authentication...");
      const response = await fetchWithAuth("/api/bots");

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to parse error" }));
        console.error("[Bot List] Error response:", errorData);
        throw new Error(errorData.message || "Failed to fetch bots");
      }

      const data = await response.json();
      console.log("[Bot List] Bots retrieved:", data);
      // Handle different API response formats - backend returns { success: true, data: [...] }
      setBots(data.data || data.bots || []);
    } catch (error) {
      console.error("[Bot List] Error fetching bots:", error);
      toast.error(t("failedToLoad"));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleBotCreated() {
    setIsCreateDialogOpen(false);
    await fetchBots();
    toast.success(t("botCreatedSuccess"));
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">{t("tradingBots")}</h1>
        <div className="flex space-x-2">
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            {t("createBot")}
          </Button>
        </div>
      </div>

      <BotsList bots={bots} isLoading={isLoading} onRefresh={fetchBots} />

      <CreateBotDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} onBotCreated={handleBotCreated} />
    </div>
  );
}
