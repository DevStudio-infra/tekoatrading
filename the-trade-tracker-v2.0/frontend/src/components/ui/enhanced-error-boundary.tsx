"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, RefreshCw, Home, Bug, ChevronDown, ChevronUp, Copy, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showErrorDetails?: boolean;
  enableRetry?: boolean;
  enableReporting?: boolean;
  level?: "page" | "component" | "feature";
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  retryCount: number;
}

export class EnhancedErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler
    this.props.onError?.(error, errorInfo);

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("Error Boundary caught an error:", error, errorInfo);
    }

    // Report to error tracking service
    this.reportError(error, errorInfo);
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    if (!this.props.enableReporting) return;

    // Here you would integrate with your error reporting service
    // e.g., Sentry, LogRocket, etc.
    console.log("Reporting error to service:", {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      level: this.props.level || "component",
    });
  };

  private handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState((prevState) => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1,
      }));
    }
  };

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      retryCount: 0,
    });
  };

  private toggleDetails = () => {
    this.setState((prevState) => ({
      showDetails: !prevState.showDetails,
    }));
  };

  private copyErrorToClipboard = () => {
    const { error, errorInfo } = this.state;
    const errorText = `
Error: ${error?.message}
Stack: ${error?.stack}
Component Stack: ${errorInfo?.componentStack}
    `.trim();

    navigator.clipboard.writeText(errorText).then(() => {
      // You could show a toast notification here
      console.log("Error details copied to clipboard");
    });
  };

  private getErrorSeverity = (): "low" | "medium" | "high" => {
    const { error } = this.state;
    const { level } = this.props;

    if (level === "page") return "high";
    if (level === "feature") return "medium";

    // Check error type
    if (error?.name === "ChunkLoadError") return "medium";
    if (error?.message?.includes("Network")) return "medium";

    return "low";
  };

  private getSeverityColor = (severity: "low" | "medium" | "high") => {
    switch (severity) {
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "default";
    }
  };

  private getErrorTitle = (): string => {
    const { level } = this.props;
    const { error } = this.state;

    if (error?.name === "ChunkLoadError") {
      return "Loading Error";
    }

    if (error?.message?.includes("Network")) {
      return "Network Error";
    }

    switch (level) {
      case "page":
        return "Page Error";
      case "feature":
        return "Feature Error";
      case "component":
        return "Component Error";
      default:
        return "Something went wrong";
    }
  };

  private getErrorDescription = (): string => {
    const { error } = this.state;
    const { level } = this.props;

    if (error?.name === "ChunkLoadError") {
      return "Failed to load application resources. This might be due to a network issue or an updated version.";
    }

    if (error?.message?.includes("Network")) {
      return "Unable to connect to the server. Please check your internet connection and try again.";
    }

    switch (level) {
      case "page":
        return "The page encountered an unexpected error. You can try refreshing the page or go back to the dashboard.";
      case "feature":
        return "This feature is temporarily unavailable. You can try again or use other parts of the application.";
      case "component":
        return "A component failed to load properly. This might not affect other parts of the page.";
      default:
        return "An unexpected error occurred. Please try again or contact support if the problem persists.";
    }
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const severity = this.getErrorSeverity();
      const canRetry = this.props.enableRetry && this.state.retryCount < this.maxRetries;

      return (
        <div className={cn("flex items-center justify-center p-4", this.props.level === "page" ? "min-h-screen" : "min-h-[200px]")}>
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-destructive/10">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{this.getErrorTitle()}</CardTitle>
                    <Badge variant={this.getSeverityColor(severity)}>{severity} severity</Badge>
                  </div>
                  <CardDescription className="mt-1">{this.getErrorDescription()}</CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                {canRetry && (
                  <Button onClick={this.handleRetry} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Try Again ({this.maxRetries - this.state.retryCount} left)
                  </Button>
                )}

                <Button variant="outline" onClick={this.handleReset} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Reset
                </Button>

                {this.props.level === "page" && (
                  <Button variant="outline" onClick={() => (window.location.href = "/dashboard")} className="gap-2">
                    <Home className="h-4 w-4" />
                    Go to Dashboard
                  </Button>
                )}

                {this.props.enableReporting && (
                  <Button variant="outline" onClick={() => window.open("mailto:support@tradetracker.com")} className="gap-2">
                    <Bug className="h-4 w-4" />
                    Report Issue
                  </Button>
                )}
              </div>

              {/* Error Details */}
              {this.props.showErrorDetails && this.state.error && (
                <div className="space-y-3">
                  <Button variant="ghost" size="sm" onClick={this.toggleDetails} className="gap-2 text-muted-foreground">
                    {this.state.showDetails ? (
                      <>
                        <ChevronUp className="h-4 w-4" />
                        Hide Details
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4" />
                        Show Details
                      </>
                    )}
                  </Button>

                  {this.state.showDetails && (
                    <Alert>
                      <Bug className="h-4 w-4" />
                      <AlertTitle className="flex items-center justify-between">
                        Error Details
                        <Button variant="ghost" size="sm" onClick={this.copyErrorToClipboard} className="gap-1 h-auto p-1">
                          <Copy className="h-3 w-3" />
                          Copy
                        </Button>
                      </AlertTitle>
                      <AlertDescription className="mt-2">
                        <div className="space-y-2 text-xs font-mono">
                          <div>
                            <strong>Error:</strong> {this.state.error.message}
                          </div>
                          {this.state.error.stack && (
                            <div>
                              <strong>Stack:</strong>
                              <pre className="mt-1 whitespace-pre-wrap break-all">{this.state.error.stack}</pre>
                            </div>
                          )}
                          {this.state.errorInfo?.componentStack && (
                            <div>
                              <strong>Component Stack:</strong>
                              <pre className="mt-1 whitespace-pre-wrap break-all">{this.state.errorInfo.componentStack}</pre>
                            </div>
                          )}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {/* Helpful Links */}
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">Need help?</p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="link" size="sm" className="gap-1 h-auto p-0">
                    <ExternalLink className="h-3 w-3" />
                    Documentation
                  </Button>
                  <Button variant="link" size="sm" className="gap-1 h-auto p-0">
                    <ExternalLink className="h-3 w-3" />
                    Support
                  </Button>
                  <Button variant="link" size="sm" className="gap-1 h-auto p-0">
                    <ExternalLink className="h-3 w-3" />
                    Status Page
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Convenience wrapper components
export function PageErrorBoundary({ children, ...props }: Omit<Props, "level">) {
  return (
    <EnhancedErrorBoundary level="page" showErrorDetails={process.env.NODE_ENV === "development"} enableRetry={true} enableReporting={true} {...props}>
      {children}
    </EnhancedErrorBoundary>
  );
}

export function FeatureErrorBoundary({ children, ...props }: Omit<Props, "level">) {
  return (
    <EnhancedErrorBoundary level="feature" showErrorDetails={process.env.NODE_ENV === "development"} enableRetry={true} enableReporting={false} {...props}>
      {children}
    </EnhancedErrorBoundary>
  );
}

export function ComponentErrorBoundary({ children, ...props }: Omit<Props, "level">) {
  return (
    <EnhancedErrorBoundary level="component" showErrorDetails={false} enableRetry={true} enableReporting={false} {...props}>
      {children}
    </EnhancedErrorBoundary>
  );
}
