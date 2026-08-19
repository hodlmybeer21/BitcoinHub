// Shared types for lib/workbench/. Extracted to avoid circular imports
// when risk-blocks.ts needs the Series shape without pulling evaluate.ts.

export interface Series {
  date: string;       // 'YYYY-MM-DD'
  value: number;
}
