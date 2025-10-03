import { Button } from "@/components/ui/button"

interface ComparisonCohortFiltersProps {
  evaluationType: "all" | "algorithmic" | "human"
  onEvaluationTypeChange: (value: "all" | "algorithmic" | "human") => void
  selectedDifficulty: "all" | "easy" | "medium" | "hard"
  onDifficultyChange: (value: "all" | "easy" | "medium" | "hard") => void
}

const evaluationTypeItems: Array<{ value: "all" | "algorithmic" | "human"; label: string }> = [
  { value: "all", label: "All Evaluations" },
  { value: "algorithmic", label: "Algorithmic" },
  { value: "human", label: "Human" },
]

const difficultyItems: Array<{ value: "all" | "easy" | "medium" | "hard"; label: string }> = [
  { value: "all", label: "All Difficulty" },
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
]

export function ComparisonCohortFilters({ evaluationType, onEvaluationTypeChange, selectedDifficulty, onDifficultyChange }: ComparisonCohortFiltersProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card/40 p-3 shadow-inner">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">Evaluation mode</span>
        <div className="flex flex-wrap gap-2">
          {evaluationTypeItems.map((item) => (
            <Button
              key={item.value}
              size="sm"
              variant={item.value === evaluationType ? "default" : "outline"}
              className={`h-8 rounded-full px-3 text-xs ${item.value === evaluationType ? "shadow" : "bg-background/60"}`}
              onClick={() => onEvaluationTypeChange(item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">Scenario difficulty</span>
        <div className="flex flex-wrap gap-2">
          {difficultyItems.map((item) => (
            <Button
              key={item.value}
              size="sm"
              variant={item.value === selectedDifficulty ? "default" : "outline"}
              className={`h-8 rounded-full px-3 text-xs ${item.value === selectedDifficulty ? "shadow" : "bg-background/60"}`}
              onClick={() => onDifficultyChange(item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
