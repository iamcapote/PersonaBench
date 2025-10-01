import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { PersonaCard } from "@/components/PersonaCard"
import { PersonaEditor } from "@/components/PersonaEditor"
import { PersonaTransparencyPanel } from "@/components/PersonaTransparencyPanel"
import type { PersonaData } from "@/lib/appTypes"
import type { SavePersonaPayload, SavePersonaResult } from "@/components/app/hooks/usePersonaCatalog"
import { Plus, FileText } from "@phosphor-icons/react"

interface PersonaWorkspaceProps {
  personas: PersonaData[]
  isSyncing: boolean
  loadError: string | null
  onSavePersona: (payload: SavePersonaPayload) => Promise<SavePersonaResult>
  onRunEvaluation: (personaId: string) => void
}

export function PersonaWorkspace({ personas, isSyncing, loadError, onSavePersona, onRunEvaluation }: PersonaWorkspaceProps) {
  const [showPersonaEditor, setShowPersonaEditor] = useState(false)
  const [editingPersona, setEditingPersona] = useState<PersonaData | null>(null)
  const [inspectingPersona, setInspectingPersona] = useState<PersonaData | null>(null)

  useEffect(() => {
    if (!inspectingPersona) {
      return
    }
    const refreshed = personas.find((persona) => persona.id === inspectingPersona.id)
    if (!refreshed) {
      setInspectingPersona(null)
      return
    }
    if (refreshed !== inspectingPersona) {
      setInspectingPersona(refreshed)
    }
  }, [personas, inspectingPersona])

  const personaDescription = useMemo(() => {
    return personas.reduce<Record<string, string>>((acc, persona) => {
      acc[persona.id] =
        persona.markdown.split("\n").find((line) => line.startsWith("## "))?.replace("## ", "") ||
        persona.config.archetype ||
        "No description"
      return acc
    }, {})
  }, [personas])

  const handleSavePersona = async (personaPayload: Omit<PersonaData, "id">) => {
    try {
      const result = await onSavePersona({ personaPayload, editingPersona })
      setShowPersonaEditor(false)
      setEditingPersona(null)
      toast.success(result.isUpdate ? "Persona updated in catalog." : "Persona saved to catalog.")
    } catch (error) {
      console.error(error)
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to save persona via orchestration service. Please try again."
      )
    }
  }

  if (showPersonaEditor) {
    return (
      <PersonaEditor
        persona={editingPersona || undefined}
        onSave={handleSavePersona}
        onCancel={() => {
          setShowPersonaEditor(false)
          setEditingPersona(null)
        }}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">AI Personas</h2>
        <div className="flex items-center gap-3">
          {isSyncing && (
            <Badge variant="outline" className="text-xs">
              Syncing with service…
            </Badge>
          )}
          <Button
            onClick={() => {
              setEditingPersona(null)
              setShowPersonaEditor(true)
            }}
          >
            <Plus size={16} className="mr-2" />
            Create Persona
          </Button>
        </div>
      </div>

      {loadError && (
        <Card>
          <CardContent className="py-4 text-sm text-muted-foreground">{loadError}</CardContent>
        </Card>
      )}

      {personas.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText size={48} className="mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No personas yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first AI persona using markdown to begin benchmarking
            </p>
            <Button
              onClick={() => {
                setEditingPersona(null)
                setShowPersonaEditor(true)
              }}
            >
              <Plus size={16} className="mr-2" />
              Create Persona
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {personas.map((persona) => (
            <PersonaCard
              key={persona.id}
              id={persona.id}
              name={persona.name}
              description={personaDescription[persona.id]}
              archetype={persona.config.archetype}
              riskTolerance={persona.config.riskTolerance}
              planningHorizon={persona.config.planningHorizon}
              lastScore={persona.lastScore}
              onRun={onRunEvaluation}
              onEdit={(personaId) => {
                const target = personas.find((entry) => entry.id === personaId)
                if (target) {
                  setEditingPersona(target)
                  setShowPersonaEditor(true)
                }
              }}
              onInspect={(personaId) => {
                const target = personas.find((entry) => entry.id === personaId)
                if (target) {
                  setInspectingPersona(target)
                }
              }}
            />
          ))}
        </div>
      )}

      {inspectingPersona && (
        <PersonaTransparencyPanel
          persona={{
            name: inspectingPersona.name,
            markdown: inspectingPersona.markdown,
            config: inspectingPersona.config,
            sourcePath: inspectingPersona.sourcePath,
            rawDefinition: inspectingPersona.rawDefinition,
          }}
          onClose={() => setInspectingPersona(null)}
        />
      )}
    </div>
  )
}
