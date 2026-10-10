import Link from "next/link";
import { AdminNav, MobileAdminMenu } from "@/components/admin-nav";
import { hasPermission, ROLE_LABELS, type Actor } from "@/lib/domain/permissions";
import { logout } from "@/server/auth-actions";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "EW";
}

export function AdminShell({
  actor,
  children,
}: {
  actor: Actor;
  children: React.ReactNode;
}) {
  const items = [
    { href: "/admin", label: "Overview" },
    { href: "/admin/events", label: "Programs" },
    { href: "/admin/account", label: "Account" },
  ];
  if (hasPermission(actor, "staff.manage")) items.push({ href: "/admin/staff", label: "Staff" });
  if (hasPermission(actor, "audit.view")) items.push({ href: "/admin/audit", label: "Audit" });
  if (hasPermission(actor, "settings.manage")) items.push({ href: "/admin/settings", label: "Settings" });

  return (
    <div className="admin-ui flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-paper lg:flex">
        <div className="flex h-16 shrink-0 items-center border-b border-line px-5">
          <div className="min-w-0">
            <Link href="/admin" className="block truncate text-sm font-semibold tracking-tight">
              Encounter Worship
            </Link>
            <p className="truncate text-xs text-muted">Staff console</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-5">
          <AdminNav items={items} />
        </div>
        <div className="border-t border-line p-3">
          <div className="flex items-center gap-2.5 px-2 py-2">
            <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-pine text-[0.6875rem] font-semibold text-white">
              {initials(actor.name)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium leading-none">{actor.name}</span>
              <span className="mt-1 block truncate text-[0.6875rem] leading-none text-muted">
                {ROLE_LABELS[actor.role]}
              </span>
            </span>
          </div>
          <form action={logout} className="px-2 pb-1">
            <button className="text-sm text-muted hover:text-ink">Sign out</button>
          </form>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-line bg-paper/85 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <MobileAdminMenu items={items} />
            <p className="truncate text-sm font-semibold lg:font-normal">Encounter Worship</p>
          </div>
          <p className="truncate text-sm text-muted lg:hidden">{actor.name}</p>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
