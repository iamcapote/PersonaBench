import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import type { PersonaData, ScenarioData } from "./types"
import { ALL_FILTER } from "./utils"

interface AnalyticsFiltersProps {
  personas: PersonaData[]
  scenarios: ScenarioData[]
  selectedPersona: string
  selectedScenario: string
  selectedEvaluationType: string
  onPersonaChange: (personaId: string) => void
  onScenarioChange: (scenarioId: string) => void
  onEvaluationTypeChange: (type: string) => void
}

export function AnalyticsFilters({
  personas,
  scenarios,
  selectedPersona,
  selectedScenario,
  selectedEvaluationType,
  onPersonaChange,
  onScenarioChange,
  onEvaluationTypeChange,
}: AnalyticsFiltersProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Analysis Filters</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Persona</label>
            <Select value={selectedPersona} onValueChange={onPersonaChange}>
              <SelectTrigger>
                <SelectValue placeholder="All Personas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FILTER}>All Personas</SelectItem>
                {personas.map((persona) => (
                  <SelectItem key={persona.id} value={persona.id}>
                    {persona.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Scenario</label>
            <Select value={selectedScenario} onValueChange={onScenarioChange}>
              <SelectTrigger>
                <SelectValue placeholder="All Scenarios" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FILTER}>All Scenarios</SelectItem>
                {scenarios.map((scenario) => (
                  <SelectItem key={scenario.id} value={scenario.id}>
                    {scenario.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Evaluation Type</label>
            <Select value={selectedEvaluationType} onValueChange={onEvaluationTypeChange}>
              <SelectTrigger>
                <SelectValue placeholder="All Evaluations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FILTER}>All Types</SelectItem>
                <SelectItem value="algorithmic">Algorithmic Only</SelectItem>
                <SelectItem value="human">Human Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
