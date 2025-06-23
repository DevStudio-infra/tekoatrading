import React from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVerticalIcon, TrashIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { ComponentStrategy } from "@/lib/api/strategy-adapter";
import { toast } from "sonner";
import { deleteStrategy } from "@/lib/api/strategy-api";

interface StrategyListProps {
  strategies: ComponentStrategy[];
  isLoading?: boolean;
  isRefreshing?: boolean;
  onUpdate?: () => void;
  onDelete?: (strategyId: number) => void;
}

export function StrategyList({ strategies, isLoading, isRefreshing = false, onUpdate, onDelete }: StrategyListProps) {
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardHeader className="pb-2">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </CardContent>
            <CardFooter>
              <Skeleton className="h-9 w-full" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  if (strategies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <h3 className="text-lg font-medium mb-2">No Trading Strategies Yet</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4 text-center max-w-md">
          Create your first trading strategy to define how your bots will analyze the markets and execute trades
        </p>
        <Button onClick={() => router.push("/strategies/new")}>Create Your First Strategy</Button>
      </div>
    );
  }

  async function handleDeleteStrategy(strategyId: number) {
    if (!confirm("Are you sure you want to delete this strategy? This cannot be undone.")) {
      return;
    }

    try {
      await deleteStrategy(strategyId);
      toast.success("Strategy deleted successfully");

      // Call the callback if provided
      if (onDelete) onDelete(strategyId);
      // For backward compatibility, also call onUpdate if provided
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error deleting strategy:", error);
      toast.error("Failed to delete strategy");
    }
  }

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <>
      {isRefreshing && (
        <div className="mb-4 p-2 bg-blue-50 text-blue-700 rounded-md flex items-center justify-center">
          <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-blue-700 border-t-transparent"></div>
          <span>Refreshing strategies...</span>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {strategies.map((strategy) => (
          <Card key={strategy.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{strategy.name}</CardTitle>
                  <CardDescription>Created {formatDate(strategy.createdAt)}</CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVerticalIcon className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteStrategy(strategy.id)}>
                      <TrashIcon className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {strategy.isPublic && <Badge variant="outline">Public</Badge>}
                <Badge variant="secondary">{strategy.indicators.length} Indicators</Badge>
                {strategy.botCount > 0 && (
                  <Badge>
                    {strategy.botCount} {strategy.botCount === 1 ? "Bot" : "Bots"}
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3">{strategy.description || "No description provided."}</p>

              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Stop Loss:</span>
                  <span>{strategy.riskControls.stopLoss}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Take Profit:</span>
                  <span>{strategy.riskControls.takeProfit}%</span>
                </div>
                {strategy.winRate && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Win Rate:</span>
                    <span className="font-medium">{strategy.winRate}%</span>
                  </div>
                )}
              </div>
            </CardContent>

            <CardFooter className="border-t pt-4">
              <Button variant="outline" className="w-full" onClick={() => router.push(`/analytics?filter=strategy&id=${strategy.id}`)}>
                Analytics
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </>
  );
}
