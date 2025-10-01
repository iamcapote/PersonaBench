import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { llm, llmPrompt } from "@/lib/llm";

import {
  EvaluationResult,
  HumanEvaluationState,
  PersonaData,
  ScenarioData,
  createInitialHumanState,
} from "./types";

interface UseHumanEvaluationArgs {
  personas: PersonaData[];
  scenario: ScenarioData;
  onComplete: (results: EvaluationResult[]) => void;
}

export const useHumanEvaluation = ({ personas, scenario, onComplete }: UseHumanEvaluationArgs) => {
  const [state, setState] = useState<HumanEvaluationState>(createInitialHumanState());

  useEffect(() => {
    setState(createInitialHumanState());
  }, [personas.length]);

  const startEvaluation = useCallback(async () => {
    if (personas.length === 0) {
      toast.error("No personas selected for evaluation.");
      return;
    }

    const totalEvaluations = Math.floor((personas.length * (personas.length - 1)) / 2);

    setState({
      phase: "collecting_responses",
      responsesCollected: 0,
      evaluationsCompleted: 0,
      totalEvaluations,
      results: [],
    });

    const personaResponses: Array<{ persona: PersonaData; response: string }> = [];

    for (let index = 0; index < personas.length; index += 1) {
      const persona = personas[index];

      setState((prev) => ({
        ...prev,
        responsesCollected: index + 1,
      }));

      const personaPrompt = llmPrompt`
        You are evaluating an AI persona defined by this markdown:
        ${persona.markdown}

        Please respond to this scenario as this persona would:
        Scenario: ${scenario.name}
        Instructions: ${scenario.instructions}

        Respond in character, maintaining the persona's behavioral patterns and characteristics.
      `;

      const personaResponse = await llm(personaPrompt);
      personaResponses.push({ persona, response: personaResponse });

      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    setState((prev) => ({
      ...prev,
      phase: "human_evaluation",
      currentComparison: undefined,
    }));

    const results: EvaluationResult[] = [];

    for (const { persona, response } of personaResponses) {
      const scores: Record<string, number> = {};
      let totalWeight = 0;
      let weightedScore = 0;

      for (const criterion of scenario.evaluationCriteria) {
        if (criterion.type === "human" || criterion.type === "both") {
          const score = Math.random() * 0.6 + 0.2;
          scores[criterion.id] = score;
          weightedScore += score * criterion.weight;
          totalWeight += criterion.weight;
        }
      }

      const overallScore = totalWeight > 0 ? weightedScore / totalWeight : 0;

      results.push({
        personaId: persona.id,
        scenarioId: scenario.id,
        type: "human",
        scores,
        overallScore,
        timestamp: new Date().toISOString(),
        response,
        humanEvaluatorId: "simulated-evaluator",
      });
    }

    setState((prev) => ({
      ...prev,
      phase: "complete",
      evaluationsCompleted: prev.totalEvaluations,
      results,
    }));

    toast.success("Human evaluation complete!");
    onComplete(results);
  }, [personas, scenario, onComplete]);

  return {
    state,
    startEvaluation,
  };
};
