import type { Persona } from "@/lib/api/types";
import { personaColor } from "@/lib/personas";
import { cn } from "@/lib/utils";

export function PersonaBadge({
  persona,
  className,
}: {
  persona: Persona;
  className?: string;
}) {
  const color = personaColor(persona);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
        className
      )}
      style={{
        borderColor: `${color}55`,
        backgroundColor: `${color}1a`,
        color,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {persona}
    </span>
  );
}
