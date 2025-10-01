import { useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChartBar } from "@phosphor-icons/react"

import {
  ALL_FILTER,
  AnalyticsFilters,
  HeadToHeadComparisons,
  OverviewMetricsPanel,
  PersonaPerformancePanel,
  ScenarioLeaderboardPanel,
  TopPerformersCard,
  isEvaluationMode,
  useComparisonAnalytics,
  usePersonaAnalytics,
  useScenarioAnalytics,
  type AnalyticsFilterState,
  type EvaluationResult,
  type PersonaData,
  type ScenarioData,
} from "@/components/analytics"

interface ResultsAnalyticsProps {
  personas: PersonaData[]
  scenarios: ScenarioData[]
  results: EvaluationResult[]
}

export function ResultsAnalytics({ personas, scenarios, results }: ResultsAnalyticsProps) {
  const [selectedPersona, setSelectedPersona] = useState<string>(ALL_FILTER)
  const [selectedScenario, setSelectedScenario] = useState<string>(ALL_FILTER)
  const [evaluationType, setEvaluationType] = useState<AnalyticsFilterState["evaluationType"]>(ALL_FILTER)

  const handleEvaluationTypeChange = (value: string) => {
    if (isEvaluationMode(value)) {
      setEvaluationType(value)
      return
    }
    setEvaluationType(ALL_FILTER)
  }

  const { personaNameMap, personaAnalysis, topPerformers } = usePersonaAnalytics({ personas, scenarios, results })
  const { scenarioAnalysis } = useScenarioAnalytics({ personas, scenarios, results })

  const filters = useMemo(
    () => ({
      personaId: selectedPersona,
      scenarioId: selectedScenario,
      evaluationType,
    }),
    [evaluationType, selectedPersona, selectedScenario],
  )

  const {
    comparisonPersonaIds,
    comparisonMatrix,
    comparisonHighlights,
  } = useComparisonAnalytics({ results, filters, personaNameMap })

  if (results.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <ChartBar size={48} className="mx-auto mb-4 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-medium">No Results Yet</h3>
          <p className="text-muted-foreground">Run some evaluations to see analytics and comparisons here</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <AnalyticsFilters
        personas={personas}
        scenarios={scenarios}
        selectedPersona={selectedPersona}
        selectedScenario={selectedScenario}
        selectedEvaluationType={evaluationType}
        onPersonaChange={setSelectedPersona}
        onScenarioChange={setSelectedScenario}
        onEvaluationTypeChange={handleEvaluationTypeChange}
      />

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="personas">Persona Analysis</TabsTrigger>
          <TabsTrigger value="scenarios">Scenario Analysis</TabsTrigger>
          <TabsTrigger value="comparisons">Head-to-Head</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <OverviewMetricsPanel personas={personas} results={results} />
          <TopPerformersCard performers={topPerformers} />
        </TabsContent>

        <TabsContent value="personas" className="space-y-6">
          <PersonaPerformancePanel personaAnalysis={personaAnalysis} />
        </TabsContent>

        <TabsContent value="scenarios" className="space-y-6">
          <ScenarioLeaderboardPanel scenarioAnalysis={scenarioAnalysis} />
        </TabsContent>

        <TabsContent value="comparisons" className="space-y-6">
          <HeadToHeadComparisons
            personaNameMap={personaNameMap}
            comparisonPersonaIds={comparisonPersonaIds}
            comparisonMatrix={comparisonMatrix}
            comparisonHighlights={comparisonHighlights}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}