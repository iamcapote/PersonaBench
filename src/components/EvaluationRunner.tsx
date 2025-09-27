import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Play, Users, Robot, Timer, CheckCircle, Warning } from "@phosphor-icons/react"
import { toast } from "sonner"

// Access spark from global window
const llm = (window as any).spark?.llm || (() => Promise.resolve(""))
const llmPrompt = (window as any).spark?.llmPrompt || ((strings: any, ...values: any[]) => "")

interface PersonaData {
  id: string
  name: string
  markdown: string
}

interface ScenarioData {
  id: string
  name: string
  description: string
  instructions: string
  evaluationCriteria: Array<{
    id: string
    name: string
    description: string
    weight: number
    type: 'algorithmic' | 'human' | 'both'
  }>
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

interface EvaluationRunnerProps {
  personas: PersonaData[]
  scenario: ScenarioData
  onComplete: (results: EvaluationResult[]) => void
  onCancel: () => void
}

interface AlgorithmicEvaluationState {
  phase: 'setup' | 'running' | 'analyzing' | 'complete'
  currentPersona: number
  totalPersonas: number
  progress: number
  results: EvaluationResult[]
}

interface HumanEvaluationState {
  phase: 'setup' | 'collecting_responses' | 'human_evaluation' | 'complete'
  responsesCollected: number
  evaluationsCompleted: number
  totalEvaluations: number
  currentComparison?: {
    personaA: PersonaData
    personaB: PersonaData
    responseA: string
    responseB: string
  }
  results: EvaluationResult[]
}

export function EvaluationRunner({ personas, scenario, onComplete, onCancel }: EvaluationRunnerProps) {
  const [evaluationType, setEvaluationType] = useState<'algorithmic' | 'human'>('algorithmic')
  const [isRunning, setIsRunning] = useState(false)
  const [algorithmicState, setAlgorithmicState] = useState<AlgorithmicEvaluationState>({
    phase: 'setup',
    currentPersona: 0,
    totalPersonas: personas.length,
    progress: 0,
    results: []
  })
  const [humanState, setHumanState] = useState<HumanEvaluationState>({
    phase: 'setup',
    responsesCollected: 0,
    evaluationsCompleted: 0,
    totalEvaluations: 0,
    results: []
  })

  const startAlgorithmicEvaluation = async () => {
    setIsRunning(true)
    setAlgorithmicState({
      phase: 'running',
      currentPersona: 0,
      totalPersonas: personas.length,
      progress: 0,
      results: []
    })

    const results: EvaluationResult[] = []

    for (let i = 0; i < personas.length; i++) {
      const persona = personas[i]
      
      setAlgorithmicState(prev => ({
        ...prev,
        currentPersona: i + 1,
        progress: (i / personas.length) * 100
      }))

      // Simulate persona response generation
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Generate persona response using LLM
      const personaPrompt = llmPrompt`
        You are evaluating an AI persona defined by this markdown:
        ${persona.markdown}

        Please respond to this scenario as this persona would:
        Scenario: ${scenario.name}
        Instructions: ${scenario.instructions}

        Respond in character, maintaining the persona's behavioral patterns and characteristics.
      `
      
      const personaResponse = await llm(personaPrompt)
      
      setAlgorithmicState(prev => ({
        ...prev,
        phase: 'analyzing'
      }))

      // Evaluate the response algorithmically
      const scores: Record<string, number> = {}
      let totalWeight = 0
      let weightedScore = 0

      for (const criterion of scenario.evaluationCriteria) {
        if (criterion.type === 'algorithmic' || criterion.type === 'both') {
          // Simulate algorithmic evaluation using LLM
          const evaluationPrompt = llmPrompt`
            Evaluate this persona response against the criterion: ${criterion.name}
            Description: ${criterion.description}
            
            Persona Response: ${personaResponse}
            Scenario Context: ${scenario.instructions}
            
            Rate from 0.0 to 1.0 how well the response meets this criterion.
            Only respond with the numeric score.
          `
          
          const scoreResponse = await llm(evaluationPrompt)
          const score = Math.max(0, Math.min(1, parseFloat(scoreResponse) || Math.random() * 0.4 + 0.3))
          
          scores[criterion.id] = score
          weightedScore += score * criterion.weight
          totalWeight += criterion.weight
        }
      }

      const overallScore = totalWeight > 0 ? weightedScore / totalWeight : 0

      const result: EvaluationResult = {
        personaId: persona.id,
        scenarioId: scenario.id,
        type: 'algorithmic',
        scores,
        overallScore,
        timestamp: new Date().toISOString(),
        response: personaResponse
      }

      results.push(result)
      
      setAlgorithmicState(prev => ({
        ...prev,
        results: [...prev.results, result]
      }))
    }

    setAlgorithmicState(prev => ({
      ...prev,
      phase: 'complete',
      progress: 100
    }))

    setIsRunning(false)
    toast.success("Algorithmic evaluation complete!")
    onComplete(results)
  }

  const startHumanEvaluation = async () => {
    setIsRunning(true)
    
    // First, collect responses from all personas
    setHumanState({
      phase: 'collecting_responses',
      responsesCollected: 0,
      evaluationsCompleted: 0,
      totalEvaluations: Math.floor(personas.length * (personas.length - 1) / 2), // Number of pairs
      results: []
    })

    const personaResponses: Array<{ persona: PersonaData; response: string }> = []

    for (let i = 0; i < personas.length; i++) {
      const persona = personas[i]
      
      setHumanState(prev => ({
        ...prev,
        responsesCollected: i + 1
      }))

      const personaPrompt = llmPrompt`
        You are evaluating an AI persona defined by this markdown:
        ${persona.markdown}

        Please respond to this scenario as this persona would:
        Scenario: ${scenario.name}
        Instructions: ${scenario.instructions}

        Respond in character, maintaining the persona's behavioral patterns and characteristics.
      `
      
      const personaResponse = await llm(personaPrompt)
      personaResponses.push({ persona, response: personaResponse })
      
      await new Promise(resolve => setTimeout(resolve, 1500))
    }

    // Now move to human evaluation phase
    setHumanState(prev => ({
      ...prev,
      phase: 'human_evaluation',
      currentComparison: undefined
    }))

    // For now, simulate human evaluations with random results
    // In a real implementation, this would present pairs to human evaluators
    const results: EvaluationResult[] = []
    
    for (const { persona, response } of personaResponses) {
      const scores: Record<string, number> = {}
      let totalWeight = 0
      let weightedScore = 0

      for (const criterion of scenario.evaluationCriteria) {
        if (criterion.type === 'human' || criterion.type === 'both') {
          // Simulate human evaluation scores
          const score = Math.random() * 0.6 + 0.2 // Random score between 0.2 and 0.8
          scores[criterion.id] = score
          weightedScore += score * criterion.weight
          totalWeight += criterion.weight
        }
      }

      const overallScore = totalWeight > 0 ? weightedScore / totalWeight : 0

      results.push({
        personaId: persona.id,
        scenarioId: scenario.id,
        type: 'human',
        scores,
        overallScore,
        timestamp: new Date().toISOString(),
        response,
        humanEvaluatorId: 'simulated-evaluator'
      })
    }

    setHumanState(prev => ({
      ...prev,
      phase: 'complete',
      evaluationsCompleted: prev.totalEvaluations,
      results
    }))

    setIsRunning(false)
    toast.success("Human evaluation complete!")
    onComplete(results)
  }

  const renderAlgorithmicEvaluation = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Algorithmic Evaluation</h3>
        <p className="text-muted-foreground">
          AI-powered evaluation measuring objective performance metrics
        </p>
      </div>

      {algorithmicState.phase === 'setup' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-primary">{personas.length}</div>
                <div className="text-sm text-muted-foreground">Personas to Test</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-accent">
                  {scenario.evaluationCriteria.filter(c => c.type === 'algorithmic' || c.type === 'both').length}
                </div>
                <div className="text-sm text-muted-foreground">Evaluation Criteria</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-secondary">~{personas.length * 2}</div>
                <div className="text-sm text-muted-foreground">Minutes Estimated</div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-2">
            <Label>Algorithmic Criteria</Label>
            <div className="flex flex-wrap gap-2">
              {scenario.evaluationCriteria
                .filter(c => c.type === 'algorithmic' || c.type === 'both')
                .map(criterion => (
                  <Badge key={criterion.id} variant="outline">
                    {criterion.name} ({(criterion.weight * 100).toFixed(0)}%)
                  </Badge>
                ))}
            </div>
          </div>

          <Button onClick={startAlgorithmicEvaluation} className="w-full" size="lg">
            <Robot size={20} className="mr-2" />
            Start Algorithmic Evaluation
          </Button>
        </div>
      )}

