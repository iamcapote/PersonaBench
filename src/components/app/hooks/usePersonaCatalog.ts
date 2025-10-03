import { useCallback, useState } from "react"

import {
  dedupeTools,
  extractMarkdownSummary,
  parsePlanningHorizonInput,
  slugifyIdentifier,
  transformPersonaSummary,
} from "@/lib/appTransformers"
import type { PersonaData, PersonaSummaryResponse } from "@/lib/appTypes"
import type { UseAuditTrailResult } from "@/components/app/hooks/useAuditTrail"
import { useAdminAuth } from "@/components/app/providers/AdminAuthProvider"

export interface SavePersonaPayload {
  personaPayload: Omit<PersonaData, "id"> & { name: string }
  editingPersona?: PersonaData | null
}

export interface UsePersonaCatalogParams {
  initialPersonas?: PersonaData[]
  recordAuditEvent: UseAuditTrailResult["recordAuditEvent"]
}

export interface SavePersonaResult {
  persona: PersonaData
  isUpdate: boolean
}

export interface UsePersonaCatalogResult {
  personas: PersonaData[]
  setPersonas: (next: PersonaData[] | ((current: PersonaData[]) => PersonaData[])) => void
  savePersona: (payload: SavePersonaPayload) => Promise<SavePersonaResult>
}

