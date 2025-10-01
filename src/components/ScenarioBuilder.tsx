import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FloppyDisk, X, Plus, Trash } from "@phosphor-icons/react"
import { dump as yamlDump } from "js-yaml"

interface EvaluationCriterion {
  id: string
  name: string
  description: string
  weight: number
  type: 'algorithmic' | 'human' | 'both'
}

interface ScenarioData {
  id: string
  name: string
  description: string
  domain: 'games' | 'social' | 'web' | 'text' | 'reasoning' | 'creative' | 'technical'
  difficulty: 'easy' | 'medium' | 'hard'
  estimatedTime: number
  instructions: string
  setupSteps: string[]
  evaluationCriteria: EvaluationCriterion[]
  expectedOutputFormat: string
  context: string
  constraints: string[]
  tags: string[]
}

interface ScenarioBuilderProps {
  scenario?: ScenarioData
  onSave: (scenario: Omit<ScenarioData, 'id'>) => void
  onCancel: () => void
}

const domains = [
  'games',
  'social', 
  'web',
  'text',
  'reasoning',
  'creative',
  'technical'
]

const difficulties = ['easy', 'medium', 'hard']

const defaultCriteria: EvaluationCriterion[] = [
  {
    id: 'effectiveness',
    name: 'Task Effectiveness',
    description: 'How well did the persona complete the main objective?',
    weight: 0.3,
    type: 'both'
  },
  {
    id: 'consistency',
    name: 'Behavioral Consistency',
    description: 'Did the persona maintain consistent character throughout?',
    weight: 0.2,
    type: 'human'
  },
  {
    id: 'efficiency',
    name: 'Efficiency',
    description: 'How efficiently did the persona use time and resources?',
    weight: 0.2,
    type: 'algorithmic'
  },
  {
    id: 'creativity',
    name: 'Creative Problem Solving',
    description: 'Did the persona demonstrate creative or innovative approaches?',
    weight: 0.15,
    type: 'human'
  },
  {
    id: 'adherence',
    name: 'Constraint Adherence',
    description: 'How well did the persona follow given constraints and rules?',
    weight: 0.15,
    type: 'algorithmic'
  }
]

