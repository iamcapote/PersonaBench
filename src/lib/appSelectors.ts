import type { AuditEvent, EvaluationQueueItem, PersonaData, ScenarioData } from "@/lib/appTypes"

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

export interface QueueSummary {
  total: number
  queued: number
  running: number
  completed: number
  failed: number
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

export const selectQueueSummary = (evaluationQueue: EvaluationQueueItem[]): QueueSummary => {
  return evaluationQueue.reduce<QueueSummary>(
    (acc, item) => {
      acc.total += 1
      acc[item.status] += 1
      return acc
    },
    { total: 0, queued: 0, running: 0, completed: 0, failed: 0 }
  )
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