export function usePersonaCatalog({
  initialPersonas = [],
  recordAuditEvent,
}: UsePersonaCatalogParams): UsePersonaCatalogResult {
  const [personas, setPersonasState] = useState<PersonaData[]>(initialPersonas)
  const { authorizedApiFetch, hasAdminAccess } = useAdminAuth()

  const setPersonas = useCallback(
    (next: PersonaData[] | ((current: PersonaData[]) => PersonaData[])) => {
      setPersonasState((current) => (typeof next === "function" ? (next as (current: PersonaData[]) => PersonaData[])(current) : next))
    },
    []
  )

  const savePersona = useCallback(
    async ({ personaPayload, editingPersona }: SavePersonaPayload): Promise<SavePersonaResult> => {
      const personaId = editingPersona?.id ?? slugifyIdentifier(personaPayload.name, "persona")
      const existingDefinition =
        editingPersona?.rawDefinition && typeof editingPersona.rawDefinition === "object"
          ? JSON.parse(JSON.stringify(editingPersona.rawDefinition))
          : {}

      const planningFallback =
        typeof existingDefinition.planning_horizon === "number"
          ? existingDefinition.planning_horizon
          : 3
      const planningHorizon = parsePlanningHorizonInput(
        personaPayload.config.planningHorizon,
        planningFallback
      )

      const summaryText =
        extractMarkdownSummary(personaPayload.markdown) ||
        existingDefinition.description ||
        personaPayload.config.archetype

      const metadata =
        existingDefinition.metadata && typeof existingDefinition.metadata === "object"
          ? { ...existingDefinition.metadata }
          : {}

      const resolvedTools = (() => {
        const desired = dedupeTools(personaPayload.config.toolPermissions)
        if (desired.length > 0) {
          return desired
        }

        const fallback = dedupeTools(
          Array.isArray(existingDefinition.tools?.allowed)
            ? existingDefinition.tools.allowed
            : []
        )

        return fallback.length > 0 ? fallback : ["search"]
      })()

      const memoryDefinition =
        existingDefinition.memory && typeof existingDefinition.memory === "object"
          ? { ...existingDefinition.memory }
          : {}

      const toolsDefinition =
        existingDefinition.tools && typeof existingDefinition.tools === "object"
          ? { ...existingDefinition.tools }
          : {}

      const negotiationDefinition =
        existingDefinition.negotiation && typeof existingDefinition.negotiation === "object"
          ? { ...existingDefinition.negotiation }
          : {}

      const definition: Record<string, any> = {
        ...existingDefinition,
        name: personaId,
        version:
          typeof existingDefinition.version === "string" && existingDefinition.version.trim().length > 0
            ? existingDefinition.version
            : "0.1",
        description: summaryText,
        planning_horizon: planningHorizon,
        risk_tolerance: personaPayload.config.riskTolerance,
        deception_aversion: personaPayload.config.deceptionAversion,
        memory: {
          ...memoryDefinition,
          window: personaPayload.config.memoryWindow,
          persistence: memoryDefinition.persistence || "short",
        },
        tools: {
          ...toolsDefinition,
          allowed: resolvedTools,
        },
      }

      if (personaPayload.config.archetype) {
        definition.negotiation = {
          ...negotiationDefinition,
          style: personaPayload.config.archetype,
        }
        metadata.archetype = personaPayload.config.archetype
      }

      metadata.display_name = personaPayload.name
      metadata.markdown = personaPayload.markdown
      metadata.summary = summaryText
      definition.metadata = metadata

      const isUpdate = editingPersona?.source === "remote"
      const isEditing = Boolean(editingPersona)

      let rollbackSnapshot: PersonaData[] = personas
      let didOptimisticUpdate = false

      const optimisticPersona: PersonaData = {
        id: personaId,
        name: personaPayload.name,
        markdown: personaPayload.markdown,
        config: {
          archetype: personaPayload.config.archetype,
          riskTolerance: personaPayload.config.riskTolerance,
          planningHorizon: personaPayload.config.planningHorizon,
          deceptionAversion: personaPayload.config.deceptionAversion,
          toolPermissions: [...personaPayload.config.toolPermissions],
          memoryWindow: personaPayload.config.memoryWindow,
        },
        lastScore: editingPersona?.lastScore,
        source: editingPersona?.source ?? (isUpdate ? "remote" : "local"),
        sourcePath: editingPersona?.sourcePath,
        rawDefinition: editingPersona?.rawDefinition,
      }

      try {
        if (!hasAdminAccess) {
          throw new Error("Admin key required to create or update personas.")
        }

        setPersonasState((currentPersonas: PersonaData[]) => {
          didOptimisticUpdate = true
          rollbackSnapshot = currentPersonas
          if (isEditing) {
            return currentPersonas.map((persona) => (persona.id === personaId ? optimisticPersona : persona))
          }
          const filtered = currentPersonas.filter((persona) => persona.id !== personaId)
          return [...filtered, optimisticPersona]
        })

        const endpoint = isUpdate ? `/api/personas/${personaId}` : "/api/personas"
        const method = isUpdate ? "PUT" : "POST"

        const response = await authorizedApiFetch(endpoint, {
          method,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ definition }),
        })

        if (!response.ok) {
          let detail = `Failed to save persona (status ${response.status})`
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

        const payload: PersonaSummaryResponse = await response.json()
        const normalized = transformPersonaSummary(payload)

        setPersonasState((currentPersonas: PersonaData[]) => {
          const filtered = currentPersonas.filter((persona: PersonaData) => persona.id !== normalized.id)
          return [...filtered, normalized]
        })

        recordAuditEvent({
          actor: "operator",
          action: isUpdate ? "persona.update" : "persona.create",
          subject: personaId,
          status: "success",
          metadata: {
            displayName: personaPayload.name,
            toolCount: normalized.config.toolPermissions.length,
            source: normalized.source,
          },
        })

        return { persona: normalized, isUpdate }
      } catch (error) {
        if (didOptimisticUpdate) {
          setPersonasState(rollbackSnapshot)
        }
        recordAuditEvent({
          actor: "operator",
          action: isUpdate ? "persona.update" : "persona.create",
          subject: personaId,
          status: "failure",
          metadata: {
            displayName: personaPayload.name,
            error: error instanceof Error ? error.message : "Unknown error",
          },
        })
        throw error instanceof Error ? error : new Error("Failed to save persona via orchestration service.")
      }
    },
    [authorizedApiFetch, hasAdminAccess, personas, recordAuditEvent]
  )

  return {
    personas,
    setPersonas,
    savePersona,
  }
}
