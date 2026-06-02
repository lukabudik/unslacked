import { notFound } from "next/navigation";
import { listUsers, listChannels, getHistory, getReactions } from "@/lib/store";
import { ChannelHeader, ChannelTopicBar } from "@/components/slack/ChannelHeader";
import { MessageList } from "@/components/slack/MessageList";
import { Composer } from "@/components/slack/Composer";
import { channelLabel } from "@/components/slack/utils";

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ channelId: string }>;
}) {
  const { channelId } = await params;

  const [users, channels] = await Promise.all([listUsers(), listChannels()]);
  const channel = channels.find((c) => c.id === channelId);
  if (!channel) notFound();

  const [messages, reactions] = await Promise.all([
    getHistory(channelId),
    getReactions(channelId),
  ]);

  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
  const isDm = channel.kind === "im" || channel.kind === "mpim";
  const label = channelLabel(channel, userMap);

  return (
    <>
      <ChannelHeader channel={channel} users={userMap} />
      <ChannelTopicBar topic={channel.topic} isDm={isDm} />

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <MessageList
          messages={messages}
          users={userMap}
          reactions={reactions}
          channelName={label}
          isDm={isDm}
        />
      </div>

      <Composer placeholderTarget={isDm ? label : `#${label}`} />
    </>
  );
}
