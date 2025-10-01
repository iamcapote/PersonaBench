import { Plus, Trash } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

import type { ScenarioBuilderFormState } from "./types"

interface ScenarioInstructionsFormProps {
  formData: ScenarioBuilderFormState
  updateField: <K extends keyof ScenarioBuilderFormState>(field: K, value: ScenarioBuilderFormState[K]) => void
  updateSetupStep: (index: number, value: string) => void
  addSetupStep: () => void
  removeSetupStep: (index: number) => void
  updateConstraint: (index: number, value: string) => void
  addConstraint: () => void
  removeConstraint: (index: number) => void
}

export function ScenarioInstructionsForm({
  formData,
  updateField,
  updateSetupStep,
  addSetupStep,
  removeSetupStep,
  updateConstraint,
  addConstraint,
  removeConstraint,
}: ScenarioInstructionsFormProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="instructions">Task Instructions</Label>
        <Textarea
          id="instructions"
          value={formData.instructions}
          onChange={(event) => updateField("instructions", event.target.value)}
          placeholder="Detailed instructions for the persona to follow..."
          rows={8}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="context">Context & Background</Label>
        <Textarea
          id="context"
          value={formData.context}
          onChange={(event) => updateField("context", event.target.value)}
          placeholder="Additional context that helps set the scene..."
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="outputFormat">Expected Output Format</Label>
        <Textarea
          id="outputFormat"
          value={formData.expectedOutputFormat}
          onChange={(event) => updateField("expectedOutputFormat", event.target.value)}
          placeholder="Describe the expected format of the persona's response..."
          rows={3}
        />
      </div>

      <div className="space-y-3">
        <Label>Setup Steps</Label>
        {formData.setupSteps.map((step, index) => (
          <div key={`setup-${index}`} className="flex gap-2">
            <Input
              value={step}
              onChange={(event) => updateSetupStep(index, event.target.value)}
              placeholder={`Step ${index + 1}...`}
            />
            <Button type="button" variant="outline" size="sm" onClick={() => removeSetupStep(index)}>
              <Trash size={16} />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" onClick={addSetupStep}>
          <Plus size={16} className="mr-2" />
          Add Setup Step
        </Button>
      </div>

      <div className="space-y-3">
        <Label>Constraints</Label>
        {formData.constraints.map((constraint, index) => (
          <div key={`constraint-${index}`} className="flex gap-2">
            <Input
              value={constraint}
              onChange={(event) => updateConstraint(index, event.target.value)}
              placeholder="Constraint or limitation..."
            />
            <Button type="button" variant="outline" size="sm" onClick={() => removeConstraint(index)}>
              <Trash size={16} />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" onClick={addConstraint}>
          <Plus size={16} className="mr-2" />
          Add Constraint
        </Button>
      </div>
    </div>
  )
}
