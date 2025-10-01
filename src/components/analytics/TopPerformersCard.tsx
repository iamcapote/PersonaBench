import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy } from "@phosphor-icons/react"

import { getScoreTone } from "./utils"
import type { PersonaAnalysis } from "./types"

interface TopPerformersCardProps {
  performers: PersonaAnalysis[]
}

export function TopPerformersCard({ performers }: TopPerformersCardProps) {
  if (performers.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy size={20} />
          Top Performing Personas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {performers.map((persona, index) => (
            <div key={persona.personaId} className="flex items-center justify-between rounded border p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {index + 1}
                </div>
                <div>
                  <div className="font-medium">{persona.name}</div>
                  <div className="text-sm text-muted-foreground">{persona.evaluationCount} evaluations</div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-lg font-bold ${getScoreTone(persona.averageScore)}`}>
                  {(persona.averageScore * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground">Avg. Score</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
