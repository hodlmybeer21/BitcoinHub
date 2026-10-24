import type { ReactNode } from "react";

/** Shared layout for the plain-language legal pages (/privacy, /terms). */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <div className="max-w-3xl mx-auto py-8 sm:py-12">
      <h1 className="text-3xl sm:text-4xl font-bold text-foreground">{title}</h1>
      <p className="text-xs text-muted-foreground mt-2">Last updated {updated}</p>
      <div className="mt-8 space-y-6 text-sm sm:text-base text-muted-foreground leading-relaxed [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mb-2 [&_a]:text-primary [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
        {children}
      </div>
    </div>
  );
}
