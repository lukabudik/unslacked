/** Slack encodes user mentions as `<@U123>`. Pull the user ids out of text. */
const MENTION_RE = /<@([A-Z0-9_]+)>/g;

export function parseMentions(text: string): string[] {
  const ids = new Set<string>();
  for (const m of text.matchAll(MENTION_RE)) ids.add(m[1]);
  return [...ids];
}
