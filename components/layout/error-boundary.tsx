"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { logger } from "@/lib/error-handling";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error("error-boundary", error.message, {
      componentStack: errorInfo.componentStack ?? "",
      errorName: error.name,
    });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
          <div>
            <AlertCircle className="mx-auto mb-2 h-8 w-8 text-destructive" />
            <h3 className="text-lg font-semibold text-foreground">
              Something went wrong
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Try again
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
