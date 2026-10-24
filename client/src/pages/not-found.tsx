import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4" data-testid="not-found">
      <div className="max-w-md w-full text-center space-y-3">
        <p className="text-sm font-mono text-primary">404</p>
        <h1 className="text-3xl font-bold text-foreground">Page not found</h1>
        <p className="text-muted-foreground">
          This page doesn't exist or has moved. The cycle overview is a good place to start.
        </p>
        <div className="flex items-center justify-center gap-4 pt-2 text-sm">
          <Link href="/cycle" className="text-primary hover:underline">Where are we in the cycle? →</Link>
          <Link href="/" className="text-muted-foreground hover:text-foreground">Home</Link>
        </div>
      </div>
    </div>
  );
}
