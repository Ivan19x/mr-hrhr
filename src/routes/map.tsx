import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Crown, Lock, Star, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { useProfile } from "@/hooks/use-profile";
import { STRATEGIES, TIERS } from "@/data/curriculum";
import { lockReason, strategyComplete, strategyStars, tierUnlocked, TIER_XP, TIER_RANK_NAME } from "@/lib/progression";

export const Route = createFileRoute("/map")({
  head: () => ({ meta: [{ title: "Strategy Map — MR_HRHR" }] }),
  component: MapPage,
});

function MapPage() {
  const profile = useProfile();
  const navigate = useNavigate();
  if (!profile) return <AppShell>{null}</AppShell>;

  return (
    <AppShell>
      <h1 className="text-3xl font-black">Strategy Map</h1>
      <p className="mt-1 text-muted-foreground">
        Four tiers, from reading a single candle to stacking confluence. Finish each strategy to open the next one, and earn XP to unlock the next tier.
      </p>

      <div className="relative mt-8">
        <div className="absolute bottom-0 left-5 top-0 w-0.5 bg-gradient-to-b from-electric via-border to-border md:left-1/2" />
        {TIERS.map((tier, ti) => {
          const unlocked = tierUnlocked(profile, tier.tier);
          const strategies = STRATEGIES.filter((s) => s.tier === tier.tier);
          const need = TIER_XP[tier.tier]!;
          return (
            <section key={tier.tier} className="relative mb-10">
              <div className="relative z-10 mb-4 flex items-center gap-3 md:justify-center">
                <div
                  className={`font-num flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-black ${
                    unlocked ? "border-electric bg-background text-electric" : "border-border bg-background text-muted-foreground"
                  }`}
                >
                  {tier.tier}
                </div>
                <div className="rounded-md bg-background/80 pr-2">
                  <p className="flex items-center gap-2 font-bold">
                    Tier {tier.tier}: {tier.name}
                    {tier.premium && (
                      <span className="flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-semibold text-gold">
                        <Crown className="h-3 w-3" /> Premium · free in beta
                      </span>
                    )}
                  </p>
                  {!unlocked && (
                    <div className="mt-1 w-56">
                      <p className="text-xs text-muted-foreground">
                        Unlocks at {need.toLocaleString()} XP ({TIER_RANK_NAME[tier.tier]}) · you have {profile.xp.toLocaleString()}
                      </p>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                        <div className="h-full bg-electric" style={{ width: `${Math.min(100, (profile.xp / need) * 100)}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="relative grid gap-3 pl-12 sm:grid-cols-2 md:pl-0 lg:grid-cols-3">
                {strategies.map((s, k) => {
                  const stars = strategyStars(profile, s.id);
                  const reason = lockReason(profile, s.id);
                  const done = strategyComplete(profile, s.id);
                  const open = reason === null;
                  return (
                    <motion.button
                      key={s.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: ti * 0.05 + k * 0.03 }}
                      onClick={() => {
                        if (!open) toast(`Locked: ${reason}.`);
                        else navigate({ to: "/levels/$strategyId", params: { strategyId: s.id } });
                      }}
                      className={`panel relative p-4 text-left transition-all ${
                        open
                          ? done
                            ? "border-up/50 hover:-translate-y-0.5"
                            : "border-electric/60 shadow-[0_0_24px_-10px_var(--color-electric)] hover:-translate-y-0.5 hover:border-electric"
                          : "opacity-60"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold">
                          <span className="font-num mr-1.5 text-xs text-muted-foreground">{k + 1}.</span>
                          {s.name}
                        </p>
                        {done ? <CheckCircle2 className="h-4 w-4 shrink-0 text-up" /> : !open ? <Lock className="h-4 w-4 shrink-0 text-muted-foreground" /> : null}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{s.description}</p>
                      <div className="mt-3 flex items-center justify-between text-xs">
                        <span className="font-num flex items-center gap-1 text-gold">
                          <Star className="h-3.5 w-3.5 fill-gold" /> {stars.earned}/{stars.max}
                        </span>
                        {open ? <span className="font-semibold text-electric">{done ? "Replay →" : "Play →"}</span> : <span className="text-[11px] text-gold">🔒 {reason}</span>}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </AppShell>
  );
}
