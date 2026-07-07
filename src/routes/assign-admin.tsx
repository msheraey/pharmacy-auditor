import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/assign-admin")({
  ssr: true,
  loader: async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const email = "m.sheraey@yahoo.com";
    const { data: users, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
    if (listErr) return { error: listErr.message };

    const user = users.users.find((u) => u.email === email);
    if (!user) return { error: `User "${email}" not found. Sign up at /auth first.` };

    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: user.id, role: "super_admin" });

    if (roleErr && roleErr.code === "23505")
      return { message: "Already a super admin!" };
    if (roleErr) return { error: roleErr.message };

    return { message: `Done! ${email} is now a super admin.` };
  },
  component: AssignPage,
});

function AssignPage() {
  const data = Route.useLoaderData();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4">
      {data.error ? (
        <>
          <h1 className="text-xl font-semibold text-destructive">Error</h1>
          <p className="text-sm text-muted-foreground">{data.error}</p>
        </>
      ) : (
        <>
          <h1 className="text-xl font-semibold text-green-700">Success</h1>
          <p className="text-sm text-muted-foreground">{data.message}</p>
        </>
      )}
    </div>
  );
}
