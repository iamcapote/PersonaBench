export type EvaluationMode = "algorithmic" | "human"

export interface PersonaData {
  id: string
  name: string
  markdown: string
}

export interface ScenarioData {
  id: string
  name: string
  domain: string
  difficulty: string
}

export interface EvaluationResult {
  personaId: string
  scenarioId: string
  type: EvaluationMode
  scores: Record<string, number>
  overallScore: number
  timestamp: string
  response?: string
}

export interface PersonaAnalysis {
  personaId: string
  name: string
  averageScore: number
  bestScenario: string
  worstScenario: string
  algorithmicAverage: number
  humanAverage: number
  evaluationCount: number
  strengths: string[]
  weaknesses: string[]
  domainScores: Record<string, number>
}

export interface ScenarioAnalysis {
  scenarioId: string
  name: string
  difficulty: string
  domain: string
  averageScore: number
  bestPersona: string
  worstPersona: string
  participantCount: number
  algorithmicAverage: number
  humanAverage: number
}

export interface AnalyticsFilterState {
  personaId: string
  scenarioId: string
  evaluationType: "all" | EvaluationMode
}

export interface ComparisonMatrixCell {
  shared: number
  winRate: number
  averageDiff: number
}

export type ComparisonMatrix = Record<string, Record<string, ComparisonMatrixCell>>

export interface ComparisonHighlight {
  leader: string
  challenger: string
  diff: number
  winRate: number
  shared: number
}

export interface PersonaScenarioAverages {
  [personaId: string]: Record<string, number>
}

export interface OverviewMetric {
  label: string
  value: number
  icon: "trophy" | "users" | "robot" | "human"
}
