export type EvaluationMode = "algorithmic" | "human";

export interface PersonaData {
  id: string;
  name: string;
  markdown: string;
}

export interface EvaluationCriterion {
  id: string;
  name: string;
  description: string;
  weight: number;
  type: "algorithmic" | "human" | "both";
}

export interface ScenarioData {
  id: string;
  name: string;
  description: string;
  instructions: string;
  evaluationCriteria: EvaluationCriterion[];
}

export interface EvaluationResult {
  personaId: string;
  scenarioId: string;
  type: EvaluationMode;
  scores: Record<string, number>;
  overallScore: number;
  timestamp: string;
  response?: string;
  humanEvaluatorId?: string;
}

export interface AlgorithmicEvaluationState {
  phase: "setup" | "running" | "analyzing" | "complete";
  currentPersona: number;
  totalPersonas: number;
  progress: number;
  results: EvaluationResult[];
}

export interface HumanEvaluationState {
  phase: "setup" | "collecting_responses" | "human_evaluation" | "complete";
  responsesCollected: number;
  evaluationsCompleted: number;
  totalEvaluations: number;
  currentComparison?: {
    personaA: PersonaData;
    personaB: PersonaData;
    responseA: string;
    responseB: string;
  };
  results: EvaluationResult[];
}

export const createInitialAlgorithmicState = (totalPersonas: number): AlgorithmicEvaluationState => ({
  phase: "setup",
  currentPersona: 0,
  totalPersonas,
  progress: 0,
  results: [],
});

export const createInitialHumanState = (): HumanEvaluationState => ({
  phase: "setup",
  responsesCollected: 0,
  evaluationsCompleted: 0,
  totalEvaluations: 0,
  results: [],
});
