import type {
  AuditEvent,
  EvaluationQueueItem,
  EvaluationQueueSummary,
  PersonaData,
  ScenarioData,
} from "@/lib/appTypes"

export interface PersonaSummary {
  total: number
  remote: number
  local: number
}

export interface ScenarioSummary {
  total: number
  remote: number
  games: {
    total: number
    remote: number
  }
}

export const selectPersonaSummary = (personas: PersonaData[]): PersonaSummary => {
  const remote = personas.filter((persona) => persona.source === "remote").length
  const local = personas.length - remote
  return {
    total: personas.length,
    remote,
    local,
  }
}

export const selectScenarioSummary = (scenarios: ScenarioData[]): ScenarioSummary => {
  const scenarioEntries = scenarios.filter((entry) => entry.kind !== "game")
  const gameEntries = scenarios.filter((entry) => entry.kind === "game")
  return {
    total: scenarioEntries.length,
    remote: scenarioEntries.filter((entry) => entry.source === "remote").length,
    games: {
      total: gameEntries.length,
      remote: gameEntries.filter((entry) => entry.source === "remote").length,
    },
  }
}

export const selectQueueSummary = (
  evaluationQueue: EvaluationQueueItem[],
  serverSummary?: EvaluationQueueSummary | null
): EvaluationQueueSummary => {
  const aggregate = evaluationQueue.reduce(
    (acc, item) => {
      acc.total += 1
      switch (item.status) {
        case "queued": {
          acc.queued += 1
          const requested = item.requestedAt ? Date.parse(item.requestedAt) : NaN
          if (!Number.isNaN(requested)) {
            if (acc.oldestQueuedTimestamp === null || requested < acc.oldestQueuedTimestamp) {
              acc.oldestQueuedTimestamp = requested
              acc.oldestQueuedEntry = item
            }
          }
          break
        }
        case "running":
          acc.running += 1
          break
        case "completed": {
          acc.completed += 1
          const completed = item.completedAt ? Date.parse(item.completedAt) : NaN
          if (!Number.isNaN(completed)) {
            if (acc.lastCompletedTimestamp === null || completed > acc.lastCompletedTimestamp) {
              acc.lastCompletedTimestamp = completed
              acc.lastCompletedEntry = item
            }
          }
          break
        }
        case "failed":
          acc.failed += 1
          break
        default:
          break
      }
      return acc
    },
    {
      total: 0,
      queued: 0,
      running: 0,
      completed: 0,
      failed: 0,
      lastCompletedTimestamp: null as number | null,
      lastCompletedEntry: null as EvaluationQueueItem | null,
      oldestQueuedTimestamp: null as number | null,
      oldestQueuedEntry: null as EvaluationQueueItem | null,
    }
  )

  const now = Date.now()
  const lastCompletedDurationSeconds = (() => {
    if (!aggregate.lastCompletedEntry) return null
    const completed = aggregate.lastCompletedEntry.completedAt
    const started = aggregate.lastCompletedEntry.startedAt
    if (!completed || !started) return null
    const completedMs = Date.parse(completed)
    const startedMs = Date.parse(started)
    if (Number.isNaN(completedMs) || Number.isNaN(startedMs)) return null
    return Math.max(0, (completedMs - startedMs) / 1000)
  })()

  const oldestQueuedWaitSeconds = (() => {
    if (aggregate.oldestQueuedTimestamp === null) return null
    return Math.max(0, (now - aggregate.oldestQueuedTimestamp) / 1000)
  })()

  const base: EvaluationQueueSummary = {
    totalEntries: aggregate.total,
    activeEntries: aggregate.queued + aggregate.running,
    queuedEntries: aggregate.queued,
    runningEntries: aggregate.running,
    completedEntries: aggregate.completed,
    failedEntries: aggregate.failed,
    lastCompletedEntryId: aggregate.lastCompletedEntry?.id ?? null,
    lastCompletedPersonaId: aggregate.lastCompletedEntry?.personaId ?? null,
    lastCompletedTargetId: aggregate.lastCompletedEntry?.scenarioId ?? null,
    lastCompletedAt: aggregate.lastCompletedEntry?.completedAt ?? null,
    lastCompletedDurationSeconds,
    oldestQueuedEntryId: aggregate.oldestQueuedEntry?.id ?? null,
    oldestQueuedPersonaId: aggregate.oldestQueuedEntry?.personaId ?? null,
    oldestQueuedRequestedAt: aggregate.oldestQueuedEntry?.requestedAt ?? null,
    oldestQueuedWaitSeconds,
  }

  if (!serverSummary) {
    return base
  }

  return {
    ...serverSummary,
    totalEntries: base.totalEntries,
    activeEntries: base.activeEntries,
    queuedEntries: base.queuedEntries,
    runningEntries: base.runningEntries,
    completedEntries: base.completedEntries,
    failedEntries: base.failedEntries,
    lastCompletedEntryId: serverSummary.lastCompletedEntryId ?? base.lastCompletedEntryId,
    lastCompletedPersonaId: serverSummary.lastCompletedPersonaId ?? base.lastCompletedPersonaId,
    lastCompletedTargetId: serverSummary.lastCompletedTargetId ?? base.lastCompletedTargetId,
    lastCompletedAt: serverSummary.lastCompletedAt ?? base.lastCompletedAt,
    lastCompletedDurationSeconds:
      serverSummary.lastCompletedDurationSeconds ?? base.lastCompletedDurationSeconds,
    oldestQueuedEntryId: serverSummary.oldestQueuedEntryId ?? base.oldestQueuedEntryId,
    oldestQueuedPersonaId: serverSummary.oldestQueuedPersonaId ?? base.oldestQueuedPersonaId,
    oldestQueuedRequestedAt:
      serverSummary.oldestQueuedRequestedAt ?? base.oldestQueuedRequestedAt,
    oldestQueuedWaitSeconds:
      serverSummary.oldestQueuedWaitSeconds ?? base.oldestQueuedWaitSeconds,
  }
}

export const selectRecentAudit = (auditLog: AuditEvent[], limit = 20): AuditEvent[] => {
  return auditLog.slice(0, limit)
}

export const selectPersonaPreview = (personas: PersonaData[]): PersonaData[] => {
  return personas.slice(0, 6)
}

export const selectScenarioPreview = (scenarios: ScenarioData[]): ScenarioData[] => {
  return scenarios.filter((entry) => entry.kind !== "game").slice(0, 6)
}

export const selectGamePreview = (scenarios: ScenarioData[]): ScenarioData[] => {
  return scenarios.filter((entry) => entry.kind === "game").slice(0, 4)
}
