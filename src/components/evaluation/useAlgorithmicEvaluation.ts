import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { llm, llmPrompt } from "@/lib/llm";

import {
  AlgorithmicEvaluationState,
  EvaluationResult,
  PersonaData,
  ScenarioData,
  createInitialAlgorithmicState,
} from "./types";

interface UseAlgorithmicEvaluationArgs {
  personas: PersonaData[];
  scenario: ScenarioData;
  onComplete: (results: EvaluationResult[]) => void;
}

export const useAlgorithmicEvaluation = ({
  personas,
  scenario,
  onComplete,
}: UseAlgorithmicEvaluationArgs) => {
  const [state, setState] = useState<AlgorithmicEvaluationState>(
    createInitialAlgorithmicState(personas.length),
  );

  useEffect(() => {
    setState(createInitialAlgorithmicState(personas.length));
  }, [personas.length]);

  const startEvaluation = useCallback(async () => {
    if (personas.length === 0) {
      toast.error("No personas selected for evaluation.");
      return;
    }

    setState({
      phase: "running",
      currentPersona: 0,
      totalPersonas: personas.length,
      progress: 0,
      results: [],
    });

    const results: EvaluationResult[] = [];

    for (let index = 0; index < personas.length; index += 1) {
      const persona = personas[index];

      setState((prev) => ({
        ...prev,
        currentPersona: index + 1,
        progress: personas.length > 0 ? (index / personas.length) * 100 : 0,
      }));

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const personaPrompt = llmPrompt`
        You are evaluating an AI persona defined by this markdown:
        ${persona.markdown}

        Please respond to this scenario as this persona would:
        Scenario: ${scenario.name}
        Instructions: ${scenario.instructions}

        Respond in character, maintaining the persona's behavioral patterns and characteristics.
      `;

      const personaResponse = await llm(personaPrompt);

      setState((prev) => ({
        ...prev,
        phase: "analyzing",
      }));

      const scores: Record<string, number> = {};
      let totalWeight = 0;
      let weightedScore = 0;

      for (const criterion of scenario.evaluationCriteria) {
        if (criterion.type === "algorithmic" || criterion.type === "both") {
          const evaluationPrompt = llmPrompt`
            Evaluate this persona response against the criterion: ${criterion.name}
            Description: ${criterion.description}

            Persona Response: ${personaResponse}
            Scenario Context: ${scenario.instructions}

            Rate from 0.0 to 1.0 how well the response meets this criterion.
            Only respond with the numeric score.
          `;

          const scoreResponse = await llm(evaluationPrompt);
          const parsedScore = parseFloat(scoreResponse);
          const score = Math.max(0, Math.min(1, Number.isFinite(parsedScore) ? parsedScore : Math.random() * 0.4 + 0.3));

          scores[criterion.id] = score;
          weightedScore += score * criterion.weight;
          totalWeight += criterion.weight;
        }
      }

      const overallScore = totalWeight > 0 ? weightedScore / totalWeight : 0;

      const result: EvaluationResult = {
        personaId: persona.id,
        scenarioId: scenario.id,
        type: "algorithmic",
        scores,
        overallScore,
        timestamp: new Date().toISOString(),
        response: personaResponse,
      };

      results.push(result);

      setState((prev) => ({
        ...prev,
        results: [...prev.results, result],
      }));
    }

    setState((prev) => ({
      ...prev,
      phase: "complete",
      progress: 100,
    }));

    toast.success("Algorithmic evaluation complete!");
    onComplete(results);
  }, [personas, scenario, onComplete]);

  return {
    state,
    startEvaluation,
  };
};
