import Link from "next/link";
import { PublicChrome } from "@/components/public-chrome";

export default function NotFound() {
  return (
    <PublicChrome>
      <h1 className="font-display text-4xl text-pine">That page is not available</h1>
      <p className="mt-3 text-muted">The program may be unpublished, or the link may be out of date.</p>
      <Link href="/" className="mt-6 inline-flex font-semibold text-pine underline">Back to programs</Link>
    </PublicChrome>
  );
}
