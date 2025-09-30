import { Button } from "@/components/ui/button";

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

export function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center text-foreground">
      <div className="max-w-md space-y-4">
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="text-sm text-muted-foreground">
          {error.message || "An unexpected error occurred. Try refreshing the page."}
        </p>
        <Button onClick={resetErrorBoundary}>Reload application</Button>
      </div>
    </div>
  );
}