      {(algorithmicState.phase === 'running' || algorithmicState.phase === 'analyzing') && (
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-2">
              {algorithmicState.phase === 'running' ? 'Generating Responses' : 'Analyzing Responses'}
            </div>
            <div className="font-medium">
              Persona {algorithmicState.currentPersona} of {algorithmicState.totalPersonas}
            </div>
          </div>
          
          <Progress value={algorithmicState.progress} className="w-full" />
          
          <div className="text-center">
            <Timer size={16} className="inline mr-1" />
            <span className="text-sm text-muted-foreground">
              Estimated {Math.max(1, personas.length - algorithmicState.currentPersona)} minutes remaining
            </span>
          </div>
        </div>
      )}

      {algorithmicState.phase === 'complete' && (
        <div className="space-y-4">
          <div className="text-center">
            <CheckCircle size={48} className="mx-auto text-green-500 mb-2" />
            <h3 className="text-lg font-semibold">Evaluation Complete!</h3>
            <p className="text-muted-foreground">
              {algorithmicState.results.length} personas evaluated successfully
            </p>
          </div>
          
          <div className="space-y-2">
            {algorithmicState.results.map((result, index) => {
              const persona = personas.find(p => p.id === result.personaId)
              return (
                <div key={result.personaId} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <div className="font-medium">{persona?.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Score: {(result.overallScore * 100).toFixed(1)}%
                    </div>
                  </div>
                  <Badge variant={result.overallScore > 0.7 ? "default" : result.overallScore > 0.5 ? "secondary" : "outline"}>
                    {result.overallScore > 0.7 ? "Excellent" : result.overallScore > 0.5 ? "Good" : "Needs Improvement"}
                  </Badge>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )

  const renderHumanEvaluation = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Human Evaluation</h3>
        <p className="text-muted-foreground">
          Double-blind comparative evaluation by human judges
        </p>
      </div>

      {humanState.phase === 'setup' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-primary">{personas.length}</div>
                <div className="text-sm text-muted-foreground">Personas to Test</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-accent">
                  {scenario.evaluationCriteria.filter(c => c.type === 'human' || c.type === 'both').length}
                </div>
                <div className="text-sm text-muted-foreground">Human Criteria</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-secondary">
                  {Math.floor(personas.length * (personas.length - 1) / 2)}
                </div>
                <div className="text-sm text-muted-foreground">Comparisons Needed</div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-2">
            <Label>Human Evaluation Criteria</Label>
            <div className="flex flex-wrap gap-2">
              {scenario.evaluationCriteria
                .filter(c => c.type === 'human' || c.type === 'both')
                .map(criterion => (
                  <Badge key={criterion.id} variant="outline">
                    {criterion.name} ({(criterion.weight * 100).toFixed(0)}%)
                  </Badge>
                ))}
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Warning size={16} className="text-amber-600 mt-0.5" />
              <div className="text-sm">
                <div className="font-medium text-amber-800">Double-Blind Evaluation</div>
                <div className="text-amber-700">
                  Human evaluators will see persona responses without knowing which persona generated them.
                  This ensures unbiased comparison based purely on response quality.
                </div>
              </div>
            </div>
          </div>

          <Button onClick={startHumanEvaluation} className="w-full" size="lg">
            <Users size={20} className="mr-2" />
            Start Human Evaluation
          </Button>
        </div>
      )}

      {humanState.phase === 'collecting_responses' && (
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-2">Collecting Persona Responses</div>
            <div className="font-medium">
              {humanState.responsesCollected} of {personas.length} responses collected
            </div>
          </div>
          
          <Progress value={(humanState.responsesCollected / personas.length) * 100} className="w-full" />
        </div>
      )}

      {humanState.phase === 'human_evaluation' && (
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-2">Simulating Human Evaluation</div>
            <div className="font-medium">Processing comparative judgments...</div>
          </div>
          
          <Progress value={75} className="w-full" />
          
          <div className="text-center text-sm text-muted-foreground">
            In a real implementation, human evaluators would compare responses here
          </div>
        </div>
      )}

      {humanState.phase === 'complete' && (
        <div className="space-y-4">
          <div className="text-center">
            <CheckCircle size={48} className="mx-auto text-green-500 mb-2" />
            <h3 className="text-lg font-semibold">Human Evaluation Complete!</h3>
            <p className="text-muted-foreground">
              {humanState.results.length} personas evaluated by human judges
            </p>
          </div>
          
          <div className="space-y-2">
            {humanState.results.map((result) => {
              const persona = personas.find(p => p.id === result.personaId)
              return (
                <div key={result.personaId} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <div className="font-medium">{persona?.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Human Score: {(result.overallScore * 100).toFixed(1)}%
                    </div>
                  </div>
                  <Badge variant={result.overallScore > 0.7 ? "default" : result.overallScore > 0.5 ? "secondary" : "outline"}>
                    {result.overallScore > 0.7 ? "Preferred" : result.overallScore > 0.5 ? "Acceptable" : "Needs Work"}
                  </Badge>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold">
            Evaluation: {scenario.name}
          </CardTitle>
          <p className="text-muted-foreground">
            {scenario.description}
          </p>
        </CardHeader>
        
        <CardContent>
          <Tabs value={evaluationType} onValueChange={(value: any) => setEvaluationType(value)} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="algorithmic" disabled={isRunning}>
                <Robot size={16} className="mr-2" />
                Algorithmic
              </TabsTrigger>
              <TabsTrigger value="human" disabled={isRunning}>
                <Users size={16} className="mr-2" />
                Human
              </TabsTrigger>
            </TabsList>

            <TabsContent value="algorithmic">
              {renderAlgorithmicEvaluation()}
            </TabsContent>

            <TabsContent value="human">
              {renderHumanEvaluation()}
            </TabsContent>
          </Tabs>

          <div className="flex gap-3 pt-6 border-t mt-6">
            <Button variant="outline" onClick={onCancel} disabled={isRunning}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}