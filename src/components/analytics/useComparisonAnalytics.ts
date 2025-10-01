import { useMemo } from "react"

import { ALL_FILTER } from "./utils"
import type {
  AnalyticsFilterState,
  ComparisonHighlight,
  ComparisonMatrix,
  EvaluationResult,
  PersonaScenarioAverages,
} from "./types"

interface UseComparisonAnalyticsOptions {
  results: EvaluationResult[]
  filters: AnalyticsFilterState
  personaNameMap: Map<string, string>
}

export function useComparisonAnalytics({ results, filters, personaNameMap }: UseComparisonAnalyticsOptions) {
  const filteredResults = useMemo(() => {
    return results.filter((result) => {
      if (filters.personaId !== ALL_FILTER && result.personaId !== filters.personaId) {
        return false
      }
      if (filters.scenarioId !== ALL_FILTER && result.scenarioId !== filters.scenarioId) {
        return false
      }
      if (filters.evaluationType !== ALL_FILTER && result.type !== filters.evaluationType) {
        return false
      }
      return true
    })
  }, [filters.evaluationType, filters.personaId, filters.scenarioId, results])

  const personaScenarioAverages = useMemo<PersonaScenarioAverages>(() => {
    if (filteredResults.length === 0) {
      return {}
    }

    const aggregation = new Map<string, Map<string, { sum: number; count: number }>>()

    filteredResults.forEach((entry) => {
      if (!aggregation.has(entry.personaId)) {
        aggregation.set(entry.personaId, new Map())
      }
      const personaBucket = aggregation.get(entry.personaId)!
      if (!personaBucket.has(entry.scenarioId)) {
        personaBucket.set(entry.scenarioId, { sum: 0, count: 0 })
      }
      const stats = personaBucket.get(entry.scenarioId)!
      stats.sum += entry.overallScore
      stats.count += 1
    })

    const averages: PersonaScenarioAverages = {}
    aggregation.forEach((scenarioMap, personaId) => {
      averages[personaId] = {}
      scenarioMap.forEach((stats, scenarioId) => {
        averages[personaId][scenarioId] = stats.sum / stats.count
      })
    })

    return averages
  }, [filteredResults])

  const comparisonPersonaIds = useMemo(() => {
    if (filteredResults.length === 0) {
      return [] as string[]
    }

    const unique = new Set(filteredResults.map((entry) => entry.personaId))
    const sorted = Array.from(unique).sort((a, b) => {
      const nameA = personaNameMap.get(a) ?? a
      const nameB = personaNameMap.get(b) ?? b
      return nameA.localeCompare(nameB)
    })

    return sorted
  }, [filteredResults, personaNameMap])

  const comparisonMatrix = useMemo<ComparisonMatrix>(() => {
    const matrix: ComparisonMatrix = {}

    comparisonPersonaIds.forEach((rowId) => {
      matrix[rowId] = {}

      comparisonPersonaIds.forEach((columnId) => {
        if (rowId === columnId) {
          matrix[rowId][columnId] = { shared: 0, winRate: 0, averageDiff: 0 }
          return
        }

        const rowScenarios = personaScenarioAverages[rowId]
        const columnScenarios = personaScenarioAverages[columnId]

        if (!rowScenarios || !columnScenarios) {
          matrix[rowId][columnId] = { shared: 0, winRate: 0, averageDiff: 0 }
          return
        }

        const sharedScenarios = Object.keys(rowScenarios).filter(
          (scenarioId) => columnScenarios[scenarioId] !== undefined,
        )

        if (sharedScenarios.length === 0) {
          matrix[rowId][columnId] = { shared: 0, winRate: 0, averageDiff: 0 }
          return
        }

        let wins = 0
        let ties = 0
        let diffSum = 0

        sharedScenarios.forEach((scenarioId) => {
          const diff = rowScenarios[scenarioId] - columnScenarios[scenarioId]
          diffSum += diff
          if (Math.abs(diff) < 1e-6) {
            ties += 1
          } else if (diff > 0) {
            wins += 1
          }
        })

        const total = sharedScenarios.length
        const winRate = total > 0 ? (wins + ties * 0.5) / total : 0
        const averageDiff = total > 0 ? diffSum / total : 0

        matrix[rowId][columnId] = {
          shared: total,
          winRate,
          averageDiff,
        }
      })
    })

    return matrix
  }, [comparisonPersonaIds, personaScenarioAverages])

  const comparisonHighlights = useMemo<ComparisonHighlight[]>(() => {
    if (comparisonPersonaIds.length < 2) {
      return []
    }

    const highlights: Array<{
      leaderId: string
      challengerId: string
      diff: number
      winRate: number
      shared: number
    }> = []

    for (let i = 0; i < comparisonPersonaIds.length; i += 1) {
      for (let j = i + 1; j < comparisonPersonaIds.length; j += 1) {
        const rowId = comparisonPersonaIds[i]
        const columnId = comparisonPersonaIds[j]
        const cell = comparisonMatrix[rowId]?.[columnId]

        if (!cell || cell.shared === 0) {
          continue
        }

        const diff = cell.averageDiff
        const leaderId = diff >= 0 ? rowId : columnId
        const challengerId = diff >= 0 ? columnId : rowId
        const winRate = diff >= 0 ? cell.winRate : 1 - cell.winRate

        highlights.push({
          leaderId,
          challengerId,
          diff: Math.abs(diff),
          winRate,
          shared: cell.shared,
        })
      }
    }

    highlights.sort((a, b) => {
      if (b.diff !== a.diff) {
        return b.diff - a.diff
      }
      return b.shared - a.shared
    })

    return highlights.slice(0, 3).map((entry) => ({
      leader: personaNameMap.get(entry.leaderId) ?? entry.leaderId,
      challenger: personaNameMap.get(entry.challengerId) ?? entry.challengerId,
      diff: entry.diff,
      winRate: entry.winRate,
      shared: entry.shared,
    }))
  }, [comparisonMatrix, comparisonPersonaIds, personaNameMap])

  return {
    filteredResults,
    personaScenarioAverages,
    comparisonPersonaIds,
    comparisonMatrix,
    comparisonHighlights,
  }
}
