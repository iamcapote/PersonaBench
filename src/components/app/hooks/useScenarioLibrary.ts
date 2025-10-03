import { useCallback, useState } from "react"

import {
  slugifyIdentifier,
  transformScenarioSummary,
} from "@/lib/appTransformers"
import type { ScenarioData, ScenarioSummaryResponse } from "@/lib/appTypes"
import type { UseAuditTrailResult } from "@/components/app/hooks/useAuditTrail"
import { useAdminAuth } from "@/components/app/providers/AdminAuthProvider"

export interface SaveScenarioPayload {
  scenarioPayload: Omit<ScenarioData, "id" | "kind"> & { name: string; kind?: ScenarioData["kind"] }
  editingScenario?: ScenarioData | null
}

export interface SaveScenarioResult {
  scenario: ScenarioData
  isUpdate: boolean
}

export interface UseScenarioLibraryParams {
  initialScenarios?: ScenarioData[]
  recordAuditEvent: UseAuditTrailResult["recordAuditEvent"]
}

export interface UseScenarioLibraryResult {
  scenarios: ScenarioData[]
  setScenarios: (next: ScenarioData[] | ((current: ScenarioData[]) => ScenarioData[])) => void
  saveScenario: (payload: SaveScenarioPayload) => Promise<SaveScenarioResult>
}

export function useScenarioLibrary({
  initialScenarios = [],
  recordAuditEvent,
}: UseScenarioLibraryParams): UseScenarioLibraryResult {
  const [scenarios, setScenariosState] = useState<ScenarioData[]>(initialScenarios)
  const { authorizedApiFetch, hasAdminAccess } = useAdminAuth()

  const setScenarios = useCallback(
    (next: ScenarioData[] | ((current: ScenarioData[]) => ScenarioData[])) => {
      setScenariosState((current) => (typeof next === "function" ? (next as (current: ScenarioData[]) => ScenarioData[])(current) : next))
    },
    []
  )

  const saveScenario = useCallback(
    async ({ scenarioPayload, editingScenario }: SaveScenarioPayload): Promise<SaveScenarioResult> => {
      const scenarioId = editingScenario?.id ?? slugifyIdentifier(scenarioPayload.name, "scenario")
      const environment =
        editingScenario?.environment ?? slugifyIdentifier(scenarioPayload.domain ?? "custom", "environment")

      const existingDefinition =
        editingScenario?.rawDefinition && typeof editingScenario.rawDefinition === "object"
          ? JSON.parse(JSON.stringify(editingScenario.rawDefinition))
          : {}

      const metadata =
        existingDefinition.metadata && typeof existingDefinition.metadata === "object"
          ? { ...existingDefinition.metadata }
          : {}

      if (scenarioPayload.name) {
        metadata.title = scenarioPayload.name
        metadata.display_name = scenarioPayload.name
      }
      if (scenarioPayload.description) {
        metadata.description = scenarioPayload.description
      }
      metadata.domain = scenarioPayload.domain
      metadata.difficulty = scenarioPayload.difficulty
      metadata.estimated_time = scenarioPayload.estimatedTime
      metadata.tags = scenarioPayload.tags
      if (scenarioPayload.expectedOutputFormat) {
        metadata.expected_output = scenarioPayload.expectedOutputFormat
      }
      if (scenarioPayload.context) {
        metadata.context = scenarioPayload.context
      }

      const definition: Record<string, any> = {
        ...existingDefinition,
        id: scenarioId,
        mode:
          typeof existingDefinition.mode === "string" && existingDefinition.mode.trim().length > 0
            ? existingDefinition.mode
            : "simulation",
        metadata,
        instructions: scenarioPayload.instructions,
        setup_steps: scenarioPayload.setupSteps,
        constraints: scenarioPayload.constraints,
      }

      const evaluationDefinition =
        existingDefinition.evaluation && typeof existingDefinition.evaluation === "object"
          ? { ...existingDefinition.evaluation }
          : {}

      if (scenarioPayload.evaluationCriteria.length > 0) {
        evaluationDefinition.criteria = scenarioPayload.evaluationCriteria.map((criterion) => ({
          id: criterion.id,
          name: criterion.name,
          description: criterion.description,
          weight: criterion.weight,
          type: criterion.type,
        }))
      }

      if (Object.keys(evaluationDefinition).length > 0) {
        definition.evaluation = evaluationDefinition
      }

      const isUpdate = editingScenario?.source === "remote"

      try {
        if (!hasAdminAccess) {
          throw new Error("Admin key required to create or update scenarios.")
        }
        const endpoint = isUpdate ? `/api/scenarios/${scenarioId}` : "/api/scenarios"
        const method = isUpdate ? "PUT" : "POST"

        const response = await authorizedApiFetch(endpoint, {
          method,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ environment, definition }),
        })

        if (!response.ok) {
          let detail = `Failed to save scenario (status ${response.status})`
          try {
            const payload = await response.json()
            if (payload?.detail) {
              if (Array.isArray(payload.detail)) {
                detail = payload.detail
                  .map((item: unknown) => (typeof item === "string" ? item : JSON.stringify(item)))
                  .join("; ")
              } else {
                detail = String(payload.detail)
              }
            }
          } catch {
            try {
              const text = await response.text()
              if (text) {
                detail = text
              }
            } catch {
              /* noop */
            }
          }
          throw new Error(detail)
        }

        const payload: ScenarioSummaryResponse = await response.json()
        const normalized = transformScenarioSummary(payload)

        setScenariosState((currentScenarios: ScenarioData[]) => {
          if (isUpdate) {
            return currentScenarios.map((scenario: ScenarioData) =>
              scenario.id === scenarioId ? normalized : scenario
            )
          }

          const filtered = currentScenarios.filter((scenario: ScenarioData) => scenario.id !== normalized.id)
          return [...filtered, normalized]
        })

        recordAuditEvent({
          actor: "operator",
          action: isUpdate ? "scenario.update" : "scenario.create",
          subject: scenarioId,
          status: "success",
          metadata: {
            displayName: scenarioPayload.name,
            environment,
            criteria: scenarioPayload.evaluationCriteria.length,
          },
        })

        return { scenario: normalized, isUpdate }
      } catch (error) {
        recordAuditEvent({
          actor: "operator",
          action: isUpdate ? "scenario.update" : "scenario.create",
          subject: scenarioId,
          status: "failure",
          metadata: {
            displayName: scenarioPayload.name,
            environment,
            error: error instanceof Error ? error.message : "Unknown error",
          },
        })
        throw error instanceof Error ? error : new Error("Failed to save scenario via orchestration service.")
      }
    },
    [authorizedApiFetch, hasAdminAccess, recordAuditEvent]
  )

  return {
    scenarios,
    setScenarios,
    saveScenario,
  }
}
