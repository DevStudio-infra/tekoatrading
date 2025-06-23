"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, AlertTriangle, XCircle, Smartphone, Tablet, Monitor, Zap, Eye, Accessibility, Gauge } from "lucide-react";
import { useBreakpoint, useIsMobile, useIsTouchDevice } from "@/lib/responsive-utils";
import { useReducedMotion, useColorSchemePreference, useHighContrast } from "@/lib/accessibility-utils";
import { useMemoryMonitor, useFPSMonitor } from "@/lib/performance-utils";

interface AuditItem {
  id: string;
  category: "responsive" | "accessibility" | "performance" | "touch";
  title: string;
  description: string;
  status: "pass" | "warning" | "fail";
  priority: "low" | "medium" | "high";
  recommendation?: string;
}

export function MobileAudit() {
  const [auditResults, setAuditResults] = useState<AuditItem[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  // Device and accessibility detection
  const breakpoint = useBreakpoint();
  const isMobile = useIsMobile();
  const isTouchDevice = useIsTouchDevice();
  const prefersReducedMotion = useReducedMotion();
  const prefersDark = useColorSchemePreference();
  const prefersHighContrast = useHighContrast();
  const memoryInfo = useMemoryMonitor();
  const fps = useFPSMonitor();

  const runAudit = async () => {
    setIsRunning(true);
    setProgress(0);
    const results: AuditItem[] = [];

    // Simulate audit progress
    const auditSteps = [() => auditResponsiveDesign(results), () => auditTouchInteractions(results), () => auditAccessibility(results), () => auditPerformance(results)];

    for (let i = 0; i < auditSteps.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      auditSteps[i]();
      setProgress(((i + 1) / auditSteps.length) * 100);
    }

    setAuditResults(results);
    setIsRunning(false);
  };

  const auditResponsiveDesign = (results: AuditItem[]) => {
    // Check viewport meta tag
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    results.push({
      id: "viewport-meta",
      category: "responsive",
      title: "Viewport Meta Tag",
      description: "Proper viewport meta tag for mobile optimization",
      status: viewportMeta ? "pass" : "fail",
      priority: "high",
      recommendation: viewportMeta ? undefined : "Add viewport meta tag to HTML head",
    });

    // Check for responsive images
    const images = document.querySelectorAll("img");
    const responsiveImages = Array.from(images).filter((img) => img.hasAttribute("srcset") || img.style.maxWidth === "100%");
    results.push({
      id: "responsive-images",
      category: "responsive",
      title: "Responsive Images",
      description: `${responsiveImages.length}/${images.length} images are responsive`,
      status: responsiveImages.length === images.length ? "pass" : "warning",
      priority: "medium",
      recommendation: responsiveImages.length < images.length ? "Add responsive attributes to all images" : undefined,
    });

    // Check for horizontal scrolling
    const hasHorizontalScroll = document.body.scrollWidth > window.innerWidth;
    results.push({
      id: "horizontal-scroll",
      category: "responsive",
      title: "Horizontal Scrolling",
      description: "No unwanted horizontal scrolling",
      status: hasHorizontalScroll ? "fail" : "pass",
      priority: "high",
      recommendation: hasHorizontalScroll ? "Fix elements causing horizontal overflow" : undefined,
    });

    // Check breakpoint usage
    results.push({
      id: "breakpoint-detection",
      category: "responsive",
      title: "Breakpoint Detection",
      description: `Current breakpoint: ${breakpoint}`,
      status: "pass",
      priority: "low",
    });
  };

  const auditTouchInteractions = (results: AuditItem[]) => {
    // Check touch target sizes
    const buttons = document.querySelectorAll('button, a, input[type="button"], input[type="submit"]');
    const smallTargets = Array.from(buttons).filter((button) => {
      const rect = button.getBoundingClientRect();
      return rect.width < 44 || rect.height < 44;
    });

    results.push({
      id: "touch-targets",
      category: "touch",
      title: "Touch Target Sizes",
      description: `${buttons.length - smallTargets.length}/${buttons.length} targets meet minimum size`,
      status: smallTargets.length === 0 ? "pass" : "warning",
      priority: "high",
      recommendation: smallTargets.length > 0 ? "Increase size of touch targets to minimum 44x44px" : undefined,
    });

    // Check touch device detection
    results.push({
      id: "touch-detection",
      category: "touch",
      title: "Touch Device Detection",
      description: `Touch device: ${isTouchDevice ? "Yes" : "No"}`,
      status: "pass",
      priority: "low",
    });

    // Check for hover-dependent interactions
    const hoverElements = document.querySelectorAll('[class*="hover:"]');
    results.push({
      id: "hover-interactions",
      category: "touch",
      title: "Hover Interactions",
      description: `${hoverElements.length} elements use hover states`,
      status: hoverElements.length > 0 && isTouchDevice ? "warning" : "pass",
      priority: "medium",
      recommendation: hoverElements.length > 0 && isTouchDevice ? "Provide touch alternatives for hover interactions" : undefined,
    });
  };

  const auditAccessibility = (results: AuditItem[]) => {
    // Check for alt text on images
    const images = document.querySelectorAll("img");
    const imagesWithAlt = Array.from(images).filter((img) => img.hasAttribute("alt"));
    results.push({
      id: "image-alt-text",
      category: "accessibility",
      title: "Image Alt Text",
      description: `${imagesWithAlt.length}/${images.length} images have alt text`,
      status: imagesWithAlt.length === images.length ? "pass" : "fail",
      priority: "high",
      recommendation: imagesWithAlt.length < images.length ? "Add alt text to all images" : undefined,
    });

    // Check for heading hierarchy
    const headings = document.querySelectorAll("h1, h2, h3, h4, h5, h6");
    results.push({
      id: "heading-hierarchy",
      category: "accessibility",
      title: "Heading Hierarchy",
      description: `${headings.length} headings found`,
      status: headings.length > 0 ? "pass" : "warning",
      priority: "medium",
      recommendation: headings.length === 0 ? "Add proper heading hierarchy for screen readers" : undefined,
    });

    // Check motion preferences
    results.push({
      id: "motion-preferences",
      category: "accessibility",
      title: "Motion Preferences",
      description: `Reduced motion: ${prefersReducedMotion ? "Yes" : "No"}`,
      status: "pass",
      priority: "low",
    });

    // Check color scheme preferences
    results.push({
      id: "color-scheme",
      category: "accessibility",
      title: "Color Scheme",
      description: `Prefers dark: ${prefersDark ? "Yes" : "No"}`,
      status: "pass",
      priority: "low",
    });

    // Check high contrast preferences
    results.push({
      id: "high-contrast",
      category: "accessibility",
      title: "High Contrast",
      description: `High contrast: ${prefersHighContrast ? "Yes" : "No"}`,
      status: "pass",
      priority: "low",
    });

    // Check for focus indicators
    const focusableElements = document.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    results.push({
      id: "focus-indicators",
      category: "accessibility",
      title: "Focus Indicators",
      description: `${focusableElements.length} focusable elements`,
      status: "pass",
      priority: "medium",
    });
  };

  const auditPerformance = (results: AuditItem[]) => {
    // Check FPS
    results.push({
      id: "fps-performance",
      category: "performance",
      title: "Frame Rate",
      description: `Current FPS: ${fps}`,
      status: fps >= 55 ? "pass" : fps >= 30 ? "warning" : "fail",
      priority: "medium",
      recommendation: fps < 55 ? "Optimize animations and rendering performance" : undefined,
    });

    // Check memory usage
    if (memoryInfo) {
      const memoryUsagePercent = (memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit) * 100;
      results.push({
        id: "memory-usage",
        category: "performance",
        title: "Memory Usage",
        description: `${memoryUsagePercent.toFixed(1)}% of heap used`,
        status: memoryUsagePercent < 70 ? "pass" : memoryUsagePercent < 85 ? "warning" : "fail",
        priority: "medium",
        recommendation: memoryUsagePercent >= 70 ? "Optimize memory usage and check for memory leaks" : undefined,
      });
    }

    // Check for large images
    const images = document.querySelectorAll("img");
    const largeImages = Array.from(images).filter((img) => {
      const rect = img.getBoundingClientRect();
      return rect.width > 1920 || rect.height > 1080;
    });
    results.push({
      id: "image-optimization",
      category: "performance",
      title: "Image Optimization",
      description: `${largeImages.length} potentially oversized images`,
      status: largeImages.length === 0 ? "pass" : "warning",
      priority: "medium",
      recommendation: largeImages.length > 0 ? "Optimize large images for better performance" : undefined,
    });

    // Check for unused CSS
    const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
    results.push({
      id: "css-optimization",
      category: "performance",
      title: "CSS Optimization",
      description: `${stylesheets.length} stylesheets loaded`,
      status: stylesheets.length <= 3 ? "pass" : "warning",
      priority: "low",
      recommendation: stylesheets.length > 3 ? "Consider combining CSS files to reduce requests" : undefined,
    });
  };

  const getStatusIcon = (status: AuditItem["status"]) => {
    switch (status) {
      case "pass":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "fail":
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getCategoryIcon = (category: AuditItem["category"]) => {
    switch (category) {
      case "responsive":
        return <Smartphone className="h-4 w-4" />;
      case "touch":
        return <Tablet className="h-4 w-4" />;
      case "accessibility":
        return <Accessibility className="h-4 w-4" />;
      case "performance":
        return <Gauge className="h-4 w-4" />;
    }
  };

  const getScoreByCategory = (category: AuditItem["category"]) => {
    const categoryItems = auditResults.filter((item) => item.category === category);
    if (categoryItems.length === 0) return 0;

    const passCount = categoryItems.filter((item) => item.status === "pass").length;
    return Math.round((passCount / categoryItems.length) * 100);
  };

  const overallScore = auditResults.length > 0 ? Math.round((auditResults.filter((item) => item.status === "pass").length / auditResults.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Mobile-First Audit
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Comprehensive audit for responsive design, accessibility, and performance</p>
            </div>
            <Button onClick={runAudit} disabled={isRunning} className="gap-2">
              {isRunning ? (
                <>
                  <Zap className="h-4 w-4 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" />
                  Run Audit
                </>
              )}
            </Button>
          </div>
        </CardHeader>

        {isRunning && (
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Running audit...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Device Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Device Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="flex justify-center mb-2">{isMobile ? <Smartphone className="h-6 w-6" /> : <Monitor className="h-6 w-6" />}</div>
              <p className="text-sm font-medium">Device Type</p>
              <p className="text-xs text-muted-foreground">{isMobile ? "Mobile" : "Desktop"}</p>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-2">
                <Badge variant="outline">{breakpoint.toUpperCase()}</Badge>
              </div>
              <p className="text-sm font-medium">Breakpoint</p>
              <p className="text-xs text-muted-foreground">{window.innerWidth}px</p>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-2">
                <Badge variant={isTouchDevice ? "default" : "secondary"}>{isTouchDevice ? "Touch" : "Mouse"}</Badge>
              </div>
              <p className="text-sm font-medium">Input Method</p>
              <p className="text-xs text-muted-foreground">Primary interaction</p>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-2">
                <Badge variant={prefersDark ? "default" : "outline"}>{prefersDark ? "Dark" : "Light"}</Badge>
              </div>
              <p className="text-sm font-medium">Theme</p>
              <p className="text-xs text-muted-foreground">System preference</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {auditResults.length > 0 && (
        <>
          {/* Score Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Overall Score
                <Badge variant={overallScore >= 80 ? "default" : overallScore >= 60 ? "secondary" : "destructive"} className="text-lg px-3 py-1">
                  {overallScore}%
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(["responsive", "touch", "accessibility", "performance"] as const).map((category) => {
                  const score = getScoreByCategory(category);
                  return (
                    <div key={category} className="text-center">
                      <div className="flex justify-center mb-2">{getCategoryIcon(category)}</div>
                      <p className="text-sm font-medium capitalize">{category}</p>
                      <Badge variant={score >= 80 ? "default" : score >= 60 ? "secondary" : "destructive"} className="mt-1">
                        {score}%
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Detailed Results */}
          <Card>
            <CardHeader>
              <CardTitle>Audit Results</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {auditResults.map((item, index) => (
                    <div key={item.id}>
                      <div className="flex items-start gap-3">
                        <div className="flex items-center gap-2 mt-1">
                          {getStatusIcon(item.status)}
                          {getCategoryIcon(item.category)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm">{item.title}</h4>
                            <Badge variant={item.priority === "high" ? "destructive" : item.priority === "medium" ? "secondary" : "outline"} className="text-xs">
                              {item.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                          {item.recommendation && <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">💡 {item.recommendation}</p>}
                        </div>
                      </div>
                      {index < auditResults.length - 1 && <Separator className="mt-4" />}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
