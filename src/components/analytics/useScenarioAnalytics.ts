import { useMemo } from "react"

import type {
  EvaluationResult,
  PersonaData,
  ScenarioAnalysis,
  ScenarioData,
} from "./types"

interface UseScenarioAnalyticsOptions {
  personas: PersonaData[]
  scenarios: ScenarioData[]
  results: EvaluationResult[]
}

export function useScenarioAnalytics({ personas, scenarios, results }: UseScenarioAnalyticsOptions) {
  const scenarioAnalysis = useMemo<ScenarioAnalysis[]>(() => {
    return scenarios.map((scenario) => {
      const scenarioResults = results.filter((result) => result.scenarioId === scenario.id)

      if (scenarioResults.length === 0) {
        return {
          scenarioId: scenario.id,
          name: scenario.name,
          difficulty: scenario.difficulty,
          domain: scenario.domain,
          averageScore: 0,
          bestPersona: "N/A",
          worstPersona: "N/A",
          participantCount: 0,
          algorithmicAverage: 0,
          humanAverage: 0,
        }
      }

      const averageScore =
        scenarioResults.reduce((sum, result) => sum + result.overallScore, 0) / scenarioResults.length

      const algorithmicResults = scenarioResults.filter((result) => result.type === "algorithmic")
      const humanResults = scenarioResults.filter((result) => result.type === "human")

      const algorithmicAverage =
        algorithmicResults.length > 0
          ? algorithmicResults.reduce((sum, result) => sum + result.overallScore, 0) /
            algorithmicResults.length
          : 0

      const humanAverage =
        humanResults.length > 0
          ? humanResults.reduce((sum, result) => sum + result.overallScore, 0) / humanResults.length
          : 0

      const personaScores = scenarioResults.reduce((acc, result) => {
        const persona = personas.find((entry) => entry.id === result.personaId)
        if (!persona) {
          return acc
        }

        if (!acc[persona.name]) {
          acc[persona.name] = []
        }
        acc[persona.name].push(result.overallScore)
        return acc
      }, {} as Record<string, number[]>)

      const personaAverages = Object.entries(personaScores).map(([name, scores]) => ({
        name,
        average: scores.reduce((sum, score) => sum + score, 0) / scores.length,
      }))

      const bestPersona =
        personaAverages.length > 0
          ? personaAverages.reduce((best, current) => (current.average > best.average ? current : best)).name
          : "N/A"

      const worstPersona =
        personaAverages.length > 0
          ? personaAverages.reduce((worst, current) => (current.average < worst.average ? current : worst)).name
          : "N/A"

      return {
        scenarioId: scenario.id,
        name: scenario.name,
        difficulty: scenario.difficulty,
        domain: scenario.domain,
        averageScore,
        bestPersona,
        worstPersona,
        participantCount: new Set(scenarioResults.map((result) => result.personaId)).size,
        algorithmicAverage,
        humanAverage,
      }
    })
  }, [personas, results, scenarios])

  return { scenarioAnalysis }
}
