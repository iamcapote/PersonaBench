import { Card, CardContent } from "@/components/ui/card"
import { formatTimestamp } from "@/lib/appTransformers"
import type { EvaluationResult, PersonaData, ScenarioData } from "./types"

interface ComparisonSummaryHeaderProps {
  personas: PersonaData[]
  scenarios: ScenarioData[]
  results: EvaluationResult[]
}

const numberFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 })
const scoreFormatter = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function ComparisonSummaryHeader({ personas, scenarios, results }: ComparisonSummaryHeaderProps) {
  if (results.length === 0) {
    return null
  }

  const totalEvaluations = results.length
  const uniquePersonaCount = new Set(results.map((entry) => entry.personaId)).size
  const uniqueScenarioCount = new Set(results.map((entry) => entry.scenarioId)).size
  const algorithmicEvaluations = results.filter((entry) => entry.type === "algorithmic").length
  const humanEvaluations = results.filter((entry) => entry.type === "human").length

  const averageScore = results.reduce((sum, entry) => sum + (entry.overallScore ?? 0), 0) / totalEvaluations
  const lastCompletionTimestamp = results.reduce<string | null>((latest, entry) => {
    if (!entry.timestamp) return latest
    if (!latest) return entry.timestamp
    return entry.timestamp > latest ? entry.timestamp : latest
  }, null)

  const metrics: Array<{ label: string; value: string; helper?: string }> = [
    {
      label: "Evaluations",
      value: numberFormatter.format(totalEvaluations),
      helper: `${algorithmicEvaluations} algorithmic · ${humanEvaluations} human`,
    },
    {
      label: "Avg. Score",
      value: scoreFormatter.format(averageScore || 0),
      helper: uniqueScenarioCount > 1 ? `${uniqueScenarioCount} scenarios compared` : undefined,
    },
    {
      label: "Personas Active",
      value: numberFormatter.format(uniquePersonaCount || personas.length || 0),
      helper: `${personas.length} in catalog`,
    },
    {
      label: "Scenarios Covered",
      value: numberFormatter.format(uniqueScenarioCount || scenarios.length || 0),
      helper: scenarios.length ? `${scenarios.length} available` : undefined,
    },
    {
      label: "Avg. Cost per Run",
      value: "—",
      helper: "Telemetry pending",
    },
    {
      label: "Avg. Latency",
      value: "—",
      helper: "Streaming data coming soon",
    },
    {
      label: "Last Completion",
      value: lastCompletionTimestamp ? formatTimestamp(lastCompletionTimestamp) : "—",
      helper: lastCompletionTimestamp ? undefined : "No completed runs yet",
    },
  ]

  return (
    <div className="sticky top-20 z-20">
      <Card className="backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-lg border border-border/60 bg-background/50 p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{metric.label}</p>
              <p className="text-2xl font-semibold text-foreground">{metric.value}</p>
              {metric.helper ? <p className="text-xs text-muted-foreground/80">{metric.helper}</p> : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
