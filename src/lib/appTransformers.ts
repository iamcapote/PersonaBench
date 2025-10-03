import { formatTimestamp as formatTimestampValue } from "@/lib/formatters"
import type {
  AuditEvent,
  AuditEventResponse,
  EvaluationEvent,
  EvaluationEventResponse,
  EvaluationQueueItem,
  EvaluationQueueResponse,
  EvaluationQueueSummary,
  EvaluationQueueSummaryResponse,
  EvaluationQueueStatus,
  GameAssetResponseApi,
  GameAssets,
  GameSummaryResponse,
  PersonaData,
  PersonaSummaryResponse,
  ScenarioData,
  ScenarioSummaryResponse,
} from "@/lib/appTypes"

export const titleCase = (value: string) =>
  value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())

export const formatPlanningHorizon = (value: number | string | undefined): string => {
  if (value === undefined || value === null) return "Not specified"
  if (typeof value === "number") return `${value} steps`
  return String(value)
}

export const formatPercent = (value: number | undefined): string => {
  if (typeof value !== "number") return "unknown"
  return `${Math.round(value * 100)}%`
}

export const buildPersonaMarkdown = (
  summary: PersonaSummaryResponse,
  details: {
    archetype: string
    planning: number | string | undefined
    risk: number | undefined
    deception: number | undefined
    memoryWindow: number | undefined
    tools: string[]
  }
) => {
  const lines = [
    `# ${titleCase(summary.name)}`,
    "",
    "## Overview",
    summary.description || summary.definition?.description || "No description provided.",
    "",
    "## Behavioral Traits",
    `- Planning horizon: ${formatPlanningHorizon(details.planning)}`,
    `- Risk tolerance: ${formatPercent(details.risk)}`,
    `- Deception aversion: ${formatPercent(details.deception)}`,
    "",
    "## Tool Preferences",
    details.tools.length > 0
      ? details.tools.map((tool) => `- ${tool}`).join("\n")
      : "- None specified",
    "",
    "## Negotiation Style",
    details.archetype,
  ]

  return lines.join("\n")
}

export const slugifyIdentifier = (value: string, fallbackPrefix = "item"): string => {
  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  if (normalized) {
    return normalized
  }

  return `${fallbackPrefix}-${Date.now()}`
}

export const extractMarkdownSummary = (markdown: string): string => {
  return markdown
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("#")) ?? ""
}

export const parsePlanningHorizonInput = (value: unknown, fallback: number): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(1, Math.round(value))
  }

  if (typeof value === "string") {
    const match = value.match(/\d+/)
    if (match) {
      return Math.max(1, parseInt(match[0], 10))
    }
  }

  if (typeof fallback === "number" && Number.isFinite(fallback) && fallback > 0) {
    return Math.round(fallback)
  }

  return 3
}

export const dedupeTools = (tools: string[]): string[] => {
  return Array.from(
    new Set(
      tools
        .map((tool) => tool.trim())
        .filter((tool) => tool.length > 0)
    )
  )
}

export const generateClientId = (prefix: string): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export const formatTimestamp = (value: string | undefined): string => {
  return formatTimestampValue(value)
}

const normalizeDomain = (value: unknown): ScenarioData["domain"] => {
  if (typeof value !== "string") return "reasoning"
  const normalized = value.toLowerCase()
  if (normalized.includes("game") || normalized === "openspiel") return "games"
  if (normalized.includes("social")) return "social"
  if (normalized.includes("web") || normalized === "webarena") return "web"
  if (normalized.includes("story") || normalized === "tales") return "creative"
  if (normalized.includes("science") || normalized === "scienceworld") return "reasoning"
  if (normalized.includes("osworld") || normalized.includes("desktop")) return "technical"
  return "text"
}

const normalizeDifficulty = (value: unknown): ScenarioData["difficulty"] => {
  if (typeof value !== "string") return "medium"
  const normalized = value.toLowerCase()
  if (normalized === "easy" || normalized === "hard") return normalized
  return "medium"
}

const coerceStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value.map((item) => String(item))
}

const buildDefaultCriteria = (tags: string[]): ScenarioData["evaluationCriteria"] => {
  if (tags.length === 0) {
    return [
      {
        id: "overall",
        name: "Overall Performance",
        description: "Composite metric across scenario objectives",
        weight: 1,
        type: "algorithmic" as const,
      },
    ]
  }

  const weight = tags.length > 0 ? 1 / tags.length : 1
  return tags.map((tag, index) => ({
    id: `tag-${index}`,
    name: titleCase(tag),
    description: `Performance on ${tag} objectives`,
    weight,
    type: "algorithmic" as const,
  }))
}

