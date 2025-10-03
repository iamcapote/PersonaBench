import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { transformQueueEntryResponse, transformQueueSummaryResponse } from "@/lib/appTransformers"
import type {
  EvaluationQueueCollectionResponse,
  EvaluationQueueItem,
  EvaluationQueueResponse,
  EvaluationQueueSummary,
  EvaluationQueueStatus,
  EvaluationTargetKind,
} from "@/lib/appTypes"
import { useAdminAuth } from "@/components/app/providers/AdminAuthProvider"
import { selectQueueSummary } from "@/lib/appSelectors"

const MAX_QUEUE_ENTRIES = 200
const QUEUE_POLL_INTERVAL_MS = 15000

const clampQueue = (entries: EvaluationQueueItem[]): EvaluationQueueItem[] => {
  if (entries.length <= MAX_QUEUE_ENTRIES) {
    return entries
  }
  return entries.slice(-MAX_QUEUE_ENTRIES)
}

export interface CreateQueueEntryPayload {
  personaId: string
  targetId: string
  targetKind: EvaluationTargetKind
  status: EvaluationQueueStatus
  requestedAt: string
  metadata?: Record<string, unknown>
}

export interface UpdateQueueEntryPayload {
  status?: EvaluationQueueStatus
  startedAt?: string
  completedAt?: string
  error?: string | null
  metadata?: Record<string, unknown>
}

export interface UseEvaluationQueueResult {
  evaluationQueue: EvaluationQueueItem[]
  queueSummary: EvaluationQueueSummary
  queueError: string | null
  isQueueSyncing: boolean
  lastSyncedAt: string | null
  setEvaluationQueue: (
    entries: EvaluationQueueItem[] | ((current: EvaluationQueueItem[]) => EvaluationQueueItem[])
  ) => void
  setQueueSummary: (summary: EvaluationQueueSummary | null) => void
  addQueueEntries: (entries: EvaluationQueueItem[]) => void
  replaceQueueEntry: (placeholderId: string, entry: EvaluationQueueItem) => void
  mergeQueueEntry: (entry: EvaluationQueueItem) => void
  createQueueEntryRemote: (payload: CreateQueueEntryPayload) => Promise<EvaluationQueueItem>
  updateQueueEntryRemote: (entryId: string, patch: UpdateQueueEntryPayload) => Promise<EvaluationQueueItem>
  refreshQueue: () => Promise<void>
}

