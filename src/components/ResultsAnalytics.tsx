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

  const topPerformers = useMemo(() => {
    return personaAnalysis
      .filter(p => p.evaluationCount > 0)
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, 5)
  }, [personaAnalysis])

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'hard': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600'
    if (score >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

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
            <CardHeader>
              <CardTitle>Head-to-Head Comparisons</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <TrendUp size={48} className="mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Coming Soon</h3>
                <p>Direct persona comparisons and statistical significance testing will be available here.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}