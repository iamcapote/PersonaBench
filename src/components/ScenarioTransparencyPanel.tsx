import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Info } from "@phosphor-icons/react"

interface EvaluationCriterion {
  id: string
  name: string
  description: string
  weight: number
  type: 'algorithmic' | 'human' | 'both'
}

interface ScenarioTransparencyData {
  name: string
  description: string
  instructions?: string
  evaluationCriteria?: EvaluationCriterion[]
  constraints?: string[]
  tags?: string[]
  sourcePath?: string
  rawDefinition?: Record<string, unknown>
}

interface ScenarioTransparencyPanelProps {
  scenario: ScenarioTransparencyData
}

const formatTypeBadgeVariant = (criterionType: EvaluationCriterion['type']) => {
  switch (criterionType) {
    case 'algorithmic':
      return 'default' as const
    case 'human':
      return 'secondary' as const
    default:
      return 'outline' as const
  }
}

export function ScenarioTransparencyPanel({ scenario }: ScenarioTransparencyPanelProps) {
  const source = scenario.rawDefinition
    ? JSON.stringify(scenario.rawDefinition, null, 2)
    : "// Scenario defined locally during this session."

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-base md:text-lg">
          <Info size={18} />
          Scenario Transparency · {scenario.name}
          {scenario.sourcePath && (
            <Badge variant="outline" className="text-xs font-mono">
              {scenario.sourcePath}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Description</h4>
              <p className="text-sm text-muted-foreground bg-muted/40 rounded p-3">
                {scenario.description}
              </p>
            </div>
            {scenario.instructions && (
              <div>
                <h4 className="text-sm font-medium mb-2">Instructions</h4>
                <p className="text-sm text-muted-foreground bg-muted/40 rounded p-3 whitespace-pre-wrap">
                  {scenario.instructions}
                </p>
              </div>
            )}
            {scenario.constraints && scenario.constraints.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Constraints</h4>
                <div className="flex flex-wrap gap-2">
                  {scenario.constraints.map((constraint) => (
                    <Badge key={constraint} variant="outline" className="text-xs">
                      {constraint}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {scenario.evaluationCriteria && scenario.evaluationCriteria.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Evaluation Criteria</h4>
                <div className="space-y-2">
                  {scenario.evaluationCriteria.map((criterion) => (
                    <div key={criterion.id} className="rounded border border-border bg-muted/30 p-3 text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{criterion.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {(criterion.weight * 100).toFixed(0)}%
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {criterion.description}
                      </p>
                      <Badge variant={formatTypeBadgeVariant(criterion.type)} className="text-xs">
                        {criterion.type}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {scenario.tags && scenario.tags.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {scenario.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Scenario Source</h4>
              <Badge variant="outline" className="text-xs">yaml/json</Badge>
            </div>
            <pre className="max-h-[28rem] overflow-auto rounded border border-border bg-background font-mono text-xs p-3 whitespace-pre">
              {source}
            </pre>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
