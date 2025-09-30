import { forwardRef } from "react";
import type { ForwardedRef, InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

function InputImpl(
  { className, type = "text", ...props }: InputProps,
  ref: ForwardedRef<HTMLInputElement>,
) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export const Input = forwardRef<HTMLInputElement, InputProps>(InputImpl);
