import type { Dispatch, FormEvent, SetStateAction } from "react"

type ScenarioDomain = "games" | "social" | "web" | "text" | "reasoning" | "creative" | "technical"
type ScenarioDifficulty = "easy" | "medium" | "hard"
export type EvaluationMode = "algorithmic" | "human" | "both"

export interface EvaluationCriterion {
  id: string
  name: string
  description: string
  weight: number
  type: EvaluationMode
}

export interface ScenarioData {
  id: string
  name: string
  description: string
  domain: ScenarioDomain
  difficulty: ScenarioDifficulty
  estimatedTime: number
  instructions: string
  setupSteps: string[]
  evaluationCriteria: EvaluationCriterion[]
  expectedOutputFormat: string
  context: string
  constraints: string[]
  tags: string[]
}

export type ScenarioDraft = Omit<ScenarioData, "id">

export interface ScenarioBuilderProps {
  scenario?: ScenarioData
  onSave: (scenario: ScenarioDraft) => void
  onCancel: () => void
}

export interface ScenarioBuilderFormState extends ScenarioDraft {}

export interface ScenarioBuilderFormHandlers {
  setFormData: Dispatch<SetStateAction<ScenarioBuilderFormState>>
  updateField: <K extends keyof ScenarioBuilderFormState>(field: K, value: ScenarioBuilderFormState[K]) => void
  updateSetupStep: (index: number, value: string) => void
  addSetupStep: () => void
  removeSetupStep: (index: number) => void
  updateConstraint: (index: number, value: string) => void
  addConstraint: () => void
  removeConstraint: (index: number) => void
  updateCriterion: (index: number, field: keyof EvaluationCriterion, value: unknown) => void
  addCriterion: () => void
  removeCriterion: (index: number) => void
  addTag: () => void
  removeTag: (tag: string) => void
}

export interface ScenarioBuilderDerivedContent {
  previewJson: string
  previewYaml: string
  cleanedCriteria: EvaluationCriterion[]
  cleanedConstraints: string[]
  cleanedSetupSteps: string[]
}

export interface ScenarioBuilderHook extends ScenarioBuilderFormHandlers, ScenarioBuilderDerivedContent {
  formData: ScenarioBuilderFormState
  newTag: string
  setNewTag: Dispatch<SetStateAction<string>>
  activeTab: string
  setActiveTab: Dispatch<SetStateAction<string>>
  handleSubmit: (event: FormEvent<HTMLFormElement>) => void
}
