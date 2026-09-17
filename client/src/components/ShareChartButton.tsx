'use client';

/**
 * ShareChartButton — reusable Share-to-X button for chart cards.
 *
 * Used on every shareable chart surface across BitcoinHub
 * (cycle compare, risk metric, MPT optimizer, workbench backtests).
 * Opens a prefilled X (Twitter) intent in a new tab.
 *
 * Follows the same <Button asChild><a target="_blank" /></Button>
 * pattern as CycleNow + CyclePositionWidget so the button is
 * accessible (right-clickable, middle-clickable, JS-optional).
 *
 * Per Tyler's review (2026-09-17): this is the primary viral
 * loop. Each chart produces a unique, compelling artifact
 * (cycle comparison, risk band, backtest equity curve, MPT
 * optimization) that people naturally want to share.
 */

import { Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ShareChartButtonProps {
  /** The pre-built share text. Pass raw text; we URL-encode it. Should usually include the URL to share. */
  text: string;
  /** Optional button label override. */
  label?: string;
  /** Optional variant override. */
  variant?: 'default' | 'outline' | 'ghost' | 'secondary' | 'link';
  /** Optional size override. */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  /** Optional className for positioning (e.g. absolute top-right). */
  className?: string;
  /** Optional title override for the tooltip. */
  title?: string;
}

export function ShareChartButton({
  text,
  label = 'Share to X',
  variant = 'outline',
  size = 'sm',
  className,
  title = 'Share this chart on X',
}: ShareChartButtonProps) {
  const url = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
  return (
    <Button asChild variant={variant} size={size} className={className} title={title}>
      <a href={url} target="_blank" rel="noopener noreferrer">
        <Share2 className="h-3 w-3 mr-1" />
        {label}
      </a>
    </Button>
  );
}

export default ShareChartButton;
