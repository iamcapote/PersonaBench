import { useCallback, useState } from "react"

import { transformQueueEntryResponse } from "@/lib/appTransformers"
import type {
  EvaluationQueueItem,
  EvaluationQueueResponse,
  EvaluationQueueStatus,
  EvaluationTargetKind,
} from "@/lib/appTypes"

const MAX_QUEUE_ENTRIES = 200

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
  setEvaluationQueue: (
    entries: EvaluationQueueItem[] | ((current: EvaluationQueueItem[]) => EvaluationQueueItem[])
  ) => void
  addQueueEntries: (entries: EvaluationQueueItem[]) => void
  replaceQueueEntry: (placeholderId: string, entry: EvaluationQueueItem) => void
  mergeQueueEntry: (entry: EvaluationQueueItem) => void
  createQueueEntryRemote: (payload: CreateQueueEntryPayload) => Promise<EvaluationQueueItem>
  updateQueueEntryRemote: (entryId: string, patch: UpdateQueueEntryPayload) => Promise<EvaluationQueueItem>
}

export function useEvaluationQueue(): UseEvaluationQueueResult {
  const [evaluationQueue, setEvaluationQueueState] = useState<EvaluationQueueItem[]>([])

  const addQueueEntries = useCallback((entries: EvaluationQueueItem[]) => {
    setEvaluationQueueState((current) => clampQueue([...current, ...entries]))
  }, [])

  const setEvaluationQueue = useCallback(
    (
      entries: EvaluationQueueItem[] | ((current: EvaluationQueueItem[]) => EvaluationQueueItem[])
    ) => {
      setEvaluationQueueState((current) => {
        const next = typeof entries === "function" ? (entries as (current: EvaluationQueueItem[]) => EvaluationQueueItem[])(current) : entries
        return clampQueue(next)
      })
    },
    []
  )

  const replaceQueueEntry = useCallback((placeholderId: string, entry: EvaluationQueueItem) => {
    setEvaluationQueueState((current) => {
      const filtered = current.filter(
        (item) => item.id !== placeholderId && item.id !== entry.id
      )
      return clampQueue([...filtered, entry])
    })
  }, [])

  const mergeQueueEntry = useCallback((entry: EvaluationQueueItem) => {
    setEvaluationQueueState((current) => {
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
  }, [])

  const createQueueEntryRemote = useCallback(
    async (payload: CreateQueueEntryPayload): Promise<EvaluationQueueItem> => {
      const response = await fetch("/admin/queue", {
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
    []
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

      const response = await fetch(`/admin/queue/${entryId}`, {
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
    []
  )

  return {
    evaluationQueue,
    setEvaluationQueue,
    addQueueEntries,
    replaceQueueEntry,
    mergeQueueEntry,
    createQueueEntryRemote,
    updateQueueEntryRemote,
  }
}
