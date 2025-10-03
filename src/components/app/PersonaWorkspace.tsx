import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { PersonaCard } from "@/components/PersonaCard"
import { PersonaEditor } from "@/components/PersonaEditor"
import { PersonaTransparencyPanel } from "@/components/PersonaTransparencyPanel"
import type { PersonaData } from "@/lib/appTypes"
import type { SavePersonaPayload, SavePersonaResult } from "@/components/app/hooks/usePersonaCatalog"
import { slugifyIdentifier } from "@/lib/appTransformers"
import { buildPersonaDefinition, parsePersonaBundle, type PersonaImportResult, type RawPersonaDefinition } from "@/lib/personaIO"
import { downloadJsonFile } from "@/lib/utils"
import { useAdminAuth } from "@/components/app/providers/AdminAuthProvider"
import { Plus, FileText, UploadSimple, DownloadSimple, CircleNotch } from "@phosphor-icons/react"

interface PersonaWorkspaceProps {
  personas: PersonaData[]
  isSyncing: boolean
  loadError: string | null
  onSavePersona: (payload: SavePersonaPayload) => Promise<SavePersonaResult>
  onRunEvaluation: (personaId: string) => void
  onImportPersonas?: (definitions: RawPersonaDefinition[]) => Promise<PersonaImportResult>
}

