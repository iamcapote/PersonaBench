import { useCallback, useEffect, useMemo, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { PersonaCard } from "@/components/PersonaCard"
import { PersonaEditor } from "@/components/PersonaEditor"
import { ScenarioSelector } from "@/components/ScenarioSelector"
import { ScenarioBuilder } from "@/components/ScenarioBuilder"
import { EvaluationRunner } from "@/components/EvaluationRunner"
import { ResultsAnalytics } from "@/components/ResultsAnalytics"
import { Badge } from "@/components/ui/badge"
import { Flask, Plus, ChartBar, FileText, Play } from "@phosphor-icons/react"
import { toast } from "sonner"

import { samplePersonas } from "@/samplePersonas"
import { GameTransparencyPanel } from "@/components/GameTransparencyPanel"
import type { GameAssets } from "@/components/GameTransparencyPanel"
import { PersonaTransparencyPanel } from "@/components/PersonaTransparencyPanel"
import { ScenarioTransparencyPanel } from "@/components/ScenarioTransparencyPanel"

interface PersonaData {
  id: string
  name: string
  markdown: string
  config: {
    archetype: string
    riskTolerance: number
    planningHorizon: string
    deceptionAversion: number
    toolPermissions: string[]
    memoryWindow: number
  }
  lastScore?: number
  source?: "remote" | "local"
  sourcePath?: string
  rawDefinition?: Record<string, any>
}

type ScenarioKind = 'scenario' | 'game'

interface ScenarioData {
  id: string
  name: string
  description: string
  domain: 'games' | 'social' | 'web' | 'text' | 'reasoning' | 'creative' | 'technical'
  difficulty: 'easy' | 'medium' | 'hard'
  estimatedTime: number
  instructions: string
  setupSteps: string[]
  evaluationCriteria: Array<{
    id: string
    name: string
    description: string
    weight: number
    type: 'algorithmic' | 'human' | 'both'
  }>
  expectedOutputFormat: string
  context: string
  constraints: string[]
  tags: string[]
  source?: "remote" | "local"
  kind?: ScenarioKind
  family?: string
  sourcePath?: string
  rawDefinition?: Record<string, any>
  environment?: string
}

interface EvaluationResult {
  personaId: string
  scenarioId: string
  type: 'algorithmic' | 'human'
  scores: Record<string, number>
  overallScore: number
  timestamp: string
  response?: string
  humanEvaluatorId?: string
}

type EvaluationQueueStatus = 'queued' | 'running' | 'completed' | 'failed'

type EvaluationTargetKind = 'scenario' | 'game'

interface EvaluationQueueItem {
  id: string
  personaId: string
  scenarioId: string
  targetKind: EvaluationTargetKind
  status: EvaluationQueueStatus
  requestedAt: string
  startedAt?: string
  completedAt?: string
  error?: string
  metadata?: Record<string, unknown>
}

interface AuditEvent {
  id: string
  timestamp: string
  actor: string
  action: string
  subject: string
  status: 'success' | 'failure'
  metadata?: Record<string, unknown>
}

interface EvaluationQueueResponse {
  id: string
  persona_id: string
  target_id: string
  target_kind: EvaluationTargetKind
  status: string
  requested_at: string
  started_at?: string | null
  completed_at?: string | null
  error?: string | null
  metadata?: Record<string, unknown> | null
}

interface AuditEventResponse {
  id: string
  timestamp: string
  actor: string
  action: string
  subject: string
  status: string
  metadata?: Record<string, unknown> | null
}

const queueStatusConfig: Record<EvaluationQueueStatus, { label: string; variant: 'default' | 'secondary' | 'outline'; className?: string }> = {
  queued: {
    label: 'Queued',
    variant: 'secondary',
  },
  running: {
    label: 'Running',
    variant: 'default',
  },
  completed: {
    label: 'Completed',
    variant: 'outline',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800',
  },
  failed: {
    label: 'Failed',
    variant: 'outline',
    className: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800',
  },
}

interface PersonaSummaryResponse {
  name: string
  version: string
  description?: string
  risk_tolerance?: number
  planning_horizon?: number | string
  deception_aversion?: number
  memory_window?: number
  tools?: string[]
  definition?: Record<string, any>
  source_path?: string
}

interface ScenarioSummaryResponse {
  key: string
  title: string
  environment: string
  tags: string[]
  description?: string
  mode?: string
  definition?: Record<string, any>
  source_path?: string
}

interface GameSummaryResponse {
  key: string
  title: string
  family: string
  tags: string[]
  description?: string
  mode?: string
  difficulty?: string
  estimated_time?: number
  definition?: Record<string, any>
  source_path?: string
}

interface AssetSnippetPayload {
  path: string
  content: string
  language?: string | null
}

interface GameAssetResponseApi {
  manifest: AssetSnippetPayload
  rule_pack?: AssetSnippetPayload | null
  adapter?: AssetSnippetPayload | null
}

const localPersonaFallback: PersonaData[] = (samplePersonas as PersonaData[]).map((persona) => ({
  ...persona,
  source: "local" as const,
}))

const mockScenarios: ScenarioData[] = [
  {
    id: 'poker-001',
    name: 'High-Stakes Poker',
    kind: 'scenario',
    description: "Navigate a complex no-limit Texas Hold'em scenario with incomplete information",
    domain: 'games',
    environment: 'custom-games',
    difficulty: 'hard',
    estimatedTime: 15,
    instructions: 'You are playing in a high-stakes poker tournament. Make strategic decisions based on your hand, position, and read of other players.',
    setupSteps: ['Shuffle deck', 'Deal initial hands', 'Set blinds'],
    evaluationCriteria: [
      {
        id: 'strategy',
        name: 'Strategic Thinking',
        description: 'Quality of strategic decisions',
        weight: 0.4,
        type: 'both'
      },
      {
        id: 'risk_management',
        name: 'Risk Management',
        description: 'Appropriate risk assessment',
        weight: 0.3,
        type: 'algorithmic'
      },
      {
        id: 'adaptability',
        name: 'Adaptability',
        description: 'Ability to adapt to changing situations',
        weight: 0.3,
        type: 'human'
      }
    ],
    expectedOutputFormat: 'Detailed decision rationale with betting actions',
    context: 'Tournament setting with experienced players',
    constraints: ['Must follow poker rules', 'Cannot see other players cards'],
    tags: ['strategy', 'incomplete-information', 'risk-assessment'],
    source: "local"
  },
  {
    id: 'negotiation-001',
    name: 'Resource Allocation',
    kind: 'scenario',
    description: 'Negotiate fair distribution of limited resources among competing parties',
    domain: 'social',
    environment: 'custom-social',
    difficulty: 'medium',
    estimatedTime: 10,
    instructions: 'You must negotiate the distribution of limited budget among 5 competing departments.',
    setupSteps: ['Review budget constraints', 'Understand department needs'],
    evaluationCriteria: [
      {
        id: 'fairness',
        name: 'Fairness',
        description: 'Equitable distribution approach',
        weight: 0.3,
        type: 'human'
      },
      {
        id: 'efficiency',
        name: 'Efficiency',
        description: 'Optimal resource utilization',
        weight: 0.4,
        type: 'algorithmic'
      },
      {
        id: 'diplomacy',
        name: 'Diplomatic Skill',
        description: 'Maintaining good relationships',
        weight: 0.3,
        type: 'human'
      }
    ],
    expectedOutputFormat: 'Allocation proposal with justification',
    context: 'Corporate environment with tight budgets',
    constraints: ['Cannot exceed total budget', 'All departments must receive something'],
    tags: ['negotiation', 'resource-management', 'diplomacy'],
    source: "local"
  }
]

const titleCase = (value: string) =>
  value
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())

