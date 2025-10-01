import { useCallback, useMemo, useState, type FormEvent } from "react"
import { dump as yamlDump } from "js-yaml"

import { DEFAULT_EVALUATION_CRITERIA } from "./constants"
import type {
  EvaluationCriterion,
  ScenarioBuilderFormState,
  ScenarioBuilderHook,
  ScenarioBuilderProps,
} from "./types"

const normalizeWeight = (value: unknown) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

const slugifyIdentifier = (value: string, fallback: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || fallback

export function useScenarioBuilderForm({ scenario, onSave }: ScenarioBuilderProps): ScenarioBuilderHook {
  const [formData, setFormData] = useState<ScenarioBuilderFormState>({
    name: scenario?.name ?? "",
    description: scenario?.description ?? "",
    domain: scenario?.domain ?? "social",
    difficulty: scenario?.difficulty ?? "medium",
    estimatedTime: scenario?.estimatedTime ?? 10,
    instructions: scenario?.instructions ?? "",
    setupSteps: scenario?.setupSteps ?? [""],
    evaluationCriteria: scenario?.evaluationCriteria ?? DEFAULT_EVALUATION_CRITERIA,
    expectedOutputFormat: scenario?.expectedOutputFormat ?? "",
    context: scenario?.context ?? "",
    constraints: scenario?.constraints ?? [""],
    tags: scenario?.tags ?? [],
  })

  const [newTag, setNewTag] = useState("")
  const [activeTab, setActiveTab] = useState("basic")

  const cleanedSetupSteps = useMemo(
    () => formData.setupSteps.filter((step) => step.trim().length > 0),
    [formData.setupSteps],
  )

  const cleanedConstraints = useMemo(
    () => formData.constraints.filter((constraint) => constraint.trim().length > 0),
    [formData.constraints],
  )

  const cleanedCriteria = useMemo(
    () =>
      formData.evaluationCriteria
        .map<EvaluationCriterion>((criterion, index) => ({
          id: criterion.id || `criterion-${index + 1}`,
          name: criterion.name.trim(),
          description: criterion.description.trim(),
          weight: normalizeWeight(criterion.weight),
          type: criterion.type,
        }))
        .filter((criterion) => criterion.name.length > 0),
    [formData.evaluationCriteria],
  )

  const metadata = useMemo(() => {
    const base: Record<string, unknown> = {
      title: formData.name || "Untitled Scenario",
      description: formData.description,
      domain: formData.domain,
      difficulty: formData.difficulty,
      estimated_time: formData.estimatedTime,
      tags: formData.tags,
    }

    if (formData.expectedOutputFormat) {
      base.expected_output = formData.expectedOutputFormat
    }

    if (formData.context) {
      base.context = formData.context
    }

    return base
  }, [
    formData.context,
    formData.description,
    formData.difficulty,
    formData.domain,
    formData.estimatedTime,
    formData.expectedOutputFormat,
    formData.name,
    formData.tags,
  ])

  const previewDefinition = useMemo(() => {
    const scenarioId = slugifyIdentifier(formData.name || scenario?.name || "custom-scenario", "scenario")
    const baseDefinition: Record<string, unknown> = {
      id: scenario?.id ?? scenarioId,
      mode: "simulation",
      metadata,
      instructions: formData.instructions,
      setup_steps: cleanedSetupSteps,
      constraints: cleanedConstraints,
    }

    if (cleanedCriteria.length > 0) {
      baseDefinition.evaluation = { criteria: cleanedCriteria }
    }

    return baseDefinition
  }, [
    cleanedConstraints,
    cleanedCriteria,
    cleanedSetupSteps,
    formData.instructions,
    formData.name,
    metadata,
    scenario?.id,
    scenario?.name,
  ])

  const previewJson = useMemo(() => JSON.stringify(previewDefinition, null, 2), [previewDefinition])

  const previewYaml = useMemo(() => {
    try {
      return yamlDump(previewDefinition, { noRefs: true })
    } catch (error) {
      console.error(error)
      return "# Unable to render YAML preview"
    }
  }, [previewDefinition])

  const updateField = useCallback(<K extends keyof ScenarioBuilderFormState>(field: K, value: ScenarioBuilderFormState[K]) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }, [])

  const updateSetupStep = useCallback((index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      setupSteps: prev.setupSteps.map((step, i) => (i === index ? value : step)),
    }))
  }, [])

  const addSetupStep = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      setupSteps: [...prev.setupSteps, ""],
    }))
  }, [])

  const removeSetupStep = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      setupSteps: prev.setupSteps.filter((_, i) => i !== index),
    }))
  }, [])

  const updateConstraint = useCallback((index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      constraints: prev.constraints.map((constraint, i) => (i === index ? value : constraint)),
    }))
  }, [])

  const addConstraint = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      constraints: [...prev.constraints, ""],
    }))
  }, [])

  const removeConstraint = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      constraints: prev.constraints.filter((_, i) => i !== index),
    }))
  }, [])

  const updateCriterion = useCallback(
    (index: number, field: keyof EvaluationCriterion, value: unknown) => {
      setFormData((prev) => ({
        ...prev,
        evaluationCriteria: prev.evaluationCriteria.map((criterion, i) =>
          i === index
            ? {
                ...criterion,
                [field]: field === "weight" ? normalizeWeight(value) : value,
              }
            : criterion,
        ),
      }))
    },
    [],
  )

  const addCriterion = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      evaluationCriteria: [
        ...prev.evaluationCriteria,
        {
          id: `criterion-${Date.now()}`,
          name: "",
          description: "",
          weight: 0.1,
          type: "both",
        },
      ],
    }))
  }, [])

  const removeCriterion = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      evaluationCriteria: prev.evaluationCriteria.filter((_, i) => i !== index),
    }))
  }, [])

  const addTag = useCallback(() => {
    const trimmed = newTag.trim()
    if (!trimmed || formData.tags.includes(trimmed)) {
      return
    }

    setFormData((prev) => ({
      ...prev,
      tags: [...prev.tags, trimmed],
    }))
    setNewTag("")
  }, [formData.tags, newTag])

  const removeTag = useCallback((tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((entry) => entry !== tag),
    }))
  }, [])

  const handleSubmit = useCallback(
  (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (!formData.name || !formData.description || !formData.instructions) {
        return
      }

      const cleanedData: ScenarioBuilderFormState = {
        ...formData,
        setupSteps: cleanedSetupSteps,
        constraints: cleanedConstraints,
      }

      onSave(cleanedData)
    },
    [cleanedConstraints, cleanedSetupSteps, formData, onSave],
  )

  return {
    formData,
    newTag,
    setNewTag,
    activeTab,
    setActiveTab,
    handleSubmit,
    cleanedCriteria,
    cleanedConstraints,
    cleanedSetupSteps,
    previewJson,
    previewYaml,
    setFormData,
    updateField,
    updateSetupStep,
    addSetupStep,
    removeSetupStep,
    updateConstraint,
    addConstraint,
    removeConstraint,
    updateCriterion,
    addCriterion,
    removeCriterion,
    addTag,
    removeTag,
  }
}
