import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Lock } from "lucide-react";
import { Logo } from "@/components/Logo";
import { AuthError, getCurrentUser, hasAnyAccount, register, signIn } from "@/services/authService";

export const Route = createFileRoute("/")({
  component: Splash,
});

// Decorative candles rising behind the logo.
const BG = Array.from({ length: 36 }, (_, k) => {
  const base = 40 + Math.sin(k / 3) * 18 + k * 1.4;
  const up = Math.sin(k * 1.7) > -0.3;
  return { k, base, up, body: 6 + ((k * 7) % 11), wick: 4 + ((k * 5) % 7) };
});

type Mode = "signin" | "register";

function Splash() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [mode, setMode] = useState<Mode>("register");
  const [name, setName] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getCurrentUser().then((u) => {
      if (u) navigate({ to: "/home", replace: true });
      else {
        setMode(hasAnyAccount() ? "signin" : "register");
        setChecking(false);
      }
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (mode === "register" && pw !== pw2) return setError("Passwords don't match.");
    setBusy(true);
    try {
      if (mode === "register") await register(name, pw);
      else await signIn(name, pw);
      navigate({ to: "/home" });
    } catch (err) {
      setError(err instanceof AuthError ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-6 py-10">
      <svg className="absolute inset-x-0 bottom-0 h-2/3 w-full opacity-[0.18]" viewBox="0 0 360 120" preserveAspectRatio="none" aria-hidden>
        {BG.map((c) => (
          <motion.g key={c.k} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: c.k * 0.04 }}>
            <line x1={c.k * 10 + 5} x2={c.k * 10 + 5} y1={120 - c.base - c.body - c.wick} y2={120 - c.base + c.wick} stroke={c.up ? "var(--color-up)" : "var(--color-down)"} strokeWidth="0.8" />
            <rect x={c.k * 10 + 2} y={120 - c.base - c.body} width="6" height={c.body} fill={c.up ? "var(--color-up)" : "var(--color-down)"} />
          </motion.g>
        ))}
      </svg>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,var(--color-background)_75%)]" />

      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }} className="relative z-10 flex w-full flex-col items-center text-center">
        <Logo size="lg" />
        <p className="mt-4 max-w-md text-lg text-muted-foreground">
          Learn to trade on real charts. Earn points for <span className="text-foreground">analysis</span>, not luck.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Virtual balance only. No real money, ever.</p>

        {!checking && (
          <motion.form
            onSubmit={submit}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="panel mt-8 w-full max-w-sm p-6 text-left"
          >
            <div className="mb-5 grid grid-cols-2 rounded-lg bg-secondary p-1 text-sm">
              {(
                [
                  ["register", "Create profile"],
                  ["signin", "Sign in"],
                ] as [Mode, string][]
              ).map(([m, label]) => (
                <button
                  type="button"
                  key={m}
                  onClick={() => {
                    setMode(m);
                    setError(null);
                  }}
                  className={`rounded-md py-1.5 font-medium ${mode === m ? "bg-background shadow" : "text-muted-foreground"}`}
                >
                  {label}
                </button>
              ))}
            </div>

            <label className="block text-sm">
              <span className="text-muted-foreground">Username</span>
              <input
                autoFocus
                autoComplete="username"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. chart_hunter"
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 outline-none focus:border-electric"
              />
            </label>
            <label className="mt-3 block text-sm">
              <span className="text-muted-foreground">Password</span>
              <div className="relative mt-1">
                <input
                  type={show ? "text" : "password"}
                  autoComplete={mode === "register" ? "new-password" : "current-password"}
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 pr-10 outline-none focus:border-electric"
                />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label="Show password">
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>
            {mode === "register" && (
              <label className="mt-3 block text-sm">
                <span className="text-muted-foreground">Confirm password</span>
                <input
                  type={show ? "text" : "password"}
                  autoComplete="new-password"
                  value={pw2}
                  onChange={(e) => setPw2(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 outline-none focus:border-electric"
                />
              </label>
            )}

            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

            <button
              disabled={busy || !name || !pw}
              className="mt-5 w-full rounded-xl bg-primary py-3 font-bold text-primary-foreground shadow-[0_0_30px_-5px_var(--color-electric)] disabled:opacity-50"
            >
              {busy ? "…" : mode === "register" ? "Create profile & start" : "Sign in"}
            </button>

            <p className="mt-4 flex gap-2 text-[11px] leading-relaxed text-muted-foreground">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Your profile and password are saved only in this browser, on this device. Clearing browser data removes them, and there's no password recovery yet.
            </p>
          </motion.form>
        )}
      </motion.div>
    </div>
  );
}
