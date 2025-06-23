"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react";
import { useTranslations } from "next-intl";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  showDetails?: boolean;
}

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
  showDetails?: boolean;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("Error caught by boundary:", error, errorInfo);
    }

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // In production, you might want to send this to an error reporting service
    // Example: Sentry.captureException(error, { contexts: { react: errorInfo } });
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error!} resetError={this.resetError} showDetails={this.props.showDetails} />;
    }

    return this.props.children;
  }
}

function DefaultErrorFallback({ error, resetError, showDetails = false }: ErrorFallbackProps) {
  const t = useTranslations("errors");
  const [showErrorDetails, setShowErrorDetails] = React.useState(showDetails);

  const handleReload = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    window.location.href = "/";
  };

  const copyErrorToClipboard = async () => {
    const errorText = `Error: ${error.message}\nStack: ${error.stack}`;
    try {
      await navigator.clipboard.writeText(errorText);
      // You could show a toast notification here
    } catch (err) {
      console.error("Failed to copy error to clipboard:", err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-lg animate-fade-in">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-xl font-semibold">{t("somethingWentWrong")}</CardTitle>
          <CardDescription>{t("tryAgain")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Error message */}
          <div className="rounded-md bg-muted p-3">
            <p className="text-sm text-muted-foreground">{error.message || "An unexpected error occurred"}</p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={resetError} className="flex-1" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            <Button onClick={handleReload} variant="outline" className="flex-1" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Reload Page
            </Button>
            <Button onClick={handleGoHome} variant="outline" className="flex-1" size="sm">
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Button>
          </div>

          {/* Error details toggle */}
          <div className="border-t pt-4">
            <Button variant="ghost" size="sm" onClick={() => setShowErrorDetails(!showErrorDetails)} className="w-full">
              <Bug className="mr-2 h-4 w-4" />
              {showErrorDetails ? "Hide" : "Show"} Error Details
            </Button>

            {showErrorDetails && (
              <div className="mt-3 space-y-2">
                <div className="rounded-md bg-muted p-3">
                  <h4 className="text-sm font-medium mb-2">Error Stack:</h4>
                  <pre className="text-xs text-muted-foreground overflow-auto max-h-32 scrollbar-thin">{error.stack}</pre>
                </div>
                <Button variant="outline" size="sm" onClick={copyErrorToClipboard} className="w-full">
                  Copy Error Details
                </Button>
              </div>
            )}
          </div>

          {/* Contact support */}
          <div className="text-center text-sm text-muted-foreground">{t("contactSupport")}</div>
        </CardContent>
      </Card>
    </div>
  );
}

// Hook for functional components to handle errors
export function useErrorHandler() {
  return React.useCallback((error: Error, errorInfo?: React.ErrorInfo) => {
    console.error("Error caught by hook:", error, errorInfo);

    // In production, send to error reporting service
    // Example: Sentry.captureException(error);
  }, []);
}

// Higher-order component for wrapping components with error boundary
export function withErrorBoundary<P extends object>(Component: React.ComponentType<P>, errorBoundaryProps?: Omit<ErrorBoundaryProps, "children">) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

export default ErrorBoundary;
