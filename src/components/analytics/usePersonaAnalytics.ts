import { useMemo } from "react"

import type {
  EvaluationResult,
  PersonaAnalysis,
  PersonaData,
  ScenarioData,
} from "./types"

interface UsePersonaAnalyticsOptions {
  personas: PersonaData[]
  scenarios: ScenarioData[]
  results: EvaluationResult[]
}

export function usePersonaAnalytics({ personas, scenarios, results }: UsePersonaAnalyticsOptions) {
  const personaNameMap = useMemo(() => {
    const map = new Map<string, string>()
    personas.forEach((persona) => {
      map.set(persona.id, persona.name)
    })
    return map
  }, [personas])

  const personaAnalysis = useMemo<PersonaAnalysis[]>(() => {
    return personas.map((persona) => {
      const personaResults = results.filter((result) => result.personaId === persona.id)

      if (personaResults.length === 0) {
        return {
          personaId: persona.id,
          name: persona.name,
          averageScore: 0,
          bestScenario: "N/A",
          worstScenario: "N/A",
          algorithmicAverage: 0,
          humanAverage: 0,
          evaluationCount: 0,
          strengths: [],
          weaknesses: [],
          domainScores: {},
        }
      }

      const averageScore =
        personaResults.reduce((sum, result) => sum + result.overallScore, 0) / personaResults.length

      const algorithmicResults = personaResults.filter((result) => result.type === "algorithmic")
      const humanResults = personaResults.filter((result) => result.type === "human")

      const algorithmicAverage =
        algorithmicResults.length > 0
          ? algorithmicResults.reduce((sum, result) => sum + result.overallScore, 0) / algorithmicResults.length
          : 0

      const humanAverage =
        humanResults.length > 0
          ? humanResults.reduce((sum, result) => sum + result.overallScore, 0) / humanResults.length
          : 0

      const scenarioScores = personaResults.reduce((acc, result) => {
        const scenario = scenarios.find((entry) => entry.id === result.scenarioId)
        if (!scenario) {
          return acc
        }

        if (!acc[scenario.name]) {
          acc[scenario.name] = []
        }
        acc[scenario.name].push(result.overallScore)
        return acc
      }, {} as Record<string, number[]>)

      const scenarioAverages = Object.entries(scenarioScores).map(([name, scores]) => ({
        name,
        average: scores.reduce((sum, score) => sum + score, 0) / scores.length,
      }))

      const bestScenario =
        scenarioAverages.length > 0
          ? scenarioAverages.reduce((best, current) => (current.average > best.average ? current : best)).name
          : "N/A"

      const worstScenario =
        scenarioAverages.length > 0
          ? scenarioAverages.reduce((worst, current) => (current.average < worst.average ? current : worst)).name
          : "N/A"

      const domainScores = personaResults.reduce((acc, result) => {
        const scenario = scenarios.find((entry) => entry.id === result.scenarioId)
        if (!scenario) {
          return acc
        }

        if (!acc[scenario.domain]) {
          acc[scenario.domain] = []
        }
        acc[scenario.domain].push(result.overallScore)
        return acc
      }, {} as Record<string, number[]>)

      const averageDomainScores = Object.entries(domainScores).reduce((acc, [domain, scores]) => {
        acc[domain] = scores.reduce((sum, score) => sum + score, 0) / scores.length
        return acc
      }, {} as Record<string, number>)

      const sortedDomains = Object.entries(averageDomainScores).sort(([, a], [, b]) => b - a)
      const strengths = sortedDomains.slice(0, 2).map(([domain]) => domain)
      const weaknesses = sortedDomains.slice(-2).map(([domain]) => domain).reverse()

      return {
        personaId: persona.id,
        name: persona.name,
        averageScore,
        bestScenario,
        worstScenario,
        algorithmicAverage,
        humanAverage,
        evaluationCount: personaResults.length,
        strengths,
        weaknesses,
        domainScores: averageDomainScores,
      }
    })
  }, [personas, results, scenarios])

  const topPerformers = useMemo(() => {
    return personaAnalysis
      .filter((persona) => persona.evaluationCount > 0)
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, 5)
  }, [personaAnalysis])

  return {
    personaNameMap,
    personaAnalysis,
    topPerformers,
  }
}
