import { useEffect, useMemo, useRef, useState } from "react"
import type { KeyboardEvent } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useQueueEventHistory } from "@/components/app/hooks/useQueueEventHistory"
import { QUEUE_STATUS_CONFIG } from "@/lib/appConstants"
import { formatTimestamp } from "@/lib/appTransformers"
import type { EvaluationQueueItem, EvaluationQueueSummary, PersonaData, ScenarioData } from "@/lib/appTypes"
import { downloadJsonFile } from "@/lib/utils"

interface QueueDashboardProps {
  evaluationQueue: EvaluationQueueItem[]
  queueSummary: EvaluationQueueSummary
  queueError?: string | null
  isSyncing?: boolean
  lastSyncedAt?: string | null
  onRefresh?: () => void | Promise<void>
  personas: PersonaData[]
  scenarios: ScenarioData[]
}

export function QueueDashboard({ evaluationQueue, queueSummary, queueError, isSyncing, lastSyncedAt, onRefresh, personas, scenarios }: QueueDashboardProps) {
  const orderedQueue = useMemo(() => evaluationQueue.slice().reverse(), [evaluationQueue])
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null)

  useEffect(() => {
    if (orderedQueue.length === 0) {
      setSelectedEntryId(null)
      return
    }
    if (!selectedEntryId || !orderedQueue.some((entry) => entry.id === selectedEntryId)) {
      setSelectedEntryId(orderedQueue[0].id)
    }
  }, [orderedQueue, selectedEntryId])

  const selectedEntry = useMemo(() => {
    if (!selectedEntryId) {
      return null
    }
    return orderedQueue.find((entry) => entry.id === selectedEntryId) ?? null
  }, [orderedQueue, selectedEntryId])

  const {
    events: eventHistory,
    isLoading: isHistoryLoading,
    isStreaming: isHistoryStreaming,
    error: historyError,
    lastUpdatedAt: historyUpdatedAt,
    refresh: refreshHistory,
  } = useQueueEventHistory(selectedEntryId)

  const eventCount = selectedEntry ? eventHistory.length : 0
  const errorEventCount = useMemo(() => eventHistory.filter((event) => Boolean(event.error)).length, [eventHistory])
  const timelineDurationSeconds = useMemo(() => {
    if (!selectedEntry || eventHistory.length < 2) {
      return null
    }

    let minTime = Number.POSITIVE_INFINITY
    let maxTime = Number.NEGATIVE_INFINITY

    for (const event of eventHistory) {
      const timestamp = new Date(event.timestamp).getTime()
      if (Number.isNaN(timestamp)) {
        continue
      }

      if (timestamp < minTime) {
        minTime = timestamp
      }

      if (timestamp > maxTime) {
        maxTime = timestamp
      }
    }

    if (!Number.isFinite(minTime) || !Number.isFinite(maxTime) || maxTime < minTime) {
      return null
    }

    return (maxTime - minTime) / 1000
  }, [selectedEntry, eventHistory])

  const historyScrollRef = useRef<HTMLDivElement | null>(null)
  const [isTimelinePinned, setIsTimelinePinned] = useState(true)
  const [timelineFilter, setTimelineFilter] = useState<"all" | "errors">("all")

  useEffect(() => {
    setIsTimelinePinned(true)
    setTimelineFilter("all")
  }, [selectedEntryId])

  useEffect(() => {
    const container = historyScrollRef.current
    if (!container) {
      return
    }

    if (!selectedEntry) {
      container.scrollTop = 0
      return
    }

    if (isTimelinePinned) {
      container.scrollTop = container.scrollHeight
    }
  }, [eventHistory.length, selectedEntry, isTimelinePinned])

  useEffect(() => {
    const container = historyScrollRef.current
    if (!container) {
      return
    }

    const handleScroll = () => {
      const distanceFromBottom = container.scrollHeight - (container.scrollTop + container.clientHeight)
      setIsTimelinePinned(distanceFromBottom <= 32)
    }

    container.addEventListener("scroll", handleScroll, { passive: true })
    handleScroll()

    return () => {
      container.removeEventListener("scroll", handleScroll)
    }
  }, [selectedEntryId])

  useEffect(() => {
    if (!selectedEntry) {
      setIsTimelinePinned(true)
    }
  }, [selectedEntry])

  const formatMinutes = (seconds: number | null | undefined): string => {
    if (typeof seconds !== "number" || !Number.isFinite(seconds)) {
      return "—"
    }
    if (seconds < 60) {
      return `${Math.round(seconds)} s`
    }
    return `${(seconds / 60).toFixed(1)} min`
  }

  const resolvePersonaName = (personaId: string | null | undefined): string => {
    if (!personaId) return "—"
    const persona = personas.find((entry) => entry.id === personaId)
    return persona ? `${persona.name}` : personaId
  }

  const resolveScenarioName = (targetId: string | null | undefined): string => {
    if (!targetId) return "—"
    const scenario = scenarios.find((entry) => entry.id === targetId)
    return scenario ? scenario.name : targetId
  }

  const handleRefresh = () => {
    if (!onRefresh) {
      return
    }
    Promise.resolve(onRefresh()).catch(() => {
      // errors are surfaced via queueError state
    })
  }

  const handleSelectEntry = (entryId: string) => {
    setSelectedEntryId(entryId)
  }

  const handleRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, entryId: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      handleSelectEntry(entryId)
    }
  }

  const handleExportHistory = () => {
    if (!selectedEntry || eventHistory.length === 0) {
      return
    }

    const filename = `queue-history-${selectedEntry.id}-${Date.now()}.json`
    downloadJsonFile(filename, {
      entry: selectedEntry,
      events: eventHistory,
    })
  }

  const handleCopyHistory = async () => {
    if (!selectedEntry || eventHistory.length === 0) {
      return
    }

    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      toast.error("Clipboard access is unavailable. Try downloading the JSON instead.")
      return
    }

    const payload = {
      entry: selectedEntry,
      events: eventHistory,
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
      toast.success("Run timeline copied to clipboard.")
    } catch (error) {
      console.error("Failed to copy run timeline", error)
      toast.error("Unable to copy timeline. Check clipboard permissions or export the JSON.")
    }
  }

  const handleScrollToLatest = () => {
    const container = historyScrollRef.current
    if (!container) {
      return
    }

    container.scrollTop = container.scrollHeight
    setIsTimelinePinned(true)
  }

  const filteredEventHistory = useMemo(() => {
    if (timelineFilter === "errors") {
      return eventHistory.filter((event) => Boolean(event.error))
    }
    return eventHistory
  }, [timelineFilter, eventHistory])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Queue Health</h2>
          <p className="text-sm text-muted-foreground">
            {queueError
              ? `Queue sync error: ${queueError}`
              : lastSyncedAt
              ? `Last sync ${formatTimestamp(lastSyncedAt)}`
              : "Queue sync in progress…"}
          </p>
        </div>
        {onRefresh && (
          <Button onClick={handleRefresh} variant="outline" size="sm" disabled={Boolean(isSyncing)}>
            {isSyncing ? "Refreshing…" : "Refresh"}
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Runs</CardTitle>
            <CardDescription>Queued from this operator session.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{queueSummary.totalEntries}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Running</CardTitle>
            <CardDescription>Currently executing rollouts.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{queueSummary.runningEntries}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Completed</CardTitle>
            <CardDescription>Finished evaluations.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{queueSummary.completedEntries}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Failed / Cancelled</CardTitle>
            <CardDescription>Runs that need operator attention.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{queueSummary.failedEntries}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Last Completed Run</CardTitle>
            <CardDescription>Most recent finished evaluation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div>
              <span className="font-medium text-foreground">Persona:</span> {resolvePersonaName(queueSummary.lastCompletedPersonaId)}
            </div>
            <div>
              <span className="font-medium text-foreground">Target:</span> {resolveScenarioName(queueSummary.lastCompletedTargetId)}
            </div>
            <div>
              <span className="font-medium text-foreground">Completed:</span> {queueSummary.lastCompletedAt ? formatTimestamp(queueSummary.lastCompletedAt) : "—"}
            </div>
            <div>
              <span className="font-medium text-foreground">Duration:</span>
              <span className="ml-1">{formatMinutes(queueSummary.lastCompletedDurationSeconds)}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Oldest Pending Run</CardTitle>
            <CardDescription>Monitor backlog pressure.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div>
              <span className="font-medium text-foreground">Persona:</span> {resolvePersonaName(queueSummary.oldestQueuedPersonaId)}
            </div>
            <div>
              <span className="font-medium text-foreground">Requested:</span> {queueSummary.oldestQueuedRequestedAt ? formatTimestamp(queueSummary.oldestQueuedRequestedAt) : "—"}
            </div>
            <div>
              <span className="font-medium text-foreground">Wait Time:</span>
              <span className="ml-1">{formatMinutes(queueSummary.oldestQueuedWaitSeconds)}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Active Queue</CardTitle>
            <CardDescription>Queued + running sessions.</CardDescription>
          </CardHeader>
          <CardContent className="flex h-full flex-col justify-center">
            <p className="text-3xl font-semibold">{queueSummary.activeEntries}</p>
            <p className="text-sm text-muted-foreground">{queueSummary.queuedEntries} queued / {queueSummary.runningEntries} running</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Evaluation Queue</CardTitle>
          <CardDescription>Most recent 15 evaluation requests.</CardDescription>
        </CardHeader>
        <CardContent>
          {orderedQueue.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No evaluations have been queued yet. Launch runs from the Personas or Scenarios tabs to populate this view.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground">
                  <tr className="border-b">
                    <th className="py-2 pr-4 text-left">Persona</th>
                    <th className="py-2 pr-4 text-left">Scenario</th>
                    <th className="py-2 pr-4 text-left">Status</th>
                    <th className="py-2 pr-4 text-left">Requested</th>
                    <th className="py-2 text-left">Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {orderedQueue.slice(0, 15).map((entry) => {
                    const personaName = personas.find((persona) => persona.id === entry.personaId)?.name ?? entry.personaId
                    const scenarioName = scenarios.find((scenario) => scenario.id === entry.scenarioId)?.name ?? entry.scenarioId
                    const status = QUEUE_STATUS_CONFIG[entry.status]
                    return (
                      <tr
                        key={entry.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleSelectEntry(entry.id)}
                        onKeyDown={(event) => handleRowKeyDown(event, entry.id)}
                        aria-selected={selectedEntryId === entry.id}
                        className={`border-b last:border-0 transition-colors ${selectedEntryId === entry.id ? "bg-muted" : "hover:bg-muted/60"}`}
                      >
                        <td className="py-2 pr-4">
                          <div className="font-medium">{personaName}</div>
                          <div className="text-xs text-muted-foreground">{entry.personaId}</div>
                        </td>
                        <td className="py-2 pr-4">
                          <div className="font-medium">{scenarioName}</div>
                          <div className="text-xs text-muted-foreground">{entry.scenarioId}</div>
                        </td>
                        <td className="py-2 pr-4">
                          <Badge variant={status.variant} className={status.className}>
                            {status.label}
                          </Badge>
                        </td>
                        <td className="py-2 pr-4 text-xs text-muted-foreground">
                          {formatTimestamp(entry.requestedAt)}
                        </td>
                        <td className="py-2 text-xs text-muted-foreground">
                          {formatTimestamp(entry.completedAt)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

          <Card>
            <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Run Event History</CardTitle>
                <CardDescription>
                  {selectedEntry
                    ? `Lifecycle events for ${resolvePersonaName(selectedEntry.personaId)} → ${resolveScenarioName(selectedEntry.scenarioId)}. Timeline updates automatically while streaming is active.`
                    : "Select a run to inspect its status timeline."}
                </CardDescription>
              </div>
              <div className="flex flex-col items-start gap-3 md:flex-row md:items-center md:justify-end">
                <div className="flex flex-wrap items-center gap-2">
                  {selectedEntry && (
                    <Badge
                      variant={isHistoryStreaming ? "secondary" : "outline"}
                      className={isHistoryStreaming ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600" : ""}
                    >
                      {isHistoryStreaming ? "Live" : "Paused"}
                    </Badge>
                  )}
                  {selectedEntry && (
                    <Badge variant="outline" className="border-muted-foreground/20 text-xs font-normal">
                      {eventCount === 1 ? "1 event" : `${eventCount} events`}
                    </Badge>
                  )}
                  {selectedEntry && errorEventCount > 0 && (
                    <Badge variant="outline" className="border-destructive/30 text-xs font-normal text-destructive">
                      {errorEventCount === 1 ? "1 error" : `${errorEventCount} errors`}
                    </Badge>
                  )}
                  {selectedEntry && timelineDurationSeconds !== null && (
                    <Badge variant="outline" className="border-muted-foreground/20 text-xs font-normal">
                      Duration {formatMinutes(timelineDurationSeconds)}
                    </Badge>
                  )}
                  {historyUpdatedAt && (
                    <span className="text-xs text-muted-foreground">
                      Last updated {formatTimestamp(historyUpdatedAt)}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {!isTimelinePinned && selectedEntry && eventHistory.length > 0 && (
                    <Button variant="outline" size="sm" onClick={handleScrollToLatest}>
                      Jump to latest
                    </Button>
                  )}
                  <div className="flex items-center gap-1">
                    <Button
                      variant={timelineFilter === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTimelineFilter("all")}
                      disabled={!selectedEntry || eventHistory.length === 0}
                    >
                      All events
                    </Button>
                    <Button
                      variant={timelineFilter === "errors" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTimelineFilter("errors")}
                      disabled={!selectedEntry || errorEventCount === 0}
                    >
                      Errors
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyHistory}
                    disabled={!selectedEntry || eventHistory.length === 0}
                  >
                    Copy JSON
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleExportHistory}
                    disabled={!selectedEntry || eventHistory.length === 0}
                  >
                    Export JSON
                  </Button>
                  <Button variant="outline" size="sm" onClick={refreshHistory} disabled={!selectedEntry || isHistoryLoading}>
                    {isHistoryLoading ? "Refreshing…" : "Refresh"}
                  </Button>
                </div>
              </div>
            </CardHeader>
        <CardContent>
          {!selectedEntry ? (
            <p className="text-sm text-muted-foreground">
              Choose a queue entry above to see its execution history and streaming updates.
            </p>
          ) : historyError ? (
            <p className="text-sm text-destructive">{historyError}</p>
          ) : filteredEventHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {timelineFilter === "errors"
                ? "No error events have been recorded for this run yet."
                : isHistoryLoading
                ? "Loading events…"
                : "No events have been recorded for this run yet."}
            </p>
          ) : (
            <div ref={historyScrollRef} className="max-h-96 overflow-y-auto pr-1">
              <ol className="space-y-3">
                {filteredEventHistory.map((event, index) => {
                  const label = event.status ? `${event.type} → ${event.status}` : event.type
                  return (
                    <li key={`${event.timestamp}-${event.type}-${index}`} className="rounded-md border bg-muted/40 p-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-foreground">{label}</span>
                        <span className="text-xs text-muted-foreground">{formatTimestamp(event.timestamp)}</span>
                      </div>
                      {event.error && (
                        <p className="mt-1 text-xs text-destructive/90">{event.error}</p>
                      )}
                      {!event.error && event.result && Object.keys(event.result).length > 0 && (
                        <pre className="mt-2 max-h-40 overflow-auto rounded bg-background/60 p-2 text-xs text-muted-foreground">
                          {JSON.stringify(event.result, null, 2)}
                        </pre>
                      )}
                    </li>
                  )
                })}
              </ol>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Next Steps</CardTitle>
          <CardDescription>Where to focus to operationalise the queue.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>Run the FastAPI orchestration service to back the queue with real job data.</li>
            <li>Enable streaming evaluation chains so long-running rollouts update live.</li>
            <li>Review the audit log after each deployment to confirm persona and scenario changes.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
