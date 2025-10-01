import { useEffect, useState } from "react"
import { toast } from "sonner"

import {
  transformAuditEventResponse,
  transformGameSummary,
  transformPersonaSummary,
  transformQueueEntryResponse,
  transformScenarioSummary,
} from "@/lib/appTransformers"
import type {
  AuditEvent,
  AuditEventResponse,
  EvaluationQueueItem,
  EvaluationQueueResponse,
  GameSummaryResponse,
  PersonaData,
  PersonaSummaryResponse,
  ScenarioData,
  ScenarioSummaryResponse,
} from "@/lib/appTypes"

interface UseAppBootstrapParams {
  setPersonas: (next: PersonaData[] | ((current: PersonaData[]) => PersonaData[])) => void
  setScenarios: (next: ScenarioData[] | ((current: ScenarioData[]) => ScenarioData[])) => void
  setEvaluationQueue: (entries: EvaluationQueueItem[]) => void
  setAuditLog: (events: AuditEvent[]) => void
  onScenariosHydrated?: (scenarios: ScenarioData[]) => void
}

interface UseAppBootstrapResult {
  isSyncing: boolean
  loadError: string | null
  setLoadError: (error: string | null) => void
}

export function useAppBootstrap({
  setPersonas,
  setScenarios,
  setEvaluationQueue,
  setAuditLog,
  onScenariosHydrated,
}: UseAppBootstrapParams): UseAppBootstrapResult {
  const [isSyncing, setIsSyncing] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadPersonas = async (): Promise<PersonaSummaryResponse[] | null> => {
      try {
        const response = await fetch("/api/personas")
        if (!response.ok) throw new Error(`Persona request failed with status ${response.status}`)
        const payload: PersonaSummaryResponse[] = await response.json()
        if (!cancelled && payload.length === 0) {
          setLoadError((prev) =>
            prev ?? "No personas returned by orchestration service; showing local examples."
          )
        }
        return payload
      } catch (error) {
        console.error(error)
        if (!cancelled) {
          setLoadError((prev) =>
            prev ?? "Failed to load personas from orchestration service; using local examples."
          )
          toast.error("Unable to load personas from orchestration service. Fallback to local examples.")
        }
        return null
      }
    }

    const loadScenarios = async (): Promise<ScenarioSummaryResponse[] | null> => {
      try {
        const response = await fetch("/api/scenarios")
        if (!response.ok) throw new Error(`Scenario request failed with status ${response.status}`)
        const payload: ScenarioSummaryResponse[] = await response.json()
        if (!cancelled && payload.length === 0) {
          setLoadError((prev) =>
            prev ?? "No scenarios returned by orchestration service; using local fixtures."
          )
        }
        return payload
      } catch (error) {
        console.error(error)
        if (!cancelled) {
          setLoadError((prev) =>
            prev ?? "Failed to load scenarios from orchestration service; using local fixtures."
          )
          toast.error("Unable to load scenarios from orchestration service. Fallback to local fixtures.")
        }
        return null
      }
    }

    const loadGames = async (): Promise<GameSummaryResponse[] | null> => {
      try {
        const response = await fetch("/api/games")
        if (!response.ok) throw new Error(`Game request failed with status ${response.status}`)
        const payload: GameSummaryResponse[] = await response.json()
        if (!cancelled && payload.length === 0) {
          setLoadError((prev) =>
            prev ?? "No games returned by orchestration service; showing scenario fixtures only."
          )
        }
        return payload
      } catch (error) {
        console.error(error)
        if (!cancelled) {
          setLoadError((prev) =>
            prev ?? "Failed to load games from orchestration service. Card library unavailable."
          )
          toast.error("Unable to load games from orchestration service. Card library unavailable.")
        }
        return null
      }
    }

    const loadQueue = async (): Promise<EvaluationQueueResponse[] | null> => {
      try {
        const response = await fetch("/admin/queue")
        if (!response.ok) throw new Error(`Queue request failed with status ${response.status}`)
        const payload: EvaluationQueueResponse[] = await response.json()
        return payload
      } catch (error) {
        console.error(error)
        if (!cancelled) {
          toast.error("Unable to load evaluation queue from orchestration service. Showing session data only.")
        }
        return null
      }
    }

    const loadAudit = async (): Promise<AuditEventResponse[] | null> => {
      try {
        const response = await fetch("/admin/audit")
        if (!response.ok) throw new Error(`Audit request failed with status ${response.status}`)
        const payload: AuditEventResponse[] = await response.json()
        return payload
      } catch (error) {
        console.error(error)
        if (!cancelled) {
          toast.error("Unable to load audit log from orchestration service. Showing session data only.")
        }
        return null
      }
    }

    const hydrate = async () => {
      setIsSyncing(true)
      const [personaPayload, scenarioPayload, gamePayload, queuePayload, auditPayload] = await Promise.all([
        loadPersonas(),
        loadScenarios(),
        loadGames(),
        loadQueue(),
        loadAudit(),
      ])

      if (cancelled) {
        return
      }

      if (personaPayload && personaPayload.length > 0) {
        setPersonas(personaPayload.map(transformPersonaSummary))
      }

      const remoteScenarios = (scenarioPayload ?? []).map(transformScenarioSummary)
      const remoteGames = (gamePayload ?? []).map(transformGameSummary)

      if (remoteScenarios.length > 0 || remoteGames.length > 0) {
        const combined = [...remoteScenarios, ...remoteGames]
        setScenarios(combined)
        onScenariosHydrated?.(combined)
      }

      if (queuePayload && queuePayload.length > 0) {
        setEvaluationQueue(queuePayload.map(transformQueueEntryResponse))
      }

      if (auditPayload && auditPayload.length > 0) {
        const events = auditPayload.map(transformAuditEventResponse).reverse()
        setAuditLog(events)
      }

      setIsSyncing(false)
    }

    hydrate()

    return () => {
      cancelled = true
    }
  }, [setPersonas, setScenarios, setEvaluationQueue, setAuditLog, onScenariosHydrated])

  return {
    isSyncing,
    loadError,
    setLoadError,
  }
}
