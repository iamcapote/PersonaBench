import { useMemo } from "react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { selectQueueSummary } from "@/lib/appSelectors"
import { QUEUE_STATUS_CONFIG } from "@/lib/appConstants"
import { formatTimestamp } from "@/lib/appTransformers"
import type { EvaluationQueueItem, PersonaData, ScenarioData } from "@/lib/appTypes"

interface QueueDashboardProps {
  evaluationQueue: EvaluationQueueItem[]
  personas: PersonaData[]
  scenarios: ScenarioData[]
}

export function QueueDashboard({ evaluationQueue, personas, scenarios }: QueueDashboardProps) {
  const queueSummary = useMemo(() => selectQueueSummary(evaluationQueue), [evaluationQueue])
  const orderedQueue = useMemo(() => evaluationQueue.slice().reverse(), [evaluationQueue])

  return (
    <div className="space-y-6">
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
                    const status = QUEUE_STATUS_CONFIG[entry.status]
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
    </div>
  )
}
