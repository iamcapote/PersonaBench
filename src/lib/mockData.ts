import { samplePersonas } from "@/samplePersonas"
import type { PersonaData, ScenarioData } from "@/lib/appTypes"

export const localPersonaFallback: PersonaData[] = (samplePersonas as PersonaData[]).map((persona) => ({
  ...persona,
  source: "local" as const,
}))

export const mockScenarios: ScenarioData[] = [
  {
    id: "poker-001",
    name: "High-Stakes Poker",
    kind: "scenario",
    description: "Navigate a complex no-limit Texas Hold'em scenario with incomplete information",
    domain: "games",
    environment: "custom-games",
    difficulty: "hard",
    estimatedTime: 15,
    instructions: "You are playing in a high-stakes poker tournament. Make strategic decisions based on your hand, position, and read of other players.",
    setupSteps: ["Shuffle deck", "Deal initial hands", "Set blinds"],
    evaluationCriteria: [
      {
        id: "strategy",
        name: "Strategic Thinking",
        description: "Quality of strategic decisions",
        weight: 0.4,
        type: "both",
      },
      {
        id: "risk_management",
        name: "Risk Management",
        description: "Appropriate risk assessment",
        weight: 0.3,
        type: "algorithmic",
      },
      {
        id: "adaptability",
        name: "Adaptability",
        description: "Ability to adapt to changing situations",
        weight: 0.3,
        type: "human",
      },
    ],
    expectedOutputFormat: "Detailed decision rationale with betting actions",
    context: "Tournament setting with experienced players",
    constraints: ["Must follow poker rules", "Cannot see other players cards"],
    tags: ["strategy", "incomplete-information", "risk-assessment"],
    source: "local",
  },
  {
    id: "negotiation-001",
    name: "Resource Allocation",
    kind: "scenario",
    description: "Negotiate fair distribution of limited resources among competing parties",
    domain: "social",
    environment: "custom-social",
    difficulty: "medium",
    estimatedTime: 10,
    instructions: "You must negotiate the distribution of limited budget among 5 competing departments.",
    setupSteps: ["Review budget constraints", "Understand department needs"],
    evaluationCriteria: [
      {
        id: "fairness",
        name: "Fairness",
        description: "Equitable distribution approach",
        weight: 0.3,
        type: "human",
      },
      {
        id: "efficiency",
        name: "Efficiency",
        description: "Optimal resource utilization",
        weight: 0.4,
        type: "algorithmic",
      },
      {
        id: "diplomacy",
        name: "Diplomatic Skill",
        description: "Maintaining good relationships",
        weight: 0.3,
        type: "human",
      },
    ],
    expectedOutputFormat: "Allocation proposal with justification",
    context: "Corporate environment with tight budgets",
    constraints: ["Cannot exceed total budget", "All departments must receive something"],
    tags: ["negotiation", "resource-management", "diplomacy"],
    source: "local",
  },
]
