import { redirect } from "next/navigation";
import { listChannels } from "@/lib/store";

/** Land on the first non-archived public channel, like opening Slack. */
export default async function Home() {
  const channels = await listChannels();
  const first =
    channels.find((c) => c.kind === "public_channel" && !c.isArchived) ??
    channels.find((c) => !c.isArchived) ??
    channels[0];

  if (first) redirect(`/c/${first.id}`);

  return (
    <div className="flex h-screen items-center justify-center bg-white text-[#616061]">
      No channels available.
    </div>
  );
}
