import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ScenarioSelector } from "@/components/ScenarioSelector"
import { ScenarioBuilder } from "@/components/ScenarioBuilder"
import { ScenarioTransparencyPanel } from "@/components/ScenarioTransparencyPanel"
import { GameTransparencyPanel } from "@/components/GameTransparencyPanel"
import type { GameAssetResponseApi, GameAssets, PersonaData, ScenarioData } from "@/lib/appTypes"
import type { SaveScenarioPayload, SaveScenarioResult } from "@/components/app/hooks/useScenarioLibrary"
import { normalizeGameAssetResponse } from "@/lib/appTransformers"
import { Play, Plus } from "@phosphor-icons/react"
import { useAdminAuth } from "@/components/app/providers/AdminAuthProvider"

interface ScenarioWorkbenchProps {
  personas: PersonaData[]
  scenarios: ScenarioData[]
  selectedScenario: string
  isSyncing: boolean
  loadError: string | null
  selectedPersonas: string[]
  onSelectScenario: (scenarioId: string) => void
  onSelectAllPersonas: (personaIds: string[]) => void
  onRunBulkEvaluation: () => void
  onSaveScenario: (payload: SaveScenarioPayload) => Promise<SaveScenarioResult>
}

export function ScenarioWorkbench({
  personas,
  scenarios,
  selectedScenario,
  isSyncing,
  loadError,
  selectedPersonas,
  onSelectScenario,
  onSelectAllPersonas,
  onRunBulkEvaluation,
  onSaveScenario,
}: ScenarioWorkbenchProps) {
  const [showScenarioBuilder, setShowScenarioBuilder] = useState(false)
  const [editingScenario, setEditingScenario] = useState<ScenarioData | null>(null)
  const [gameAssets, setGameAssets] = useState<Record<string, GameAssets>>({})
  const [assetLoading, setAssetLoading] = useState(false)
  const [assetError, setAssetError] = useState<string | null>(null)
  const { authorizedApiFetch } = useAdminAuth()

  const selectedScenarioData = useMemo(
    () => scenarios.find((scenario) => scenario.id === selectedScenario),
    [scenarios, selectedScenario]
  )

  useEffect(() => {
    if (!selectedScenarioData || selectedScenarioData.kind !== "game") {
      setAssetLoading(false)
      setAssetError(null)
      return
    }

    if (gameAssets[selectedScenarioData.id]) {
      setAssetLoading(false)
      return
    }

    let cancelled = false

    const fetchAssets = async () => {
      setAssetLoading(true)
      setAssetError(null)
      try {
  const response = await authorizedApiFetch(`/games/${selectedScenarioData.id}/assets`)
        if (!response.ok) throw new Error(`Failed to load game assets: ${response.status}`)
        const payload: GameAssetResponseApi = await response.json()
        if (!cancelled) {
          const normalized = normalizeGameAssetResponse(payload)
          setGameAssets((current) => ({ ...current, [selectedScenarioData.id]: normalized }))
        }
      } catch (error) {
        console.error(error)
        if (!cancelled) {
          setAssetError("Unable to load game transparency assets.")
          toast.error("Unable to load game transparency assets. Check the orchestration service logs.")
        }
      } finally {
        if (!cancelled) {
          setAssetLoading(false)
        }
      }
    }

    fetchAssets()

    return () => {
      cancelled = true
    }
  }, [authorizedApiFetch, gameAssets, selectedScenarioData])

  const handleEditScenario = (scenarioId: string) => {
    const scenario = scenarios.find((entry) => entry.id === scenarioId)
    if (!scenario) return
    if (scenario.kind === "game") {
      toast.error("Games are managed via the repository. Duplicate the game to customize it locally.")
      return
    }
    setEditingScenario(scenario)
    setShowScenarioBuilder(true)
  }

  const handleSaveScenario = async (scenarioPayload: Omit<ScenarioData, "id" | "kind">) => {
    try {
      const result = await onSaveScenario({ scenarioPayload, editingScenario })
      setShowScenarioBuilder(false)
      setEditingScenario(null)
      if (!result.isUpdate) {
        onSelectScenario(result.scenario.id)
      }
      toast.success(result.isUpdate ? "Scenario updated in catalog." : "Scenario saved to catalog.")
    } catch (error) {
      console.error(error)
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to save scenario via orchestration service. Please try again."
      )
    }
  }

  if (showScenarioBuilder) {
    return (
      <ScenarioBuilder
        scenario={editingScenario || undefined}
        onSave={handleSaveScenario}
        onCancel={() => {
          setShowScenarioBuilder(false)
          setEditingScenario(null)
        }}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Scenarios & Games</h2>
        <div className="flex items-center gap-3">
          {isSyncing && (
            <Badge variant="outline" className="text-xs">
              Syncing with service…
            </Badge>
          )}
          <Button
            onClick={() => {
              setEditingScenario(null)
              setShowScenarioBuilder(true)
            }}
          >
            <Plus size={16} className="mr-2" />
            Create Scenario
          </Button>
        </div>
      </div>

      {loadError && (
        <Card>
          <CardContent className="py-4 text-sm text-muted-foreground">{loadError}</CardContent>
        </Card>
      )}

      <ScenarioSelector
        scenarios={scenarios}
        selectedScenario={selectedScenario}
        onSelect={onSelectScenario}
        onEdit={handleEditScenario}
      />

      {selectedScenarioData && (
        <ScenarioTransparencyPanel
          scenario={{
            name: selectedScenarioData.name,
            description: selectedScenarioData.description,
            instructions: selectedScenarioData.instructions,
            evaluationCriteria: selectedScenarioData.evaluationCriteria,
            constraints: selectedScenarioData.constraints,
            tags: selectedScenarioData.tags,
            sourcePath: selectedScenarioData.sourcePath,
            rawDefinition: selectedScenarioData.rawDefinition,
          }}
        />
      )}

      {selectedScenarioData?.kind === "game" && (
        <GameTransparencyPanel
          scenarioName={selectedScenarioData.name}
          scenarioFamily={selectedScenarioData.family}
          assets={gameAssets[selectedScenarioData.id]}
          loading={assetLoading}
          error={assetError}
        />
      )}

      {selectedScenario && selectedPersonas.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Play size={32} className="mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground mb-4">
              Select personas to evaluate with this scenario or game, or run individual tests from the Personas tab
            </p>
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                onClick={() => onSelectAllPersonas(personas.map((persona) => persona.id))}
                disabled={personas.length === 0}
              >
                Select All Personas
              </Button>
              <Button onClick={onRunBulkEvaluation} disabled={selectedPersonas.length === 0}>
                <Play size={16} className="mr-2" />
                Run Bulk Evaluation
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
