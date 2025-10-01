import { useMemo } from "react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { selectGamePreview, selectPersonaPreview, selectPersonaSummary, selectScenarioPreview, selectScenarioSummary, selectQueueSummary } from "@/lib/appSelectors"
import { formatTimestamp, titleCase } from "@/lib/appTransformers"
import type { AuditEvent, EvaluationQueueItem, PersonaData, ScenarioData } from "@/lib/appTypes"

interface LibraryDashboardProps {
  personas: PersonaData[]
  scenarios: ScenarioData[]
  evaluationQueue: EvaluationQueueItem[]
  recentAudit: AuditEvent[]
  onNavigateToTab: (tab: "personas" | "scenarios") => void
}

export function LibraryDashboard({ personas, scenarios, evaluationQueue, recentAudit, onNavigateToTab }: LibraryDashboardProps) {
  const personaSummary = useMemo(() => selectPersonaSummary(personas), [personas])
  const scenarioSummary = useMemo(() => selectScenarioSummary(scenarios), [scenarios])
  const queueSummary = useMemo(() => selectQueueSummary(evaluationQueue), [evaluationQueue])
  const personaPreview = useMemo(() => selectPersonaPreview(personas), [personas])
  const scenarioPreview = useMemo(() => selectScenarioPreview(scenarios), [scenarios])
  const gamePreview = useMemo(() => selectGamePreview(scenarios), [scenarios])

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
    </div>
  )
}
