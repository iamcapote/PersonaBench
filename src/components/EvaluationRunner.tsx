import { useCallback, useState } from "react"
import { Users, Robot } from "@phosphor-icons/react"

import { AlgorithmicEvaluationPanel } from "@/components/evaluation/AlgorithmicEvaluationPanel"
import { HumanEvaluationPanel } from "@/components/evaluation/HumanEvaluationPanel"
import { useAlgorithmicEvaluation } from "@/components/evaluation/useAlgorithmicEvaluation"
import { useHumanEvaluation } from "@/components/evaluation/useHumanEvaluation"
import { EvaluationMode, EvaluationResult, PersonaData, ScenarioData } from "@/components/evaluation/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface EvaluationRunnerProps {
  personas: PersonaData[]
  scenario: ScenarioData
  onComplete: (results: EvaluationResult[]) => void
  onCancel: () => void
}

export function EvaluationRunner({ personas, scenario, onComplete, onCancel }: EvaluationRunnerProps) {
  const [evaluationType, setEvaluationType] = useState<EvaluationMode>("algorithmic")
  const [isRunning, setIsRunning] = useState(false)

  const { state: algorithmicState, startEvaluation: runAlgorithmicEvaluation } = useAlgorithmicEvaluation({
    personas,
    scenario,
    onComplete,
  })

  const { state: humanState, startEvaluation: runHumanEvaluation } = useHumanEvaluation({
    personas,
    scenario,
    onComplete,
  })

  const algorithmicInFlight =
    algorithmicState.phase === "running" || algorithmicState.phase === "analyzing"
  const humanInFlight =
    humanState.phase === "collecting_responses" || humanState.phase === "human_evaluation"

  const evaluationInProgress = isRunning || algorithmicInFlight || humanInFlight

  const handleAlgorithmicStart = useCallback(async () => {
    setIsRunning(true)
    try {
      await runAlgorithmicEvaluation()
    } finally {
      setIsRunning(false)
    }
  }, [runAlgorithmicEvaluation])

  const handleHumanStart = useCallback(async () => {
    setIsRunning(true)
    try {
      await runHumanEvaluation()
    } finally {
      setIsRunning(false)
    }
  }, [runHumanEvaluation])

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Evaluation: {scenario.name}</CardTitle>
          <p className="text-muted-foreground">{scenario.description}</p>
        </CardHeader>

        <CardContent>
          <Tabs
            value={evaluationType}
            onValueChange={(value) => setEvaluationType(value as EvaluationMode)}
            className="space-y-6"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="algorithmic" disabled={evaluationInProgress}>
                <Robot size={16} className="mr-2" />
                Algorithmic
              </TabsTrigger>
              <TabsTrigger value="human" disabled={evaluationInProgress}>
                <Users size={16} className="mr-2" />
                Human
              </TabsTrigger>
            </TabsList>

            <TabsContent value="algorithmic">
              <AlgorithmicEvaluationPanel
                personas={personas}
                scenario={scenario}
                state={algorithmicState}
                onStart={handleAlgorithmicStart}
                isRunning={evaluationInProgress}
              />
            </TabsContent>

            <TabsContent value="human">
              <HumanEvaluationPanel
                personas={personas}
                scenario={scenario}
                state={humanState}
                onStart={handleHumanStart}
                isRunning={evaluationInProgress}
              />
            </TabsContent>
          </Tabs>

          <div className="mt-6 flex gap-3 border-t pt-6">
            <Button variant="outline" onClick={onCancel} disabled={evaluationInProgress}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}