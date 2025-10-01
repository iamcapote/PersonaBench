import { Robot, Timer, CheckCircle } from "@phosphor-icons/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

import {
  AlgorithmicEvaluationState,
  PersonaData,
  ScenarioData,
} from "./types";

interface AlgorithmicEvaluationPanelProps {
  personas: PersonaData[];
  scenario: ScenarioData;
  state: AlgorithmicEvaluationState;
  onStart: () => void;
  isRunning: boolean;
}

export const AlgorithmicEvaluationPanel = ({
  personas,
  scenario,
  state,
  onStart,
  isRunning,
}: AlgorithmicEvaluationPanelProps) => (
  <div className="space-y-6">
    <div className="text-center">
      <h3 className="mb-2 text-lg font-semibold">Algorithmic Evaluation</h3>
      <p className="text-muted-foreground">
        AI-powered evaluation measuring objective performance metrics
      </p>
    </div>

    {state.phase === "setup" && (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 text-center md:grid-cols-3">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-primary">{personas.length}</div>
              <div className="text-sm text-muted-foreground">Personas to Test</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-accent">
                {scenario.evaluationCriteria.filter((criterion) => criterion.type === "algorithmic" || criterion.type === "both").length}
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
              .filter((criterion) => criterion.type === "algorithmic" || criterion.type === "both")
              .map((criterion) => (
                <Badge key={criterion.id} variant="outline">
                  {criterion.name} ({(criterion.weight * 100).toFixed(0)}%)
                </Badge>
              ))}
          </div>
        </div>

        <Button onClick={onStart} className="w-full" size="lg" disabled={isRunning}>
          <Robot size={20} className="mr-2" />
          Start Algorithmic Evaluation
        </Button>
      </div>
    )}

    {(state.phase === "running" || state.phase === "analyzing") && (
      <div className="space-y-4">
        <div className="text-center">
          <div className="mb-2 text-sm text-muted-foreground">
            {state.phase === "running" ? "Generating Responses" : "Analyzing Responses"}
          </div>
          <div className="font-medium">
            Persona {state.currentPersona} of {state.totalPersonas}
          </div>
        </div>

        <Progress value={state.progress} className="w-full" />

        <div className="text-center">
          <Timer size={16} className="mr-1 inline" />
          <span className="text-sm text-muted-foreground">
            Estimated {Math.max(1, state.totalPersonas - state.currentPersona)} minutes remaining
          </span>
        </div>
      </div>
    )}

    {state.phase === "complete" && (
      <div className="space-y-4">
        <div className="text-center">
          <CheckCircle size={48} className="mx-auto mb-2 text-green-500" />
          <h3 className="text-lg font-semibold">Evaluation Complete!</h3>
          <p className="text-muted-foreground">
            {state.results.length} personas evaluated successfully
          </p>
        </div>

        <div className="space-y-2">
          {state.results.map((result) => {
            const persona = personas.find((entry) => entry.id === result.personaId);
            return (
              <div key={result.personaId} className="flex items-center justify-between rounded border p-3">
                <div>
                  <div className="font-medium">{persona?.name}</div>
                  <div className="text-sm text-muted-foreground">
                    Score: {(result.overallScore * 100).toFixed(1)}%
                  </div>
                </div>
                <Badge
                  variant={
                    result.overallScore > 0.7
                      ? "default"
                      : result.overallScore > 0.5
                        ? "secondary"
                        : "outline"
                  }
                >
                  {result.overallScore > 0.7
                    ? "Excellent"
                    : result.overallScore > 0.5
                      ? "Good"
                      : "Needs Improvement"}
                </Badge>
              </div>
            );
          })}
        </div>
      </div>
    )}
  </div>
);
