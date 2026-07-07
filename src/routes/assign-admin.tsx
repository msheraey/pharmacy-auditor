import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { assignSuperAdmin } from "@/lib/assign-admin.functions";

export const Route = createFileRoute("/assign-admin")({
  ssr: false,
  component: AssignPage,
});

function AssignPage() {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4">
      <h1 className="text-xl font-semibold">Assign Super Admin</h1>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setMsg("");
          const email = (e.currentTarget.elements.namedItem("email") as HTMLInputElement).value;
          const res = await assignSuperAdmin(email);
          setMsg(res.message);
          setBusy(false);
        }}
        className="flex flex-col gap-3"
      >
        <input
          name="email"
          type="email"
          defaultValue="m.sheraey@outlook.com"
          className="h-10 w-80 rounded-md border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={busy}
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Working…" : "Assign Super Admin"}
        </button>
      </form>
      {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
    </div>
  );
}
