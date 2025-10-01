import type { EvaluationMode } from "./types"

export const ALL_FILTER = "all" as const

export const formatPercentage = (value: number, digits = 0) => `${(value * 100).toFixed(digits)}%`

export const getDifficultyTone = (difficulty: string) => {
  switch (difficulty) {
    case "easy":
      return "bg-brand-emerald-200/40 text-brand-emerald-500 border-transparent"
    case "medium":
      return "bg-brand-amber-500/20 text-brand-amber-500 border-transparent"
    case "hard":
      return "bg-brand-rose-500/20 text-brand-rose-500 border-transparent"
    default:
      return "bg-muted text-ink-600"
  }
}

export const getScoreTone = (score: number) => {
  if (score >= 0.8) return "text-brand-emerald-500"
  if (score >= 0.6) return "text-brand-amber-500"
  return "text-brand-rose-500"
}

export const getComparisonTone = (diff: number) => {
  if (diff > 0.05) return "bg-brand-emerald-500/18 text-brand-emerald-600 border border-brand-emerald-200/60"
  if (diff > 0.015) return "bg-brand-emerald-200/40 text-brand-emerald-600 border border-transparent"
  if (diff < -0.05) return "bg-brand-rose-500/18 text-brand-rose-500 border border-transparent"
  if (diff < -0.015) return "bg-brand-rose-500/12 text-brand-rose-500 border border-transparent"
  return "bg-muted text-ink-600 border border-border"
}

export const isEvaluationMode = (value: string): value is EvaluationMode =>
  value === "algorithmic" || value === "human"
