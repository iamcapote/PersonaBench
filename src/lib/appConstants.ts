import type { EvaluationQueueStatus } from "@/lib/appTypes"

interface QueueStatusConfig {
  label: string
  variant: "default" | "secondary" | "outline"
  className?: string
}

export const QUEUE_STATUS_CONFIG: Record<EvaluationQueueStatus, QueueStatusConfig> = {
  queued: {
    label: "Queued",
    variant: "secondary",
  },
  running: {
    label: "Running",
    variant: "default",
  },
  completed: {
    label: "Completed",
    variant: "outline",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800",
  },
  failed: {
    label: "Failed",
    variant: "outline",
    className: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800",
  },
}
