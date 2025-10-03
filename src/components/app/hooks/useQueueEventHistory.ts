import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { useAdminAuth } from "@/components/app/providers/AdminAuthProvider"
import { transformQueueEventResponse } from "@/lib/appTransformers"
import type { EvaluationEvent, EvaluationEventResponse } from "@/lib/appTypes"

interface UseQueueEventHistoryResult {
  events: EvaluationEvent[]
  isLoading: boolean
  isStreaming: boolean
  error: string | null
  lastUpdatedAt: string | null
  refresh: () => Promise<void>
}

export function useQueueEventHistory(entryId: string | null | undefined): UseQueueEventHistoryResult {
  const { authorizedApiFetch, adminKey } = useAdminAuth()
  const [events, setEvents] = useState<EvaluationEvent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null)
  const [streamRevision, setStreamRevision] = useState(0)
  const [isStreaming, setIsStreaming] = useState(false)
  const activeEntryIdRef = useRef<string | null>(null)
  const controllerRef = useRef<AbortController | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const eventSignatureRef = useRef<Set<string>>(new Set())

  const buildSignature = useCallback((event: EvaluationEvent) => {
    const queueEntryId = typeof event.queueEntry?.id === "string" ? event.queueEntry.id : ""
    return [event.type, event.status ?? "", event.timestamp, queueEntryId].join("|")
  }, [])

  const fetchHistory = useCallback(async (targetId: string) => {
    setIsLoading(true)
    setError(null)

    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    activeEntryIdRef.current = targetId

    try {
      const response = await authorizedApiFetch(`/evaluations/queue/${encodeURIComponent(targetId)}/events/history`, {
        signal: controller.signal,
      })
      if (!response.ok) {
        const detail = await response.text().catch(() => "")
        throw new Error(detail || `Failed to load event history (status ${response.status})`)
      }

      const payload: unknown = await response.json()
      if (!Array.isArray(payload)) {
        throw new Error("Unexpected event history payload")
      }

      const transformed = payload.map((item) => transformQueueEventResponse(item as EvaluationEventResponse))

      if (activeEntryIdRef.current !== targetId) {
        return
      }

      setEvents(transformed)
      setLastUpdatedAt(new Date().toISOString())
      const signatureSet = new Set<string>()
      for (const event of transformed) {
        signatureSet.add(buildSignature(event))
      }
      eventSignatureRef.current = signatureSet
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        return
      }
      console.error(err)
      const message = err instanceof Error ? err.message : "Unable to load event history."
      setError(message)
      toast.error(message)
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null
      }
      setIsLoading(false)
    }
  }, [authorizedApiFetch, buildSignature])

  const refresh = useCallback(async () => {
    if (!entryId) {
      setEvents([])
      setError(null)
      setLastUpdatedAt(null)
      return
    }
    await fetchHistory(entryId)
  }, [entryId, fetchHistory])

  useEffect(() => {
    if (!entryId) {
      setEvents([])
      setError(null)
      setLastUpdatedAt(null)
      activeEntryIdRef.current = null
      controllerRef.current?.abort()
      controllerRef.current = null
      eventSourceRef.current?.close()
      eventSourceRef.current = null
      eventSignatureRef.current = new Set()
      return
    }

    if (activeEntryIdRef.current === entryId && events.length > 0) {
      return
    }

    fetchHistory(entryId)
    setStreamRevision((value) => value + 1)
  }, [entryId, fetchHistory, events.length])

  useEffect(() => {
    return () => {
      controllerRef.current?.abort()
      controllerRef.current = null
      eventSourceRef.current?.close()
      eventSourceRef.current = null
      setIsStreaming(false)
    }
  }, [])

  useEffect(() => {
    if (!entryId || typeof window === "undefined") {
      return () => {}
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
      setIsStreaming(false)
    }

    try {
      const url = new URL(`/api/evaluations/queue/${encodeURIComponent(entryId)}/events`, window.location.origin)
      if (adminKey) {
        url.searchParams.set("admin_key", adminKey)
      }
      const source = new EventSource(url.toString())
      eventSourceRef.current = source
      setIsStreaming(true)

      source.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as EvaluationEventResponse
          const transformed = transformQueueEventResponse(payload)
          const signature = buildSignature(transformed)
          setError(null)
          if (eventSignatureRef.current.has(signature)) {
            return
          }
          eventSignatureRef.current.add(signature)
          setEvents((current) => [...current, transformed])
          setLastUpdatedAt(new Date().toISOString())
        } catch (err) {
          console.error("Failed to parse queue event", err)
        }
      }

      source.onerror = (err) => {
        console.error("Queue event stream error", err)
        setError((current) => current ?? "Live event stream interrupted. Retrying…")
        source.close()
        eventSourceRef.current = null
        setIsStreaming(false)
        setTimeout(() => {
          if (activeEntryIdRef.current === entryId) {
            fetchHistory(entryId).catch(() => {
              // errors handled within fetchHistory
            })
            setStreamRevision((value) => value + 1)
          }
        }, 1500)
      }
    } catch (err) {
      console.error("Unable to establish queue event stream", err)
    }

    return () => {
      eventSourceRef.current?.close()
      eventSourceRef.current = null
      setIsStreaming(false)
    }
  }, [entryId, fetchHistory, streamRevision, adminKey, buildSignature])

  return {
    events,
    isLoading,
    isStreaming,
    error,
    lastUpdatedAt,
    refresh,
  }
}
