import React, { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Slider } from "../../components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TradingPairSelect } from "../trading-pairs/trading-pair-select";
import { TradingPair } from "../trading-pairs/symbol-search-dialog";
import { fetchWithAuth } from "@/lib/fetch-with-auth";

interface CreateBotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBotCreated: () => void;
}

// Form schema
const botFormSchema = z.object({
  name: z.string().min(3, {
    message: "Bot name must be at least 3 characters.",
  }),
  strategyId: z.string(),
  brokerCredentialId: z.string(),
  tradingPairId: z.number({
    required_error: "Trading pair is required",
  }),
  tradingPairSymbol: z.string(),
  timeframe: z.string(),
  maxSimultaneousTrades: z.number().min(1).max(10),
  isActive: z.boolean(),
  isAiTradingActive: z.boolean(),
});

type BotFormValues = z.infer<typeof botFormSchema>;

interface Strategy {
  id: number;
  name: string;
}

interface BrokerCredential {
  id: string | number; // Support for both numeric IDs and UUIDs
  name: string; // User-friendly credential name
  brokerName: string;
  isActive: boolean;
}

interface CredentialBotCount {
  credentialId: string;
  botCount: number;
  maxBots: number;
  status: "optimal" | "warning" | "critical" | "blocked";
}

export function CreateBotDialog({ open, onOpenChange, onBotCreated }: CreateBotDialogProps) {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [credentials, setCredentials] = useState<BrokerCredential[]>([]);
  const [credentialBotCounts, setCredentialBotCounts] = useState<CredentialBotCount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedTradingPair, setSelectedTradingPair] = useState<TradingPair | null>(null);
  const [selectedBrokerName, setSelectedBrokerName] = useState<string>("Capital.com");

  // Bot limit constants
  const MAX_BOTS_PER_CREDENTIAL = 8;
  const WARNING_THRESHOLD = 5;

  // Initialize form
  const form = useForm<BotFormValues>({
    resolver: zodResolver(botFormSchema),
    defaultValues: {
      name: "",
      strategyId: "",
      brokerCredentialId: "",
      tradingPairId: 0,
      tradingPairSymbol: "",
      timeframe: "H1",
      maxSimultaneousTrades: 3,
      isActive: false,
      isAiTradingActive: false,
    },
  });

  useEffect(() => {
    if (open) {
      loadFormDependencies();
    }
  }, [open]);

  // Load strategies and credentials
  async function loadFormDependencies() {
    setIsLoading(true);
    try {
      // Load strategies
      const strategiesResponse = await fetchWithAuth("/api/strategies");
      if (strategiesResponse.ok) {
        const strategiesData = await strategiesResponse.json();
        setStrategies(strategiesData.strategies);
      }

      // Load broker credentials
      const credentialsResponse = await fetchWithAuth("/api/broker-credentials");
      if (credentialsResponse.ok) {
        const credentialsData = await credentialsResponse.json();
        setCredentials(credentialsData.credentials);

        // Load bot counts for each credential
        await loadBotCounts(credentialsData.credentials);
      }
    } catch (error) {
      console.error("Error loading form dependencies:", error);
    } finally {
      setIsLoading(false);
    }
  }

  // Load bot counts for each credential
  async function loadBotCounts(credentials: BrokerCredential[]) {
    try {
      // Load all bots first
      const response = await fetchWithAuth("/api/bots");
      if (!response.ok) {
        console.error("Failed to load bots for credential analysis");
        return;
      }

      const data = await response.json();
      const allBots = data.data || [];

      // Calculate bot counts per credential
      const botCounts = credentials.map((credential) => {
        const credentialBots = allBots.filter(
          (bot: { brokerCredentialId: string; isActive: boolean; isAiTradingActive: boolean }) =>
            bot.brokerCredentialId === credential.id.toString() && bot.isActive && bot.isAiTradingActive
        );
        const botCount = credentialBots.length;

        let status: "optimal" | "warning" | "critical" | "blocked";
        if (botCount >= MAX_BOTS_PER_CREDENTIAL) {
          status = "blocked";
        } else if (botCount >= MAX_BOTS_PER_CREDENTIAL - 1) {
          status = "critical";
        } else if (botCount >= WARNING_THRESHOLD) {
          status = "warning";
        } else {
          status = "optimal";
        }

        return {
          credentialId: credential.id.toString(),
          botCount,
          maxBots: MAX_BOTS_PER_CREDENTIAL,
          status,
        };
      });

      setCredentialBotCounts(botCounts);
    } catch (error) {
      console.error("Error loading bot counts:", error);
      // Set default values if loading fails
      const defaultBotCounts = credentials.map((credential) => ({
        credentialId: credential.id.toString(),
        botCount: 0,
        maxBots: MAX_BOTS_PER_CREDENTIAL,
        status: "optimal" as const,
      }));
      setCredentialBotCounts(defaultBotCounts);
    }
  }

  // Get bot count info for a specific credential
  function getCredentialInfo(credentialId: string): CredentialBotCount | null {
    return credentialBotCounts.find((c) => c.credentialId === credentialId) || null;
  }

  // Check if bot creation is allowed for selected credential
  function isBotCreationAllowed(): boolean {
    const selectedCredentialId = form.watch("brokerCredentialId");
    if (!selectedCredentialId) return true;

    const credentialInfo = getCredentialInfo(selectedCredentialId);
    return credentialInfo?.status !== "blocked";
  }

  // Submit form
  async function onSubmit(values: BotFormValues) {
    setIsSubmitting(true);
    try {
      console.log("[Bot API] Sending bot creation request:", {
        ...values,
        strategyId: values.strategyId, // Don't parse UUIDs as integers
        brokerCredentialId: values.brokerCredentialId, // Don't parse UUIDs as integers
      });

      const response = await fetchWithAuth("/api/bots", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...values,
          strategyId: values.strategyId, // Don't parse UUIDs as integers
          brokerCredentialId: values.brokerCredentialId, // Don't parse UUIDs as integers
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to create bot and parse error" }));
        console.error("Error response from /api/bots:", errorData);

        // Handle specific bot limit error
        if (errorData.code === "BOT_LIMIT_EXCEEDED") {
          throw new Error(`Bot limit exceeded: ${errorData.error}\n\n${errorData.details?.recommendation || "Use a different credential or delete existing bots."}`);
        }

        throw new Error(errorData.message || errorData.error || "Failed to create bot");
      }

      form.reset();
      onBotCreated();
    } catch (error) {
      console.error("Error creating bot:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create a New Trading Bot</DialogTitle>
          <DialogDescription>Configure your bot to automatically trade based on your strategy and preferences.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner size="lg" />
          </div>
        ) : (
          <Form {...form}>
            {/* Show global warning if any credentials are at/near limits */}
            {credentialBotCounts.some((c) => c.status === "blocked" || c.status === "critical") && (
              <Alert className="mb-4">
                <AlertDescription>
                  <strong>Bot Limit Warning:</strong> Some credentials have reached or are near their bot limits (8 bots max per credential). Consider using additional Capital.com
                  credentials for better performance and reliability.
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bot Name</FormLabel>
                    <FormControl>
                      <Input placeholder="My Trading Bot" {...field} />
                    </FormControl>
                    <FormDescription>A unique name to identify your trading bot</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="strategyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Strategy</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a strategy" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {strategies.length > 0 ? (
                          strategies.map((strategy) => (
                            <SelectItem key={strategy.id} value={strategy.id.toString()}>
                              {strategy.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-strategy" disabled>
                            No strategies available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="brokerCredentialId"
                render={({ field }) => {
                  const selectedCredentialInfo = field.value ? getCredentialInfo(field.value) : null;

                  return (
                    <FormItem>
                      <FormLabel>Broker Account</FormLabel>
                      <Select
                        onValueChange={(value: string) => {
                          field.onChange(value);
                          // Find the broker name for the selected credential
                          const credential = credentials.find((c) => c.id.toString() === value);
                          if (credential) {
                            setSelectedBrokerName(credential.brokerName);
                          }
                        }}
                        defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a broker account" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {credentials.map((credential) => {
                            const botInfo = getCredentialInfo(credential.id.toString());
                            const isBlocked = botInfo?.status === "blocked";
                            const statusIcon = {
                              optimal: "✅",
                              warning: "⚠️",
                              critical: "🔴",
                              blocked: "🚫",
                            }[botInfo?.status || "optimal"];

                            return (
                              <SelectItem key={credential.id} value={credential.id.toString()} disabled={isBlocked}>
                                <div className="flex items-center justify-between w-full">
                                  <span>{credential.name || `${credential.brokerName} Account`}</span>
                                  <span className="text-xs text-gray-500 ml-2">
                                    {statusIcon} {botInfo?.botCount || 0}/{botInfo?.maxBots || 8}
                                  </span>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>

                      {/* Show status message for selected credential */}
                      {selectedCredentialInfo && (
                        <div
                          className={`text-sm p-2 rounded-md ${
                            selectedCredentialInfo.status === "blocked"
                              ? "bg-red-50 text-red-700 border border-red-200"
                              : selectedCredentialInfo.status === "critical"
                              ? "bg-orange-50 text-orange-700 border border-orange-200"
                              : selectedCredentialInfo.status === "warning"
                              ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
                              : "bg-green-50 text-green-700 border border-green-200"
                          }`}>
                          {selectedCredentialInfo.status === "blocked" && (
                            <>
                              🚫 <strong>Cannot create more bots</strong> ({selectedCredentialInfo.botCount}/{selectedCredentialInfo.maxBots})<br />
                              Use a different credential or delete existing bots.
                            </>
                          )}
                          {selectedCredentialInfo.status === "critical" && (
                            <>
                              🔴 <strong>Critical:</strong> Only {selectedCredentialInfo.maxBots - selectedCredentialInfo.botCount} slot(s) remaining (
                              {selectedCredentialInfo.botCount}/{selectedCredentialInfo.maxBots})<br />
                              Consider using additional credentials for better performance.
                            </>
                          )}
                          {selectedCredentialInfo.status === "warning" && (
                            <>
                              ⚠️ <strong>Warning:</strong> Approaching limit ({selectedCredentialInfo.botCount}/{selectedCredentialInfo.maxBots})<br />
                              Consider using additional credentials for optimal performance.
                            </>
                          )}
                          {selectedCredentialInfo.status === "optimal" && (
                            <>
                              ✅ <strong>Optimal:</strong> {selectedCredentialInfo.maxBots - selectedCredentialInfo.botCount} slots available ({selectedCredentialInfo.botCount}/
                              {selectedCredentialInfo.maxBots})
                            </>
                          )}
                        </div>
                      )}

                      <FormDescription>The broker account to use for trading</FormDescription>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              {/* Trading Pair Selection - Remove duplicate label */}
              <div className="space-y-2">
                <TradingPairSelect
                  selectedBroker={selectedBrokerName}
                  selectedSymbol={selectedTradingPair}
                  onSelectSymbol={(pair: TradingPair) => {
                    setSelectedTradingPair(pair);
                    form.setValue("tradingPairId", pair.id);
                    form.setValue("tradingPairSymbol", pair.symbol);
                  }}
                />
                {form.formState.errors.tradingPairId && <p className="text-sm font-medium text-destructive">{form.formState.errors.tradingPairId.message?.toString()}</p>}
                <FormDescription>Select a trading pair for this bot</FormDescription>
              </div>

              <FormField
                control={form.control}
                name="timeframe"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Timeframe</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select timeframe" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="M1">1 Minute (M1)</SelectItem>
                        <SelectItem value="M5">5 Minutes (M5)</SelectItem>
                        <SelectItem value="M15">15 Minutes (M15)</SelectItem>
                        <SelectItem value="M30">30 Minutes (M30)</SelectItem>
                        <SelectItem value="H1">1 Hour (H1)</SelectItem>
                        <SelectItem value="H4">4 Hours (H4)</SelectItem>
                        <SelectItem value="D1">Daily (D1)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxSimultaneousTrades"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maximum Simultaneous Trades</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <Slider min={1} max={10} step={1} defaultValue={[field.value]} onValueChange={(value: number[]) => field.onChange(value[0])} />
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>1</span>
                          <span>{field.value}</span>
                          <span>10</span>
                        </div>
                      </div>
                    </FormControl>
                    <FormDescription>Maximum number of trades that can be open at the same time</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Responsive grid for switches - stack on mobile */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Activate Immediately</FormLabel>
                        <FormDescription className="text-sm">Start trading as soon as the bot is created</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isAiTradingActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Enable AI Trading</FormLabel>
                        <FormDescription className="text-sm">Use AI assistance for trade decisions</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting} className="w-full sm:w-auto">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting || strategies.length === 0 || credentials.length === 0 || !isBotCreationAllowed()} className="w-full sm:w-auto">
                  {isSubmitting ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Creating...
                    </>
                  ) : !isBotCreationAllowed() ? (
                    "Bot Limit Reached"
                  ) : (
                    "Create Bot"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
