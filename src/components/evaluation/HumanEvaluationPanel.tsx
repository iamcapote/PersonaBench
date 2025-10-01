import { CheckCircle, Users, Warning } from "@phosphor-icons/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

import { HumanEvaluationState, PersonaData, ScenarioData } from "./types";

interface HumanEvaluationPanelProps {
  personas: PersonaData[];
  scenario: ScenarioData;
  state: HumanEvaluationState;
  onStart: () => void;
  isRunning: boolean;
}

export const HumanEvaluationPanel = ({
  personas,
  scenario,
  state,
  onStart,
  isRunning,
}: HumanEvaluationPanelProps) => (
  <div className="space-y-6">
    <div className="text-center">
      <h3 className="mb-2 text-lg font-semibold">Human Evaluation</h3>
      <p className="text-muted-foreground">Double-blind comparative evaluation by human judges</p>
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
                {scenario.evaluationCriteria.filter((criterion) => criterion.type === "human" || criterion.type === "both").length}
              </div>
              <div className="text-sm text-muted-foreground">Human Criteria</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-secondary">
                {Math.floor((personas.length * (personas.length - 1)) / 2)}
              </div>
              <div className="text-sm text-muted-foreground">Comparisons Needed</div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-2">
          <Label>Human Evaluation Criteria</Label>
          <div className="flex flex-wrap gap-2">
            {scenario.evaluationCriteria
              .filter((criterion) => criterion.type === "human" || criterion.type === "both")
              .map((criterion) => (
                <Badge key={criterion.id} variant="outline">
                  {criterion.name} ({(criterion.weight * 100).toFixed(0)}%)
                </Badge>
              ))}
          </div>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-2">
            <Warning size={16} className="mt-0.5 text-amber-600" />
            <div className="text-sm">
              <div className="font-medium text-amber-800">Double-Blind Evaluation</div>
              <div className="text-amber-700">
                Human evaluators will see persona responses without knowing which persona generated them.
                This ensures unbiased comparison based purely on response quality.
              </div>
            </div>
          </div>
        </div>

        <Button onClick={onStart} className="w-full" size="lg" disabled={isRunning}>
          <Users size={20} className="mr-2" />
          Start Human Evaluation
        </Button>
      </div>
    )}

    {state.phase === "collecting_responses" && (
      <div className="space-y-4">
        <div className="text-center">
          <div className="mb-2 text-sm text-muted-foreground">Collecting Persona Responses</div>
          <div className="font-medium">
            {state.responsesCollected} of {personas.length} responses collected
          </div>
        </div>

        <Progress value={(state.responsesCollected / Math.max(1, personas.length)) * 100} className="w-full" />
      </div>
    )}

    {state.phase === "human_evaluation" && (
      <div className="space-y-4">
        <div className="text-center">
          <div className="mb-2 text-sm text-muted-foreground">Simulating Human Evaluation</div>
          <div className="font-medium">Processing comparative judgments...</div>
        </div>

        <Progress value={75} className="w-full" />

        <div className="text-center text-sm text-muted-foreground">
          In a real implementation, human evaluators would compare responses here
        </div>
      </div>
    )}

    {state.phase === "complete" && (
      <div className="space-y-4">
        <div className="text-center">
          <CheckCircle size={48} className="mx-auto mb-2 text-green-500" />
          <h3 className="text-lg font-semibold">Human Evaluation Complete!</h3>
          <p className="text-muted-foreground">{state.results.length} personas evaluated by human judges</p>
        </div>

        <div className="space-y-2">
          {state.results.map((result) => {
            const persona = personas.find((entry) => entry.id === result.personaId);
            return (
              <div key={result.personaId} className="flex items-center justify-between rounded border p-3">
                <div>
                  <div className="font-medium">{persona?.name}</div>
                  <div className="text-sm text-muted-foreground">
                    Human Score: {(result.overallScore * 100).toFixed(1)}%
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
                    ? "Preferred"
                    : result.overallScore > 0.5
                      ? "Acceptable"
                      : "Needs Work"}
                </Badge>
              </div>
            );
          })}
        </div>
      </div>
    )}
  </div>
);
