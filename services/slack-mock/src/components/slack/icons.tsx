import type { SVGProps } from "react";

const base = (props: SVGProps<SVGSVGElement>) => ({
  viewBox: "0 0 20 20",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...props,
});

export const HashIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M7.5 3.5 6 16.5M14 3.5 12.5 16.5M3.5 7.5h13M3 12.5h13" /></svg>
);

export const LockIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <rect x="4.5" y="9" width="11" height="7.5" rx="1.5" />
    <path d="M7 9V6.5a3 3 0 0 1 6 0V9" />
  </svg>
);

export const ChevronIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="m6 8 4 4 4-4" /></svg>
);

export const ThreadIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4 5h12M4 9h9M4 13h6" /><path d="M13.5 13.5 16 16l2.5-2.5" /></svg>
);

export const StarIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="m10 3 2 4.3 4.7.6-3.4 3.2.9 4.6L10 13.6 5.8 15.7l.9-4.6L3.3 7.9l4.7-.6z" /></svg>
);

export const HeadphonesIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M4 11v-1a6 6 0 0 1 12 0v1" />
    <rect x="3" y="11" width="3" height="5" rx="1" />
    <rect x="14" y="11" width="3" height="5" rx="1" />
  </svg>
);

export const UsersIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <circle cx="8" cy="7" r="2.5" /><path d="M3.5 16c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4" />
    <path d="M13.5 5.2a2.5 2.5 0 0 1 0 4.6M14.5 16c0-2-.6-3.2-1.8-4" />
  </svg>
);

export const SearchIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="9" cy="9" r="5.5" /><path d="m13.5 13.5 3 3" /></svg>
);

export const PlusIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M10 4.5v11M4.5 10h11" /></svg>
);

export const SendIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)} fill="currentColor" stroke="none"><path d="M3.4 2.6 17.5 9c.9.4.9 1.6 0 2L3.4 17.4c-.8.4-1.6-.4-1.3-1.2L4 10 2.1 3.8c-.3-.8.5-1.6 1.3-1.2zM5.3 10H10" /></svg>
);

// Composer toolbar glyphs (filled-ish small marks)
export const BoldIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ ...p, strokeWidth: 2 })}><path d="M6 4h5a3 3 0 0 1 0 6H6zM6 10h6a3 3 0 0 1 0 6H6z" /></svg>
);
export const ItalicIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 4H8M12 16H8M11 4 9 16" /></svg>
);
export const StrikeIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4 10h12M7 6.5C7.5 5 9 4.5 10.5 4.5c2 0 3 1 3 2.2M13 13.5c-.3 1.3-1.6 2-3.2 2-2 0-3.2-.8-3.5-2.2" /></svg>
);
export const CodeIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="m7 7-3 3 3 3M13 7l3 3-3 3" /></svg>
);
export const LinkIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M8 12a3 3 0 0 0 4.2 0l2.3-2.3a3 3 0 0 0-4.2-4.2L9.2 6.5M12 8a3 3 0 0 0-4.2 0L5.5 10.3a3 3 0 0 0 4.2 4.2l1.1-1" /></svg>
);
export const ListIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M8 6h8M8 10h8M8 14h8M4 6h.01M4 10h.01M4 14h.01" /></svg>
);
export const EmojiIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="10" cy="10" r="6.5" /><path d="M7.5 8.5h.01M12.5 8.5h.01M7.5 12c.6.7 1.5 1.1 2.5 1.1s1.9-.4 2.5-1.1" /></svg>
);
export const AtIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="10" cy="10" r="3" /><path d="M13 10v1.2a2 2 0 0 0 4 0V10a7 7 0 1 0-2.7 5.5" /></svg>
);
export const PaperclipIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M15 8.5 9.3 14.2a2.5 2.5 0 0 1-3.5-3.5l6-6a3.5 3.5 0 0 1 5 5l-6 6" /></svg>
);
export const VideoIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><rect x="3" y="6" width="10" height="8" rx="2" /><path d="M13 9.5 17 7v6l-4-2.5z" /></svg>
);
export const MicIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><rect x="8" y="3" width="4" height="8" rx="2" /><path d="M5.5 9.5a4.5 4.5 0 0 0 9 0M10 14v3M8 17h4" /></svg>
);
export const InfoIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="10" cy="10" r="6.5" /><path d="M10 9v4M10 6.7h.01" /></svg>
);
export const PinIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M8 3h4l-.5 4 2.5 2.5H6L8.5 7 8 3zM10 9.5V16" /></svg>
);
