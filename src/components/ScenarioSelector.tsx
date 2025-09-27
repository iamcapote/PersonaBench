import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { GameController, Users, Globe, BookOpen, Brain, Lightbulb, Wrench, PencilSimple, Info } from "@phosphor-icons/react"

interface ScenarioData {
  id: string
  name: string
  description: string
  domain: 'games' | 'social' | 'web' | 'text' | 'reasoning' | 'creative' | 'technical'
  difficulty: 'easy' | 'medium' | 'hard'
  estimatedTime: number
  instructions?: string
  evaluationCriteria?: Array<{
    id: string
    name: string
    description: string
    weight: number
    type: 'algorithmic' | 'human' | 'both'
  }>
  tags?: string[]
}

interface ScenarioSelectorProps {
  scenarios: ScenarioData[]
  selectedScenario?: string
  onSelect: (scenarioId: string) => void
  onEdit?: (scenarioId: string) => void
  showTransparency?: boolean
}

const domainIcons = {
  games: GameController,
  social: Users,
  web: Globe,
  text: BookOpen,
  reasoning: Brain,
  creative: Lightbulb,
  technical: Wrench
}

const domainColors = {
  games: "bg-blue-100 text-blue-800 border-blue-200",
  social: "bg-green-100 text-green-800 border-green-200", 
  web: "bg-purple-100 text-purple-800 border-purple-200",
  text: "bg-orange-100 text-orange-800 border-orange-200",
  reasoning: "bg-indigo-100 text-indigo-800 border-indigo-200",
  creative: "bg-pink-100 text-pink-800 border-pink-200",
  technical: "bg-gray-100 text-gray-800 border-gray-200"
}

const difficultyColors = {
  easy: "bg-green-50 text-green-700 border-green-200",
  medium: "bg-yellow-50 text-yellow-700 border-yellow-200",
  hard: "bg-red-50 text-red-700 border-red-200"
}

export function ScenarioSelector({ 
  scenarios, 
  selectedScenario, 
  onSelect, 
  onEdit,
  showTransparency = false 
}: ScenarioSelectorProps) {
  const selectedScenarioData = scenarios.find(s => s.id === selectedScenario)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Test Scenarios</h3>
        <Badge variant="outline" className="text-xs">
          {scenarios.length} scenarios available
        </Badge>
      </div>

      <div className="grid gap-3">
        {scenarios.map((scenario) => {
          const Icon = domainIcons[scenario.domain]
          const isSelected = selectedScenario === scenario.id
          
          return (
            <Card 
              key={scenario.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                isSelected ? 'ring-2 ring-primary shadow-md' : ''
              }`}
              onClick={() => onSelect(scenario.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    <Icon size={20} className="text-muted-foreground" />
                    <div className="flex-1">
                      <CardTitle className="text-base font-medium">{scenario.name}</CardTitle>
                      <CardDescription className="text-sm mt-1">
                        {scenario.description}
                      </CardDescription>
                    </div>
                  </div>
                  {onEdit && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        onEdit(scenario.id)
                      }}
                    >
                      <PencilSimple size={16} />
                    </Button>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex gap-2">
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${domainColors[scenario.domain]}`}
                    >
                      {scenario.domain}
                    </Badge>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${difficultyColors[scenario.difficulty]}`}
                    >
                      {scenario.difficulty}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">
                    ~{scenario.estimatedTime}min
                  </span>
                </div>
                
                {scenario.tags && scenario.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {scenario.tags.slice(0, 3).map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {scenario.tags.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{scenario.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Show evaluation transparency for selected scenario */}
      {showTransparency && selectedScenarioData && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Info size={16} />
              Evaluation Transparency: {selectedScenarioData.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedScenarioData.instructions && (
              <div>
                <h4 className="font-medium text-sm mb-2">Task Instructions</h4>
                <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">
                  {selectedScenarioData.instructions}
                </p>
              </div>
            )}
            
            {selectedScenarioData.evaluationCriteria && selectedScenarioData.evaluationCriteria.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2">Evaluation Criteria</h4>
                <div className="space-y-2">
                  {selectedScenarioData.evaluationCriteria.map(criterion => (
                    <div key={criterion.id} className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm">
                      <div>
                        <div className="font-medium">{criterion.name}</div>
                        <div className="text-muted-foreground text-xs">{criterion.description}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {(criterion.weight * 100).toFixed(0)}%
                        </Badge>
                        <Badge variant={
                          criterion.type === 'algorithmic' ? 'default' : 
                          criterion.type === 'human' ? 'secondary' : 'outline'
                        } className="text-xs">
                          {criterion.type}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}