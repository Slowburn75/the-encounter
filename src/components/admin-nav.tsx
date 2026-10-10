"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminNav({
  items,
  onNavigate,
}: {
  items: { href: string; label: string }[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-1 flex-col gap-0.5 px-3" aria-label="Staff">
      <p className="mb-1.5 px-3 text-[0.6875rem] font-medium tracking-widest text-muted uppercase">
        Work
      </p>
      {items.map((item) => {
        const active =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`flex items-center rounded-lg px-3 py-2 text-sm transition-colors ${
              active
                ? "bg-moss font-semibold text-ink"
                : "text-ink/70 hover:bg-moss/70 hover:text-ink"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileAdminMenu({
  items,
}: {
  items: { href: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden">
      <button
        type="button"
        className="inline-flex size-9 items-center justify-center rounded-lg border border-line bg-card text-sm font-semibold"
        aria-expanded={open}
        aria-controls="staff-menu"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      {open ? (
        <div id="staff-menu" className="absolute top-16 right-0 left-0 z-40 border-b border-line bg-paper px-2 py-3 shadow-none">
          <AdminNav items={items} onNavigate={() => setOpen(false)} />
        </div>
      ) : null}
    </div>
  );
}
