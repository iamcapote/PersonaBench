import type { EvaluationCriterion } from "./types"

export const SCENARIO_DOMAINS = [
  "games",
  "social",
  "web",
  "text",
  "reasoning",
  "creative",
  "technical",
] as const

export const SCENARIO_DIFFICULTIES = ["easy", "medium", "hard"] as const

export const DEFAULT_EVALUATION_CRITERIA: EvaluationCriterion[] = [
  {
    id: "effectiveness",
    name: "Task Effectiveness",
    description: "How well did the persona complete the main objective?",
    weight: 0.3,
    type: "both",
  },
  {
    id: "consistency",
    name: "Behavioral Consistency",
    description: "Did the persona maintain consistent character throughout?",
    weight: 0.2,
    type: "human",
  },
  {
    id: "efficiency",
    name: "Efficiency",
    description: "How efficiently did the persona use time and resources?",
    weight: 0.2,
    type: "algorithmic",
  },
  {
    id: "creativity",
    name: "Creative Problem Solving",
    description: "Did the persona demonstrate creative or innovative approaches?",
    weight: 0.15,
    type: "human",
  },
  {
    id: "adherence",
    name: "Constraint Adherence",
    description: "How well did the persona follow given constraints and rules?",
    weight: 0.15,
    type: "algorithmic",
  },
]
