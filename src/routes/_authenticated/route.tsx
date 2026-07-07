import { createFileRoute, Outlet, redirect, Link, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useUserRoles, hasRole } from "@/lib/auth";
import { ClipboardCheck, LayoutDashboard, LogOut, Plus, Settings } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user } = useSession();
  const { roles, loading } = useUserRoles(user?.id);
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!roles || roles.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="max-w-md text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent">
            <ClipboardCheck className="h-7 w-7 text-accent-foreground" />
          </div>
          <h1 className="text-2xl font-semibold">Awaiting access</h1>
          <p className="text-sm text-muted-foreground">
            Your account has been created. A super admin needs to assign you a role
            (super admin, cluster manager, or viewer) before you can start auditing.
          </p>
          <p className="text-xs text-muted-foreground">Signed in as {user?.email}</p>
          <button
            onClick={handleSignOut}
            className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/dashboard" className="flex items-center gap-2 font-semibold">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <ClipboardCheck className="h-4 w-4" />
            </span>
            <span className="hidden sm:inline">Branch Auditor</span>
          </Link>
          <nav className="flex items-center gap-1">
            <Link
              to="/dashboard"
              className="inline-flex h-10 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground [&.active]:bg-secondary [&.active]:text-secondary-foreground"
              activeOptions={{ exact: true }}
            >
              <LayoutDashboard className="h-4 w-4" /> <span className="hidden sm:inline">Dashboard</span>
            </Link>
            <Link
              to="/visits/new"
              className="inline-flex h-10 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              <Plus className="h-4 w-4" /> <span className="hidden sm:inline">New visit</span>
            </Link>
            {hasRole(roles, "super_admin") ? (
              <Link
                to="/admin/checklist"
                className="inline-flex h-10 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground [&.active]:bg-secondary [&.active]:text-secondary-foreground"
              >
                <Settings className="h-4 w-4" /> <span className="hidden sm:inline">Admin</span>
              </Link>
            ) : null}
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="ml-1 inline-flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
