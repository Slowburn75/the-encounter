import Image from "next/image";
import Link from "next/link";
import { CHURCH_NAME } from "@/lib/domain/constants";
import { officialLogoSrc } from "@/lib/worship-assets";

export function ChurchMark({ tone = "pine" }: { tone?: "pine" | "light" }) {
  const logo = officialLogoSrc();
  const className = tone === "light" ? "text-white" : "text-pine";
  if (logo) {
    return (
      <Link href="/" className="inline-flex items-center">
        <Image src={logo} alt={CHURCH_NAME} width={168} height={40} className="h-8 w-auto" />
      </Link>
    );
  }
  return (
    <Link href="/" className={`font-display text-[1.15rem] leading-none tracking-tight sm:text-xl ${className}`}>
      {CHURCH_NAME}
    </Link>
  );
}