export function ScenarioBuilder({ scenario, onSave, onCancel }: ScenarioBuilderProps) {
  const [formData, setFormData] = useState<Omit<ScenarioData, 'id'>>({
    name: scenario?.name || "",
    description: scenario?.description || "",
    domain: scenario?.domain || 'social',
    difficulty: scenario?.difficulty || 'medium',
    estimatedTime: scenario?.estimatedTime || 10,
    instructions: scenario?.instructions || "",
    setupSteps: scenario?.setupSteps || [""],
    evaluationCriteria: scenario?.evaluationCriteria || defaultCriteria,
    expectedOutputFormat: scenario?.expectedOutputFormat || "",
    context: scenario?.context || "",
    constraints: scenario?.constraints || [""],
    tags: scenario?.tags || []
  })

  const [newTag, setNewTag] = useState("")
  const [activeTab, setActiveTab] = useState("basic")

  const slugifyIdentifier = (value: string, fallback: string) => {
    const normalized = value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
    return normalized.length > 0 ? normalized : fallback
  }

  const cleanedContent = useMemo(() => {
    const setupSteps = formData.setupSteps.filter((step) => step.trim() !== "")
    const constraints = formData.constraints.filter((entry) => entry.trim() !== "")
    const criteria = formData.evaluationCriteria
      .map((criterion, index) => ({
        id: criterion.id || `criterion-${index + 1}`,
        name: criterion.name.trim(),
        description: criterion.description.trim(),
        weight: Number.isFinite(criterion.weight) ? Number(criterion.weight) : 0,
        type: criterion.type,
      }))
      .filter((criterion) => criterion.name.length > 0)

    const metadata: Record<string, unknown> = {
      title: formData.name || "Untitled Scenario",
      description: formData.description,
      domain: formData.domain,
      difficulty: formData.difficulty,
      estimated_time: formData.estimatedTime,
      tags: formData.tags,
    }

    if (formData.expectedOutputFormat) {
      metadata.expected_output = formData.expectedOutputFormat
    }

    if (formData.context) {
      metadata.context = formData.context
    }

    return {
      setupSteps,
      constraints,
      criteria,
      metadata,
    }
  }, [formData])

  const previewDefinition = useMemo(() => {
    const scenarioId = slugifyIdentifier(formData.name || scenario?.name || "custom-scenario", "scenario")
    const evaluationBlock = cleanedContent.criteria.length > 0 ? { criteria: cleanedContent.criteria } : undefined

    const baseDefinition: Record<string, unknown> = {
      id: scenario?.id ?? scenarioId,
      mode: "simulation",
      metadata: cleanedContent.metadata,
      instructions: formData.instructions,
      setup_steps: cleanedContent.setupSteps,
      constraints: cleanedContent.constraints,
    }

    if (evaluationBlock) {
      baseDefinition.evaluation = evaluationBlock
    }

    return baseDefinition
  }, [cleanedContent, formData.instructions, formData.name, scenario?.id, scenario?.name])

  const previewJson = useMemo(() => JSON.stringify(previewDefinition, null, 2), [previewDefinition])

  const previewYaml = useMemo(() => {
    try {
      return yamlDump(previewDefinition, { noRefs: true })
    } catch (error) {
      console.error(error)
      return "# Unable to render YAML preview"
    }
  }, [previewDefinition])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.name && formData.description && formData.instructions) {
      const cleanedData = {
        ...formData,
        setupSteps: formData.setupSteps.filter(step => step.trim() !== ""),
        constraints: formData.constraints.filter(constraint => constraint.trim() !== "")
      }
      onSave(cleanedData)
    }
  }

  const addSetupStep = () => {
    setFormData(prev => ({
      ...prev,
      setupSteps: [...prev.setupSteps, ""]
    }))
  }

  const updateSetupStep = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      setupSteps: prev.setupSteps.map((step, i) => i === index ? value : step)
    }))
  }

  const removeSetupStep = (index: number) => {
    setFormData(prev => ({
      ...prev,
      setupSteps: prev.setupSteps.filter((_, i) => i !== index)
    }))
  }

  const addConstraint = () => {
    setFormData(prev => ({
      ...prev,
      constraints: [...prev.constraints, ""]
    }))
  }

  const updateConstraint = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      constraints: prev.constraints.map((constraint, i) => i === index ? value : constraint)
    }))
  }

  const removeConstraint = (index: number) => {
    setFormData(prev => ({
      ...prev,
      constraints: prev.constraints.filter((_, i) => i !== index)
    }))
  }

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }))
      setNewTag("")
    }
  }

  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }))
  }

  const updateCriterion = (index: number, field: keyof EvaluationCriterion, value: any) => {
    setFormData(prev => ({
      ...prev,
      evaluationCriteria: prev.evaluationCriteria.map((criterion, i) => 
        i === index ? { ...criterion, [field]: value } : criterion
      )
    }))
  }

  const addCriterion = () => {
    const newCriterion: EvaluationCriterion = {
      id: `criterion-${Date.now()}`,
      name: "",
      description: "",
      weight: 0.1,
      type: 'both'
    }
    setFormData(prev => ({
      ...prev,
      evaluationCriteria: [...prev.evaluationCriteria, newCriterion]
    }))
  }

  const removeCriterion = (index: number) => {
    setFormData(prev => ({
      ...prev,
      evaluationCriteria: prev.evaluationCriteria.filter((_, i) => i !== index)
    }))
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold">
            {scenario ? 'Edit Scenario' : 'Create New Scenario'}
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="instructions">Instructions</TabsTrigger>
                <TabsTrigger value="evaluation">Evaluation</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Scenario Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Multi-Agent Negotiation"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="domain">Domain</Label>
                    <Select
                      value={formData.domain}
                      onValueChange={(value: any) => setFormData(prev => ({ ...prev, domain: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {domains.map((domain) => (
                          <SelectItem key={domain} value={domain}>
                            {domain.charAt(0).toUpperCase() + domain.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="difficulty">Difficulty</Label>
                    <Select
                      value={formData.difficulty}
                      onValueChange={(value: any) => setFormData(prev => ({ ...prev, difficulty: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {difficulties.map((difficulty) => (
                          <SelectItem key={difficulty} value={difficulty}>
                            {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="time">Estimated Time (minutes)</Label>
                    <Input
                      id="time"
                      type="number"
                      value={formData.estimatedTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, estimatedTime: parseInt(e.target.value) }))}
                      min="1"
                      max="120"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief overview of what this scenario tests..."
                    rows={3}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tags</Label>
                  <div className="flex gap-2 flex-wrap mb-2">
                    {formData.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                        {tag} <X size={12} className="ml-1" />
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Add a tag..."
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    />
                    <Button type="button" onClick={addTag} size="sm">
                      <Plus size={16} />
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="instructions" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="instructions">Task Instructions</Label>
                  <Textarea
                    id="instructions"
                    value={formData.instructions}
                    onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
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
                    onChange={(e) => setFormData(prev => ({ ...prev, context: e.target.value }))}
                    placeholder="Additional context that helps set the scene..."
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="outputFormat">Expected Output Format</Label>
                  <Textarea
                    id="outputFormat"
                    value={formData.expectedOutputFormat}
                    onChange={(e) => setFormData(prev => ({ ...prev, expectedOutputFormat: e.target.value }))}
                    placeholder="Describe the expected format of the persona's response..."
                    rows={3}
                  />
                </div>

                <div className="space-y-3">
                  <Label>Setup Steps</Label>
                  {formData.setupSteps.map((step, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={step}
                        onChange={(e) => updateSetupStep(index, e.target.value)}
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
                    <div key={index} className="flex gap-2">
                      <Input
                        value={constraint}
                        onChange={(e) => updateConstraint(index, e.target.value)}
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
              </TabsContent>

              <TabsContent value="evaluation" className="space-y-4">
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
                              onChange={(e) => updateCriterion(index, 'name', e.target.value)}
                              placeholder="e.g., Task Effectiveness"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Weight (0-1)</Label>
                            <Input
                              type="number"
                              value={criterion.weight}
                              onChange={(e) => updateCriterion(index, 'weight', parseFloat(e.target.value))}
                              min="0"
                              max="1"
                              step="0.05"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea
                              value={criterion.description}
                              onChange={(e) => updateCriterion(index, 'description', e.target.value)}
                              placeholder="What does this criterion measure?"
                              rows={2}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Evaluation Type</Label>
                            <Select
                              value={criterion.type}
                              onValueChange={(value: any) => updateCriterion(index, 'type', value)}
                            >
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
              </TabsContent>

              <TabsContent value="advanced" className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <p>Advanced settings and scenario metadata will be available here.</p>
                  <p>This could include things like:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Random seed settings for reproducible tests</li>
                    <li>Advanced algorithmic evaluation parameters</li>
                    <li>Custom evaluation scripts</li>
                    <li>Integration settings for external tools</li>
                  </ul>
                </div>
              </TabsContent>

              <TabsContent value="preview" className="space-y-4">
                <div>
                  <Label>Scenario JSON Definition</Label>
                  <Card className="border-dashed">
                    <CardContent className="py-4">
                      <pre className="max-h-72 overflow-auto rounded bg-muted p-4 text-xs leading-relaxed">
{previewJson}
                      </pre>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <Label>Scenario YAML Definition</Label>
                  <Card className="border-dashed">
                    <CardContent className="py-4">
                      <pre className="max-h-72 overflow-auto rounded bg-muted p-4 text-xs leading-relaxed">
{previewYaml}
                      </pre>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex gap-3 pt-6 border-t">
              <Button type="submit" className="flex-1">
                <FloppyDisk size={16} className="mr-2" />
                Save Scenario
              </Button>
              <Button type="button" variant="outline" onClick={onCancel}>
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