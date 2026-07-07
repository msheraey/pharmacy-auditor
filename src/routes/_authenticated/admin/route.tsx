import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { useSession, useUserRoles, hasRole } from "@/lib/auth";
import { ClipboardCheck, ShieldAlert, Users, Building2, UserCheck } from "lucide-react";

const tabs = [
  { to: "/admin/checklist", label: "Checklist", icon: ClipboardCheck },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/branches", label: "Branches", icon: Building2 },
  { to: "/admin/staff", label: "Staff", icon: UserCheck },
] as const;

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
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
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Admin</h1>
        <p className="text-sm text-muted-foreground">Manage checklist, users, branches, and staff</p>
      </div>
      <nav className="flex gap-1 rounded-lg border bg-card p-1 shadow-xs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-all [&.active]:bg-primary [&.active]:text-primary-foreground [&.active]:shadow-xs text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </Link>
          );
        })}
      </nav>
      <Outlet />
    </div>
  );
}
