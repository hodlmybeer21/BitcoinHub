import { ExternalLink } from "lucide-react";
import { NEWSLETTER_NAME, SUBSTACK_EMBED_URL, SUBSTACK_SUBSCRIBE_URL } from "@/lib/newsletter";

interface SubstackSignupProps {
  /** iframe height in px. Substack's embed needs ~150px for the form alone, ~320px with the header. */
  height?: number;
  className?: string;
}

/**
 * Shared newsletter signup: Substack's official embed (it sends the confirmation email
 * and handles unsubscribes). The plain link below works without JS or if the iframe is blocked.
 */
export default function SubstackSignup({ height = 320, className = "" }: SubstackSignupProps) {
  return (
    <div className={`w-full ${className}`} data-testid="substack-signup">
      <iframe
        src={SUBSTACK_EMBED_URL}
        title={`Subscribe to ${NEWSLETTER_NAME} on Substack`}
        width="100%"
        height={height}
        loading="lazy"
        scrolling="no"
        frameBorder={0}
        className="w-full rounded-lg border border-muted/30 bg-transparent"
        style={{ background: "transparent" }}
      />
      <p className="text-xs text-muted-foreground text-center mt-2">
        Free to subscribe, unsubscribe any time. Not financial advice.{" "}
        <a
          href={SUBSTACK_SUBSCRIBE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-primary hover:underline"
        >
          Subscribe on Substack <ExternalLink className="w-3 h-3" />
        </a>
      </p>
    </div>
  );
}
