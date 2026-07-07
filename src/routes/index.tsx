import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardCheck, ShieldCheck, Camera, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Branch & Staff Auditor — Live pharmacy branch audits" },
      {
        name: "description",
        content:
          "Mobile-first branch and staff auditing for multi-branch pharmacy operations: scoring, evidence, knockouts, and revisit tracking.",
      },
      { property: "og:title", content: "Branch & Staff Auditor" },
      {
        property: "og:description",
        content: "Live, evidence-based pharmacy branch audits with scoring, knockouts, and revisit tracking.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2 font-semibold">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ClipboardCheck className="h-5 w-5" />
            </span>
            Branch Auditor
          </div>
          <Link
            to="/auth"
            className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-5xl px-4 py-16 md:py-24">
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
            Live branch and staff audits, from the shop floor.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            A mobile-first auditor for multi-branch pharmacy operations. Score branches
            and staff on the 5-point scale, capture photo evidence, flag knockouts, and
            trigger the right revisit — all in one visit.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/auth"
              className="inline-flex h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Get started
            </Link>
          </div>
        </section>

        <section className="border-t bg-card">
          <div className="mx-auto grid max-w-5xl gap-6 px-4 py-14 md:grid-cols-3">
            <Feature icon={<ClipboardCheck className="h-5 w-5" />} title="Structured checklists">
              Branch sections A1–A11 and staff sections B0–B4 seeded and ready. Weights,
              knockouts and delivery-only rules built in.
            </Feature>
            <Feature icon={<Camera className="h-5 w-5" />} title="Evidence-first scoring">
              Any score of 1 or 2 requires a photo or comment before a visit can be
              completed. Uploads are compressed on-device.
            </Feature>
            <Feature icon={<ShieldCheck className="h-5 w-5" />} title="Knockouts & revisits">
              Fridge out of range, licenses missing, expired bike registration — one
              knockout red-flags the visit and schedules a 7-day revisit.
            </Feature>
            <Feature icon={<TrendingUp className="h-5 w-5" />} title="People Index">
              Each staff audit feeds a cumulative running score, structured for your
              scheduling system to consume.
            </Feature>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto max-w-5xl px-4 py-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} Branch & Staff Auditor
        </div>
      </footer>
    </div>
  );
}

function Feature({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-background p-5">
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
        {icon}
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{children}</p>
    </div>
  );
}
