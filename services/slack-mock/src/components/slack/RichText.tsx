import { Fragment } from "react";
import type { StoreUser } from "@unslacked/db";
import { displayName } from "./utils";

/**
 * Renders Slack-flavored message text:
 *  - `<@U_X>` user mentions  -> blue pill `@Name`
 *  - `<#C_X|name>` channel refs -> blue `#name`
 *  - `` `code` `` inline code
 *  - `*bold*` bold
 * Falls back to plain text for everything else. Read-only; no sanitization
 * concerns since input is trusted fixture/db content.
 */
export function RichText({ text, users }: { text: string; users: Record<string, StoreUser> }) {
  return <>{renderInline(text, users)}</>;
}

// Split on the structural tokens first (mentions / channel refs / code spans).
const TOKEN_RE = /(<@[A-Z0-9_]+>|<#[A-Z0-9_]+(?:\|[^>]+)?>|`[^`]+`)/g;

function renderInline(text: string, users: Record<string, StoreUser>) {
  const parts = text.split(TOKEN_RE);
  return parts.map((part, i) => {
    if (!part) return null;

    const mention = part.match(/^<@([A-Z0-9_]+)>$/);
    if (mention) {
      const id = mention[1];
      const u = users[id];
      return (
        <span
          key={i}
          className="rounded-[3px] bg-[#1d9bd1]/10 px-[3px] py-px font-medium text-[#1264a3] hover:bg-[#1d9bd1]/20"
        >
          @{u ? displayName(users, id) : id}
        </span>
      );
    }

    const channelRef = part.match(/^<#[A-Z0-9_]+(?:\|([^>]+))?>$/);
    if (channelRef) {
      return (
        <span key={i} className="rounded-[3px] px-px font-medium text-[#1264a3] hover:underline">
          #{channelRef[1] ?? "channel"}
        </span>
      );
    }

    const code = part.match(/^`([^`]+)`$/);
    if (code) {
      return (
        <code
          key={i}
          className="rounded border border-black/10 bg-[#f6f6f6] px-1 py-px font-mono text-[12.5px] text-[#e01e5a]"
        >
          {code[1]}
        </code>
      );
    }

    return <Fragment key={i}>{renderBold(part)}</Fragment>;
  });
}

function renderBold(text: string) {
  const segs = text.split(/(\*[^*]+\*)/g);
  return segs.map((seg, i) => {
    const b = seg.match(/^\*([^*]+)\*$/);
    if (b) return <strong key={i} className="font-bold">{b[1]}</strong>;
    return <Fragment key={i}>{seg}</Fragment>;
  });
}
