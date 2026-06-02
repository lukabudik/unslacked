import { notFound } from "next/navigation";
import { listUsers, listChannels, getChannelTimeline } from "@unslacked/db";
import { ChannelHeader, ChannelTopicBar } from "@/components/slack/ChannelHeader";
import { ChannelTimeline } from "@/components/slack/ChannelTimeline";
import { Composer } from "@/components/slack/Composer";
import { ThreadPanel } from "@/components/slack/ThreadPanel";
import { channelLabel } from "@/components/slack/utils";

export default async function ChannelPage({
  params,
  searchParams,
}: {
  params: Promise<{ channelId: string }>;
  searchParams: Promise<{ thread?: string }>;
}) {
  const { channelId } = await params;
  const { thread } = await searchParams;

  const [users, channels] = await Promise.all([listUsers(), listChannels()]);
  const channel = channels.find((c) => c.id === channelId);
  if (!channel) notFound();

  const page = await getChannelTimeline(channelId);

  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
  const isDm = channel.kind === "im" || channel.kind === "mpim";
  const label = channelLabel(channel, userMap);

  return (
    <>
      <ChannelHeader channel={channel} users={userMap} />
      <ChannelTopicBar topic={channel.topic} isDm={isDm} />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* main conversation column */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <ChannelTimeline
            key={channelId}
            channelId={channelId}
            initialPage={page}
            users={userMap}
            channelName={label}
            isDm={isDm}
          />

          <Composer channelId={channelId} placeholderTarget={isDm ? label : `#${label}`} />
        </div>

        {/* thread panel (URL-driven via ?thread=<parentMessageId>) */}
        {thread && (
          <ThreadPanel
            channelId={channelId}
            parentId={thread}
            channelLabel={label}
            isDm={isDm}
            users={userMap}
          />
        )}
      </div>
    </>
  );
}
