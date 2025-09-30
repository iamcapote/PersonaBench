import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value?: number;
}

export function Progress({ value = 0, className, ...props }: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-muted", className)}
      {...props}
    >
      <div
        className="h-full w-full flex-1 bg-primary transition-all"
        style={{ transform: `translateX(${clamped - 100}%)` }}
      />
    </div>
  );
}
