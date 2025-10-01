import { Plus, X } from "@phosphor-icons/react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

import { SCENARIO_DIFFICULTIES, SCENARIO_DOMAINS } from "./constants"
import type { ScenarioBuilderFormState } from "./types"

interface ScenarioBasicsFormProps {
  formData: ScenarioBuilderFormState
  updateField: <K extends keyof ScenarioBuilderFormState>(field: K, value: ScenarioBuilderFormState[K]) => void
  newTag: string
  setNewTag: (value: string) => void
  addTag: () => void
  removeTag: (tag: string) => void
}

export function ScenarioBasicsForm({
  formData,
  updateField,
  newTag,
  setNewTag,
  addTag,
  removeTag,
}: ScenarioBasicsFormProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Scenario Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(event) => updateField("name", event.target.value)}
            placeholder="e.g., Multi-Agent Negotiation"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="domain">Domain</Label>
          <Select
            value={formData.domain}
            onValueChange={(value) => updateField("domain", value as ScenarioBuilderFormState["domain"])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCENARIO_DOMAINS.map((domain) => (
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
            onValueChange={(value) => updateField("difficulty", value as ScenarioBuilderFormState["difficulty"])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCENARIO_DIFFICULTIES.map((difficulty) => (
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
            onChange={(event) => updateField("estimatedTime", Number(event.target.value))}
            min={1}
            max={120}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(event) => updateField("description", event.target.value)}
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
            onChange={(event) => setNewTag(event.target.value)}
            placeholder="Add a tag..."
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                addTag()
              }
            }}
          />
          <Button type="button" onClick={addTag} size="sm">
            <Plus size={16} />
          </Button>
        </div>
      </div>
    </div>
  )
}