export function PersonaWorkspace({ personas, isSyncing, loadError, onSavePersona, onRunEvaluation, onImportPersonas }: PersonaWorkspaceProps) {
  const [showPersonaEditor, setShowPersonaEditor] = useState(false)
  const [editingPersona, setEditingPersona] = useState<PersonaData | null>(null)
  const [personaEditorSeed, setPersonaEditorSeed] = useState<PersonaData | null>(null)
  const [inspectingPersona, setInspectingPersona] = useState<PersonaData | null>(null)
  const [pendingPersonaId, setPendingPersonaId] = useState<string | null>(null)
  const [isSavingPersona, setIsSavingPersona] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const personaFileInputRef = useRef<HTMLInputElement>(null)
  const exportTimestamp = useMemo(() => new Date().toISOString().replace(/[:.]/g, "-"), [])
  const { hasAdminAccess } = useAdminAuth()

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
    const personaId = editingPersona?.id ?? slugifyIdentifier(personaPayload.name, "persona")
    setPendingPersonaId(personaId)
    setIsSavingPersona(true)

    try {
      const result = await toast.promise(
        onSavePersona({ personaPayload, editingPersona }),
        {
          loading: editingPersona ? "Updating persona…" : "Saving persona…",
          success: (operationResult) =>
            operationResult.isUpdate ? "Persona updated in catalog." : "Persona saved to catalog.",
          error: (error) =>
            error instanceof Error
              ? error.message
              : "Failed to save persona via orchestration service. Please try again.",
        }
      )

      if (result) {
        setShowPersonaEditor(false)
        setEditingPersona(null)
        setPersonaEditorSeed(null)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setIsSavingPersona(false)
      setPendingPersonaId(null)
    }
  }

  const handleExportPersonas = useCallback(() => {
    if (personas.length === 0) {
      toast.info("No personas available to export yet.")
      return
    }

    const payload = {
      generated_at: new Date().toISOString(),
      personas: personas.map((persona) => buildPersonaDefinition(persona)),
    }

    downloadJsonFile(`personas-export-${exportTimestamp}.json`, payload)
    toast.success(`Exported ${personas.length} persona${personas.length === 1 ? "" : "s"}.`)
  }, [exportTimestamp, personas])

  const openPersonaImport = useCallback(() => {
    if (!onImportPersonas) {
      toast.error("Persona import is not available in this build.")
      return
    }

    if (!hasAdminAccess) {
      toast.warning("Set the admin key to import personas via the orchestration service.")
      return
    }

    personaFileInputRef.current?.click()
  }, [hasAdminAccess, onImportPersonas])

  const handlePersonaFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) {
        return
      }

      event.target.value = ""

      if (!onImportPersonas) {
        toast.error("Persona import is not available in this build.")
        return
      }

      if (!hasAdminAccess) {
        toast.warning("Set the admin key to import personas via the orchestration service.")
        return
      }

      setIsImporting(true)
      try {
        const text = await file.text()
        const parsed = JSON.parse(text)
        const definitions = parsePersonaBundle(parsed)

        if (definitions.length === 0) {
          toast.warning("No persona definitions found in the selected file.")
          return
        }

        const importResult = (await toast.promise(onImportPersonas(definitions), {
          loading: "Importing personas…",
          success: (result) => {
            if (result.created === 0 && result.updated === 0) {
              return "No personas were imported."
            }
            const summary: string[] = []
            if (result.created > 0) summary.push(`${result.created} created`)
            if (result.updated > 0) summary.push(`${result.updated} updated`)
            return `Personas imported (${summary.join(", ")}).`
          },
          error: (error) =>
            error instanceof Error ? error.message : "Unable to import personas from file.",
        })) as unknown as PersonaImportResult

        if (importResult.errors.length > 0) {
          toast.warning(
            `${importResult.errors.length} persona${importResult.errors.length === 1 ? "" : "s"} failed. Check console for details.`
          )
          importResult.errors.forEach((message: string) => console.warn(`[persona import] ${message}`))
        }
      } catch (error) {
        console.error(error)
        toast.error(error instanceof Error ? error.message : "Unable to import personas from file.")
      } finally {
        setIsImporting(false)
      }
    },
    [hasAdminAccess, onImportPersonas]
  )

  if (showPersonaEditor) {
    return (
      <PersonaEditor
        persona={editingPersona || undefined}
        seedPersona={personaEditorSeed || undefined}
        onSave={handleSavePersona}
        onCancel={() => {
          setShowPersonaEditor(false)
          setEditingPersona(null)
          setPersonaEditorSeed(null)
        }}
        isSaving={isSavingPersona}
      />
    )
  }

  return (
    <div className="space-y-6">
      <input
        ref={personaFileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={handlePersonaFileChange}
      />
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">AI Personas</h2>
        <div className="flex items-center gap-3">
          {isSyncing && (
            <Badge variant="outline" className="text-xs">
              Syncing with service…
            </Badge>
          )}
          {pendingPersonaId && (
            <Badge variant="outline" className="flex items-center gap-1 text-xs">
              <CircleNotch size={12} className="animate-spin" />
              Saving changes…
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleExportPersonas}
            disabled={personas.length === 0}
          >
            <DownloadSimple size={16} />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={openPersonaImport}
            disabled={isImporting || !onImportPersonas}
            title={!onImportPersonas ? "Persona import is not available in this build." : undefined}
          >
            {isImporting ? <CircleNotch size={16} className="animate-spin" /> : <UploadSimple size={16} />}
            {isImporting ? "Importing…" : "Import"}
          </Button>
          <Button
            onClick={() => {
              setEditingPersona(null)
              setPersonaEditorSeed(null)
              setShowPersonaEditor(true)
            }}
            disabled={isSavingPersona}
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
                setPersonaEditorSeed(null)
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
              isSaving={pendingPersonaId === persona.id && isSavingPersona}
              onRun={onRunEvaluation}
              onEdit={(personaId) => {
                const target = personas.find((entry) => entry.id === personaId)
                if (target) {
                  setEditingPersona(target)
                  setPersonaEditorSeed(target)
                  setShowPersonaEditor(true)
                }
              }}
              onDuplicate={(personaId) => {
                const target = personas.find((entry) => entry.id === personaId)
                if (target) {
                  const duplicateSeed: PersonaData = {
                    ...target,
                    id: `${target.id}-copy`,
                    name: `${target.name} Copy`,
                    config: { ...target.config },
                    markdown: target.markdown,
                    source: target.source ?? "local",
                    sourcePath: target.sourcePath,
                    rawDefinition: target.rawDefinition ? { ...target.rawDefinition } : undefined,
                  }
                  setEditingPersona(null)
                  setPersonaEditorSeed(duplicateSeed)
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
