"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Download, FileText, Table, Calendar, TrendingUp, PieChart, BarChart3, AlertTriangle, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ExportOptions {
  period: string;
  format: "PDF" | "CSV";
  sections: {
    performanceMetrics: boolean;
    pnlHistory: boolean;
    winLossDistribution: boolean;
    botComparison: boolean;
    strategyPerformance: boolean;
    riskAnalysis: boolean;
    tradeDetails: boolean;
  };
  dateRange?: {
    start: string;
    end: string;
  };
}

interface AnalyticsExportProps {
  userId?: string;
  strategyFilter?: { id: string; name: string };
}

export function AnalyticsExport({ userId, strategyFilter }: AnalyticsExportProps) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    period: "30d",
    format: "PDF",
    sections: {
      performanceMetrics: true,
      pnlHistory: true,
      winLossDistribution: true,
      botComparison: true,
      strategyPerformance: true,
      riskAnalysis: true,
      tradeDetails: false,
    },
  });

  const sectionOptions = [
    {
      key: "performanceMetrics" as keyof ExportOptions["sections"],
      label: "Performance Metrics",
      description: "Sharpe ratio, max drawdown, profit factor, risk metrics",
      icon: TrendingUp,
      recommended: true,
    },
    {
      key: "pnlHistory" as keyof ExportOptions["sections"],
      label: "P&L History",
      description: "Daily and cumulative profit/loss charts and data",
      icon: BarChart3,
      recommended: true,
    },
    {
      key: "winLossDistribution" as keyof ExportOptions["sections"],
      label: "Win/Loss Distribution",
      description: "Trade outcome analysis and distribution charts",
      icon: PieChart,
      recommended: true,
    },
    {
      key: "botComparison" as keyof ExportOptions["sections"],
      label: "Bot Comparison",
      description: "Performance comparison across different bots",
      icon: BarChart3,
      recommended: false,
    },
    {
      key: "strategyPerformance" as keyof ExportOptions["sections"],
      label: "Strategy Performance",
      description: "Strategy-specific performance analysis",
      icon: TrendingUp,
      recommended: false,
    },
    {
      key: "riskAnalysis" as keyof ExportOptions["sections"],
      label: "Risk Analysis",
      description: "Exposure analysis, VaR, concentration risk",
      icon: AlertTriangle,
      recommended: true,
    },
    {
      key: "tradeDetails" as keyof ExportOptions["sections"],
      label: "Trade Details",
      description: "Individual trade records and detailed analysis",
      icon: Table,
      recommended: false,
    },
  ];

  const handleExport = async () => {
    try {
      setIsExporting(true);

      // Build export request
      const exportRequest = {
        ...exportOptions,
        userId,
        strategyFilter,
        timestamp: new Date().toISOString(),
      };

      const endpoint = exportOptions.format === "PDF" ? "/api/analytics/export/pdf" : "/api/analytics/export/csv";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(exportRequest),
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      // Handle file download
      const blob = await response.blob();
      const filename = generateFilename();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export Successful",
        description: `Analytics report exported as ${exportOptions.format}`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export analytics report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const generateFilename = () => {
    const timestamp = new Date().toISOString().split("T")[0];
    const strategyPart = strategyFilter ? `_${strategyFilter.name.replace(/\s+/g, "_")}` : "";
    return `analytics_report_${exportOptions.period}${strategyPart}_${timestamp}.${exportOptions.format.toLowerCase()}`;
  };

  const toggleSection = (sectionKey: keyof ExportOptions["sections"]) => {
    setExportOptions((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [sectionKey]: !prev.sections[sectionKey],
      },
    }));
  };

  const selectAllSections = () => {
    setExportOptions((prev) => ({
      ...prev,
      sections: Object.keys(prev.sections).reduce(
        (acc, key) => ({
          ...acc,
          [key]: true,
        }),
        {} as ExportOptions["sections"]
      ),
    }));
  };

  const selectRecommendedSections = () => {
    setExportOptions((prev) => ({
      ...prev,
      sections: Object.keys(prev.sections).reduce(
        (acc, key) => ({
          ...acc,
          [key]: sectionOptions.find((option) => option.key === key)?.recommended || false,
        }),
        {} as ExportOptions["sections"]
      ),
    }));
  };

  const selectedSectionsCount = Object.values(exportOptions.sections).filter(Boolean).length;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Download className="h-5 w-5 text-primary" />
          <CardTitle>Export Analytics Report</CardTitle>
          {strategyFilter && (
            <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
              {strategyFilter.name}
            </Badge>
          )}
        </div>
        <CardDescription>Generate comprehensive reports in PDF or CSV format with customizable sections and date ranges.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Format and Period Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Export Format</label>
            <Select value={exportOptions.format} onValueChange={(value: "PDF" | "CSV") => setExportOptions((prev) => ({ ...prev, format: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PDF">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    PDF Report
                  </div>
                </SelectItem>
                <SelectItem value="CSV">
                  <div className="flex items-center gap-2">
                    <Table className="h-4 w-4" />
                    CSV Data
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Time Period</label>
            <Select value={exportOptions.period} onValueChange={(value) => setExportOptions((prev) => ({ ...prev, period: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="90d">Last 90 Days</SelectItem>
                <SelectItem value="1y">Last Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Section Selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Report Sections</label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p>Select which sections to include in your analytics report. Recommended sections provide the most valuable insights.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={selectRecommendedSections}>
                Select Recommended
              </Button>
              <Button variant="ghost" size="sm" onClick={selectAllSections}>
                Select All
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {sectionOptions.map((section) => {
              const Icon = section.icon;
              const isSelected = exportOptions.sections[section.key];

              return (
                <div
                  key={section.key}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${isSelected ? "bg-primary/5 border-primary/20" : "bg-muted/30"}`}>
                  <Checkbox checked={isSelected} onCheckedChange={() => toggleSection(section.key)} className="mt-1" />
                  <div className="flex items-start gap-3 flex-1">
                    <Icon className={`h-4 w-4 mt-0.5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>{section.label}</span>
                        {section.recommended && (
                          <Badge variant="secondary" className="text-xs px-1.5 py-0.5 bg-green-100 text-green-800 border-green-200">
                            Recommended
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{section.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-sm text-muted-foreground">
            {selectedSectionsCount} of {sectionOptions.length} sections selected
          </div>
        </div>

        {/* Export Button */}
        <div className="flex items-center gap-4 pt-4 border-t">
          <Button onClick={handleExport} disabled={isExporting || selectedSectionsCount === 0} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            {isExporting ? "Generating..." : `Export ${exportOptions.format}`}
          </Button>

          <div className="text-sm text-muted-foreground">
            {selectedSectionsCount === 0 ? "Select at least one section to export" : `Ready to export ${selectedSectionsCount} sections as ${exportOptions.format}`}
          </div>
        </div>

        {/* File Preview Info */}
        {selectedSectionsCount > 0 && (
          <div className="bg-muted/50 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Export Preview:</span>
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              <span className="font-medium">Filename:</span> {generateFilename()}
            </div>
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">Period:</span> {exportOptions.period} • <span className="font-medium">Format:</span> {exportOptions.format} •{" "}
              <span className="font-medium">Sections:</span> {selectedSectionsCount}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
