import { useState } from "react";
import { Bitcoin, Copy, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export function DonationButton({ asLink = false }: { asLink?: boolean } = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  
  const donationAddress = "bc1qakn7jw6wjuhr3t5mpgjaw5ppnsp7gwt4534php";

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(donationAddress);
      setCopied(true);
      toast({
        title: "Address copied!",
        description: "Bitcoin address has been copied to your clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {asLink ? (
          <button type="button" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-donate">
            Support (BTC)
          </button>
        ) : (
        <Button variant="outline" size="sm" className="flex items-center gap-2 text-orange-600 border-orange-200 hover:bg-orange-50">
          <Bitcoin className="h-4 w-4" />
          <span className="hidden sm:inline">Support BitcoinHub</span>
          <span className="sm:hidden">Donate</span>
        </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bitcoin className="h-5 w-5 text-orange-500" />
            Support BitcoinHub
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Help keep BitcoinHub running by sending any amount of Bitcoin to our donation address:
          </p>
          
          <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
            <code className="flex-1 text-sm font-mono break-all">
              {donationAddress}
            </code>
            <Button
              size="sm"
              variant="ghost"
              onClick={copyToClipboard}
              className="shrink-0"
            >
              {copied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-3">
              Scan QR code with your Bitcoin wallet:
            </p>
            <div className="mx-auto w-48 h-48 bg-muted/30 rounded-lg flex items-center justify-center">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=192x192&data=bitcoin:${donationAddress}`}
                alt="Bitcoin donation QR code"
                className="w-44 h-44 rounded-md"
              />
            </div>
          </div>
          
          <p className="text-xs text-center text-muted-foreground">
            Every donation helps us maintain this free Bitcoin resource. Thank you for your support! 🧡
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}