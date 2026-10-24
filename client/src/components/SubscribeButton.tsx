import { useState } from "react";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import SubstackSignup from "@/components/SubstackSignup";
import { NEWSLETTER_NAME, NEWSLETTER_TAGLINE } from "@/lib/newsletter";

/**
 * Header "Subscribe" button (replaces Donate). Opens the shared Substack embed in a dialog,
 * so the iframe only loads when someone asks for it and pages keep one in-page Substack CTA.
 */
export function SubscribeButton({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="bg-[#F7931A] hover:bg-[#E67500] text-black font-semibold"
          data-testid={compact ? "nav-subscribe-mobile" : "nav-subscribe"}
        >
          <Mail className="w-4 h-4 mr-1.5" />
          {compact ? "Subscribe" : "Subscribe — free"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{NEWSLETTER_NAME}</DialogTitle>
          <DialogDescription>
            {NEWSLETTER_TAGLINE} The free daily cycle chart, with sources, in your inbox.
          </DialogDescription>
        </DialogHeader>
        {open && <SubstackSignup height={150} />}
      </DialogContent>
    </Dialog>
  );
}

export default SubscribeButton;
