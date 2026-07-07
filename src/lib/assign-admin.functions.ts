import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const assignSuperAdmin = createServerFn({ method: "POST" })
  .validator((email: string) => email)
  .handler(async ({ data: email }) => {
    const { data: users, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
    if (listErr) throw new Error(listErr.message);

    const user = users.users.find((u) => u.email === email);
    if (!user) return { ok: false, message: `User "${email}" not found. Sign up at /auth first.` };

    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: user.id, role: "super_admin" });

    if (roleErr && roleErr.code === "23505")
      return { ok: true, message: "Already a super admin!" };
    if (roleErr) throw new Error(roleErr.message);

    return { ok: true, message: `${email} is now a super admin. Refresh the app.` };
  });
