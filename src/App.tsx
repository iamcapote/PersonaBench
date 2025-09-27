import { useState, useEffect } from "react"
import { useKV } from "@github/spark/hooks"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PersonaCard } from "@/components/PersonaCard"
import { PersonaEditor } from "@/components/PersonaEditor"
import { ScenarioSelector } from "@/components/ScenarioSelector"
import { ScenarioBuilder } from "@/components/ScenarioBuilder"
import { EvaluationRunner } from "@/components/EvaluationRunner"
import { ResultsAnalytics } from "@/components/ResultsAnalytics"
import { Flask, Plus, ChartBar, FileText, Play } from "@phosphor-icons/react"
import { toast } from "sonner"
import { samplePersonas } from "@/samplePersonas"

interface PersonaData {
  id: string
  name: string
  markdown: string
  config: {
    archetype: string
    riskTolerance: number
    planningHorizon: string
    deceptionAversion: number
    toolPermissions: string[]
    memoryWindow: number
  }
  lastScore?: number
}

interface ScenarioData {
  id: string
  name: string
  description: string
  domain: 'games' | 'social' | 'web' | 'text' | 'reasoning' | 'creative' | 'technical'
  difficulty: 'easy' | 'medium' | 'hard'
  estimatedTime: number
  instructions: string
  setupSteps: string[]
  evaluationCriteria: Array<{
    id: string
    name: string
    description: string
    weight: number
    type: 'algorithmic' | 'human' | 'both'
  }>
  expectedOutputFormat: string
  context: string
  constraints: string[]
  tags: string[]
}

interface EvaluationResult {
  personaId: string
  scenarioId: string
  type: 'algorithmic' | 'human'
  scores: Record<string, number>
  overallScore: number
  timestamp: string
  response?: string
  humanEvaluatorId?: string
}

const mockScenarios: ScenarioData[] = [
  {
    id: 'poker-001',
    name: 'High-Stakes Poker',
    description: 'Navigate a complex no-limit Texas Hold\'em scenario with incomplete information',
    domain: 'games',
    difficulty: 'hard',
    estimatedTime: 15,
    instructions: 'You are playing in a high-stakes poker tournament. Make strategic decisions based on your hand, position, and read of other players.',
    setupSteps: ['Shuffle deck', 'Deal initial hands', 'Set blinds'],
    evaluationCriteria: [
      {
        id: 'strategy',
        name: 'Strategic Thinking',
        description: 'Quality of strategic decisions',
        weight: 0.4,
        type: 'both'
      },
      {
        id: 'risk_management',
        name: 'Risk Management',
        description: 'Appropriate risk assessment',
        weight: 0.3,
        type: 'algorithmic'
      },
      {
        id: 'adaptability',
        name: 'Adaptability',
        description: 'Ability to adapt to changing situations',
        weight: 0.3,
        type: 'human'
      }
    ],
    expectedOutputFormat: 'Detailed decision rationale with betting actions',
    context: 'Tournament setting with experienced players',
    constraints: ['Must follow poker rules', 'Cannot see other players cards'],
    tags: ['strategy', 'incomplete-information', 'risk-assessment']
  },
  {
    id: 'negotiation-001', 
    name: 'Resource Allocation',
    description: 'Negotiate fair distribution of limited resources among competing parties',
    domain: 'social',
    difficulty: 'medium',
    estimatedTime: 10,
    instructions: 'You must negotiate the distribution of limited budget among 5 competing departments.',
    setupSteps: ['Review budget constraints', 'Understand department needs'],
    evaluationCriteria: [
      {
        id: 'fairness',
        name: 'Fairness',
        description: 'Equitable distribution approach',
        weight: 0.3,
        type: 'human'
      },
      {
        id: 'efficiency',
        name: 'Efficiency',
        description: 'Optimal resource utilization',
        weight: 0.4,
        type: 'algorithmic'
      },
      {
        id: 'diplomacy',
        name: 'Diplomatic Skill',
        description: 'Maintaining good relationships',
        weight: 0.3,
        type: 'human'
      }
    ],
    expectedOutputFormat: 'Allocation proposal with justification',
    context: 'Corporate environment with tight budgets',
    constraints: ['Cannot exceed total budget', 'All departments must receive something'],
    tags: ['negotiation', 'resource-management', 'diplomacy']
  }
]

