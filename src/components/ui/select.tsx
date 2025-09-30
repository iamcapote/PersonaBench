import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
  type HTMLAttributes,
  type ButtonHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

interface OptionRecord {
  value: string;
  label: string;
}

interface SelectContextValue {
  value?: string;
  placeholder?: string;
  open: boolean;
  options: OptionRecord[];
  setOpen: (open: boolean) => void;
  selectValue: (value: string, label: string) => void;
  registerOption: (option: OptionRecord) => void;
}

const SelectContext = createContext<SelectContextValue | null>(null);

export interface SelectProps extends HTMLAttributes<HTMLDivElement> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  children: ReactNode;
}

export function Select({
  value,
  defaultValue,
  onValueChange,
  placeholder,
  className,
  children,
  ...props
}: SelectProps) {
  const [internalValue, setInternalValue] = useState<string | undefined>(defaultValue);
  const [options, setOptions] = useState<OptionRecord[]>([]);
  const [open, setOpen] = useState(false);

  const selectValue = useCallback(
    (next: string, label: string) => {
      if (value === undefined) {
        setInternalValue(next);
      }
      onValueChange?.(next);
      setOpen(false);
      setOptions((prev: OptionRecord[]) => {
        const existing = prev.find((option) => option.value === next);
        if (existing) {
          if (existing.label !== label) {
            return prev.map((option: OptionRecord) =>
              option.value === next ? { value: next, label } : option,
            );
          }
          return prev;
        }
        return [...prev, { value: next, label }];
      });
    },
    [onValueChange, value],
  );

  const registerOption = useCallback((option: OptionRecord) => {
    setOptions((prev: OptionRecord[]) => {
      const exists = prev.some((entry) => entry.value === option.value);
      if (exists) {
        return prev.map((entry: OptionRecord) =>
          entry.value === option.value ? option : entry,
        );
      }
      return [...prev, option];
    });
  }, []);

  useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value);
    }
  }, [value]);

  const contextValue = useMemo<SelectContextValue>(
    () => ({
      value: value ?? internalValue,
      placeholder,
      open,
      options,
      setOpen,
      selectValue,
      registerOption,
    }),
    [internalValue, open, options, placeholder, selectValue, registerOption, value],
  );

  return (
    <SelectContext.Provider value={contextValue}>
      <div className={cn("relative w-full", className)} {...props}>
        {children}
      </div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({ className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  const context = useRequiredContext();
  return (
    <button
      type="button"
      aria-haspopup="listbox"
      aria-expanded={context.open}
      onClick={() => context.setOpen(!context.open)}
      className={cn(
        "flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <span className="flex-1 text-left">{children}</span>
      <svg
        aria-hidden
        className="ml-2 h-3 w-3 opacity-70"
        viewBox="0 0 10 6"
        fill="none"
      >
        <path d="M9 1.5L5 4.5L1 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </button>
  );
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const context = useRequiredContext();
  const value = context.value;
  const label = value
    ? context.options.find((option: OptionRecord) => option.value === value)?.label ?? value
    : undefined;

  return (
    <span className="text-sm text-foreground">
      {label ?? placeholder ?? context.placeholder ?? "Select"}
    </span>
  );
}

export function SelectContent({ className, children }: { className?: string; children: ReactNode }) {
  const context = useRequiredContext();
  if (!context.open) return null;

  return (
    <div
      className={cn(
        "absolute z-20 mt-2 w-full rounded-md border border-border bg-popover p-1 shadow-lg",
        className,
      )}
      role="listbox"
    >
      <div className="max-h-60 overflow-y-auto">{children}</div>
    </div>
  );
}

interface SelectItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  children: ReactNode;
}

export function SelectItem({ value, children, className, ...props }: SelectItemProps) {
  const context = useRequiredContext();
  const label = typeof children === "string" ? children : value;
  const isSelected = context.value === value;

  useEffect(() => {
    context.registerOption({ value, label: label.toString() });
  }, [context, label, value]);

  return (
    <button
      type="button"
      role="option"
      aria-selected={isSelected}
      onClick={() => context.selectValue(value, label.toString())}
      className={cn(
        "flex w-full cursor-pointer items-center rounded-sm px-3 py-2 text-sm transition-colors hover:bg-muted",
        isSelected ? "bg-muted text-foreground" : "text-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function useRequiredContext() {
  const context = useContext(SelectContext);
  if (!context) {
    throw new Error("Select components must be used within <Select>");
  }
  return context;
}
