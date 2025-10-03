import { ArrowDown, ArrowUp, CopySimple, Plus, Trash } from "@phosphor-icons/react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

import type { EvaluationCriterion, ScenarioBuilderFormState } from "./types"

interface ScenarioEvaluationFormProps {
  formData: ScenarioBuilderFormState
  updateCriterion: (index: number, field: keyof EvaluationCriterion, value: unknown) => void
  addCriterion: () => void
  removeCriterion: (index: number) => void
  duplicateCriterion: (index: number) => void
  reorderCriterion: (fromIndex: number, toIndex: number) => void
}

export function ScenarioEvaluationForm({
  formData,
  updateCriterion,
  addCriterion,
  removeCriterion,
  duplicateCriterion,
  reorderCriterion,
}: ScenarioEvaluationFormProps) {
  const moveCriterion = (index: number, delta: number) => {
    const target = index + delta
    if (target < 0 || target >= formData.evaluationCriteria.length) {
      return
    }
    reorderCriterion(index, target)
  }

  return (
    <div className="space-y-4">
      <Label>Evaluation Criteria</Label>
      <div className="space-y-2">
        {formData.evaluationCriteria.length === 0 ? (
          <p className="text-sm italic text-muted-foreground">No evaluation criteria configured yet.</p>
        ) : null}
        {formData.evaluationCriteria.map((criterion, index) => (
          <Card key={criterion.id} className="border border-border bg-background">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded bg-muted text-xs font-medium text-muted-foreground">
                  {index + 1}
                </div>
                <div className="flex-1 space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Criterion Name</Label>
                      <Input
                        value={criterion.name}
                        onChange={(event) => updateCriterion(index, "name", event.target.value)}
                        placeholder="e.g., Task Effectiveness"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Weight (0-1)</Label>
                      <Input
                        type="number"
                        value={criterion.weight}
                        onChange={(event) => updateCriterion(index, "weight", event.target.value)}
                        min={0}
                        max={1}
                        step={0.05}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={criterion.description}
                      onChange={(event) => updateCriterion(index, "description", event.target.value)}
                      placeholder="What does this criterion measure?"
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Evaluation Type</Label>
                    <Select value={criterion.type} onValueChange={(value) => updateCriterion(index, "type", value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="algorithmic">Algorithmic Only</SelectItem>
                        <SelectItem value="human">Human Only</SelectItem>
                        <SelectItem value="both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => moveCriterion(index, -1)}
                        disabled={index === 0}
                        aria-label={`Move criterion ${index + 1} up`}
                      >
                        <ArrowUp size={16} />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => moveCriterion(index, 1)}
                        disabled={index === formData.evaluationCriteria.length - 1}
                        aria-label={`Move criterion ${index + 1} down`}
                      >
                        <ArrowDown size={16} />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => duplicateCriterion(index)}
                        aria-label={`Duplicate criterion ${index + 1}`}
                      >
                        <CopySimple size={16} />
                      </Button>
                    </div>
                    <Button type="button" variant="outline" size="icon" onClick={() => removeCriterion(index)} aria-label={`Remove criterion ${index + 1}`}>
                      <Trash size={16} />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Button type="button" variant="outline" onClick={addCriterion}>
        <Plus size={16} className="mr-2" />
        Add Criterion
      </Button>
    </div>
  )
}
