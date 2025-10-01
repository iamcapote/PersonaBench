import { Plus, Trash } from "@phosphor-icons/react"
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
}

export function ScenarioEvaluationForm({
  formData,
  updateCriterion,
  addCriterion,
  removeCriterion,
}: ScenarioEvaluationFormProps) {
  return (
    <div className="space-y-4">
      <Label>Evaluation Criteria</Label>
      {formData.evaluationCriteria.map((criterion, index) => (
        <Card key={criterion.id}>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>
            <div className="flex justify-end mt-4">
              <Button type="button" variant="outline" size="sm" onClick={() => removeCriterion(index)}>
                <Trash size={16} className="mr-2" />
                Remove
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
      <Button type="button" variant="outline" onClick={addCriterion}>
        <Plus size={16} className="mr-2" />
        Add Criterion
      </Button>
    </div>
  )
}
