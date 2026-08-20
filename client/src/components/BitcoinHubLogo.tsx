import React from "react";

/**
 * BitcoinHubLogo — shared brand mark.
 *
 * The icon is an orange circle containing a stylized white line that traces
 * one full peak-and-trough of the 4-year halving cycle. Reads as a single
 * unique mark instead of a generic crypto icon, and ties the visual identity
 * to the site's core thesis (cycles).
 *
 * The orange + white palette matches the project's existing `primary` token,
 * so it sits naturally on dark cards and the site shell.
 *
 * Variants:
 *   - "icon"        — orange circle + cycle wave only (favicon-friendly)
 *   - "wordmark"    — orange circle + ₿ BitcoinHub text
 *   - "full"        — same as "wordmark", kept as an alias for clarity
 *
 * Size is interpreted as the icon width in Tailwind units (default `w-8 h-8`
 * in Navbar, `w-7 h-7` in mobile Navbar, `w-5 h-5` in Footer).
 */

type LogoVariant = "icon" | "wordmark" | "full";

export interface BitcoinHubLogoProps {
  /** Tailwind width/height class, e.g. "w-8 h-8". Defaults to "w-8 h-8". */
  size?: string;
  /** Which parts to render. Default "wordmark". */
  variant?: LogoVariant;
  /** ClassName passed through to the outer wrapper. */
  className?: string;
  /**
   * Override the inner SVG sizing. Defaults to the same as `size`.
   * Use this when the wrapper needs different padding than the SVG itself.
   */
  iconSize?: string;
}

/**
 * Inner mark: orange circle + white cycle wave.
 * viewBox 0 0 32 32 — the wave path was hand-tuned for stroke width 1.6.
 */
const CycleMark: React.FC<{ size: string }> = ({ size }) => (
  <svg
    viewBox="0 0 32 32"
    className={size}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    {/* Orange circle background — same #F7931A as before */}
    <circle cx="16" cy="16" r="16" fill="#F7931A" />
    {/* White cycle wave: rise, peak, fall, trough, rise back to start.
        Stylized single-peak single-trough over a 4-year halving cycle. */}
    <path
      d="M5 21 C 8 21, 10 14, 13 11 C 15 8.6, 17 8.5, 19 11.4 C 21 14.5, 22.5 19, 25 21 L 27 21"
      stroke="white"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    {/* Faint baseline tick so the wave reads as a chart, not a scribble */}
    <line
      x1="5"
      y1="21"
      x2="27"
      y2="21"
      stroke="white"
      strokeOpacity="0.35"
      strokeWidth="0.8"
      strokeLinecap="round"
    />
    {/* Small dot marking "today" position (right edge of trough) */}
    <circle cx="27" cy="21" r="1.1" fill="white" />
  </svg>
);

export const BitcoinHubLogo: React.FC<BitcoinHubLogoProps> = ({
  size = "w-8 h-8",
  variant = "wordmark",
  className = "",
  iconSize,
}) => {
  const iconClass = iconSize ?? size;

  if (variant === "icon") {
    return (
      <span className={`inline-flex items-center ${className}`}>
        <CycleMark size={iconClass} />
      </span>
    );
  }

  // "wordmark" and "full" share the same composition
  return (
    <span className={`flex items-center ${className}`}>
      <CycleMark size={iconClass} />
      <span className="ml-2 text-xl font-bold text-foreground whitespace-nowrap">
        <span className="text-primary">₿</span> BitcoinHub
      </span>
    </span>
  );
};

export default BitcoinHubLogo;