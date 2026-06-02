import React from "react";

// Minimal Lucide-style stroke icons (16px, currentColor) used in the admin recreation.
const S: React.FC<{ children: React.ReactNode; size?: number }> = ({ children, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

export const Icon: React.FC<{ name: string; size?: number }> = ({ name, size }) => {
  switch (name) {
    case "clock":
      return <S size={size}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></S>;
    case "repeat":
      return <S size={size}><path d="m17 2 4 4-4 4" /><path d="M3 11v-1a4 4 0 0 1 4-4h14" /><path d="m7 22-4-4 4-4" /><path d="M21 13v1a4 4 0 0 1-4 4H3" /></S>;
    case "waypoints":
      return <S size={size}><circle cx="12" cy="4.5" r="2.5" /><circle cx="4.5" cy="19.5" r="2.5" /><circle cx="19.5" cy="19.5" r="2.5" /><path d="M6.5 17 10 7m4 0 3.5 10" /></S>;
    case "target":
      return <S size={size}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" /></S>;
    case "eyeoff":
      return <S size={size}><path d="M10.7 5.1A10 10 0 0 1 12 5c5 0 9 4.5 10 7a13 13 0 0 1-2 3" /><path d="M6.6 6.6C3.9 8 2.3 10.3 2 12c1 2.5 5 7 10 7a9.7 9.7 0 0 0 4.5-1.1" /><path d="m2 2 20 20" /></S>;
    case "bus":
      return <S size={size}><rect x="3" y="5" width="18" height="12" rx="2" /><path d="M3 11h18" /><circle cx="7.5" cy="19" r="1.5" /><circle cx="16.5" cy="19" r="1.5" /></S>;
    case "network":
      return <S size={size}><rect x="9" y="3" width="6" height="6" rx="1" /><rect x="3" y="15" width="6" height="6" rx="1" /><rect x="15" y="15" width="6" height="6" rx="1" /><path d="M12 9v3M6 15v-1a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" /></S>;
    case "dashboard":
      return <S size={size}><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></S>;
    case "workflow":
      return <S size={size}><rect x="3" y="3" width="6" height="6" rx="1" /><rect x="15" y="15" width="6" height="6" rx="1" /><path d="M9 6h4a2 2 0 0 1 2 2v7" /></S>;
    case "route":
      return <S size={size}><circle cx="6" cy="19" r="2.5" /><circle cx="18" cy="5" r="2.5" /><path d="M8.5 19H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5" /></S>;
    case "shield":
      return <S size={size}><path d="M12 3 5 6v5c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z" /><path d="M12 8v4m0 3h.01" /></S>;
    case "book":
      return <S size={size}><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" /><path d="M4 5v14" /></S>;
    case "activity":
      return <S size={size}><path d="M3 12h4l3 8 4-16 3 8h4" /></S>;
    case "help":
      return <S size={size}><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 .9-1 1.7m0 3h.01" /></S>;
    case "smile":
      return <S size={size}><circle cx="12" cy="12" r="9" /><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" /></S>;
    case "search":
      return <S size={size}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></S>;
    case "menu":
      return <S size={size}><path d="M3 6h18M3 12h18M3 18h18" /></S>;
    default:
      return <S size={size}><circle cx="12" cy="12" r="9" /></S>;
  }
};
