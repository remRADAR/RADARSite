import { notFound, redirect } from "next/navigation";

export const revalidate = 3600;

const aliases: Record<string, string> = {
  discovery: "/ontheradar/articles/spotlight/page/1",
  "talk-to-us": "/ontheradar/magazine",
  motherland: "/motherland",
};

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const destination = aliases[section.toLowerCase()];
  if (!destination) notFound();
  redirect(destination);
}
