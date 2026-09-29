import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useProfile } from "@/hooks/use-profile";
import { resetProgress, updateSettings } from "@/services/progressService";
import { AuthError, changePassword, currentUserSync, deleteAccount, signOut } from "@/services/authService";
import { deleteUserData } from "@/services/db";
import { sfx } from "@/lib/sound";
import { resetGuide } from "@/components/WebGuide";
import type { Profile } from "@/types/game";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — MR_HRHR" }] }),
  component: SettingsPage,
});

const SCHEMES: { id: Profile["settings"]["chartColors"]; label: string; up: string; down: string }[] = [
  { id: "classic", label: "Classic", up: "#22c55e", down: "#ef4444" },
  { id: "colorblind", label: "Colour-blind", up: "#3b82f6", down: "#f97316" },
  { id: "mono", label: "Monochrome", up: "#e5e7eb", down: "#4b5563" },
];

function SettingsPage() {
  const profile = useProfile();
  const navigate = useNavigate();
  const [confirmReset, setConfirmReset] = useState(false);
  if (!profile) return <AppShell>{null}</AppShell>;
  const s = profile.settings;
  const set = (patch: Partial<Profile["settings"]>) => updateSettings({ ...s, ...patch });

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-black">Settings</h1>

        <div className="panel mt-6 divide-y divide-border">
          <Row title="Sound" desc="Clicks, trade fills, wins and fines.">
            <Switch
              checked={s.sound}
              onCheckedChange={(v) => {
                set({ sound: v });
                if (v) setTimeout(sfx.win, 50);
              }}
            />
          </Row>
          <Row title="Tutorials" desc="Show the tutorial the first time you open a strategy.">
            <Switch checked={s.tutorials} onCheckedChange={(v) => set({ tutorials: v })} />
          </Row>
          <Row title="Theme" desc="Dark is the default trading-terminal look.">
            <div className="flex rounded-lg bg-secondary p-1">
              {(["dark", "light"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => set({ theme: t })}
                  className={`rounded-md px-3 py-1 text-sm capitalize ${s.theme === t ? "bg-background shadow" : "text-muted-foreground"}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </Row>
          <div className="p-5">
            <p className="font-medium">Chart colours</p>
            <p className="text-sm text-muted-foreground">Pick candle colours that are easy for you to read.</p>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {SCHEMES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => set({ chartColors: c.id })}
                  className={`rounded-lg border-2 p-3 transition-colors ${s.chartColors === c.id ? "border-electric" : "border-border hover:border-muted-foreground/40"}`}
                >
                  <svg viewBox="0 0 60 30" className="mx-auto h-8 w-full">
                    {[0, 1, 2, 3, 4].map((k) => {
                      const up = k % 2 === 0;
                      const y = 18 - k * 2.5;
                      return (
                        <g key={k}>
                          <line x1={6 + k * 12} x2={6 + k * 12} y1={y - 6} y2={y + 10} stroke={up ? c.up : c.down} />
                          <rect x={2 + k * 12} y={y} width="8" height="7" fill={up ? c.up : c.down} />
                        </g>
                      );
                    })}
                  </svg>
                  <p className="mt-1 text-xs">{c.label}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="panel mt-6 divide-y divide-border">
          <Row title="Sign out" desc="Your progress stays saved on this device.">
            <button
              onClick={async () => {
                await signOut();
                navigate({ to: "/" });
              }}
              className="rounded-lg bg-secondary px-4 py-1.5 text-sm font-medium"
            >
              Sign out
            </button>
          </Row>
          <Row title="Reset progress" desc="Clears XP, stars, badges and stats on this device.">
            <button onClick={() => setConfirmReset(true)} className="rounded-lg bg-destructive/15 px-4 py-1.5 text-sm font-medium text-destructive">
              Reset
            </button>
          </Row>
        </div>

        <div className="panel mt-6 divide-y divide-border">
          <Row title="Quick guide" desc="Take the short tour of the site again.">
            <button
              onClick={() => {
                resetGuide();
                navigate({ to: "/home" });
              }}
              className="rounded-lg bg-secondary px-4 py-1.5 text-sm font-medium"
            >
              Replay guide
            </button>
          </Row>
        </div>

        <AccountSection />
      </div>

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset all progress?</AlertDialogTitle>
            <AlertDialogDescription>This deletes your XP, stars, badges and stats on this device. It can't be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                await resetProgress();
                toast("Progress reset");
              }}
            >
              Reset progress
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

function Row({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 p-5">
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
      {children}
    </div>
  );
}

function AccountSection() {
  const navigate = useNavigate();
  const me = currentUserSync();
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [delPw, setDelPw] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setMsg(null);
    try {
      await fn();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof AuthError ? e.message : "Something went wrong." });
    }
  };

  return (
    <div className="panel mt-6 p-5">
      <p className="font-medium">Account</p>
      <p className="text-sm text-muted-foreground">
        Signed in as <span className="font-semibold text-foreground">{me?.name}</span>. Stored only on this device. Cloud accounts come later.
      </p>
      <form
        className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            await changePassword(cur, next);
            setCur("");
            setNext("");
            setMsg({ ok: true, text: "Password changed." });
          });
        }}
      >
        <input type="password" autoComplete="current-password" placeholder="Current password" value={cur} onChange={(e) => setCur(e.target.value)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm" />
        <input type="password" autoComplete="new-password" placeholder="New password" value={next} onChange={(e) => setNext(e.target.value)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm" />
        <button disabled={!cur || !next} className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium disabled:opacity-40">
          Change password
        </button>
      </form>
      {msg && <p className={`mt-2 text-sm ${msg.ok ? "text-up" : "text-destructive"}`}>{msg.text}</p>}
      <div className="mt-5 border-t border-border pt-4">
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)} className="text-sm text-destructive hover:underline">
            Delete this profile from the device…
          </button>
        ) : (
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              run(async () => {
                const id = await deleteAccount(delPw);
                await deleteUserData(id);
                toast("Profile deleted");
                navigate({ to: "/" });
              });
            }}
          >
            <p className="w-full text-sm text-muted-foreground">This permanently removes your profile, progress and trade journal. Enter your password to confirm.</p>
            <input type="password" placeholder="Password" value={delPw} onChange={(e) => setDelPw(e.target.value)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm" />
            <button disabled={!delPw} className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground disabled:opacity-40">
              Delete permanently
            </button>
            <button type="button" onClick={() => setConfirmDelete(false)} className="text-sm text-muted-foreground">
              Cancel
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

