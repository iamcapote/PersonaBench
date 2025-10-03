import { useCallback, useMemo, useRef, useState, type ChangeEvent } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { selectGamePreview, selectPersonaPreview, selectPersonaSummary, selectScenarioPreview, selectScenarioSummary } from "@/lib/appSelectors"
import { formatTimestamp, titleCase } from "@/lib/appTransformers"
import type { AuditEvent, EvaluationQueueSummary, PersonaData, ScenarioData } from "@/lib/appTypes"
import {
  buildPersonaDefinition,
  parsePersonaBundle,
  type PersonaImportResult,
  type RawPersonaDefinition,
} from "@/lib/personaIO"
import { downloadJsonFile } from "@/lib/utils"
import { DownloadSimple } from "@phosphor-icons/react"
import { useAdminAuth } from "@/components/app/providers/AdminAuthProvider"

type RawScenarioDefinition = Record<string, any>

interface LibraryDashboardProps {
  personas: PersonaData[]
  scenarios: ScenarioData[]
  queueSummary: EvaluationQueueSummary
  queueError?: string | null
  lastSyncedAt?: string | null
  recentAudit: AuditEvent[]
  onRefreshQueue?: () => void | Promise<void>
  onNavigateToTab: (tab: "personas" | "scenarios") => void
  onImportPersonas?: (definitions: RawPersonaDefinition[]) => Promise<PersonaImportResult>
  onImportScenarios?: (definitions: RawScenarioDefinition[]) => Promise<PersonaImportResult>
}

