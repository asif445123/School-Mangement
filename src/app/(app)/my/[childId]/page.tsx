import { redirect } from "next/navigation";

// /my/<childId> opens the first section of that child.
export default async function ChildPortalIndex({ params }: { params: Promise<{ childId: string }> }) {
  const { childId } = await params;
  redirect(`/my/${encodeURIComponent(childId)}/fees`);
}
