import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { useSession, useUserRoles, hasRole } from "@/lib/auth";
import { ClipboardCheck, Settings, ShieldAlert } from "lucide-react";

const tabs = [
  { to: "/admin/checklist", label: "Checklist" },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/branches", label: "Branches" },
  { to: "/admin/staff", label: "Staff" },
] as const;

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — Branch Auditor" }] }),
  component: AdminLayout,
});

function AdminLayout() {
  const { user } = useSession();
  const { roles } = useUserRoles(user?.id);
  const isAdmin = hasRole(roles, "super_admin");

  if (!isAdmin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-sm text-center space-y-4">
          <ShieldAlert className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="text-xl font-semibold">Access denied</h1>
          <p className="text-sm text-muted-foreground">
            Only super admins can access the admin panel.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Admin</h1>
      </div>
      <nav className="flex gap-1 rounded-lg border bg-card p-1 text-sm">
        {tabs.map((tab) => (
          <Link
            key={tab.to}
            to={tab.to}
            className="flex-1 rounded-md px-3 py-2 text-center font-medium transition [&.active]:bg-primary [&.active]:text-primary-foreground text-muted-foreground hover:bg-muted"
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
