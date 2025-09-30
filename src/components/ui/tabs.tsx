import {
  createContext,
  useContext,
  useId,
  useMemo,
  useState,
  type ReactNode,
  type HTMLAttributes,
  type ButtonHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

interface TabsContextValue {
  value: string;
  onChange: (value: string) => void;
  listId: string;
}

const TabsContext = createContext<TabsContextValue | null>(null);

export interface TabsProps extends HTMLAttributes<HTMLDivElement> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
}

export function Tabs({ value, defaultValue, onValueChange, className, children, ...props }: TabsProps) {
  const [internalValue, setInternalValue] = useState<string>(defaultValue ?? "");
  const currentValue = value ?? internalValue;
  const listId = useId();

  const contextValue = useMemo<TabsContextValue>(
    () => ({
      value: currentValue,
      onChange: (next: string) => {
        if (value === undefined) {
          setInternalValue(next);
        }
        onValueChange?.(next);
      },
      listId,
    }),
    [currentValue, listId, onValueChange, value],
  );

  return (
    <TabsContext.Provider value={contextValue}>
      <div className={cn("w-full", className)} role="tablist" aria-labelledby={listId} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export function TabsList({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

interface TabsTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export function TabsTrigger({ className, value, ...props }: TabsTriggerProps) {
  const context = useContext(TabsContext);
  if (!context) throw new Error("TabsTrigger must be used within Tabs");
  const isActive = context.value === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-controls={`${context.listId}-${value}`}
      onClick={() => context.onChange(value)}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        isActive ? "bg-background text-foreground shadow" : "hover:bg-background/80",
        className,
      )}
      {...props}
    />
  );
}

interface TabsContentProps extends HTMLAttributes<HTMLDivElement> {
  value: string;
}

export function TabsContent({ className, value, children, ...props }: TabsContentProps) {
  const context = useContext(TabsContext);
  if (!context) throw new Error("TabsContent must be used within Tabs");
  const isActive = context.value === value;

  return (
    <div
      role="tabpanel"
      id={`${context.listId}-${value}`}
      hidden={!isActive}
      className={cn("mt-4 focus-visible:outline-none", className)}
      {...props}
    >
      {isActive ? children : null}
    </div>
  );
}
