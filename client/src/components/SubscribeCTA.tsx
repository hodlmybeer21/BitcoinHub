import { ArrowRight } from "lucide-react";
import { NEWSLETTER_NAME, SUBSTACK_SUBSCRIBE_URL } from "@/lib/newsletter";

/** Compact one-line Substack CTA for pages that do not carry the full embed. Use at most once per page. */
export function SubscribeCTA({ text = "Get tomorrow's cycle chart in your inbox, sourced and free." }: { text?: string }) {
  return (
    <a
      href={SUBSTACK_SUBSCRIBE_URL}
      target="_blank"
      rel="noopener noreferrer"
      data-testid="subscribe-cta"
      className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-[#F7931A]/25 bg-[#F7931A]/[0.04] px-4 py-3 text-sm hover:border-[#F7931A]/50 transition-colors"
    >
      <span className="text-muted-foreground">{text}</span>
      <span className="inline-flex items-center gap-1 font-medium text-[#F7931A] whitespace-nowrap">
        {NEWSLETTER_NAME} on Substack <ArrowRight className="w-4 h-4" />
      </span>
    </a>
  );
}

export default SubscribeCTA;
