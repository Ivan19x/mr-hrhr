// App chrome shared by every non-game screen: header with rank + sync status,
// bottom nav on mobile, top nav on desktop, and the institutional footer link.
import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Cloud, CloudOff, Home, Gamepad2, Trophy, User, Settings, RefreshCw, GraduationCap, BrainCircuit } from "lucide-react";
import { isApp } from "@/lib/platform";
import { useProfile } from "@/hooks/use-profile";
import { useOnline } from "@/hooks/use-online";
import { pendingCount } from "@/services/syncService";
import { subscribeProfile } from "@/services/progressService";
import { rankForXp } from "@/data/curriculum";
import { RankBadge } from "./RankBadge";
import { Logo } from "./Logo";

const NAV = [
  { to: "/home", label: "Home", icon: Home, mobile: true },
  { to: "/academy", label: "Academy", icon: GraduationCap, mobile: true },
  { to: "/map", label: "Play", icon: Gamepad2, mobile: true },
  { to: "/analyst", label: "Analyst", icon: BrainCircuit, mobile: true },
  { to: "/leaderboards", label: "Ranks", icon: Trophy, mobile: false },
  { to: "/profile", label: "Profile", icon: User, mobile: true },
] as const;

function isActive(path: string, to: string) {
  if (to === "/map") return path.startsWith("/map") || path.startsWith("/levels");
  if (to === "/academy") return path.startsWith("/academy") || path.startsWith("/glossary");
  return path.startsWith(to);
}

/** Offline / sync status. Only meaningful in the installed app. */
export function SyncIndicator() {
  const online = useOnline();
  const [pending, setPending] = useState(0);
  const [app, setApp] = useState(false);
  useEffect(() => {
    setApp(isApp());
  }, []);
  useEffect(() => {
    const refresh = () => pendingCount().then(setPending).catch(() => {});
    refresh();
    const off = subscribeProfile(refresh);
    const iv = setInterval(refresh, 10000);
    return () => {
      off();
      clearInterval(iv);
    };
  }, []);
  if (!app) return null;
  if (!online)
    return (
      <span title="Offline — progress is saved on this device" className="flex items-center gap-1 text-xs text-muted-foreground">
        <CloudOff className="h-4 w-4" /> Offline
      </span>
    );
  if (pending > 0)
    return (
      <span title={`${pending} result(s) waiting to sync`} className="flex items-center gap-1 text-xs text-gold">
        <RefreshCw className="h-4 w-4" /> {pending}
      </span>
    );
  return (
    <span title="All progress synced" className="flex items-center gap-1 text-xs text-up">
      <Cloud className="h-4 w-4" />
    </span>
  );
}

export function AppShell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  const profile = useProfile();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const rank = profile ? rankForXp(profile.xp) : null;

  return (
    <div className="flex min-h-screen flex-col bg-background pb-16 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className={`mx-auto flex h-14 items-center gap-4 px-4 ${wide ? "max-w-7xl" : "max-w-6xl"}`}>
          <Link to="/home" className="shrink-0">
            <Logo size="sm" />
          </Link>
          <nav className="ml-4 hidden items-center gap-1 md:flex">
            {NAV.map((n) => {
              const active = isActive(path, n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    active ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-4">
            <SyncIndicator />
            {profile && (
              <div className="hidden text-right sm:block">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Balance</p>
                <p className="font-num text-sm font-semibold">${profile.balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
            )}
            <Link to="/settings" title="Settings" className={`rounded-md p-1.5 ${path.startsWith("/settings") ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              <Settings className="h-5 w-5" />
            </Link>
            {rank && (
              <Link to="/profile" className="flex items-center gap-2">
                <RankBadge index={rank.index} sub={rank.sub} size={30} />
                <span className="hidden text-sm font-semibold lg:inline">{rank.name}</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className={`mx-auto w-full flex-1 px-4 py-6 ${wide ? "max-w-7xl" : "max-w-6xl"}`}>{children}</main>

      <footer className="hidden border-t border-border py-6 text-center text-xs text-muted-foreground md:block">
        MR_HRHR · Virtual balances only — no real money ·{" "}
        <Link to="/institutional" className="text-electric hover:underline">
          For universities &amp; trading clubs
        </Link>
      </footer>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-card md:hidden">
        {NAV.filter((n) => n.mobile).map((n) => {
          const active = isActive(path, n.to);
          const Icon = n.icon;
          return (
            <Link
              key={n.to}
              to={n.to}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${
                active ? "text-electric" : "text-muted-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              {n.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
