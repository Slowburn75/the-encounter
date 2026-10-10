"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CHURCH_NAME } from "@/lib/domain/constants";

const LINKS = [
  { href: "#about", label: "About" },
  { href: "#gathering", label: "Details" },
  { href: "#expect", label: "What to expect" },
  { href: "#questions", label: "Questions" },
];

export function WorshipHeader({
  logoSrc,
  registerHref,
}: {
  logoSrc: string | null;
  registerHref: string;
}) {
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const onPhoto = !solid;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 ${
        solid ? "border-b border-line bg-paper" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
        {logoSrc ? (
          <Link href="/" className="inline-flex shrink-0 items-center">
            <Image src={logoSrc} alt={CHURCH_NAME} width={168} height={40} className="h-8 w-auto" />
          </Link>
        ) : (
          <Link
            href="/"
            className={`font-display text-[1.05rem] leading-none tracking-tight sm:text-xl ${
              onPhoto ? "text-white" : "text-pine"
            }`}
          >
            {CHURCH_NAME}
          </Link>
        )}
        <nav aria-label="On this page" className="flex items-center gap-5">
          <div className="hidden items-center gap-5 md:flex">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`text-sm font-semibold ${onPhoto ? "text-white/85 hover:text-white" : "text-ink/80 hover:text-ink"}`}
              >
                {link.label}
              </a>
            ))}
          </div>
          <a
            href={registerHref}
            className={`inline-flex min-h-11 items-center justify-center px-4 text-sm font-semibold ${
              onPhoto ? "bg-white text-pine" : "bg-pine text-white"
            }`}
          >
            Register
          </a>
        </nav>
      </div>
    </header>
  );
}