export function LibraryDashboard({ personas, scenarios, queueSummary, queueError, lastSyncedAt, recentAudit, onRefreshQueue, onNavigateToTab, onImportPersonas, onImportScenarios }: LibraryDashboardProps) {
  const personaSummary = useMemo(() => selectPersonaSummary(personas), [personas])
  const scenarioSummary = useMemo(() => selectScenarioSummary(scenarios), [scenarios])
  const personaPreview = useMemo(() => selectPersonaPreview(personas), [personas])
  const scenarioPreview = useMemo(() => selectScenarioPreview(scenarios), [scenarios])
  const gamePreview = useMemo(() => selectGamePreview(scenarios), [scenarios])
  const { hasAdminAccess } = useAdminAuth()
  const personaFileInputRef = useRef<HTMLInputElement>(null)
  const scenarioFileInputRef = useRef<HTMLInputElement>(null)
  const [isImportingPersonas, setIsImportingPersonas] = useState(false)
  const [isImportingScenarios, setIsImportingScenarios] = useState(false)

  const exportTimestamp = useMemo(() => new Date().toISOString().replace(/[:.]/g, "-"), [])

  const buildScenarioDefinition = useCallback((scenario: ScenarioData): Record<string, any> => {
    if (scenario.rawDefinition && Object.keys(scenario.rawDefinition).length > 0) {
      return JSON.parse(JSON.stringify(scenario.rawDefinition))
    }

    const evaluationCriteria = scenario.evaluationCriteria.map((criterion) => ({
      id: criterion.id,
      name: criterion.name,
      description: criterion.description,
      weight: criterion.weight,
      type: criterion.type,
    }))

    return {
      id: scenario.id,
      mode: scenario.kind === "game" ? "game" : "simulation",
      environment: scenario.environment ?? "custom",
      metadata: {
        title: scenario.name,
        display_name: scenario.name,
        description: scenario.description,
        tags: scenario.tags,
        domain: scenario.domain,
        difficulty: scenario.difficulty,
        estimated_time: scenario.estimatedTime,
        expected_output: scenario.expectedOutputFormat,
        context: scenario.context,
        source: scenario.source ?? "local",
        source_path: scenario.sourcePath,
      },
      instructions: scenario.instructions,
      setup_steps: scenario.setupSteps,
      constraints: scenario.constraints,
      evaluation: evaluationCriteria.length > 0 ? { criteria: evaluationCriteria } : undefined,
    }
  }, [])

  const handleExportPersonas = useCallback(() => {
    if (personas.length === 0) {
      toast.info("No personas available to export yet.")
      return
    }

    const payload = {
      generated_at: new Date().toISOString(),
      personas: personas.map((persona) => buildPersonaDefinition(persona)),
    }

    downloadJsonFile(`personas-export-${exportTimestamp}.json`, payload)
    toast.success(`Exported ${personas.length} persona${personas.length === 1 ? "" : "s"}.`)
  }, [buildPersonaDefinition, exportTimestamp, personas])

  const handleExportScenarios = useCallback(() => {
    if (scenarios.length === 0) {
      toast.info("No scenarios available to export yet.")
      return
    }

    const payload = {
      generated_at: new Date().toISOString(),
      scenarios: scenarios.map(buildScenarioDefinition),
    }

    downloadJsonFile(`scenarios-export-${exportTimestamp}.json`, payload)
    toast.success(`Exported ${scenarios.length} scenario${scenarios.length === 1 ? "" : "s"}.`)
  }, [buildScenarioDefinition, exportTimestamp, scenarios])

  const parseScenarioBundle = useCallback((payload: unknown): RawScenarioDefinition[] => {
    if (Array.isArray(payload)) {
      return payload.filter((item): item is RawScenarioDefinition => item && typeof item === "object")
    }
    if (payload && typeof payload === "object") {
      const container = payload as Record<string, unknown>
      if (Array.isArray(container.scenarios)) {
        return container.scenarios.filter((item): item is RawScenarioDefinition => item && typeof item === "object")
      }
      if (Array.isArray(container.items)) {
        return container.items.filter((item): item is RawScenarioDefinition => item && typeof item === "object")
      }
      return [payload as RawScenarioDefinition]
    }
    return []
  }, [])

  const handlePersonaFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) {
        return
      }

      event.target.value = ""

      if (!onImportPersonas) {
        toast.error("Persona import is not available in this build.")
        return
      }

      if (!hasAdminAccess) {
        toast.warning("Set the admin key to import personas via the orchestration service.")
        return
      }

      setIsImportingPersonas(true)
      try {
        const text = await file.text()
        const parsed = JSON.parse(text)
        const definitions = parsePersonaBundle(parsed)
        if (definitions.length === 0) {
          toast.warning("No persona definitions found in the selected file.")
          return
        }

        const result = await onImportPersonas(definitions)

        if (result.created === 0 && result.updated === 0) {
          if (result.errors.length > 0) {
            toast.error(`Failed to import personas: ${result.errors[0]}`)
          } else {
            toast.info("No personas were imported.")
          }
          return
        }

        const summaryParts: string[] = []
        if (result.created > 0) summaryParts.push(`${result.created} created`)
        if (result.updated > 0) summaryParts.push(`${result.updated} updated`)
        toast.success(`Personas imported (${summaryParts.join(", ")}).`)

        if (result.errors.length > 0) {
          toast.warning(`${result.errors.length} persona${result.errors.length === 1 ? "" : "s"} failed. Check console for details.`)
          result.errors.forEach((message) => console.warn(`[persona import] ${message}`))
        }
      } catch (error) {
        console.error(error)
        toast.error(error instanceof Error ? error.message : "Unable to import personas from file.")
      } finally {
        setIsImportingPersonas(false)
      }
    },
    [hasAdminAccess, onImportPersonas, parsePersonaBundle]
  )

  const handleScenarioFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) {
        return
      }

      event.target.value = ""

      if (!onImportScenarios) {
        toast.error("Scenario import is not available in this build.")
        return
      }

      if (!hasAdminAccess) {
        toast.warning("Set the admin key to import scenarios via the orchestration service.")
        return
      }

      setIsImportingScenarios(true)
      try {
        const text = await file.text()
        const parsed = JSON.parse(text)
        const definitions = parseScenarioBundle(parsed)
        if (definitions.length === 0) {
          toast.warning("No scenario definitions found in the selected file.")
          return
        }

        const result = await onImportScenarios(definitions)

        if (result.created === 0 && result.updated === 0) {
          if (result.errors.length > 0) {
            toast.error(`Failed to import scenarios: ${result.errors[0]}`)
          } else {
            toast.info("No scenarios were imported.")
          }
          return
        }

        const summaryParts: string[] = []
        if (result.created > 0) summaryParts.push(`${result.created} created`)
        if (result.updated > 0) summaryParts.push(`${result.updated} updated`)
        toast.success(`Scenarios imported (${summaryParts.join(", ")}).`)

        if (result.errors.length > 0) {
          toast.warning(`${result.errors.length} scenario${result.errors.length === 1 ? "" : "s"} failed. Check console for details.`)
          result.errors.forEach((message) => console.warn(`[scenario import] ${message}`))
        }
      } catch (error) {
        console.error(error)
        toast.error(error instanceof Error ? error.message : "Unable to import scenarios from file.")
      } finally {
        setIsImportingScenarios(false)
      }
    },
    [hasAdminAccess, onImportScenarios, parseScenarioBundle]
  )

  const openPersonaImport = useCallback(() => {
    if (!hasAdminAccess) {
      toast.warning("Set the admin key to import personas via the orchestration service.")
      return
    }
    personaFileInputRef.current?.click()
  }, [hasAdminAccess])

  const openScenarioImport = useCallback(() => {
    if (!hasAdminAccess) {
      toast.warning("Set the admin key to import scenarios via the orchestration service.")
      return
    }
    scenarioFileInputRef.current?.click()
  }, [hasAdminAccess])

  return (
    <div className="space-y-6">
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
                {recentAudit[0] ? formatTimestamp(recentAudit[0].timestamp) : "—"}
              </p>
            </div>
            <div className="col-span-2 flex justify-end">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExportPersonas}>
                  <DownloadSimple className="mr-2 h-4 w-4" /> Export
                </Button>
                <Button variant="ghost" size="sm" onClick={openPersonaImport} disabled={isImportingPersonas}>
                  Import
                </Button>
              </div>
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
            <div className="col-span-2 flex justify-end">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExportScenarios}>
                  <DownloadSimple className="mr-2 h-4 w-4" /> Export
                </Button>
                <Button variant="ghost" size="sm" onClick={openScenarioImport} disabled={isImportingScenarios}>
                  Import
                </Button>
              </div>
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
              <p className="text-2xl font-semibold">{queueSummary.totalEntries}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Active</p>
              <p className="text-2xl font-semibold">{queueSummary.activeEntries}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Completed</p>
              <p className="text-2xl font-semibold">{queueSummary.completedEntries}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Failed</p>
              <p className="text-2xl font-semibold">{queueSummary.failedEntries}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs uppercase text-muted-foreground">Last completed</p>
              <p className="text-sm text-muted-foreground">
                {queueSummary.lastCompletedAt ? formatTimestamp(queueSummary.lastCompletedAt) : "—"}
              </p>
            </div>
            <div className="col-span-2 text-xs text-muted-foreground">
              {queueError ? (
                <span className="text-destructive">Queue sync error: {queueError}</span>
              ) : lastSyncedAt ? (
                <>Last sync: {formatTimestamp(lastSyncedAt)}</>
              ) : (
                "Queue sync in progress…"
              )}
            </div>
            {onRefreshQueue && (
              <div className="col-span-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    Promise.resolve(onRefreshQueue()).catch(() => {
                      // errors are surfaced through queueError state
                    })
                  }}
                >
                  Refresh now
                </Button>
              </div>
            )}
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
                  <Badge variant={persona.source === "remote" ? "default" : "outline"}>
                    {persona.source === "remote" ? "remote" : "local"}
                  </Badge>
                </div>
              ))
            )}
            {personas.length > personaPreview.length && (
              <Button variant="ghost" onClick={() => onNavigateToTab("personas")} className="px-0">
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
                    <Badge variant={scenario.source === "remote" ? "default" : "outline"}>
                      {scenario.source === "remote" ? "remote" : "local"}
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
                        Family: {titleCase(game.family ?? game.environment ?? "unknown")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {scenarios.length > scenarioPreview.length && (
              <Button variant="ghost" onClick={() => onNavigateToTab("scenarios")} className="px-0">
                Browse full library
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
      <input
        ref={personaFileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={handlePersonaFileChange}
      />
      <input
        ref={scenarioFileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={handleScenarioFileChange}
      />
    </div>
  )
}