const formatPlanningHorizon = (value: number | string | undefined) => {
  if (value === undefined || value === null) return 'Not specified'
  if (typeof value === 'number') return `${value} steps`
  return String(value)
}

const formatPercent = (value: number | undefined) => {
  if (typeof value !== 'number') return 'unknown'
  return `${Math.round(value * 100)}%`
}

const buildPersonaMarkdown = (
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
    '',
    '## Overview',
    summary.description || summary.definition?.description || 'No description provided.',
    '',
    '## Behavioral Traits',
    `- Planning horizon: ${formatPlanningHorizon(details.planning)}`,
    `- Risk tolerance: ${formatPercent(details.risk)}`,
    `- Deception aversion: ${formatPercent(details.deception)}`,
    '',
    '## Tool Preferences',
    details.tools.length > 0
      ? details.tools.map((tool) => `- ${tool}`).join('\n')
      : '- None specified',
    '',
    '## Negotiation Style',
    details.archetype,
  ]

  return lines.join('\n')
}

const slugifyIdentifier = (value: string, fallbackPrefix = 'item'): string => {
  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  if (normalized) {
    return normalized
  }

  return `${fallbackPrefix}-${Date.now()}`
}

const extractMarkdownSummary = (markdown: string): string => {
  return markdown
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith('#')) ?? ''
}

const parsePlanningHorizonInput = (value: unknown, fallback: number): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(1, Math.round(value))
  }

  if (typeof value === 'string') {
    const match = value.match(/\d+/)
    if (match) {
      return Math.max(1, parseInt(match[0], 10))
    }
  }

  if (typeof fallback === 'number' && Number.isFinite(fallback) && fallback > 0) {
    return Math.round(fallback)
  }

  return 3
}

const dedupeTools = (tools: string[]): string[] => {
  return Array.from(
    new Set(
      tools
        .map((tool) => tool.trim())
        .filter((tool) => tool.length > 0)
    )
  )
}

