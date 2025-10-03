import { useState, type FormEvent } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CircleNotch, FloppyDisk, X } from "@phosphor-icons/react"

import {
  ScenarioAdvancedSettings,
  ScenarioBasicsForm,
  ScenarioEvaluationForm,
  ScenarioInstructionsForm,
  ScenarioPreviewPanel,
  useScenarioBuilderForm,
  type ScenarioBuilderProps,
} from "@/components/scenario"

export function ScenarioBuilder(props: ScenarioBuilderProps) {
  const [isSaving, setIsSaving] = useState(false)
  const {
    formData,
    activeTab,
    setActiveTab,
    newTag,
    setNewTag,
    addTag,
    removeTag,
    updateField,
    updateSetupStep,
    addSetupStep,
    removeSetupStep,
    duplicateSetupStep,
    reorderSetupSteps,
    updateConstraint,
    addConstraint,
    removeConstraint,
    duplicateConstraint,
    reorderConstraints,
    updateCriterion,
    addCriterion,
    removeCriterion,
    duplicateCriterion,
    reorderCriteria,
    previewJson,
    previewYaml,
    buildScenarioDraft,
  } = useScenarioBuilderForm(props)

  const canSave =
    formData.name.trim().length > 0 &&
    formData.description.trim().length > 0 &&
    formData.instructions.trim().length > 0

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSave || isSaving) {
      return
    }

    setIsSaving(true)
    try {
      await props.onSave(buildScenarioDraft())
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold">
            {props.scenario ? "Edit Scenario" : "Create New Scenario"}
          </CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6" aria-busy={isSaving}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="instructions">Instructions</TabsTrigger>
                <TabsTrigger value="evaluation">Evaluation</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <ScenarioBasicsForm
                  formData={formData}
                  updateField={updateField}
                  newTag={newTag}
                  setNewTag={setNewTag}
                  addTag={addTag}
                  removeTag={removeTag}
                />
              </TabsContent>

              <TabsContent value="instructions" className="space-y-4">
                <ScenarioInstructionsForm
                  formData={formData}
                  updateField={updateField}
                  updateSetupStep={updateSetupStep}
                  addSetupStep={addSetupStep}
                  removeSetupStep={removeSetupStep}
                  duplicateSetupStep={duplicateSetupStep}
                  reorderSetupStep={reorderSetupSteps}
                  updateConstraint={updateConstraint}
                  addConstraint={addConstraint}
                  removeConstraint={removeConstraint}
                  duplicateConstraint={duplicateConstraint}
                  reorderConstraint={reorderConstraints}
                />
              </TabsContent>

              <TabsContent value="evaluation" className="space-y-4">
                <ScenarioEvaluationForm
                  formData={formData}
                  updateCriterion={updateCriterion}
                  addCriterion={addCriterion}
                  removeCriterion={removeCriterion}
                  duplicateCriterion={duplicateCriterion}
                  reorderCriterion={reorderCriteria}
                />
              </TabsContent>

              <TabsContent value="advanced" className="space-y-4">
                <ScenarioAdvancedSettings />
              </TabsContent>

              <TabsContent value="preview" className="space-y-4">
                <ScenarioPreviewPanel previewJson={previewJson} previewYaml={previewYaml} />
              </TabsContent>
            </Tabs>

            <div className="flex gap-3 pt-6 border-t">
              <Button type="submit" className="flex-1" disabled={!canSave || isSaving}>
                {isSaving ? (
                  <CircleNotch size={16} className="mr-2 animate-spin" />
                ) : (
                  <FloppyDisk size={16} className="mr-2" />
                )}
                {isSaving ? "Saving…" : "Save Scenario"}
              </Button>
              <Button type="button" variant="outline" onClick={props.onCancel} disabled={isSaving}>
                <X size={16} className="mr-2" />
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}