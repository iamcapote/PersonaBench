import { useCallback, useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChartBar } from "@phosphor-icons/react"

import {
  ALL_FILTER,
  AnalyticsFilters,
  ComparisonCohortFilters,
  ComparisonSummaryHeader,
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

type DifficultyFilter = "all" | "easy" | "medium" | "hard"

export function ResultsAnalytics({ personas, scenarios, results }: ResultsAnalyticsProps) {
  const [selectedPersona, setSelectedPersona] = useState<string>(ALL_FILTER)
  const [selectedScenario, setSelectedScenario] = useState<string>(ALL_FILTER)
  const [evaluationType, setEvaluationType] = useState<AnalyticsFilterState["evaluationType"]>(ALL_FILTER)
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyFilter>("all")

  const handleEvaluationTypeChange = useCallback(
    (value: string) => {
      if (isEvaluationMode(value)) {
        setEvaluationType(value)
        return
      }
      setEvaluationType(ALL_FILTER)
    },
    [],
  )

  const handleCohortEvaluationTypeChange = useCallback(
    (value: "all" | "algorithmic" | "human") => {
      handleEvaluationTypeChange(value)
    },
    [handleEvaluationTypeChange],
  )

  const scenarioById = useMemo(() => {
    return scenarios.reduce<Map<string, ScenarioData>>((acc, scenario) => {
      acc.set(scenario.id, scenario)
      return acc
    }, new Map())
  }, [scenarios])

  const handleScenarioChange = useCallback((value: string) => {
    setSelectedScenario(value)
    if (value !== ALL_FILTER) {
      setSelectedDifficulty("all")
    }
  }, [])

  const handleDifficultyChange = useCallback((value: DifficultyFilter) => {
    setSelectedDifficulty(value)
    if (value !== "all") {
      setSelectedScenario(ALL_FILTER)
    }
  }, [])

  const difficultyFilteredResults = useMemo(() => {
    if (selectedDifficulty === "all") {
      return results
    }

    return results.filter((entry) => {
      const scenario = scenarioById.get(entry.scenarioId)
      if (!scenario) {
        return false
      }
      return scenario.difficulty === selectedDifficulty
    })
  }, [results, scenarioById, selectedDifficulty])

  const cohortResults = useMemo(() => {
    if (evaluationType === ALL_FILTER) {
      return difficultyFilteredResults
    }

    return difficultyFilteredResults.filter((entry) => entry.type === evaluationType)
  }, [difficultyFilteredResults, evaluationType])

  const { personaNameMap, personaAnalysis, topPerformers } = usePersonaAnalytics({
    personas,
    scenarios,
    results: cohortResults,
  })
  const { scenarioAnalysis } = useScenarioAnalytics({ personas, scenarios, results: cohortResults })

  const filters = useMemo(
    () => ({
      personaId: selectedPersona,
      scenarioId: selectedScenario,
      evaluationType,
    }),
    [evaluationType, selectedPersona, selectedScenario],
  )

  const {
    filteredResults,
    comparisonPersonaIds,
    comparisonMatrix,
    comparisonHighlights,
  } = useComparisonAnalytics({
    results: cohortResults,
    filters,
    personaNameMap,
  })

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
      <ComparisonSummaryHeader personas={personas} scenarios={scenarios} results={cohortResults} />
      <ComparisonCohortFilters
        evaluationType={evaluationType}
        onEvaluationTypeChange={handleCohortEvaluationTypeChange}
        selectedDifficulty={selectedDifficulty}
        onDifficultyChange={handleDifficultyChange}
      />
      <AnalyticsFilters
        personas={personas}
        scenarios={scenarios}
        selectedPersona={selectedPersona}
        selectedScenario={selectedScenario}
        selectedEvaluationType={evaluationType}
        onPersonaChange={setSelectedPersona}
        onScenarioChange={handleScenarioChange}
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
          <OverviewMetricsPanel personas={personas} results={cohortResults} />
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