const generateClientId = (prefix: string): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const formatTimestamp = (value: string | undefined): string => {
  if (!value) {
    return '—'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString()
}

const transformPersonaSummary = (summary: PersonaSummaryResponse): PersonaData => {
  const rawDefinition = summary.definition ?? {}
  const definition = rawDefinition as Record<string, any>
  const metadata = (definition.metadata ?? {}) as Record<string, any>
  const risk = summary.risk_tolerance ?? definition.risk_tolerance ?? 0.5
  const planning = summary.planning_horizon ?? definition.planning_horizon
  const deception = summary.deception_aversion ?? definition.deception_aversion ?? 0.5
  const memoryWindow = summary.memory_window ?? definition.memory?.window ?? 0
  const tools = summary.tools ?? definition.tools?.allowed ?? []
  const archetypeSource =
    (typeof metadata.archetype === 'string' && metadata.archetype.trim().length > 0
      ? metadata.archetype
      : undefined) ?? definition.negotiation?.style
  const archetype = archetypeSource ? titleCase(archetypeSource) : titleCase(summary.name)
  const displayName =
    typeof metadata.display_name === 'string' && metadata.display_name.trim().length > 0
      ? metadata.display_name.trim()
      : titleCase(summary.name)
  const storedMarkdown =
    typeof metadata.markdown === 'string' && metadata.markdown.trim().length > 0
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

const normalizeDomain = (value: unknown): ScenarioData['domain'] => {
  if (typeof value !== 'string') return 'reasoning'
  const normalized = value.toLowerCase()
  if (normalized.includes('game') || normalized === 'openspiel') return 'games'
  if (normalized.includes('social')) return 'social'
  if (normalized.includes('web') || normalized === 'webarena') return 'web'
  if (normalized.includes('story') || normalized === 'tales') return 'creative'
  if (normalized.includes('science') || normalized === 'scienceworld') return 'reasoning'
  if (normalized.includes('osworld') || normalized.includes('desktop')) return 'technical'
  return 'text'
}

const normalizeDifficulty = (value: unknown): ScenarioData['difficulty'] => {
  if (typeof value !== 'string') return 'medium'
  const normalized = value.toLowerCase()
  if (normalized === 'easy' || normalized === 'hard') return normalized
  return 'medium'
}

const coerceStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value.map((item) => String(item))
}

const buildDefaultCriteria = (tags: string[]): ScenarioData['evaluationCriteria'] => {
  if (tags.length === 0) {
    return [
      {
        id: 'overall',
        name: 'Overall Performance',
        description: 'Composite metric across scenario objectives',
        weight: 1,
        type: 'algorithmic',
      },
    ]
  }

  const weight = tags.length > 0 ? 1 / tags.length : 1
  return tags.map((tag, index) => ({
    id: `tag-${index}`,
    name: titleCase(tag),
    description: `Performance on ${tag} objectives`,
    weight,
    type: 'algorithmic' as const,
  }))
}

const transformScenarioSummary = (summary: ScenarioSummaryResponse): ScenarioData => {
  const definition = summary.definition ?? {}
  const metadata = (definition.metadata ?? {}) as Record<string, unknown>
  const mergedTags = Array.from(new Set([...(summary.tags ?? []), ...coerceStringArray(metadata.tags)]))
  const evaluationDefinition = (definition.evaluation ?? {}) as Record<string, any>
  const rawCriteria = Array.isArray(evaluationDefinition.criteria)
    ? evaluationDefinition.criteria
    : []
  const extractedCriteria = rawCriteria.map((entry: Record<string, any>, index: number) => {
    const weight =
      typeof entry.weight === 'number' && Number.isFinite(entry.weight)
        ? entry.weight
        : rawCriteria.length > 0
          ? 1 / rawCriteria.length
          : 1

    const type =
      entry.type === 'human' || entry.type === 'both' || entry.type === 'algorithmic'
        ? entry.type
        : 'algorithmic'

    return {
      id: String(entry.id ?? `criterion-${index}`),
      name: String(entry.name ?? `Criterion ${index + 1}`),
      description: String(entry.description ?? 'No description provided'),
      weight,
      type,
    }
  })
  const evaluationCriteria = extractedCriteria.length > 0
    ? extractedCriteria
    : buildDefaultCriteria(mergedTags.slice(0, 3))

  return {
    id: summary.key,
    name: summary.title,
    description:
      summary.description || (metadata.description as string) || 'No description provided for this scenario.',
    domain: normalizeDomain(metadata.domain ?? summary.environment),
    difficulty: normalizeDifficulty(metadata.difficulty),
    estimatedTime: Number(metadata.estimated_time ?? 12),
    instructions:
      (metadata.instructions as string) || summary.description || 'Follow the scenario instructions in the orchestration service.',
    setupSteps: coerceStringArray(definition.setup_steps ?? metadata.setup_steps),
    evaluationCriteria,
    expectedOutputFormat: (metadata.expected_output as string) || 'See scenario documentation.',
    context: (metadata.context as string) || summary.environment,
    constraints: coerceStringArray(metadata.constraints),
    tags: mergedTags,
    source: "remote",
    kind: 'scenario',
    environment: summary.environment,
    sourcePath: summary.source_path ?? undefined,
    rawDefinition: definition,
  }
}

const transformGameSummary = (summary: GameSummaryResponse): ScenarioData => {
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
    summary.description || (metadata.description as string) || 'No description provided for this game.'

  return {
    id: summary.key,
    name: summary.title || titleCase(summary.key),
    description: descriptionFallback,
    domain: 'games',
    difficulty: normalizeDifficulty(metadata.difficulty ?? summary.difficulty),
    estimatedTime: Number(estimatedTime ?? 10),
    instructions:
      (definition.instructions as string) ||
      (metadata.instructions as string) ||
      descriptionFallback,
    setupSteps: coerceStringArray(definition.setup_steps ?? metadata.setup_steps),
    evaluationCriteria: buildDefaultCriteria(mergedTags.slice(0, 3)),
    expectedOutputFormat: (metadata.expected_output as string) || 'Follow the game-specific instructions.',
    context: (metadata.context as string) || summary.family,
    constraints: coerceStringArray(metadata.constraints),
    tags: mergedTags,
    source: "remote",
    kind: 'game',
    family: summary.family,
    environment: summary.family,
    sourcePath: summary.source_path ?? undefined,
    rawDefinition: definition,
  }
}

const normalizeQueueStatus = (status: string): EvaluationQueueStatus => {
  switch (status) {
    case 'running':
    case 'completed':
    case 'failed':
      return status
    case 'queued':
    default:
      return 'queued'
  }
}

const transformQueueEntryResponse = (entry: EvaluationQueueResponse): EvaluationQueueItem => {
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

const normalizeAuditStatus = (status: string): AuditEvent['status'] => {
  const lowered = status.toLowerCase()
  if (lowered === 'success' || lowered === 'ok' || lowered === 'succeeded') {
    return 'success'
  }
  return 'failure'
}

const transformAuditEventResponse = (entry: AuditEventResponse): AuditEvent => {
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

function App() {
  const [personas, setPersonas] = useState<PersonaData[]>(localPersonaFallback)
  const [scenarios, setScenarios] = useState<ScenarioData[]>(mockScenarios)
  const [results, setResults] = useState<EvaluationResult[]>([])
  const [evaluationQueue, setEvaluationQueue] = useState<EvaluationQueueItem[]>([])
  const [auditLog, setAuditLog] = useState<AuditEvent[]>([])
  const [gameAssets, setGameAssets] = useState<Record<string, GameAssets>>({})
  const [assetLoading, setAssetLoading] = useState(false)
  const [assetError, setAssetError] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState("personas")
  const [showPersonaEditor, setShowPersonaEditor] = useState(false)
  const [showScenarioBuilder, setShowScenarioBuilder] = useState(false)
  const [showEvaluationRunner, setShowEvaluationRunner] = useState(false)

  const [editingPersona, setEditingPersona] = useState<PersonaData | null>(null)
  const [editingScenario, setEditingScenario] = useState<ScenarioData | null>(null)
  const [selectedScenario, setSelectedScenario] = useState<string>("")
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>([])
  const [inspectingPersona, setInspectingPersona] = useState<PersonaData | null>(null)
  const [isSyncing, setIsSyncing] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const replaceAuditEvent = useCallback((placeholderId: string, entry: AuditEvent) => {
    setAuditLog((current) => {
      const filtered = current.filter((item) => item.id !== placeholderId && item.id !== entry.id)
      const next = [entry, ...filtered]
      return next.slice(0, 200)
    })
  }, [])

  const recordAuditEvent = useCallback(
    (event: Omit<AuditEvent, 'id' | 'timestamp'> & { timestamp?: string }) => {
      const placeholderId = generateClientId('audit')
      const timestamp = event.timestamp ?? new Date().toISOString()
      const placeholder: AuditEvent = {
        id: placeholderId,
        timestamp,
        actor: event.actor,
        action: event.action,
        subject: event.subject,
        status: event.status,
        metadata: event.metadata,
      }

      setAuditLog((current) => [placeholder, ...current].slice(0, 200))

      const payload: Record<string, unknown> = {
        actor: event.actor,
        action: event.action,
        subject: event.subject,
        status: event.status,
        metadata: event.metadata ?? {},
      }
      if (event.timestamp) {
        payload.timestamp = event.timestamp
      }

      fetch("/admin/audit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })
        .then(async (response) => {
          if (!response.ok) {
            const message = await response.text().catch(() => '')
            throw new Error(message || `Failed to persist audit event (status ${response.status})`)
          }

          const data: AuditEventResponse = await response.json()
          const normalized = transformAuditEventResponse(data)
          replaceAuditEvent(placeholderId, normalized)
        })
        .catch((error) => {
          console.error(error)
          toast.error("Unable to persist audit event. Recording locally only.")
        })
    },
    [replaceAuditEvent]
  )

  const replaceQueueEntry = useCallback((placeholderId: string, entry: EvaluationQueueItem) => {
    setEvaluationQueue((current) => {
      const filtered = current.filter(
        (item) => item.id !== placeholderId && item.id !== entry.id
      )
      const appended = [...filtered, entry]
      if (appended.length > 200) {
        return appended.slice(-200)
      }
      return appended
    })
  }, [])

  const mergeQueueEntry = useCallback((entry: EvaluationQueueItem) => {
    setEvaluationQueue((current) => {
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
      const appended = [...current, entry]
      if (appended.length > 200) {
        return appended.slice(-200)
      }
      return appended
    })
  }, [])

  const createQueueEntry = useCallback(
    async (payload: {
      personaId: string
      targetId: string
      targetKind: EvaluationTargetKind
      status: EvaluationQueueStatus
      requestedAt: string
      metadata?: Record<string, unknown>
    }): Promise<EvaluationQueueItem> => {
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
        const message = await response.text()
        throw new Error(message || `Failed to persist queue entry (status ${response.status})`)
      }

      const data: EvaluationQueueResponse = await response.json()
      return transformQueueEntryResponse(data)
    },
    []
  )

  const updateQueueEntryRemote = useCallback(
    async (
      entryId: string,
      patch: {
        status?: EvaluationQueueStatus
        startedAt?: string
        completedAt?: string
        error?: string | null
        metadata?: Record<string, unknown>
      }
    ): Promise<EvaluationQueueItem> => {
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
        const message = await response.text()
        throw new Error(message || `Failed to update queue entry '${entryId}' (status ${response.status})`)
      }

      const data: EvaluationQueueResponse = await response.json()
      return transformQueueEntryResponse(data)
    },
    []
  )

  const selectedScenarioData = useMemo(
    () => scenarios.find((scenario: ScenarioData) => scenario.id === selectedScenario),
    [scenarios, selectedScenario]
  )

  const personaSummary = useMemo(() => {
    const remote = personas.filter((persona) => persona.source === 'remote').length
    const local = personas.length - remote
    return {
      total: personas.length,
      remote,
      local,
    }
  }, [personas])

  const scenarioSummary = useMemo(() => {
    const scenarioEntries = scenarios.filter((entry) => entry.kind !== 'game')
    const gameEntries = scenarios.filter((entry) => entry.kind === 'game')
    return {
      total: scenarioEntries.length,
      remote: scenarioEntries.filter((entry) => entry.source === 'remote').length,
      games: {
        total: gameEntries.length,
        remote: gameEntries.filter((entry) => entry.source === 'remote').length,
      },
    }
  }, [scenarios])

  const queueSummary = useMemo(() => {
    return evaluationQueue.reduce<Record<'total' | EvaluationQueueStatus, number>>(
      (acc, item) => {
        acc.total += 1
        acc[item.status] += 1
        return acc
      },
      { total: 0, queued: 0, running: 0, completed: 0, failed: 0 }
    )
  }, [evaluationQueue])

  const orderedQueue = useMemo(() => evaluationQueue.slice().reverse(), [evaluationQueue])

  const recentAudit = useMemo(() => auditLog.slice(0, 20), [auditLog])

  const personaPreview = useMemo(() => personas.slice(0, 6), [personas])

  const scenarioPreview = useMemo(
    () => scenarios.filter((entry) => entry.kind !== 'game').slice(0, 6),
    [scenarios]
  )

  const gamePreview = useMemo(
    () => scenarios.filter((entry) => entry.kind === 'game').slice(0, 4),
    [scenarios]
  )

  const auditSummary = useMemo(() => {
    const success = auditLog.filter((entry) => entry.status === 'success').length
    const failure = auditLog.length - success
    return {
      total: auditLog.length,
      success,
      failure,
    }
  }, [auditLog])

  useEffect(() => {
    let cancelled = false

    const loadPersonas = async (): Promise<PersonaSummaryResponse[] | null> => {
      try {
        const response = await fetch("/api/personas")
        if (!response.ok) throw new Error(`Persona request failed with status ${response.status}`)
        const payload: PersonaSummaryResponse[] = await response.json()
        if (!cancelled && payload.length === 0) {
          setLoadError((prev: string | null) =>
            prev ?? "No personas returned by orchestration service; showing local examples."
          )
        }
        return payload
      } catch (error) {
        console.error(error)
        if (!cancelled) {
          setLoadError((prev: string | null) =>
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
          setLoadError((prev: string | null) =>
            prev ?? "No scenarios returned by orchestration service; using local fixtures."
          )
        }
        return payload
      } catch (error) {
        console.error(error)
        if (!cancelled) {
          setLoadError((prev: string | null) =>
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
          setLoadError((prev: string | null) =>
            prev ?? "No games returned by orchestration service; showing scenario fixtures only."
          )
        }
        return payload
      } catch (error) {
        console.error(error)
        if (!cancelled) {
          setLoadError((prev: string | null) =>
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
        setSelectedScenario((current: string) =>
          current && combined.some((entry) => entry.id === current)
            ? current
            : combined[0]?.id ?? ""
        )
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
  }, [])

  useEffect(() => {
    if (!selectedScenarioData || selectedScenarioData.kind !== 'game') {
      setAssetLoading(false)
      setAssetError(null)
      return
    }

    const scenarioId = selectedScenarioData.id
    if (gameAssets[scenarioId]) {
      setAssetLoading(false)
      return
    }

    let cancelled = false

    const fetchAssets = async () => {
      setAssetLoading(true)
      setAssetError(null)
      try {
        const response = await fetch(`/api/games/${scenarioId}/assets`)
        if (!response.ok) throw new Error(`Failed to load game assets: ${response.status}`)
        const payload: GameAssetResponseApi = await response.json()
        if (!cancelled) {
          const normalized: GameAssets = {
            manifest: payload.manifest,
            rulePack: payload.rule_pack ?? null,
            adapter: payload.adapter ?? null,
          }
          setGameAssets((current) => ({ ...current, [scenarioId]: normalized }))
        }
      } catch (error) {
        console.error(error)
        if (!cancelled) {
          setAssetError("Unable to load game transparency assets.")
          toast.error("Unable to load game transparency assets. Check the orchestration service logs.")
        }
      } finally {
        if (!cancelled) {
          setAssetLoading(false)
        }
      }
    }

    fetchAssets()

    return () => {
      cancelled = true
    }
  }, [selectedScenarioData, gameAssets])

  useEffect(() => {
    if (!inspectingPersona) {
      return
    }
    const refreshed = personas.find((persona) => persona.id === inspectingPersona.id)
    if (!refreshed) {
      setInspectingPersona(null)
      return
    }
    if (refreshed !== inspectingPersona) {
      setInspectingPersona(refreshed)
    }
  }, [personas, inspectingPersona])

  const handleSavePersona = async (personaPayload: Omit<PersonaData, 'id'>) => {
  const personaId = editingPersona?.id ?? slugifyIdentifier(personaPayload.name, 'persona')
    const existingDefinition =
      editingPersona?.rawDefinition && typeof editingPersona.rawDefinition === 'object'
        ? JSON.parse(JSON.stringify(editingPersona.rawDefinition))
        : {}

    const planningFallback =
      typeof existingDefinition.planning_horizon === 'number'
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
      existingDefinition.metadata && typeof existingDefinition.metadata === 'object'
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

      return fallback.length > 0 ? fallback : ['search']
    })()

    const memoryDefinition =
      existingDefinition.memory && typeof existingDefinition.memory === 'object'
        ? { ...existingDefinition.memory }
        : {}

    const toolsDefinition =
      existingDefinition.tools && typeof existingDefinition.tools === 'object'
        ? { ...existingDefinition.tools }
        : {}

    const negotiationDefinition =
      existingDefinition.negotiation && typeof existingDefinition.negotiation === 'object'
        ? { ...existingDefinition.negotiation }
        : {}

    const definition: Record<string, any> = {
      ...existingDefinition,
      name: personaId,
      version:
        typeof existingDefinition.version === 'string' && existingDefinition.version.trim().length > 0
          ? existingDefinition.version
          : '0.1',
      description: summaryText,
      planning_horizon: planningHorizon,
      risk_tolerance: personaPayload.config.riskTolerance,
      deception_aversion: personaPayload.config.deceptionAversion,
      memory: {
        ...memoryDefinition,
        window: personaPayload.config.memoryWindow,
        persistence: memoryDefinition.persistence || 'short',
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

    const isUpdate = editingPersona?.source === 'remote'

    try {
      const endpoint = isUpdate ? `/api/personas/${personaId}` : '/api/personas'
      const method = isUpdate ? 'PUT' : 'POST'

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
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
                .map((item: unknown) => (typeof item === 'string' ? item : JSON.stringify(item)))
                .join('; ')
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
            // Swallow text parsing errors and keep default detail
          }
        }
        throw new Error(detail)
      }

      const payload: PersonaSummaryResponse = await response.json()
      const normalized = transformPersonaSummary(payload)

      setPersonas((currentPersonas: PersonaData[]) => {
        if (isUpdate) {
          return currentPersonas.map((persona: PersonaData) =>
            persona.id === personaId ? normalized : persona
          )
        }

        const filtered = currentPersonas.filter((persona: PersonaData) => persona.id !== normalized.id)
        return [...filtered, normalized]
      })

      if (inspectingPersona && inspectingPersona.id === personaId) {
        setInspectingPersona(normalized)
      }

      recordAuditEvent({
        actor: 'operator',
        action: isUpdate ? 'persona.update' : 'persona.create',
        subject: personaId,
        status: 'success',
        metadata: {
          displayName: personaPayload.name,
          toolCount: normalized.config.toolPermissions.length,
          source: normalized.source,
        },
      })

      setShowPersonaEditor(false)
      setEditingPersona(null)
      toast.success(isUpdate ? 'Persona updated in catalog.' : 'Persona saved to catalog.')
    } catch (error) {
      console.error(error)
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to save persona via orchestration service. Please try again.'
      )

      recordAuditEvent({
        actor: 'operator',
        action: isUpdate ? 'persona.update' : 'persona.create',
        subject: personaId,
        status: 'failure',
        metadata: {
          displayName: personaPayload.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      })
    }
  }

  const handleSaveScenario = async (scenarioPayload: Omit<ScenarioData, 'id'>) => {
    const scenarioId = editingScenario?.id ?? slugifyIdentifier(scenarioPayload.name, 'scenario')
    const environment =
      editingScenario?.environment ?? slugifyIdentifier(scenarioPayload.domain ?? 'custom', 'environment')

    const existingDefinition =
      editingScenario?.rawDefinition && typeof editingScenario.rawDefinition === 'object'
        ? JSON.parse(JSON.stringify(editingScenario.rawDefinition))
        : {}

    const metadata =
      existingDefinition.metadata && typeof existingDefinition.metadata === 'object'
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
        typeof existingDefinition.mode === 'string' && existingDefinition.mode.trim().length > 0
          ? existingDefinition.mode
          : 'simulation',
      metadata,
      instructions: scenarioPayload.instructions,
      setup_steps: scenarioPayload.setupSteps,
      constraints: scenarioPayload.constraints,
    }

    const evaluationDefinition =
      existingDefinition.evaluation && typeof existingDefinition.evaluation === 'object'
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

    const isUpdate = editingScenario?.source === 'remote'

    try {
      const endpoint = isUpdate ? `/api/scenarios/${scenarioId}` : '/api/scenarios'
      const method = isUpdate ? 'PUT' : 'POST'

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
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
                .map((item: unknown) => (typeof item === 'string' ? item : JSON.stringify(item)))
                .join('; ')
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
            // Ignore text parsing issues
          }
        }
        throw new Error(detail)
      }

      const payload: ScenarioSummaryResponse = await response.json()
      const normalized = transformScenarioSummary(payload)

      setScenarios((currentScenarios: ScenarioData[]) => {
        if (isUpdate) {
          return currentScenarios.map((scenario: ScenarioData) =>
            scenario.id === scenarioId ? normalized : scenario
          )
        }

        const filtered = currentScenarios.filter((scenario: ScenarioData) => scenario.id !== normalized.id)
        return [...filtered, normalized]
      })

      if (!isUpdate) {
        setSelectedScenario(normalized.id)
      } else if (selectedScenario === scenarioId) {
        setSelectedScenario(normalized.id)
      }

      recordAuditEvent({
        actor: 'operator',
        action: isUpdate ? 'scenario.update' : 'scenario.create',
        subject: scenarioId,
        status: 'success',
        metadata: {
          displayName: scenarioPayload.name,
          environment,
          criteria: scenarioPayload.evaluationCriteria.length,
        },
      })

      setShowScenarioBuilder(false)
      setEditingScenario(null)
      toast.success(isUpdate ? 'Scenario updated in catalog.' : 'Scenario saved to catalog.')
    } catch (error) {
      console.error(error)
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to save scenario via orchestration service. Please try again.'
      )

      recordAuditEvent({
        actor: 'operator',
        action: isUpdate ? 'scenario.update' : 'scenario.create',
        subject: scenarioId,
        status: 'failure',
        metadata: {
          displayName: scenarioPayload.name,
          environment,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      })
    }
  }

  const handleRunEvaluation = (personaId: string) => {
    if (!selectedScenario) {
      toast.error("Please select a scenario or game first")
      setActiveTab("scenarios")
      return
    }

    const targetKind: EvaluationTargetKind = selectedScenarioData?.kind === 'game' ? 'game' : 'scenario'
    const now = new Date().toISOString()
    const metadata: Record<string, unknown> = {
      mode: 'single',
      initiated_by: 'operator',
    }
    const placeholderId = generateClientId('run')
    const placeholderEntry: EvaluationQueueItem = {
      id: placeholderId,
      personaId,
      scenarioId: selectedScenario,
      targetKind,
      status: 'running',
      requestedAt: now,
      startedAt: now,
      metadata,
    }

    setEvaluationQueue((current) => [...current, placeholderEntry].slice(-200))

    createQueueEntry({
      personaId,
      targetId: selectedScenario,
      targetKind,
      status: 'queued',
      requestedAt: now,
      metadata,
    })
      .then(async (createdEntry) => {
        try {
          const updated = await updateQueueEntryRemote(createdEntry.id, {
            status: 'running',
            startedAt: now,
          })
          replaceQueueEntry(placeholderId, {
            ...updated,
            status: 'running',
            startedAt: updated.startedAt ?? now,
          })
        } catch (patchError) {
          console.error(patchError)
          replaceQueueEntry(placeholderId, {
            ...createdEntry,
            status: 'running',
            startedAt: createdEntry.startedAt ?? now,
          })
        }
      })
      .catch((error) => {
        console.error(error)
        toast.error("Unable to persist evaluation queue entry. Tracking locally only.")
      })

    recordAuditEvent({
      actor: 'operator',
      action: 'evaluation.start',
      subject: placeholderId,
      status: 'success',
      metadata: {
        personaId,
        scenarioId: selectedScenario,
        mode: 'single',
      },
    })

    setSelectedPersonas([personaId])
    setShowEvaluationRunner(true)
  }

  const handleBulkEvaluation = () => {
    if (!selectedScenario) {
      toast.error("Please select a scenario or game first")
      setActiveTab("scenarios")
      return
    }

    if (selectedPersonas.length === 0) {
      toast.error("Please select personas to evaluate")
      return
    }

    const targetKind: EvaluationTargetKind = selectedScenarioData?.kind === 'game' ? 'game' : 'scenario'
    const now = new Date().toISOString()
    const placeholders = selectedPersonas.map<EvaluationQueueItem>((personaId, index) => ({
      id: generateClientId('run'),
      personaId,
      scenarioId: selectedScenario,
      targetKind,
      status: 'running',
      requestedAt: now,
      startedAt: now,
      metadata: {
        mode: 'batch',
        initiated_by: 'operator',
        order: index,
        total: selectedPersonas.length,
      },
    }))

    if (placeholders.length > 0) {
      setEvaluationQueue((current) => [...current, ...placeholders].slice(-200))

      let notifiedError = false
      placeholders.forEach((placeholder) => {
        const metadata = placeholder.metadata ?? {}
        createQueueEntry({
          personaId: placeholder.personaId,
          targetId: selectedScenario,
          targetKind,
          status: 'queued',
          requestedAt: now,
          metadata,
        })
          .then(async (createdEntry) => {
            try {
              const updated = await updateQueueEntryRemote(createdEntry.id, {
                status: 'running',
                startedAt: now,
              })
              replaceQueueEntry(placeholder.id, {
                ...updated,
                status: 'running',
                startedAt: updated.startedAt ?? now,
              })
            } catch (patchError) {
              console.error(patchError)
              replaceQueueEntry(placeholder.id, {
                ...createdEntry,
                status: 'running',
                startedAt: createdEntry.startedAt ?? now,
              })
            }
          })
          .catch((error) => {
            console.error(error)
            if (!notifiedError) {
              toast.error("Unable to persist some evaluation queue entries. Tracking locally only.")
              notifiedError = true
            }
          })
      })

      placeholders.forEach((placeholder) => {
        recordAuditEvent({
          actor: 'operator',
          action: 'evaluation.start',
          subject: placeholder.id,
          status: 'success',
          metadata: {
            personaId: placeholder.personaId,
            scenarioId: placeholder.scenarioId,
            mode: 'batch',
          },
        })
      })
    }

    setShowEvaluationRunner(true)
  }

  const handleEvaluationComplete = (newResults: EvaluationResult[]) => {
    const completionTimestamp = new Date().toISOString()
    const scenarioId = newResults[0]?.scenarioId
    if (scenarioId) {
      const completedPersonaIds = new Set(newResults.map((result) => result.personaId))
      const affectedEntries = evaluationQueue.filter(
        (entry) =>
          entry.scenarioId === scenarioId &&
          completedPersonaIds.has(entry.personaId) &&
          entry.status !== 'completed'
      )

      if (affectedEntries.length > 0) {
        setEvaluationQueue((current) =>
          current.map((entry) => {
            if (
              entry.scenarioId === scenarioId &&
              completedPersonaIds.has(entry.personaId) &&
              entry.status !== 'completed'
            ) {
              return { ...entry, status: 'completed', completedAt: completionTimestamp }
            }
            return entry
          })
        )

        affectedEntries.forEach((entry) => {
          const result = newResults.find((item) => item.personaId === entry.personaId)
          updateQueueEntryRemote(entry.id, {
            status: 'completed',
            completedAt: completionTimestamp,
            metadata: {
              overallScore: result?.overallScore ?? null,
              evaluationType: result?.type ?? null,
            },
          })
            .then((remoteEntry) => {
              mergeQueueEntry({
                ...remoteEntry,
                status: 'completed',
                completedAt: remoteEntry.completedAt ?? completionTimestamp,
              })
            })
            .catch((error) => {
              console.error(error)
            })

          recordAuditEvent({
            actor: 'orchestrator',
            action: 'evaluation.complete',
            subject: entry.id,
            status: 'success',
            metadata: {
              personaId: entry.personaId,
              scenarioId: entry.scenarioId,
              overallScore: result?.overallScore ?? null,
              evaluationType: result?.type,
            },
          })
        })
      }
    }

    setResults((currentResults: EvaluationResult[]) => [...currentResults, ...newResults])

    setPersonas((currentPersonas: PersonaData[]) =>
      currentPersonas.map((persona: PersonaData) => {
        const personaResults = newResults.filter((result) => result.personaId === persona.id)
        if (personaResults.length === 0) return persona
        const avgScore =
          personaResults.reduce((sum, result) => sum + result.overallScore, 0) /
          personaResults.length
        return { ...persona, lastScore: avgScore }
      })
    )

    setShowEvaluationRunner(false)
    setActiveTab("results")
    toast.success(`Evaluation complete! ${newResults.length} results saved.`)
  }

  const handleEvaluationCancelled = () => {
    const scenarioId = selectedScenario
    if (scenarioId) {
      const cancellationTimestamp = new Date().toISOString()
      const runningEntries = evaluationQueue.filter(
        (entry) => entry.scenarioId === scenarioId && entry.status === 'running'
      )

      if (runningEntries.length > 0) {
        setEvaluationQueue((current) =>
          current.map((entry) => {
            if (entry.scenarioId === scenarioId && entry.status === 'running') {
              return { ...entry, status: 'failed', completedAt: cancellationTimestamp }
            }
            return entry
          })
        )

        runningEntries.forEach((entry) => {
          updateQueueEntryRemote(entry.id, {
            status: 'failed',
            completedAt: cancellationTimestamp,
            metadata: {
              cancelled: true,
            },
          })
            .then((remoteEntry) => {
              mergeQueueEntry({
                ...remoteEntry,
                status: 'failed',
                completedAt: remoteEntry.completedAt ?? cancellationTimestamp,
              })
            })
            .catch((error) => {
              console.error(error)
            })

          recordAuditEvent({
            actor: 'operator',
            action: 'evaluation.cancel',
            subject: entry.id,
            status: 'failure',
            metadata: {
              personaId: entry.personaId,
              scenarioId: entry.scenarioId,
            },
          })
        })
      }
    }

    setShowEvaluationRunner(false)
  }

  const handleEditPersona = (personaId: string) => {
    const persona = personas.find((entry: PersonaData) => entry.id === personaId)
    if (persona) {
      setEditingPersona(persona)
      setShowPersonaEditor(true)
    }
  }

  const handleInspectPersona = (personaId: string) => {
    const persona = personas.find((entry: PersonaData) => entry.id === personaId)
    if (persona) {
      setInspectingPersona(persona)
    }
  }

  const handleEditScenario = (scenarioId: string) => {
    const scenario = scenarios.find((entry: ScenarioData) => entry.id === scenarioId)
    if (scenario) {
      if (scenario.kind === 'game') {
        toast.error('Games are managed via the repository. Duplicate the game to customize it locally.')
        return
      }
      setEditingScenario(scenario)
      setShowScenarioBuilder(true)
    }
  }

  const selectedPersonaData = selectedPersonas
    .map((id: string) => personas.find((persona: PersonaData) => persona.id === id))
    .filter((persona: PersonaData | undefined): persona is PersonaData => Boolean(persona))

  if (showPersonaEditor) {
    return (
      <div className="min-h-screen bg-background p-6">
        <PersonaEditor
          persona={editingPersona || undefined}
          onSave={handleSavePersona}
          onCancel={() => {
            setShowPersonaEditor(false)
            setEditingPersona(null)
          }}
        />
      </div>
    )
  }

  if (showScenarioBuilder) {
    return (
      <div className="min-h-screen bg-background p-6">
        <ScenarioBuilder
          scenario={editingScenario || undefined}
          onSave={handleSaveScenario}
          onCancel={() => {
            setShowScenarioBuilder(false)
            setEditingScenario(null)
          }}
        />
      </div>
    )
  }

  if (showEvaluationRunner && selectedScenarioData) {
    return (
      <div className="min-h-screen bg-background p-6">
        <EvaluationRunner
          personas={selectedPersonaData}
          scenario={selectedScenarioData}
          onComplete={handleEvaluationComplete}
          onCancel={handleEvaluationCancelled}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-gutter py-section">
        <div className="mb-section">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <Flask size={36} className="text-primary drop-shadow-sm" />
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">PersonaBench</h1>
              <p className="text-sm text-ink-600">
                Benchmark markdown personas across diverse scenarios with blended algorithmic and human evaluation.
              </p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex w-full flex-wrap gap-2 rounded-xl bg-card/80 p-1.5 shadow-soft backdrop-blur">
            <TabsTrigger value="personas" className="flex-1 min-w-[150px] rounded-lg text-sm font-medium text-ink-600 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Personas ({personas.length})
            </TabsTrigger>
            <TabsTrigger value="scenarios" className="flex-1 min-w-[150px] rounded-lg text-sm font-medium text-ink-600 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Scenarios & Games ({scenarios.length})
            </TabsTrigger>
            <TabsTrigger value="evaluation" className="flex-1 min-w-[150px] rounded-lg text-sm font-medium text-ink-600 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Evaluation
            </TabsTrigger>
            <TabsTrigger value="results" className="flex-1 min-w-[150px] rounded-lg text-sm font-medium text-ink-600 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Results
            </TabsTrigger>
            <TabsTrigger value="library" className="flex-1 min-w-[150px] rounded-lg text-sm font-medium text-ink-600 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Library
            </TabsTrigger>
            <TabsTrigger value="queue" className="flex-1 min-w-[150px] rounded-lg text-sm font-medium text-ink-600 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Queue
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex-1 min-w-[150px] rounded-lg text-sm font-medium text-ink-600 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Audit Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personas" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">AI Personas</h2>
              <div className="flex items-center gap-3">
                {isSyncing && (
                  <Badge variant="outline" className="text-xs">
                    Syncing with service…
                  </Badge>
                )}
                <Button onClick={() => setShowPersonaEditor(true)}>
                  <Plus size={16} className="mr-2" />
                  Create Persona
                </Button>
              </div>
            </div>

            {loadError && (
              <Card>
                <CardContent className="py-4 text-sm text-muted-foreground">
                  {loadError}
                </CardContent>
              </Card>
            )}

            {personas.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <FileText size={48} className="mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No personas yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first AI persona using markdown to begin benchmarking
                  </p>
                  <Button onClick={() => setShowPersonaEditor(true)}>
                    <Plus size={16} className="mr-2" />
                    Create Persona
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {personas.map((persona) => (
                  <PersonaCard
                    key={persona.id}
                    id={persona.id}
                    name={persona.name}
                    description={
                      persona.markdown.split('\n').find((line) => line.startsWith('## '))?.replace('## ', '') ||
                      persona.config.archetype ||
                      'No description'
                    }
                    archetype={persona.config.archetype}
                    riskTolerance={persona.config.riskTolerance}
                    planningHorizon={persona.config.planningHorizon}
                    lastScore={persona.lastScore}
                    onRun={handleRunEvaluation}
                    onEdit={handleEditPersona}
                    onInspect={handleInspectPersona}
                  />
                ))}
              </div>
            )}

            {inspectingPersona && (
              <PersonaTransparencyPanel
                persona={{
                  name: inspectingPersona.name,
                  markdown: inspectingPersona.markdown,
                  config: inspectingPersona.config,
                  sourcePath: inspectingPersona.sourcePath,
                  rawDefinition: inspectingPersona.rawDefinition,
                }}
                onClose={() => setInspectingPersona(null)}
              />
            )}
          </TabsContent>

          <TabsContent value="scenarios" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Scenarios & Games</h2>
              <div className="flex items-center gap-3">
                {isSyncing && (
                  <Badge variant="outline" className="text-xs">
                    Syncing with service…
                  </Badge>
                )}
                <Button onClick={() => setShowScenarioBuilder(true)}>
                  <Plus size={16} className="mr-2" />
                  Create Scenario
                </Button>
              </div>
            </div>

            <ScenarioSelector
              scenarios={scenarios}
              selectedScenario={selectedScenario}
              onSelect={setSelectedScenario}
              onEdit={handleEditScenario}
            />

            {selectedScenarioData && (
              <ScenarioTransparencyPanel
                scenario={{
                  name: selectedScenarioData.name,
                  description: selectedScenarioData.description,
                  instructions: selectedScenarioData.instructions,
                  evaluationCriteria: selectedScenarioData.evaluationCriteria,
                  constraints: selectedScenarioData.constraints,
                  tags: selectedScenarioData.tags,
                  sourcePath: selectedScenarioData.sourcePath,
                  rawDefinition: selectedScenarioData.rawDefinition,
                }}
              />
            )}

            {selectedScenarioData?.kind === 'game' && (
              <GameTransparencyPanel
                scenarioName={selectedScenarioData.name}
                scenarioFamily={selectedScenarioData.family}
                assets={gameAssets[selectedScenarioData.id]}
                loading={assetLoading}
                error={assetError}
              />
            )}

            {selectedScenario && selectedPersonas.length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <Play size={32} className="mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground mb-4">
                    Select personas to evaluate with this scenario or game, or run individual tests from the Personas tab
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button
                      variant="outline"
                      onClick={() => setSelectedPersonas(personas.map((persona) => persona.id))}
                      disabled={personas.length === 0}
                    >
                      Select All Personas
                    </Button>
                    <Button onClick={handleBulkEvaluation} disabled={selectedPersonas.length === 0}>
                      <Play size={16} className="mr-2" />
                      Run Bulk Evaluation
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="evaluation" className="space-y-6">
            <Card>
              <CardContent className="text-center py-12">
                <ChartBar size={48} className="mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No evaluation running</h3>
                <p className="text-muted-foreground mb-4">
                  Select personas and scenarios, then run evaluations to see live progress here
                </p>
                <Button onClick={() => setActiveTab("personas")}>
                  Go to Personas
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
            <ResultsAnalytics personas={personas} scenarios={scenarios} results={results} />
          </TabsContent>

          <TabsContent value="library" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>Persona Catalog</CardTitle>
                  <CardDescription>Profiles synced from the orchestration service.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Total</p>
                    <p className="text-2xl font-semibold">{personaSummary.total}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Remote</p>
                    <p className="text-2xl font-semibold">{personaSummary.remote}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Local</p>
                    <p className="text-2xl font-semibold">{personaSummary.local}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Last activity</p>
                    <p className="text-sm text-muted-foreground">
                      {recentAudit[0] ? formatTimestamp(recentAudit[0].timestamp) : '—'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Scenario Library</CardTitle>
                  <CardDescription>Evaluation blueprints available for operators.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Scenarios</p>
                    <p className="text-2xl font-semibold">{scenarioSummary.total}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Remote</p>
                    <p className="text-2xl font-semibold">{scenarioSummary.remote}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Games</p>
                    <p className="text-2xl font-semibold">{scenarioSummary.games.total}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Games (remote)</p>
                    <p className="text-2xl font-semibold">{scenarioSummary.games.remote}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Evaluation Queue</CardTitle>
                  <CardDescription>Snapshot of runs initiated from this session.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Total</p>
                    <p className="text-2xl font-semibold">{queueSummary.total}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Running</p>
                    <p className="text-2xl font-semibold">{queueSummary.running}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Completed</p>
                    <p className="text-2xl font-semibold">{queueSummary.completed}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Failed</p>
                    <p className="text-2xl font-semibold">{queueSummary.failed}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Persona Overview</CardTitle>
                  <CardDescription>Top personas ready for evaluation.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {personaPreview.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No personas available yet. Create one from the Personas tab.
                    </p>
                  ) : (
                    personaPreview.map((persona) => (
                      <div
                        key={persona.id}
                        className="flex items-center justify-between rounded-lg border border-dashed px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-medium">{persona.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Horizon: {persona.config.planningHorizon} · Tools: {persona.config.toolPermissions.length}
                          </p>
                        </div>
                        <Badge variant={persona.source === 'remote' ? 'default' : 'outline'}>
                          {persona.source === 'remote' ? 'remote' : 'local'}
                        </Badge>
                      </div>
                    ))
                  )}
                  {personas.length > personaPreview.length && (
                    <Button variant="ghost" onClick={() => setActiveTab('personas')} className="px-0">
                      Manage personas
                    </Button>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Scenario &amp; Game Library</CardTitle>
                  <CardDescription>Recent additions across scenarios and card games.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {scenarioPreview.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No scenarios yet. Use the builder to define a new evaluation.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {scenarioPreview.map((scenario) => (
                        <div
                          key={scenario.id}
                          className="flex items-center justify-between rounded-lg border border-dashed px-3 py-2"
                        >
                          <div>
                            <p className="text-sm font-medium">{scenario.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {titleCase(scenario.domain)} · Difficulty: {titleCase(scenario.difficulty)}
                            </p>
                          </div>
                          <Badge variant={scenario.source === 'remote' ? 'default' : 'outline'}>
                            {scenario.source === 'remote' ? 'remote' : 'local'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}

                  {gamePreview.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold uppercase text-muted-foreground">Games</h4>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {gamePreview.map((game) => (
                          <div key={game.id} className="rounded-lg border border-dashed px-3 py-2">
                            <p className="text-sm font-medium">{game.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Family: {titleCase(game.family ?? game.environment ?? 'unknown')}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {scenarios.length > scenarioPreview.length && (
                    <Button variant="ghost" onClick={() => setActiveTab('scenarios')} className="px-0">
                      Browse full library
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="queue" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader>
                  <CardTitle>Total Runs</CardTitle>
                  <CardDescription>Queued from this operator session.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold">{queueSummary.total}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Running</CardTitle>
                  <CardDescription>Currently executing rollouts.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold">{queueSummary.running}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Completed</CardTitle>
                  <CardDescription>Finished evaluations.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold">{queueSummary.completed}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Failed / Cancelled</CardTitle>
                  <CardDescription>Runs that need operator attention.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold">{queueSummary.failed}</p>
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
                          const status = queueStatusConfig[entry.status]
                          return (
                            <tr key={entry.id} className="border-b last:border-0">
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
          </TabsContent>

          <TabsContent value="audit" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>Total Events</CardTitle>
                  <CardDescription>Cumulative log entries this session.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold">{auditSummary.total}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Successes</CardTitle>
                  <CardDescription>Persona and scenario operations that completed.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold text-emerald-600 dark:text-emerald-400">{auditSummary.success}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Failures</CardTitle>
                  <CardDescription>Actions that need operator review.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold text-red-600 dark:text-red-400">{auditSummary.failure}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest {recentAudit.length} audit entries.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentAudit.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No audit events recorded yet.</p>
                ) : (
                  recentAudit.map((event) => (
                    <div key={event.id} className="rounded-lg border px-3 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={
                              event.status === 'success'
                                ? 'border-emerald-300 text-emerald-600 dark:border-emerald-800 dark:text-emerald-300'
                                : 'border-red-300 text-red-600 dark:border-red-800 dark:text-red-300'
                            }
                          >
                            {event.status === 'success' ? 'Success' : 'Failure'}
                          </Badge>
                          <span className="text-sm font-medium">{event.action}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{formatTimestamp(event.timestamp)}</span>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        Subject: {event.subject} · Actor: {event.actor}
                      </div>
                      {event.metadata && Object.keys(event.metadata).length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          {Object.entries(event.metadata).map(([key, value]) => (
                            <span key={key} className="rounded bg-muted px-2 py-1">
                              {key}: {typeof value === 'string' ? value : value === null ? '—' : JSON.stringify(value)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default App