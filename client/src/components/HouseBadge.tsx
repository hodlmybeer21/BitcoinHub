'use client';

/**
 * HouseBadge — orange "BitcoinHub House" pill for officially-published
 * content. Identifies items where authorUuidPrefix === 'bitcoinh'
 * (first 8 chars of 'bitcoinhub-house' from
 * scripts/workbench-seed-house.js — the userId used by the seed script).
 *
 * Used on:
 *   - /workbench/backtests (gallery list)
 *   - /workbench/backtests/:id (detail page)
 *
 * Per Tyler's 2026-09-17 directive: "label these, some of ours" so
 * users can distinguish official BitcoinHub content from community.
 */

import { BadgeCheck } from 'lucide-react';

interface HouseBadgeProps {
  /** Optional className for positioning. */
  className?: string;
  /** Size variant: 'sm' (~10px, default) or 'xs' (~9px). */
  size?: 'sm' | 'xs';
}

/**
 * Identify an item as BitcoinHub House-published. The gallery list
 * endpoint returns `authorUuidPrefix` (8 chars) not the full userId;
 * the house userId is 'bitcoinhub-house' so the prefix is 'bitcoinh'.
 */
export function isHouseItem(authorUuidPrefix: string | undefined | null): boolean {
  return authorUuidPrefix === 'bitcoinh';
}

export function HouseBadge({ className, size = 'sm' }: HouseBadgeProps) {
  const sizeText = size === 'xs' ? 'text-[9px]' : 'text-[10px]';
  const sizeIcon = size === 'xs' ? 'h-2.5 w-2.5' : 'h-3 w-3';
  return (
    <span
      className={
        `inline-flex items-center gap-1 ${sizeText} px-1.5 py-0.5 rounded-md font-semibold ` +
        `bg-orange-500/15 text-orange-400 border border-orange-500/40 ` +
        (className || '')
      }
      title="Officially published by BitcoinHub"
      data-testid="house-badge"
    >
      <BadgeCheck className={sizeIcon} />
      <span>House</span>
    </span>
  );
}

export default HouseBadge;
