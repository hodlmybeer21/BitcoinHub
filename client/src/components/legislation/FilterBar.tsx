// BitcoinHub — /legislation FilterBar
// Multi-select filters by category, priority, and stage. Client-side only —
// no server roundtrip needed. Renders the active filter count + reset button.

import { Badge } from "@/components/ui/badge";
import { Filter, X } from "lucide-react";
import type { LegislationCategory, LegislationPriority, BillStage } from "@/lib/legislation-data";

export interface LegislationFilters {
  category: Set<LegislationCategory>;
  priority: Set<LegislationPriority>;
  stage: Set<BillStage>;
}

interface Props {
  filters: LegislationFilters;
  onChange: (filters: LegislationFilters) => void;
}

const CATEGORY_OPTIONS: { value: LegislationCategory; label: string }[] = [
  { value: 'regulation', label: 'Regulation' },
  { value: 'stablecoin', label: 'Stablecoin' },
  { value: 'taxation', label: 'Taxation' },
  { value: 'innovation', label: 'Innovation' },
  { value: 'enforcement', label: 'Enforcement' },
];

const PRIORITY_OPTIONS: { value: LegislationPriority; label: string }[] = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const STAGE_OPTIONS: { value: BillStage; label: string }[] = [
  { value: 'introduced', label: 'Introduced' },
  { value: 'committee', label: 'In Committee' },
  { value: 'passed_chamber', label: 'Passed Chamber' },
  { value: 'conference', label: 'Conference' },
  { value: 'signed', label: 'Signed' },
  { value: 'dead', label: 'Stalled' },
];

function toggleSet<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export default function FilterBar({ filters, onChange }: Props) {
  const activeCount = filters.category.size + filters.priority.size + filters.stage.size;

  return (
    <div className="bg-card border border-muted/20 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Filter className="w-4 h-4" />
          <span>Filter</span>
          {activeCount > 0 && (
            <Badge variant="outline" className="text-xs border-primary/40 text-primary">
              {activeCount} active
            </Badge>
          )}
        </div>
        {activeCount > 0 && (
          <button
            onClick={() => onChange({ category: new Set(), priority: new Set(), stage: new Set() })}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="w-3 h-3" />
            Reset
          </button>
        )}
      </div>

      <div className="space-y-2">
        <FilterRow label="Category">
          {CATEGORY_OPTIONS.map(opt => (
            <FilterChip
              key={opt.value}
              active={filters.category.has(opt.value)}
              onClick={() => onChange({ ...filters, category: toggleSet(filters.category, opt.value) })}
            >
              {opt.label}
            </FilterChip>
          ))}
        </FilterRow>
        <FilterRow label="Priority">
          {PRIORITY_OPTIONS.map(opt => (
            <FilterChip
              key={opt.value}
              active={filters.priority.has(opt.value)}
              onClick={() => onChange({ ...filters, priority: toggleSet(filters.priority, opt.value) })}
            >
              {opt.label}
            </FilterChip>
          ))}
        </FilterRow>
        <FilterRow label="Stage">
          {STAGE_OPTIONS.map(opt => (
            <FilterChip
              key={opt.value}
              active={filters.stage.has(opt.value)}
              onClick={() => onChange({ ...filters, stage: toggleSet(filters.stage, opt.value) })}
            >
              {opt.label}
            </FilterChip>
          ))}
        </FilterRow>
      </div>
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs uppercase tracking-wider text-muted-foreground w-20 flex-shrink-0">{label}</span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-2.5 py-1 rounded-full border transition-colors
        ${active
          ? 'bg-primary border-primary text-primary-foreground'
          : 'bg-background border-muted/30 text-muted-foreground hover:border-primary/40 hover:text-foreground'
        }`}
    >
      {children}
    </button>
  );
}