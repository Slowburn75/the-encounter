import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProgramLanding } from "@/components/program-landing";
import { getEventBySlug } from "@/lib/data";
import { isPublicEventStatus } from "@/lib/domain/registration-window";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event || !isPublicEventStatus(event.status)) return { title: "Program" };
  return { title: event.title, description: event.description.slice(0, 160) };
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event || !isPublicEventStatus(event.status)) notFound();
  return <ProgramLanding event={event} />;
}
