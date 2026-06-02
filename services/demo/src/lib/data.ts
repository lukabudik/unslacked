import raw from "../data/demo-data.json";

export type Person = {
  id: string;
  name: string;
  initials: string;
  color: string;
};

export type Node = {
  id: string;
  name: string;
  initials: string;
  team: string;
  color: string;
  title: string;
  routedOut: number;
  routedIn: number;
  routerScore: number;
  isRouter: boolean;
  size: number;
  x: number;
  y: number;
};

export type Edge = { from: string; to: string; weight: number; fromRouter: boolean };

export const data = raw as unknown as {
  company: string;
  stats: {
    people: number;
    channels: number;
    messages: number;
    channelMessages: number;
    dms: number;
    days: number;
    weeks: number;
    chains: number;
    storylines: number;
    tagChains: number;
    handoffChains: number;
    deepChains: number;
    hopsDist: Record<string, number>;
    teams: number;
    hoursRecoverable: number;
    avgDegrees: number;
  };
  teams: { name: string; color: string; count: number }[];
  sidebar: {
    channels: { name: string; private: boolean }[];
    dms: { name: string; initials: string; color: string; online: boolean }[];
  };
  topRouters: { id: string; name: string; team: string; color: string; count: number; title: string }[];
  topBottlenecks: { id: string; name: string; team: string; color: string; count: number; title: string }[];
  topOwners: { id: string; name: string; team: string; color: string; count: number; title: string }[];
  hero: {
    topic: string;
    channel: string;
    asker: { id: string; name: string; team: string; color: string; initials: string };
    owner: { id: string; name: string; team: string; color: string; initials: string; title: string };
    mechanism: string;
    hops: {
      from: { id: string; name: string; initials: string; color: string } | null;
      to: { id: string; name: string; initials: string; color: string };
      mechanism: string;
      text: string;
    }[];
    messages: { id: string; user: Person; text: string; ts: string }[];
  };
  assistant: {
    dmWith: { name: string; title: string; team: string; initials: string; color: string };
    draft: string;
    topic: string;
    owner: { name: string; title: string; team: string; initials: string; color: string };
    bot: { q: string; owner: { name: string; title: string; team: string; initials: string; color: string } };
  };
  chaos: { id: string; channel: string; user: Person; text: string }[];
  graph: { width: number; height: number; nodes: Node[]; edges: Edge[] };
};
