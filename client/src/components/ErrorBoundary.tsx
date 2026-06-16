import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  label?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Defensive error boundary — keeps the rest of the page alive if any
 * sub-component throws during render. Shows a compact "this widget is
 * unavailable" card instead of a blank page.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log for debugging — Vercel + browser devtools both pick this up
    console.error(`[ErrorBoundary${this.props.label ? ` ${this.props.label}` : ""}]`, error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="bg-red-950/30 border border-red-800/40 rounded-lg p-4 text-sm">
          <div className="flex items-center gap-2 text-red-300 font-semibold mb-1">
            <AlertTriangle className="h-4 w-4" />
            {this.props.label || "This widget"} is temporarily unavailable
          </div>
          <div className="text-red-200/60 text-xs">
            {this.state.error?.message || "An unexpected error occurred."}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
