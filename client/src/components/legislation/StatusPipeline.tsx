// BitcoinHub — /legislation StatusPipeline
// 5-step horizontal progress bar showing a bill's current stage in the
// legislative process. Replaces the "passage chance %" as a more honest
// visual signal: a step further along the pipeline = closer to becoming
// law (or already law).

import { Check } from "lucide-react";
import { PIPELINE_STAGES, STAGE_LABEL, STAGE_DESCRIPTION, type BillStage } from "@/lib/legislation-data";

interface Props {
  currentStage: BillStage;
  billName: string;
}

export default function StatusPipeline({ currentStage, billName }: Props) {
  // Map currentStage to an index. "dead" and "vetoed" are off-pipeline.
  const isOffPipeline = currentStage === 'dead' || currentStage === 'vetoed';
  const currentIdx = isOffPipeline ? -1 : PIPELINE_STAGES.indexOf(currentStage as BillStage);

  if (isOffPipeline) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="font-semibold text-red-500 text-sm">
            {STAGE_LABEL[currentStage]}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{STAGE_DESCRIPTION[currentStage]}</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        {PIPELINE_STAGES.map((stage, idx) => {
          const isCompleted = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          return (
            <div key={stage} className="flex flex-col items-center flex-1">
              <div className="flex items-center w-full">
                {/* Connector line to the left (except for first stage) */}
                {idx > 0 && (
                  <div className={`flex-1 h-0.5 ${idx <= currentIdx ? 'bg-primary' : 'bg-muted/30'}`} />
                )}
                {/* The dot */}
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors
                    ${isCompleted ? 'bg-primary border-primary text-primary-foreground' : ''}
                    ${isCurrent ? 'bg-primary border-primary text-primary-foreground ring-4 ring-primary/20' : ''}
                    ${!isCompleted && !isCurrent ? 'bg-background border-muted/40 text-muted-foreground' : ''}
                  `}
                  aria-label={`${STAGE_LABEL[stage]}${isCurrent ? ' (current)' : isCompleted ? ' (completed)' : ''}`}
                >
                  {isCompleted ? <Check className="w-3 h-3" /> : <span className="text-[10px] font-semibold">{idx + 1}</span>}
                </div>
                {/* Connector line to the right (except for last stage) */}
                {idx < PIPELINE_STAGES.length - 1 && (
                  <div className={`flex-1 h-0.5 ${idx < currentIdx ? 'bg-primary' : 'bg-muted/30'}`} />
                )}
              </div>
              <div className={`mt-2 text-[10px] font-medium text-center ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>
                {STAGE_LABEL[stage]}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground mt-3 italic text-center">
        Currently at: <span className="font-medium text-foreground">{STAGE_LABEL[currentStage]}</span> — {STAGE_DESCRIPTION[currentStage as BillStage]}
      </p>
      <span className="sr-only">Pipeline stage for {billName}: {STAGE_LABEL[currentStage]}</span>
    </div>
  );
}