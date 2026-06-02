import { listUsers, listChannels } from "@unslacked/db";
import { VIEWER_ID } from "@/lib/viewer";
import { IconRail } from "@/components/slack/IconRail";
import { Sidebar } from "@/components/slack/Sidebar";
import { channelLabel, dmCounterpart, isOnline } from "@/components/slack/utils";
import type { SidebarChannel } from "@/components/slack/types";

const WORKSPACE_NAME = "Nimbus Logistics";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const [users, channels] = await Promise.all([listUsers(), listChannels()]);
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
  const viewer = userMap[VIEWER_ID];

  const isMember = (c: (typeof channels)[number]) => c.members.includes(VIEWER_ID);
  const visible = channels.filter((c) => !c.isArchived);

  const channelItems: SidebarChannel[] = visible
    // public channels are browsable; private channels only if you're a member (real Slack)
    .filter((c) => c.kind === "public_channel" || (c.kind === "private_channel" && isMember(c)))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((c) => ({
      id: c.id,
      name: c.name,
      kind: c.kind,
      isArchived: c.isArchived,
      label: channelLabel(c, userMap),
    }));

  const dmItems: SidebarChannel[] = visible
    // you only see DMs you're actually in
    .filter((c) => (c.kind === "im" || c.kind === "mpim") && isMember(c))
    .map((c) => {
      const other = dmCounterpart(c, userMap);
      return {
        id: c.id,
        name: c.name,
        kind: c.kind,
        isArchived: c.isArchived,
        label: channelLabel(c, userMap),
        dm: {
          statusEmoji: other?.statusEmoji ?? null,
          isBot: Boolean(other?.isBot),
          online: other ? isOnline(other.id) : false,
        },
      };
    });

  return (
    <div className="flex h-screen overflow-hidden">
      <IconRail viewer={viewer} workspaceName={WORKSPACE_NAME} />
      <div className="flex flex-1 overflow-hidden py-0 pr-0">
        <Sidebar workspaceName={WORKSPACE_NAME} channels={channelItems} dms={dmItems} />
        <div className="flex flex-1 flex-col overflow-hidden bg-white md:my-2 md:mr-2 md:rounded-xl md:border md:border-black/10 md:shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
