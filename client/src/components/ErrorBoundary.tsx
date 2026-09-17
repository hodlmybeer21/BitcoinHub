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
  componentStack?: string;
}

/**
 * Defensive error boundary — keeps the rest of the page alive if any
 * sub-component throws during render. Shows a compact "this widget is
 * unavailable" card instead of a blank page.
 *
 * Includes the React component stack in the diagnostic so we can locate
 * the throw site without browser DevTools (Recharts 2.15.x "Invariant
 * failed" gives almost no useful info otherwise).
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
    this.setState({ componentStack: info.componentStack });
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
          <div className="text-red-200/60 text-xs font-mono">
            {this.state.error?.message || "An unexpected error occurred."}
          </div>
          {this.state.componentStack && (
            <details className="mt-2">
              <summary className="text-red-300/60 text-[10px] cursor-pointer hover:text-red-300">
                Component stack
              </summary>
              <pre className="mt-1 text-[10px] text-red-200/50 whitespace-pre-wrap break-all max-h-40 overflow-auto">
                {this.state.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
