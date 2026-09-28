// Paywall for Tiers 3–4. Mock only — there is no real payment.
import { Crown, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";

const PERKS = [
  "Tier 3 — Smart Money Concepts",
  "Tier 4 — Combined Setups & Timing",
  "Advanced strategy packs",
  "Detailed concept-by-concept stats",
];

export function PremiumDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-gold/40">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-gold/15">
            <Crown className="h-7 w-7 text-gold" />
          </div>
          <DialogTitle className="text-center text-2xl">Unlock MR_HRHR Premium</DialogTitle>
          <DialogDescription className="text-center">
            Go beyond structure. Learn how the big players move price.
          </DialogDescription>
        </DialogHeader>
        <ul className="my-2 space-y-2">
          {PERKS.map((p) => (
            <li key={p} className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-up" /> {p}
            </li>
          ))}
        </ul>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Monthly", price: "$6.99", sub: "per month" },
            { label: "Yearly", price: "$49.99", sub: "save 40%" },
          ].map((plan) => (
            <button
              key={plan.label}
              onClick={() => {
                toast("Payments aren't live yet", { description: "Premium will be available at launch." });
                onOpenChange(false);
              }}
              className="panel p-4 text-center transition-colors hover:border-gold"
            >
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{plan.label}</p>
              <p className="font-num mt-1 text-2xl font-bold">{plan.price}</p>
              <p className="text-xs text-gold">{plan.sub}</p>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