export const transformPersonaSummary = (summary: PersonaSummaryResponse): PersonaData => {
  const rawDefinition = summary.definition ?? {}
  const definition = rawDefinition as Record<string, any>
  const metadata = (definition.metadata ?? {}) as Record<string, any>
  const risk = summary.risk_tolerance ?? definition.risk_tolerance ?? 0.5
  const planning = summary.planning_horizon ?? definition.planning_horizon
  const deception = summary.deception_aversion ?? definition.deception_aversion ?? 0.5
  const memoryWindow = summary.memory_window ?? definition.memory?.window ?? 0
  const tools = summary.tools ?? definition.tools?.allowed ?? []
  const archetypeSource =
    (typeof metadata.archetype === "string" && metadata.archetype.trim().length > 0
      ? metadata.archetype
      : undefined) ?? definition.negotiation?.style
  const archetype = archetypeSource ? titleCase(archetypeSource) : titleCase(summary.name)
  const displayName =
    typeof metadata.display_name === "string" && metadata.display_name.trim().length > 0
      ? metadata.display_name.trim()
      : titleCase(summary.name)
  const storedMarkdown =
    typeof metadata.markdown === "string" && metadata.markdown.trim().length > 0
      ? metadata.markdown
      : null

  return {
    id: summary.name,
    name: displayName,
    markdown:
      storedMarkdown ??
      buildPersonaMarkdown(summary, {
        archetype,
        planning,
        risk,
        deception,
        memoryWindow,
        tools,
      }),
    config: {
      archetype,
      riskTolerance: risk,
      planningHorizon: formatPlanningHorizon(planning),
      deceptionAversion: deception,
      toolPermissions: tools,
      memoryWindow,
    },
    source: "remote",
    sourcePath: summary.source_path ?? undefined,
    rawDefinition,
  }
}

const extractCriteria = (
  rawCriteria: Array<Record<string, any>>
): ScenarioData["evaluationCriteria"] => {
  return rawCriteria.map((entry: Record<string, any>, index: number) => {
    const weight =
      typeof entry.weight === "number" && Number.isFinite(entry.weight)
        ? entry.weight
        : rawCriteria.length > 0
          ? 1 / rawCriteria.length
          : 1

    const type =
      entry.type === "human" || entry.type === "both" || entry.type === "algorithmic"
        ? entry.type
        : "algorithmic"

    return {
      id: String(entry.id ?? `criterion-${index}`),
      name: String(entry.name ?? `Criterion ${index + 1}`),
      description: String(entry.description ?? "No description provided"),
      weight,
      type,
    }
  })
}

export const transformScenarioSummary = (summary: ScenarioSummaryResponse): ScenarioData => {
  const definition = summary.definition ?? {}
  const metadata = (definition.metadata ?? {}) as Record<string, unknown>
  const mergedTags = Array.from(new Set([...(summary.tags ?? []), ...coerceStringArray(metadata.tags)]))
  const evaluationDefinition = (definition.evaluation ?? {}) as Record<string, any>
  const rawCriteria = Array.isArray(evaluationDefinition.criteria)
    ? evaluationDefinition.criteria
    : []
  const extractedCriteria = rawCriteria.length > 0 ? extractCriteria(rawCriteria) : []
  const evaluationCriteria = extractedCriteria.length > 0
    ? extractedCriteria
    : buildDefaultCriteria(mergedTags.slice(0, 3))

  return {
    id: summary.key,
    name: summary.title,
    description:
      summary.description || (metadata.description as string) || "No description provided for this scenario.",
    domain: normalizeDomain(metadata.domain ?? summary.environment),
    difficulty: normalizeDifficulty(metadata.difficulty),
    estimatedTime: Number(metadata.estimated_time ?? 12),
    instructions:
      (metadata.instructions as string) || summary.description || "Follow the scenario instructions in the orchestration service.",
    setupSteps: coerceStringArray(definition.setup_steps ?? metadata.setup_steps),
    evaluationCriteria,
    expectedOutputFormat: (metadata.expected_output as string) || "See scenario documentation.",
    context: (metadata.context as string) || summary.environment,
    constraints: coerceStringArray(metadata.constraints),
    tags: mergedTags,
    source: "remote",
    kind: "scenario",
    environment: summary.environment,
    sourcePath: summary.source_path ?? undefined,
    rawDefinition: definition,
  }
}