function App() {
  const [personas, setPersonas] = useKV<PersonaData[]>("personas-v2", [])
  const [scenarios, setScenarios] = useKV<ScenarioData[]>("scenarios", mockScenarios)
  const [results, setResults] = useKV<EvaluationResult[]>("evaluation-results", [])
  
  const [activeTab, setActiveTab] = useState("personas")
  const [showPersonaEditor, setShowPersonaEditor] = useState(false)
  const [showScenarioBuilder, setShowScenarioBuilder] = useState(false)
  const [showEvaluationRunner, setShowEvaluationRunner] = useState(false)
  
  const [editingPersona, setEditingPersona] = useState<PersonaData | null>(null)
  const [editingScenario, setEditingScenario] = useState<ScenarioData | null>(null)
  const [selectedScenario, setSelectedScenario] = useState<string>("")
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>([])

  // Initialize with sample personas if empty
  useEffect(() => {
    if (personas && personas.length === 0) {
      setPersonas(samplePersonas as PersonaData[])
    }
  }, [personas, setPersonas])

  const handleSavePersona = (personaData: Omit<PersonaData, 'id'>) => {
    const newPersona: PersonaData = {
      ...personaData,
      id: editingPersona?.id || `persona-${Date.now()}`
    }

    setPersonas((currentPersonas) => {
      if (!currentPersonas) return [newPersona]
      if (editingPersona) {
        return currentPersonas.map(p => p.id === editingPersona.id ? newPersona : p)
      } else {
        return [...currentPersonas, newPersona]
      }
    })

    setShowPersonaEditor(false)
    setEditingPersona(null)
    toast.success(editingPersona ? "Persona updated!" : "Persona created!")
  }

  const handleSaveScenario = (scenarioData: Omit<ScenarioData, 'id'>) => {
    const newScenario: ScenarioData = {
      ...scenarioData,
      id: editingScenario?.id || `scenario-${Date.now()}`
    }

    setScenarios((currentScenarios) => {
      if (!currentScenarios) return [newScenario]
      if (editingScenario) {
        return currentScenarios.map(s => s.id === editingScenario.id ? newScenario : s)
      } else {
        return [...currentScenarios, newScenario]
      }
    })

    setShowScenarioBuilder(false)
    setEditingScenario(null)
    toast.success(editingScenario ? "Scenario updated!" : "Scenario created!")
  }

  const handleRunEvaluation = (personaId: string) => {
    if (!selectedScenario) {
      toast.error("Please select a scenario first")
      setActiveTab("scenarios")
      return
    }

    setSelectedPersonas([personaId])
    setShowEvaluationRunner(true)
  }

  const handleBulkEvaluation = () => {
    if (!selectedScenario) {
      toast.error("Please select a scenario first")
      setActiveTab("scenarios")
      return
    }

    if (selectedPersonas.length === 0) {
      toast.error("Please select personas to evaluate")
      return
    }

    setShowEvaluationRunner(true)
  }

  const handleEvaluationComplete = (newResults: EvaluationResult[]) => {
    setResults((currentResults) => {
      if (!currentResults) return newResults
      return [...currentResults, ...newResults]
    })
    
    // Update persona scores
    setPersonas((currentPersonas) => {
      if (!currentPersonas) return []
      return currentPersonas.map(persona => {
        const personaResults = newResults.filter(r => r.personaId === persona.id)
        if (personaResults.length > 0) {
          const avgScore = personaResults.reduce((sum, r) => sum + r.overallScore, 0) / personaResults.length
          return { ...persona, lastScore: avgScore }
        }
        return persona
      })
    })

    setShowEvaluationRunner(false)
    setActiveTab("results")
    toast.success(`Evaluation complete! ${newResults.length} results saved.`)
  }

  const handleEditPersona = (personaId: string) => {
    if (!personas) return
    const persona = personas.find(p => p.id === personaId)
    if (persona) {
      setEditingPersona(persona)
      setShowPersonaEditor(true)
    }
  }

  const handleEditScenario = (scenarioId: string) => {
    if (!scenarios) return
    const scenario = scenarios.find(s => s.id === scenarioId)
    if (scenario) {
      setEditingScenario(scenario)
      setShowScenarioBuilder(true)
    }
  }

  const selectedScenarioData = scenarios?.find(s => s.id === selectedScenario)
  const selectedPersonaData = selectedPersonas
    .map(id => personas?.find(p => p.id === id))
    .filter(Boolean) as PersonaData[]

  if (showPersonaEditor) {
    return (
      <div className="min-h-screen bg-background p-6">
        <PersonaEditor
          persona={editingPersona || undefined}
          onSave={handleSavePersona}
          onCancel={() => {
            setShowPersonaEditor(false)
            setEditingPersona(null)
          }}
        />
      </div>
    )
  }

  if (showScenarioBuilder) {
    return (
      <div className="min-h-screen bg-background p-6">
        <ScenarioBuilder
          scenario={editingScenario || undefined}
          onSave={handleSaveScenario}
          onCancel={() => {
            setShowScenarioBuilder(false)
            setEditingScenario(null)
          }}
        />
      </div>
    )
  }

  if (showEvaluationRunner && selectedScenarioData) {
    return (
      <div className="min-h-screen bg-background p-6">
        <EvaluationRunner
          personas={selectedPersonaData}
          scenario={selectedScenarioData}
          onComplete={handleEvaluationComplete}
          onCancel={() => setShowEvaluationRunner(false)}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Flask size={32} className="text-primary" />
            <h1 className="text-3xl font-bold">PersonaBench</h1>
          </div>
          <p className="text-muted-foreground">
            Benchmark AI personas stored as markdown files across diverse scenarios using algorithmic and human evaluation
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="personas">Personas ({personas?.length || 0})</TabsTrigger>
            <TabsTrigger value="scenarios">Scenarios ({scenarios?.length || 0})</TabsTrigger>
            <TabsTrigger value="evaluation">Evaluation</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
          </TabsList>

          <TabsContent value="personas" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">AI Personas</h2>
              <Button onClick={() => setShowPersonaEditor(true)}>
                <Plus size={16} className="mr-2" />
                Create Persona
              </Button>
            </div>

            {!personas || personas.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <FileText size={48} className="mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No personas yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first AI persona using markdown to begin benchmarking
                  </p>
                  <Button onClick={() => setShowPersonaEditor(true)}>
                    <Plus size={16} className="mr-2" />
                    Create Persona
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {personas?.map((persona) => (
                  <PersonaCard
                    key={persona.id}
                    id={persona.id}
                    name={persona.name}
                    description={persona.markdown.split('\n').find(line => line.includes('##'))?.replace(/#+\s*/, '') || "No description"}
                    archetype={persona.config.archetype}
                    riskTolerance={persona.config.riskTolerance}
                    planningHorizon={persona.config.planningHorizon}
                    lastScore={persona.lastScore}
                    onRun={handleRunEvaluation}
                    onEdit={handleEditPersona}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="scenarios" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Test Scenarios</h2>
              <Button onClick={() => setShowScenarioBuilder(true)}>
                <Plus size={16} className="mr-2" />
                Create Scenario
              </Button>
            </div>

            <ScenarioSelector
              scenarios={scenarios || []}
              selectedScenario={selectedScenario}
              onSelect={setSelectedScenario}
              onEdit={handleEditScenario}
              showTransparency={true}
            />

            {selectedScenario && selectedPersonas.length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <Play size={32} className="mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground mb-4">
                    Select personas to evaluate, or run individual tests from the Personas tab
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button 
                      variant="outline" 
                      onClick={() => setSelectedPersonas(personas?.map(p => p.id) || [])}
                      disabled={!personas || personas.length === 0}
                    >
                      Select All Personas
                    </Button>
                    <Button 
                      onClick={handleBulkEvaluation}
                      disabled={selectedPersonas.length === 0}
                    >
                      <Play size={16} className="mr-2" />
                      Run Bulk Evaluation
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="evaluation" className="space-y-6">
            <Card>
              <CardContent className="text-center py-12">
                <ChartBar size={48} className="mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No evaluation running</h3>
                <p className="text-muted-foreground mb-4">
                  Select personas and scenarios, then run evaluations to see live progress here
                </p>
                <Button onClick={() => setActiveTab("personas")}>
                  Go to Personas
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
            <ResultsAnalytics
              personas={personas || []}
              scenarios={scenarios || []}
              results={results || []}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default App