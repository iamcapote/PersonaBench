import type { PersonaData } from "@/lib/appTypes"

export type RawPersonaDefinition = Record<string, any>
export interface PersonaImportResult {
  created: number
  updated: number
  errors: string[]
}

export function buildPersonaDefinition(persona: PersonaData): Record<string, any> {
  if (persona.rawDefinition && Object.keys(persona.rawDefinition).length > 0) {
    return JSON.parse(JSON.stringify(persona.rawDefinition))
  }

  const parsedPlanning = Number.parseInt(persona.config.planningHorizon, 10)
  const planningHorizon = Number.isFinite(parsedPlanning) ? parsedPlanning : persona.config.planningHorizon

  return {
    name: persona.id,
    version: "0.1",
    description: persona.markdown,
    planning_horizon: planningHorizon,
    risk_tolerance: persona.config.riskTolerance,
    deception_aversion: persona.config.deceptionAversion,
    memory: {
      window: persona.config.memoryWindow,
      persistence: "short",
    },
    tools: {
      allowed: [...persona.config.toolPermissions],
    },
    metadata: {
      display_name: persona.name,
      markdown: persona.markdown,
      source: persona.source ?? "local",
      source_path: persona.sourcePath,
    },
  }
}

export function parsePersonaBundle(payload: unknown): RawPersonaDefinition[] {
  if (Array.isArray(payload)) {
    return payload.filter((item): item is RawPersonaDefinition => Boolean(item) && typeof item === "object")
  }

  if (payload && typeof payload === "object") {
    const container = payload as Record<string, unknown>

    if (Array.isArray(container.personas)) {
      return container.personas.filter((item): item is RawPersonaDefinition => Boolean(item) && typeof item === "object")
    }

    if (Array.isArray(container.items)) {
      return container.items.filter((item): item is RawPersonaDefinition => Boolean(item) && typeof item === "object")
    }

    return [payload as RawPersonaDefinition]
  }

  return []
}
