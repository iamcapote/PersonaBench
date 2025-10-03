import { ArrowDown, ArrowUp, CopySimple, Plus, Trash } from "@phosphor-icons/react"
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
  duplicateSetupStep: (index: number) => void
  reorderSetupStep: (fromIndex: number, toIndex: number) => void
  updateConstraint: (index: number, value: string) => void
  addConstraint: () => void
  removeConstraint: (index: number) => void
  duplicateConstraint: (index: number) => void
  reorderConstraint: (fromIndex: number, toIndex: number) => void
}

export function ScenarioInstructionsForm({
  formData,
  updateField,
  updateSetupStep,
  addSetupStep,
  removeSetupStep,
  duplicateSetupStep,
  reorderSetupStep,
  updateConstraint,
  addConstraint,
  removeConstraint,
  duplicateConstraint,
  reorderConstraint,
}: ScenarioInstructionsFormProps) {
  const moveSetupStep = (index: number, delta: number) => {
    const target = index + delta
    if (target < 0 || target >= formData.setupSteps.length) {
      return
    }
    reorderSetupStep(index, target)
  }

  const moveConstraint = (index: number, delta: number) => {
    const target = index + delta
    if (target < 0 || target >= formData.constraints.length) {
      return
    }
    reorderConstraint(index, target)
  }

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
        <div className="space-y-2">
          {formData.setupSteps.length === 0 ? (
            <p className="text-sm italic text-muted-foreground">No setup steps defined yet.</p>
          ) : null}
          {formData.setupSteps.map((step, index) => (
            <div key={`setup-${index}`} className="flex items-start gap-2 rounded border border-border bg-background p-3">
              <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded bg-muted text-xs font-medium text-muted-foreground">
                {index + 1}
              </div>
              <Input
                value={step}
                onChange={(event) => updateSetupStep(index, event.target.value)}
                placeholder={`Step ${index + 1}...`}
                className="flex-1"
              />
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => moveSetupStep(index, -1)}
                  disabled={index === 0}
                  aria-label={`Move setup step ${index + 1} up`}
                >
                  <ArrowUp size={16} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => moveSetupStep(index, 1)}
                  disabled={index === formData.setupSteps.length - 1}
                  aria-label={`Move setup step ${index + 1} down`}
                >
                  <ArrowDown size={16} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => duplicateSetupStep(index)}
                  aria-label={`Duplicate setup step ${index + 1}`}
                >
                  <CopySimple size={16} />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => removeSetupStep(index)}
                  aria-label={`Remove setup step ${index + 1}`}
                >
                  <Trash size={16} />
                </Button>
              </div>
            </div>
          ))}
        </div>
        <Button type="button" variant="outline" onClick={addSetupStep}>
          <Plus size={16} className="mr-2" />
          Add Setup Step
        </Button>
      </div>

      <div className="space-y-3">
        <Label>Constraints</Label>
        <div className="space-y-2">
          {formData.constraints.length === 0 ? (
            <p className="text-sm italic text-muted-foreground">No constraints captured yet.</p>
          ) : null}
          {formData.constraints.map((constraint, index) => (
            <div key={`constraint-${index}`} className="flex items-start gap-2 rounded border border-border bg-background p-3">
              <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded bg-muted text-xs font-medium text-muted-foreground">
                {index + 1}
              </div>
              <Input
                value={constraint}
                onChange={(event) => updateConstraint(index, event.target.value)}
                placeholder="Constraint or limitation..."
                className="flex-1"
              />
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => moveConstraint(index, -1)}
                  disabled={index === 0}
                  aria-label={`Move constraint ${index + 1} up`}
                >
                  <ArrowUp size={16} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => moveConstraint(index, 1)}
                  disabled={index === formData.constraints.length - 1}
                  aria-label={`Move constraint ${index + 1} down`}
                >
                  <ArrowDown size={16} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => duplicateConstraint(index)}
                  aria-label={`Duplicate constraint ${index + 1}`}
                >
                  <CopySimple size={16} />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => removeConstraint(index)}
                  aria-label={`Remove constraint ${index + 1}`}
                >
                  <Trash size={16} />
                </Button>
              </div>
            </div>
          ))}
        </div>
        <Button type="button" variant="outline" onClick={addConstraint}>
          <Plus size={16} className="mr-2" />
          Add Constraint
        </Button>
      </div>
    </div>
  )
}
