import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { GraduationCap, Users, Building2, Check } from "lucide-react";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/institutional")({
  head: () => ({
    meta: [
      { title: "For universities & trading clubs — MR_HRHR" },
      { name: "description", content: "MR_HRHR licenses for universities, trading clubs and broker education programs." },
    ],
  }),
  component: InstitutionalPage,
});

const AUDIENCES = [
  { icon: GraduationCap, title: "Universities", desc: "Finance courses with hands-on chart reading that's scored for reasoning, not luck." },
  { icon: Users, title: "Trading clubs", desc: "Private leaderboards and shared challenges for your members." },
  { icon: Building2, title: "Brokers", desc: "An education program that teaches risk management before clients trade real money." },
];

function InstitutionalPage() {
  const [sent, setSent] = useState(false);
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-electric">MR_HRHR for institutions</p>
        <h1 className="mt-2 text-4xl font-black">Teach trading the way it should be learned.</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Students mark structure, plan risk and explain their trades, and every part of it is scored. Good analysis wins over time.
        </p>

        <div className="mt-8 grid gap-3 md:grid-cols-3">
          {AUDIENCES.map((a) => (
            <div key={a.title} className="panel p-5">
              <a.icon className="h-6 w-6 text-electric" />
              <p className="mt-3 font-semibold">{a.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{a.desc}</p>
            </div>
          ))}
        </div>

        <div className="panel mt-8 p-6">
          {sent ? (
            <div className="flex flex-col items-center py-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-up/15">
                <Check className="h-6 w-6 text-up" />
              </div>
              <p className="mt-3 font-semibold">Thanks, we'll be in touch.</p>
              <p className="text-sm text-muted-foreground">(Preview: enquiries aren't sent anywhere yet.)</p>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSent(true);
              }}
              className="grid gap-4 md:grid-cols-2"
            >
              <h2 className="text-lg font-semibold md:col-span-2">Get in touch</h2>
              <Field label="Name" name="name" />
              <Field label="Email" name="email" type="email" />
              <Field label="Organisation" name="org" />
              <label className="text-sm">
                <span className="text-muted-foreground">Type</span>
                <select className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2">
                  <option>University</option>
                  <option>Trading club</option>
                  <option>Broker</option>
                  <option>Other</option>
                </select>
              </label>
              <label className="text-sm md:col-span-2">
                <span className="text-muted-foreground">How many learners?</span>
                <textarea rows={3} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2" />
              </label>
              <button className="rounded-lg bg-primary py-2.5 font-semibold text-primary-foreground md:col-span-2">Send enquiry</button>
            </form>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function Field({ label, name, type = "text" }: { label: string; name: string; type?: string }) {
  return (
    <label className="text-sm">
      <span className="text-muted-foreground">{label}</span>
      <input required name={name} type={type} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 outline-none focus:border-electric" />
    </label>
  );
}
