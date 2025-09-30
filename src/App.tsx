import { useEffect, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
}

interface ScenarioSummaryResponse {
  key: string
  title: string
  environment: string
  tags: string[]
  description?: string
  mode?: string
  definition?: Record<string, any>
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

const transformPersonaSummary = (summary: PersonaSummaryResponse): PersonaData => {
  const definition = summary.definition ?? {}
  const risk = summary.risk_tolerance ?? definition.risk_tolerance ?? 0.5
  const planning = summary.planning_horizon ?? definition.planning_horizon
  const deception = summary.deception_aversion ?? definition.deception_aversion ?? 0.5
  const memoryWindow = summary.memory_window ?? definition.memory?.window ?? 0
  const tools = summary.tools ?? definition.tools?.allowed ?? []
  const archetype = definition.negotiation?.style
    ? titleCase(definition.negotiation.style)
    : titleCase(summary.name)

  return {
    id: summary.name,
    name: titleCase(summary.name),
    markdown: buildPersonaMarkdown(summary, {
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
    evaluationCriteria: buildDefaultCriteria(mergedTags.slice(0, 3)),
    expectedOutputFormat: (metadata.expected_output as string) || 'See scenario documentation.',
    context: (metadata.context as string) || summary.environment,
    constraints: coerceStringArray(metadata.constraints),
    tags: mergedTags,
    source: "remote",
    kind: 'scenario',
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
  }
}

function App() {
  const [personas, setPersonas] = useState<PersonaData[]>(localPersonaFallback)
  const [scenarios, setScenarios] = useState<ScenarioData[]>(mockScenarios)
  const [results, setResults] = useState<EvaluationResult[]>([])

  const [activeTab, setActiveTab] = useState("personas")
  const [showPersonaEditor, setShowPersonaEditor] = useState(false)
  const [showScenarioBuilder, setShowScenarioBuilder] = useState(false)
  const [showEvaluationRunner, setShowEvaluationRunner] = useState(false)

  const [editingPersona, setEditingPersona] = useState<PersonaData | null>(null)
  const [editingScenario, setEditingScenario] = useState<ScenarioData | null>(null)
  const [selectedScenario, setSelectedScenario] = useState<string>("")
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>([])
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

    const hydrate = async () => {
      setIsSyncing(true)
      const [personaPayload, scenarioPayload, gamePayload] = await Promise.all([
        loadPersonas(),
        loadScenarios(),
        loadGames(),
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

      setIsSyncing(false)
    }

    hydrate()

    return () => {
      cancelled = true
    }
  }, [])

  const handleSavePersona = (personaData: Omit<PersonaData, 'id'>) => {
    const newPersona: PersonaData = {
      ...personaData,
      id: editingPersona?.id || `persona-${Date.now()}`,
      source: editingPersona?.source ?? "local",
    }

    setPersonas((currentPersonas: PersonaData[]) => {
      if (editingPersona) {
        return currentPersonas.map((persona: PersonaData) =>
          persona.id === editingPersona.id ? newPersona : persona
        )
      }
      return [...currentPersonas, newPersona]
    })

    setShowPersonaEditor(false)
    setEditingPersona(null)
    toast.success(editingPersona ? "Persona updated!" : "Persona created!")
  }

  const handleSaveScenario = (scenarioData: Omit<ScenarioData, 'id'>) => {
    const newScenario: ScenarioData = {
      ...scenarioData,
      id: editingScenario?.id || `scenario-${Date.now()}`,
      source: editingScenario?.source ?? "local",
      kind: editingScenario?.kind ?? 'scenario',
    }

    setScenarios((currentScenarios: ScenarioData[]) => {
      if (editingScenario) {
        return currentScenarios.map((scenario: ScenarioData) =>
          scenario.id === editingScenario.id ? newScenario : scenario
        )
      }
      return [...currentScenarios, newScenario]
    })

    setShowScenarioBuilder(false)
    setEditingScenario(null)
    toast.success(editingScenario ? "Scenario updated!" : "Scenario created!")
  }

  const handleRunEvaluation = (personaId: string) => {
    if (!selectedScenario) {
      toast.error("Please select a scenario or game first")
      setActiveTab("scenarios")
      return
    }

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

    setShowEvaluationRunner(true)
  }

  const handleEvaluationComplete = (newResults: EvaluationResult[]) => {
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

  const handleEditPersona = (personaId: string) => {
  const persona = personas.find((entry: PersonaData) => entry.id === personaId)
    if (persona) {
      setEditingPersona(persona)
      setShowPersonaEditor(true)
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

  const selectedScenarioData = scenarios.find(
    (scenario: ScenarioData) => scenario.id === selectedScenario
  )
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
          onCancel={() => setShowEvaluationRunner(false)}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Flask size={32} className="text-primary" />
            <h1 className="text-3xl font-bold">PersonaBench</h1>
          </div>
          <p className="text-muted-foreground">
            Benchmark AI personas stored as markdown files across diverse scenarios using algorithmic and human evaluation
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="personas">Personas ({personas.length})</TabsTrigger>
            <TabsTrigger value="scenarios">Scenarios & Games ({scenarios.length})</TabsTrigger>
            <TabsTrigger value="evaluation">Evaluation</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
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
                  />
                ))}
              </div>
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
              showTransparency={true}
            />

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
        </Tabs>
      </div>
    </div>
  )
}

export default App