export const transformGameSummary = (summary: GameSummaryResponse): ScenarioData => {
  const definition = summary.definition ?? {}
  const metadata = (definition.metadata ?? {}) as Record<string, unknown>
  const mergedTags = Array.from(
    new Set([
      ...(summary.tags ?? []),
      ...(summary.family ? [summary.family] : []),
      ...coerceStringArray(metadata.tags),
    ])
  )

  const estimatedTime = metadata.estimated_time ?? summary.estimated_time ?? 10
  const descriptionFallback =
    summary.description || (metadata.description as string) || "No description provided for this game."

  return {
    id: summary.key,
    name: summary.title || titleCase(summary.key),
    description: descriptionFallback,
    domain: "games",
    difficulty: normalizeDifficulty(metadata.difficulty ?? summary.difficulty),
    estimatedTime: Number(estimatedTime ?? 10),
    instructions:
      (definition.instructions as string) ||
      (metadata.instructions as string) ||
      descriptionFallback,
    setupSteps: coerceStringArray(definition.setup_steps ?? metadata.setup_steps),
    evaluationCriteria: buildDefaultCriteria(mergedTags.slice(0, 3)),
    expectedOutputFormat: (metadata.expected_output as string) || "Follow the game-specific instructions.",
    context: (metadata.context as string) || summary.family,
    constraints: coerceStringArray(metadata.constraints),
    tags: mergedTags,
    source: "remote",
    kind: "game",
    family: summary.family,
    environment: summary.family,
    sourcePath: summary.source_path ?? undefined,
    rawDefinition: definition,
  }
}

export const normalizeQueueStatus = (status: string): EvaluationQueueStatus => {
  switch (status) {
    case "running":
    case "completed":
    case "failed":
      return status
    case "queued":
    default:
      return "queued"
  }
}

export const transformQueueEntryResponse = (entry: EvaluationQueueResponse): EvaluationQueueItem => {
  return {
    id: entry.id,
    personaId: entry.persona_id,
    scenarioId: entry.target_id,
    targetKind: entry.target_kind,
    status: normalizeQueueStatus(entry.status),
    requestedAt: entry.requested_at,
    startedAt: entry.started_at ?? undefined,
    completedAt: entry.completed_at ?? undefined,
    error: entry.error ?? undefined,
    metadata: entry.metadata ?? undefined,
  }
}

export const transformQueueSummaryResponse = (
  summary: EvaluationQueueSummaryResponse
): EvaluationQueueSummary => {
  return {
    totalEntries: summary.total_entries,
    activeEntries: summary.active_entries,
    queuedEntries: summary.queued_entries,
    runningEntries: summary.running_entries,
    completedEntries: summary.completed_entries,
    failedEntries: summary.failed_entries,
    lastCompletedEntryId: summary.last_completed_entry_id ?? null,
    lastCompletedPersonaId: summary.last_completed_persona_id ?? null,
    lastCompletedTargetId: summary.last_completed_target_id ?? null,
    lastCompletedAt: summary.last_completed_at ?? null,
    lastCompletedDurationSeconds: summary.last_completed_duration_seconds ?? null,
    oldestQueuedEntryId: summary.oldest_queued_entry_id ?? null,
    oldestQueuedPersonaId: summary.oldest_queued_persona_id ?? null,
    oldestQueuedRequestedAt: summary.oldest_queued_requested_at ?? null,
    oldestQueuedWaitSeconds: summary.oldest_queued_wait_seconds ?? null,
  }
}

export const transformQueueEventResponse = (event: EvaluationEventResponse): EvaluationEvent => {
  return {
    type: event.type,
    status: event.status ?? undefined,
    timestamp: event.timestamp,
    queueEntry: event.queue_entry ?? {},
    result: event.result ?? undefined,
    error: event.error ?? undefined,
    errorType: event.error_type ?? undefined,
  }
}

export const normalizeAuditStatus = (status: string): AuditEvent["status"] => {
  const lowered = status.toLowerCase()
  if (lowered === "success" || lowered === "ok" || lowered === "succeeded") {
    return "success"
  }
  return "failure"
}

export const transformAuditEventResponse = (entry: AuditEventResponse): AuditEvent => {
  return {
    id: entry.id,
    timestamp: entry.timestamp,
    actor: entry.actor,
    action: entry.action,
    subject: entry.subject,
    status: normalizeAuditStatus(entry.status),
    metadata: entry.metadata ?? undefined,
  }
}

export const normalizeGameAssetResponse = (payload: GameAssetResponseApi): GameAssets => {
  return {
    manifest: payload.manifest,
    rulePack: payload.rule_pack ?? null,
    adapter: payload.adapter ?? null,
  }
}