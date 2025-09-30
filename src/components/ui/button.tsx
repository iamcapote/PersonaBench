import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ForwardedRef } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "secondary" | "outline" | "ghost" | "destructive";
type ButtonSize = "default" | "sm" | "lg" | "icon";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  outline: "border border-input bg-background hover:bg-muted",
  ghost: "hover:bg-muted text-foreground",
  destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "h-10 px-4 py-2",
  sm: "h-9 px-3",
  lg: "h-11 px-8",
  icon: "h-10 w-10",
};

function ButtonImpl(
  { className, variant = "default", size = "default", ...props }: ButtonProps,
  ref: ForwardedRef<HTMLButtonElement>,
) {
  const resolvedVariant = (variant ?? "default") as ButtonVariant;
  const resolvedSize = (size ?? "default") as ButtonSize;

  return (
    <button
      ref={ref}
      type={props.type ?? "button"}
      className={cn(
        "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background",
        variantClasses[resolvedVariant],
        sizeClasses[resolvedSize],
        className,
      )}
      {...props}
    />
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(ButtonImpl);

Button.displayName = "Button";
