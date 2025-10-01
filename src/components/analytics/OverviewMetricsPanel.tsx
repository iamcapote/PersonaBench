import { Card, CardContent } from "@/components/ui/card"
import { Trophy, Users, Robot } from "@phosphor-icons/react"

import type { EvaluationResult, PersonaData } from "./types"

interface OverviewMetricsPanelProps {
  personas: PersonaData[]
  results: EvaluationResult[]
}

export function OverviewMetricsPanel({ personas, results }: OverviewMetricsPanelProps) {
  const totalEvaluations = results.length
  const algorithmicCount = results.filter((result) => result.type === "algorithmic").length
  const humanCount = results.filter((result) => result.type === "human").length

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <Trophy className="h-4 w-4 text-primary" />
            <div className="text-2xl font-bold">{totalEvaluations}</div>
          </div>
          <p className="text-xs text-muted-foreground">Total Evaluations</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-primary" />
            <div className="text-2xl font-bold">{personas.length}</div>
          </div>
          <p className="text-xs text-muted-foreground">Active Personas</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <Robot className="h-4 w-4 text-primary" />
            <div className="text-2xl font-bold">{algorithmicCount}</div>
          </div>
          <p className="text-xs text-muted-foreground">Algorithmic Tests</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-primary" />
            <div className="text-2xl font-bold">{humanCount}</div>
          </div>
          <p className="text-xs text-muted-foreground">Human Evaluations</p>
        </CardContent>
      </Card>
    </div>
  )
}
