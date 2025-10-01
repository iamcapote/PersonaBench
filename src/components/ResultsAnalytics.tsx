import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { ChartBar, Trophy, TrendUp, Users, Robot } from "@phosphor-icons/react"

interface PersonaData {
  id: string
  name: string
  markdown: string
}

interface ScenarioData {
  id: string
  name: string
  domain: string
  difficulty: string
}

interface EvaluationResult {
  personaId: string
  scenarioId: string
  type: 'algorithmic' | 'human'
  scores: Record<string, number>
  overallScore: number
  timestamp: string
  response?: string
}

interface ResultsAnalyticsProps {
  personas: PersonaData[]
  scenarios: ScenarioData[]
  results: EvaluationResult[]
}

interface PersonaAnalysis {
  personaId: string
  name: string
  averageScore: number
  bestScenario: string
  worstScenario: string
  algorithmicAverage: number
  humanAverage: number
  evaluationCount: number
  strengths: string[]
  weaknesses: string[]
  domainScores: Record<string, number>
}

interface ScenarioAnalysis {
  scenarioId: string
  name: string
  difficulty: string
  domain: string
  averageScore: number
  bestPersona: string
  worstPersona: string
  participantCount: number
  algorithmicAverage: number
  humanAverage: number
}

export function ResultsAnalytics({ personas, scenarios, results }: ResultsAnalyticsProps) {
  const [selectedPersona, setSelectedPersona] = useState<string>("all")
  const [selectedScenario, setSelectedScenario] = useState<string>("all")
  const [evaluationType, setEvaluationType] = useState<string>("all")

  const personaNameMap = useMemo(() => {
    const map = new Map<string, string>()
    personas.forEach((persona) => {
      map.set(persona.id, persona.name)
    })
    return map
  }, [personas])

  const personaAnalysis = useMemo((): PersonaAnalysis[] => {
    return personas.map(persona => {
      const personaResults = results.filter(r => r.personaId === persona.id)
      
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
          domainScores: {}
        }
      }

      const averageScore = personaResults.reduce((sum, r) => sum + r.overallScore, 0) / personaResults.length
      
      const algorithmicResults = personaResults.filter(r => r.type === 'algorithmic')
      const humanResults = personaResults.filter(r => r.type === 'human')
      
      const algorithmicAverage = algorithmicResults.length > 0 
        ? algorithmicResults.reduce((sum, r) => sum + r.overallScore, 0) / algorithmicResults.length 
        : 0
      
      const humanAverage = humanResults.length > 0 
        ? humanResults.reduce((sum, r) => sum + r.overallScore, 0) / humanResults.length 
        : 0

      // Find best and worst scenarios
      const scenarioScores = personaResults.reduce((acc, result) => {
        const scenario = scenarios.find(s => s.id === result.scenarioId)
        if (scenario) {
          if (!acc[scenario.name]) acc[scenario.name] = []
          acc[scenario.name].push(result.overallScore)
        }
        return acc
      }, {} as Record<string, number[]>)

      const scenarioAverages = Object.entries(scenarioScores).map(([name, scores]) => ({
        name,
        average: scores.reduce((sum, s) => sum + s, 0) / scores.length
      }))

      const bestScenario = scenarioAverages.length > 0 
        ? scenarioAverages.reduce((best, current) => current.average > best.average ? current : best).name
        : "N/A"
      
      const worstScenario = scenarioAverages.length > 0 
        ? scenarioAverages.reduce((worst, current) => current.average < worst.average ? current : worst).name
        : "N/A"

      // Calculate domain scores
      const domainScores = personaResults.reduce((acc, result) => {
        const scenario = scenarios.find(s => s.id === result.scenarioId)
        if (scenario) {
          if (!acc[scenario.domain]) acc[scenario.domain] = []
          acc[scenario.domain].push(result.overallScore)
        }
        return acc
      }, {} as Record<string, number[]>)

      const averageDomainScores = Object.entries(domainScores).reduce((acc, [domain, scores]) => {
        acc[domain] = scores.reduce((sum, s) => sum + s, 0) / scores.length
        return acc
      }, {} as Record<string, number>)

      // Determine strengths and weaknesses
      const sortedDomains = Object.entries(averageDomainScores).sort(([,a], [,b]) => b - a)
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
        domainScores: averageDomainScores
      }
    })
  }, [personas, scenarios, results])

  const scenarioAnalysis = useMemo((): ScenarioAnalysis[] => {
    return scenarios.map(scenario => {
      const scenarioResults = results.filter(r => r.scenarioId === scenario.id)
      
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
          humanAverage: 0
        }
      }

      const averageScore = scenarioResults.reduce((sum, r) => sum + r.overallScore, 0) / scenarioResults.length
      
      const algorithmicResults = scenarioResults.filter(r => r.type === 'algorithmic')
      const humanResults = scenarioResults.filter(r => r.type === 'human')
      
      const algorithmicAverage = algorithmicResults.length > 0 
        ? algorithmicResults.reduce((sum, r) => sum + r.overallScore, 0) / algorithmicResults.length 
        : 0
      
      const humanAverage = humanResults.length > 0 
        ? humanResults.reduce((sum, r) => sum + r.overallScore, 0) / humanResults.length 
        : 0

      // Find best and worst personas
      const personaScores = scenarioResults.reduce((acc, result) => {
        const persona = personas.find(p => p.id === result.personaId)
        if (persona) {
          if (!acc[persona.name]) acc[persona.name] = []
          acc[persona.name].push(result.overallScore)
        }
        return acc
      }, {} as Record<string, number[]>)

      const personaAverages = Object.entries(personaScores).map(([name, scores]) => ({
        name,
        average: scores.reduce((sum, s) => sum + s, 0) / scores.length
      }))

      const bestPersona = personaAverages.length > 0 
        ? personaAverages.reduce((best, current) => current.average > best.average ? current : best).name
        : "N/A"
      
      const worstPersona = personaAverages.length > 0 
        ? personaAverages.reduce((worst, current) => current.average < worst.average ? current : worst).name
        : "N/A"

      return {
        scenarioId: scenario.id,
        name: scenario.name,
        difficulty: scenario.difficulty,
        domain: scenario.domain,
        averageScore,
        bestPersona,
        worstPersona,
        participantCount: new Set(scenarioResults.map(r => r.personaId)).size,
        algorithmicAverage,
        humanAverage
      }
    })
  }, [personas, scenarios, results])

  const filteredResults = useMemo(() => {
    return results.filter(result => {
      if (selectedPersona !== "all" && result.personaId !== selectedPersona) return false
      if (selectedScenario !== "all" && result.scenarioId !== selectedScenario) return false
      if (evaluationType !== "all" && result.type !== evaluationType) return false
      return true
    })
  }, [results, selectedPersona, selectedScenario, evaluationType])

  const personaScenarioAverages = useMemo(() => {
    if (filteredResults.length === 0) {
      return {} as Record<string, Record<string, number>>
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
      const scenarioStats = personaBucket.get(entry.scenarioId)!
      scenarioStats.sum += entry.overallScore
      scenarioStats.count += 1
    })

    const averages: Record<string, Record<string, number>> = {}
    aggregation.forEach((scenarioMap, personaId) => {
      averages[personaId] = {}
      scenarioMap.forEach((stats, scenarioId) => {
        averages[personaId][scenarioId] = stats.sum / stats.count
      })
    })

    return averages
  }, [filteredResults])

  const topPerformers = useMemo(() => {
    return personaAnalysis
      .filter(p => p.evaluationCount > 0)
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, 5)
  }, [personaAnalysis])

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

  const comparisonMatrix = useMemo(() => {
    const matrix: Record<string, Record<string, { shared: number; winRate: number; averageDiff: number }>> = {}

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
          (scenarioId) => columnScenarios[scenarioId] !== undefined
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

  const comparisonHighlights = useMemo(() => {
    if (comparisonPersonaIds.length < 2) {
      return [] as Array<{ leader: string; challenger: string; diff: number; winRate: number; shared: number }>
    }

    const highlights: Array<{ leaderId: string; challengerId: string; diff: number; winRate: number; shared: number }> = []

    for (let i = 0; i < comparisonPersonaIds.length; i += 1) {
      for (let j = i + 1; j < comparisonPersonaIds.length; j += 1) {
        const rowId = comparisonPersonaIds[i]
        const columnId = comparisonPersonaIds[j]
        const cell = comparisonMatrix[rowId]?.[columnId]
        if (!cell || cell.shared === 0) continue

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
      if (b.diff !== a.diff) return b.diff - a.diff
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

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-brand-emerald-200/40 text-brand-emerald-500 border-transparent'
      case 'medium':
        return 'bg-brand-amber-500/20 text-brand-amber-500 border-transparent'
      case 'hard':
        return 'bg-brand-rose-500/20 text-brand-rose-500 border-transparent'
      default:
        return 'bg-muted text-ink-600'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-brand-emerald-500'
    if (score >= 0.6) return 'text-brand-amber-500'
    return 'text-brand-rose-500'
  }

  const getComparisonTone = (diff: number) => {
    if (diff > 0.05) return 'bg-brand-emerald-500/18 text-brand-emerald-600 border border-brand-emerald-200/60'
    if (diff > 0.015) return 'bg-brand-emerald-200/40 text-brand-emerald-600 border border-transparent'
    if (diff < -0.05) return 'bg-brand-rose-500/18 text-brand-rose-500 border border-transparent'
    if (diff < -0.015) return 'bg-brand-rose-500/12 text-brand-rose-500 border border-transparent'
    return 'bg-muted text-ink-600 border border-border'
  }

  const formatPercentage = (value: number, digits = 0) => `${(value * 100).toFixed(digits)}%`

  if (results.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <ChartBar size={48} className="mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Results Yet</h3>
          <p className="text-muted-foreground">
            Run some evaluations to see analytics and comparisons here
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Analysis Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Persona</label>
              <Select value={selectedPersona} onValueChange={setSelectedPersona}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Personas</SelectItem>
                  {personas.map(persona => (
                    <SelectItem key={persona.id} value={persona.id}>
                      {persona.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Scenario</label>
              <Select value={selectedScenario} onValueChange={setSelectedScenario}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Scenarios</SelectItem>
                  {scenarios.map(scenario => (
                    <SelectItem key={scenario.id} value={scenario.id}>
                      {scenario.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Evaluation Type</label>
              <Select value={evaluationType} onValueChange={setEvaluationType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="algorithmic">Algorithmic Only</SelectItem>
                  <SelectItem value="human">Human Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="personas">Persona Analysis</TabsTrigger>
          <TabsTrigger value="scenarios">Scenario Analysis</TabsTrigger>
          <TabsTrigger value="comparisons">Head-to-Head</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Trophy className="h-4 w-4 text-primary" />
                  <div className="text-2xl font-bold">{results.length}</div>
                </div>
                <p className="text-xs text-muted-foreground">Total Evaluations</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-primary" />
                  <div className="text-2xl font-bold">{personas.length}</div>
                </div>
                <p className="text-xs text-muted-foreground">Active Personas</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Robot className="h-4 w-4 text-primary" />
                  <div className="text-2xl font-bold">{results.filter(r => r.type === 'algorithmic').length}</div>
                </div>
                <p className="text-xs text-muted-foreground">Algorithmic Tests</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-primary" />
                  <div className="text-2xl font-bold">{results.filter(r => r.type === 'human').length}</div>
                </div>
                <p className="text-xs text-muted-foreground">Human Evaluations</p>
              </CardContent>
            </Card>
          </div>

          {/* Top Performers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy size={20} />
                Top Performing Personas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topPerformers.map((persona, index) => (
                  <div key={persona.personaId} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{persona.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {persona.evaluationCount} evaluations
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${getScoreColor(persona.averageScore)}`}>
                        {(persona.averageScore * 100).toFixed(1)}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Avg. Score
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="personas" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Persona Performance Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Persona</TableHead>
                    <TableHead>Overall Score</TableHead>
                    <TableHead>Algorithmic</TableHead>
                    <TableHead>Human</TableHead>
                    <TableHead>Best Domain</TableHead>
                    <TableHead>Evaluations</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {personaAnalysis.map((persona) => (
                    <TableRow key={persona.personaId}>
                      <TableCell className="font-medium">{persona.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={getScoreColor(persona.averageScore)}>
                            {(persona.averageScore * 100).toFixed(1)}%
                          </span>
                          <Progress value={persona.averageScore * 100} className="w-16 h-2" />
                        </div>
                      </TableCell>
                      <TableCell>
                        {persona.algorithmicAverage > 0 
                          ? `${(persona.algorithmicAverage * 100).toFixed(1)}%` 
                          : "N/A"}
                      </TableCell>
                      <TableCell>
                        {persona.humanAverage > 0 
                          ? `${(persona.humanAverage * 100).toFixed(1)}%` 
                          : "N/A"}
                      </TableCell>
                      <TableCell>
                        {persona.strengths.length > 0 ? (
                          <Badge variant="outline">{persona.strengths[0]}</Badge>
                        ) : "N/A"}
                      </TableCell>
                      <TableCell>{persona.evaluationCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scenarios" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Scenario Difficulty Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Scenario</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead>Difficulty</TableHead>
                    <TableHead>Avg Score</TableHead>
                    <TableHead>Best Performer</TableHead>
                    <TableHead>Participants</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scenarioAnalysis.map((scenario) => (
                    <TableRow key={scenario.scenarioId}>
                      <TableCell className="font-medium">{scenario.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{scenario.domain}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getDifficultyColor(scenario.difficulty)}>
                          {scenario.difficulty}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={getScoreColor(scenario.averageScore)}>
                            {(scenario.averageScore * 100).toFixed(1)}%
                          </span>
                          <Progress value={scenario.averageScore * 100} className="w-16 h-2" />
                        </div>
                      </TableCell>
                      <TableCell>{scenario.bestPersona}</TableCell>
                      <TableCell>{scenario.participantCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparisons" className="space-y-6">
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle>Head-to-Head Comparisons</CardTitle>
              <p className="text-sm text-muted-foreground">
                Compare personas on shared scenarios. Win rate counts per-scenario victories; average edge shows the
                mean score difference across those matchups.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {comparisonPersonaIds.length < 2 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <TrendUp size={48} className="mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Need more overlap</h3>
                  <p>
                    Make sure at least two personas have results for the selected filters (try switching Persona to
                    'All') to unlock the comparison matrix.
                  </p>
                </div>
              ) : (
                <>
                  {comparisonHighlights.length > 0 && (
                    <div className="grid gap-4 md:grid-cols-3">
                      {comparisonHighlights.map((highlight, index) => (
                        <div
                          key={`${highlight.leader}-${highlight.challenger}-${index}`}
                          className="rounded-lg border border-border bg-muted/40 p-4"
                        >
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Key matchup</p>
                          <h3 className="mt-1 text-sm font-semibold text-ink-600">
                            {highlight.leader} vs {highlight.challenger}
                          </h3>
                          <div className="mt-4 flex items-baseline justify-between">
                            <span className="text-2xl font-bold text-brand-emerald-600">
                              {formatPercentage(highlight.winRate, 0)}
                            </span>
                            <span className="text-xs text-muted-foreground">win rate</span>
                          </div>
                          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                            <span>+{(highlight.diff * 100).toFixed(1)}% avg. edge</span>
                            <span>{highlight.shared} shared scenarios</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[180px]">Persona</TableHead>
                          {comparisonPersonaIds.map((personaId) => (
                            <TableHead key={personaId} className="min-w-[140px] text-center">
                              {personaNameMap.get(personaId) ?? personaId}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {comparisonPersonaIds.map((rowId) => (
                          <TableRow key={rowId} className="align-top">
                            <TableCell className="font-medium">{personaNameMap.get(rowId) ?? rowId}</TableCell>
                            {comparisonPersonaIds.map((columnId) => {
                              if (rowId === columnId) {
                                return (
                                  <TableCell key={columnId} className="text-center text-xs text-muted-foreground">
                                    —
                                  </TableCell>
                                )
                              }

                              const cell = comparisonMatrix[rowId]?.[columnId]

                              if (!cell || cell.shared === 0) {
                                return (
                                  <TableCell key={columnId} className="text-center text-xs text-muted-foreground">
                                    No overlap
                                  </TableCell>
                                )
                              }

                              const tone = getComparisonTone(cell.averageDiff)

                              return (
                                <TableCell key={columnId} className="align-top">
                                  <div className={`rounded-lg px-3 py-3 text-xs leading-5 ${tone}`}>
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm font-semibold">
                                        {formatPercentage(cell.winRate)}
                                      </span>
                                      <span className="text-[10px] uppercase tracking-wide text-ink-500/80">
                                        win rate
                                      </span>
                                    </div>
                                    <div className="mt-2 flex items-center justify-between">
                                      <span className="text-[11px] font-medium">
                                        {(cell.averageDiff >= 0 ? '+' : '') + (cell.averageDiff * 100).toFixed(1)}%
                                      </span>
                                      <span className="text-[11px] text-muted-foreground">n={cell.shared}</span>
                                    </div>
                                  </div>
                                </TableCell>
                              )
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}