export function useEvaluationQueue(): UseEvaluationQueueResult {
  const [evaluationQueue, setEvaluationQueueState] = useState<EvaluationQueueItem[]>([])
  const [serverSummary, setServerSummary] = useState<EvaluationQueueSummary | null>(null)
  const [queueError, setQueueError] = useState<string | null>(null)
  const [isQueueSyncing, setIsQueueSyncing] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)
  const { authorizedApiFetch, hasAdminAccess } = useAdminAuth()

  const queueSummary = useMemo(
    () => selectQueueSummary(evaluationQueue, serverSummary),
    [evaluationQueue, serverSummary]
  )

  const setEvaluationQueue = useCallback(
    (
      entries: EvaluationQueueItem[] | ((current: EvaluationQueueItem[]) => EvaluationQueueItem[])
    ) => {
      setEvaluationQueueState((current) => {
        const next =
          typeof entries === "function"
            ? (entries as (current: EvaluationQueueItem[]) => EvaluationQueueItem[])(current)
            : entries
        const clamped = clampQueue(next)
        return clamped
      })
    },
    []
  )

  const addQueueEntries = useCallback((entries: EvaluationQueueItem[]) => {
    setEvaluationQueue((current) => clampQueue([...current, ...entries]))
  }, [setEvaluationQueue])

  const setQueueSummary = useCallback((summary: EvaluationQueueSummary | null) => {
    setServerSummary(summary)
  }, [])

  const refreshQueue = useCallback(async () => {
    setIsQueueSyncing(true)
    setQueueError(null)

    const endpoint = hasAdminAccess ? "/admin/queue" : "/evaluations/queue"

    try {
      const response = await authorizedApiFetch(endpoint)
      if (!response.ok) {
        const message = await response.text().catch(() => "")
        throw new Error(message || `Failed to load evaluation queue (status ${response.status})`)
      }

      const payload: EvaluationQueueCollectionResponse = await response.json()
      const entries = (payload.entries ?? []).map(transformQueueEntryResponse)
      const summary = transformQueueSummaryResponse(payload.summary)

      setEvaluationQueue(entries)
      setQueueSummary(summary)
      setLastSyncedAt(new Date().toISOString())
    } catch (error) {
      console.error(error)
      const message =
        error instanceof Error ? error.message : "Unable to load evaluation queue from orchestration service."
      setQueueError((previous) => {
        if (!previous) {
          toast.error(message)
        }
        return message
      })
      throw error
    } finally {
      setIsQueueSyncing(false)
    }
  }, [authorizedApiFetch, hasAdminAccess, setEvaluationQueue, setQueueSummary])

  const replaceQueueEntry = useCallback((placeholderId: string, entry: EvaluationQueueItem) => {
    setEvaluationQueue((current) => {
      const filtered = current.filter(
        (item) => item.id !== placeholderId && item.id !== entry.id
      )
      return clampQueue([...filtered, entry])
    })
  }, [setEvaluationQueue])

  const mergeQueueEntry = useCallback((entry: EvaluationQueueItem) => {
    setEvaluationQueue((current) => {
      let found = false
      const next = current.map((item) => {
        if (item.id === entry.id) {
          found = true
          return entry
        }
        return item
      })
      if (found) {
        return next
      }
      return clampQueue([...current, entry])
    })
  }, [setEvaluationQueue])

  const createQueueEntryRemote = useCallback(
    async (payload: CreateQueueEntryPayload): Promise<EvaluationQueueItem> => {
      if (!hasAdminAccess) {
        throw new Error("Admin key required to enqueue evaluations.")
      }

  const response = await authorizedApiFetch("/admin/queue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          persona_id: payload.personaId,
          target_id: payload.targetId,
          target_kind: payload.targetKind,
          status: payload.status,
          requested_at: payload.requestedAt,
          metadata: payload.metadata ?? {},
        }),
      })

      if (!response.ok) {
        const message = await response.text().catch(() => "")
        throw new Error(message || `Failed to persist queue entry (status ${response.status})`)
      }

      const data: EvaluationQueueResponse = await response.json()
      return transformQueueEntryResponse(data)
    },
  [authorizedApiFetch, hasAdminAccess]
  )

  const updateQueueEntryRemote = useCallback(
    async (entryId: string, patch: UpdateQueueEntryPayload): Promise<EvaluationQueueItem> => {
      const payload: Record<string, unknown> = {}
      if (patch.status) {
        payload.status = patch.status
      }
      if (patch.startedAt) {
        payload.started_at = patch.startedAt
      }
      if (patch.completedAt) {
        payload.completed_at = patch.completedAt
      }
      if (patch.error !== undefined) {
        payload.error = patch.error
      }
      if (patch.metadata) {
        payload.metadata = patch.metadata
      }

      if (!hasAdminAccess) {
        throw new Error("Admin key required to update evaluation queue entries.")
      }

  const response = await authorizedApiFetch(`/admin/queue/${entryId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const message = await response.text().catch(() => "")
        throw new Error(message || `Failed to update queue entry '${entryId}' (status ${response.status})`)
      }

      const data: EvaluationQueueResponse = await response.json()
      return transformQueueEntryResponse(data)
    },
  [authorizedApiFetch, hasAdminAccess]
  )

  useEffect(() => {
    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const scheduleNext = () => {
      if (cancelled || !hasAdminAccess) {
        return
      }
      timeoutId = setTimeout(() => {
        refreshQueue().catch(() => {
          // errors surfaced via queueError state
        }).finally(scheduleNext)
      }, QUEUE_POLL_INTERVAL_MS)
    }

    refreshQueue()
      .catch(() => {
        // initial error already captured
      })
      .finally(() => {
        if (hasAdminAccess) {
          scheduleNext()
        }
      })

    return () => {
      cancelled = true
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [hasAdminAccess, refreshQueue])

  return {
    evaluationQueue,
    queueSummary,
    queueError,
    isQueueSyncing,
    lastSyncedAt,
    setEvaluationQueue,
    setQueueSummary,
    addQueueEntries,
    replaceQueueEntry,
    mergeQueueEntry,
    createQueueEntryRemote,
    updateQueueEntryRemote,
    refreshQueue,
  }
}
