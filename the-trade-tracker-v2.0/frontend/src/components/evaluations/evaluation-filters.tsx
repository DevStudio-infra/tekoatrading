import React, { useState, useEffect } from "react";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CalendarIcon } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { DateRange } from "react-day-picker";

interface EvaluationFiltersProps {
  onFilterChange: (filters: { botId: string | null; dateRange: { from: Date; to: Date } | null; profitOnly: boolean }) => void;
}

export function EvaluationFilters({ onFilterChange }: EvaluationFiltersProps) {
  const [bots, setBots] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedBot, setSelectedBot] = useState<string>("all");
  const [date, setDate] = useState<DateRange | undefined>();
  const [profitOnly, setProfitOnly] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Fetch available bots
  useEffect(() => {
    async function fetchBots() {
      try {
        const response = await fetchWithAuth("/api/bots");
        if (response.ok) {
          const data = await response.json();
          // Fix data structure - API returns { success: true, data: [...] }
          setBots(data.data || data.bots || []);
        }
      } catch (error) {
        console.error("Failed to fetch bots:", error);
        setBots([]); // Set empty array on error
      }
    }

    fetchBots();
  }, []);

  // Apply filters when any filter changes (debounced to prevent infinite loops)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const filters = {
        botId: selectedBot && selectedBot !== "all" ? selectedBot : null, // Keep as string instead of parseInt
        dateRange: date?.from && date?.to ? { from: date.from, to: date.to } : null,
        profitOnly,
      };
      onFilterChange(filters);
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [selectedBot, date, profitOnly, onFilterChange]); // Include onFilterChange but use useCallback in parent to memoize it

  // Clear all filters
  const handleClearFilters = () => {
    setSelectedBot("all");
    setDate(undefined);
    setProfitOnly(false);
  };

  return (
    <div className="bg-white border rounded-lg p-4 shadow-sm">
      <h3 className="font-medium mb-4">Filter Evaluations</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Bot Selection */}
        <div className="space-y-2">
          <Label htmlFor="bot-filter">Bot</Label>
          <select
            value={selectedBot}
            onChange={(e) => setSelectedBot(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">All Bots</option>
            {bots.map((bot) => (
              <option key={`bot-${bot.id}`} value={bot.id}>
                {bot.name}
              </option>
            ))}
          </select>
        </div>

        {/* Date Range */}
        <div className="space-y-2">
          <Label>Date Range</Label>
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (
                  date.to ? (
                    <>
                      {formatDate(date.from)} - {formatDate(date.to)}
                    </>
                  ) : (
                    formatDate(date.from)
                  )
                ) : (
                  <span>Any date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={(newDate: DateRange | undefined) => {
                  setDate(newDate);
                  if (newDate?.from && newDate?.to) {
                    setIsCalendarOpen(false);
                  }
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Profit Only Toggle */}
        <div className="space-y-2">
          <Label htmlFor="profit-only" className="block mb-2">
            Profitable Only
          </Label>
          <div className="flex items-center space-x-2">
            <Switch id="profit-only" checked={profitOnly} onCheckedChange={(checked) => setProfitOnly(checked)} />
            <Label htmlFor="profit-only">Show only profitable evaluations</Label>
          </div>
        </div>
      </div>

      {/* Clear Filters Button */}
      <div className="mt-4 flex justify-end">
        <Button variant="outline" onClick={handleClearFilters} size="sm">
          Clear Filters
        </Button>
      </div>
    </div>
  );
}
