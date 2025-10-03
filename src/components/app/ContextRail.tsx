import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { formatTimestamp, titleCase } from "@/lib/appTransformers"
import type { EvaluationQueueSummary, PersonaData, ScenarioData } from "@/lib/appTypes"

const DEFAULT_DESCRIPTION = "No scenario selected yet. Choose one to anchor upcoming evaluations."
const MAX_PERSONAS_TO_LIST = 3

export type ContextRailTab = "runs" | "compare" | "personas" | "scenarios"

interface ContextRailProps {
  scenario?: ScenarioData
  selectedPersonas: PersonaData[]
  queueSummary: EvaluationQueueSummary
  isEvaluationRunning: boolean
  lastResultTimestamp?: string | null
  onNavigate?: (tab: ContextRailTab) => void
}

export function ContextRail({
  scenario,
  selectedPersonas,
  queueSummary,
  isEvaluationRunning,
  lastResultTimestamp,
  onNavigate,
}: ContextRailProps) {
  const primaryPersonaNames = selectedPersonas.slice(0, MAX_PERSONAS_TO_LIST).map((persona) => persona.name)
  const remainingPersonaCount = Math.max(0, selectedPersonas.length - primaryPersonaNames.length)
  const scenarioDescription = scenario?.description?.trim().length ? scenario.description : DEFAULT_DESCRIPTION
  const scenarioDifficulty = scenario ? titleCase(scenario.difficulty) : "Not set"
  const scenarioEstimatedTime = scenario && scenario.estimatedTime > 0 ? `${scenario.estimatedTime} min run` : "Timing TBD"

  const handleNavigate = (tab: ContextRailTab) => {
    if (onNavigate) {
      onNavigate(tab)
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-4">
      <Card className="bg-card/70 shadow-sm">
        <CardContent className="space-y-3 py-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground/80">Scenario in Focus</h3>
            <Badge variant="outline" className="text-[0.65rem] uppercase">
              {scenario ? titleCase(scenario.domain) : "Unset"}
            </Badge>
          </div>
          <div className="space-y-1">
            <p className="text-base font-semibold">
              {scenario ? scenario.name : "No scenario selected"}
            </p>
            <p className="text-sm text-muted-foreground">
              {scenarioDescription}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>
              Difficulty: {scenarioDifficulty}
            </span>
            <span className="hidden text-muted-foreground/60 sm:inline" aria-hidden>
              •
            </span>
            <span>Estimated {scenarioEstimatedTime}</span>
          </div>
          <Button variant="ghost" size="sm" className="px-3" onClick={() => handleNavigate("scenarios")}>
            Manage scenarios
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-card/70 shadow-sm">
        <CardContent className="space-y-3 py-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground/80">Selected Personas</h3>
            <Badge variant="secondary" className="text-[0.65rem] uppercase">
              {selectedPersonas.length}
            </Badge>
          </div>
          {selectedPersonas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Pick personas to queue evaluations faster.</p>
          ) : (
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                {primaryPersonaNames.join(", ")}
                {remainingPersonaCount > 0 ? ` +${remainingPersonaCount} more` : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                Last score updates appear in the comparison hub.
              </p>
            </div>
          )}
          <Button variant="ghost" size="sm" className="px-3" onClick={() => handleNavigate("personas")}>
            Browse personas
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-card/70 shadow-sm">
        <CardContent className="space-y-3 py-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground/80">Evaluation Status</h3>
            <Badge variant={isEvaluationRunning ? "default" : "outline"} className="text-[0.65rem] uppercase">
              {isEvaluationRunning ? "Running" : "Idle"}
            </Badge>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-md bg-muted/40 p-2">
              <p className="text-lg font-semibold text-foreground">{queueSummary.runningEntries}</p>
              <p className="text-muted-foreground">Running</p>
            </div>
            <div className="rounded-md bg-muted/40 p-2">
              <p className="text-lg font-semibold text-foreground">{queueSummary.queuedEntries}</p>
              <p className="text-muted-foreground">Queued</p>
            </div>
            <div className="rounded-md bg-muted/40 p-2">
              <p className="text-lg font-semibold text-foreground">{queueSummary.failedEntries}</p>
              <p className="text-muted-foreground">Failed</p>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Last result: {lastResultTimestamp ? formatTimestamp(lastResultTimestamp) : "—"}
          </div>
          <Button variant="ghost" size="sm" className="px-3" onClick={() => handleNavigate("runs")}>
            View queue
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-card/70 shadow-sm">
        <CardContent className="space-y-3 py-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground/80">Next Actions</h3>
          </div>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>1. Confirm scenario instructions and constraints.</li>
            <li>2. Select personas to evaluate.</li>
            <li>3. Launch runs and monitor from the queue.</li>
          </ul>
          <Button variant="outline" size="sm" className="px-3" onClick={() => handleNavigate("compare")}>
            Open comparison hub
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
