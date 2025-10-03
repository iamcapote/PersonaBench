import { useCallback, useMemo, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

import { EvaluationRunner } from "@/components/EvaluationRunner"
import { ResultsAnalytics } from "@/components/ResultsAnalytics"
import { FeedbackReview } from "@/components/FeedbackReview"
import { PersonaWorkspace } from "@/components/app/PersonaWorkspace"
import { ScenarioWorkbench } from "@/components/app/ScenarioWorkbench"
import { LibraryDashboard } from "@/components/app/LibraryDashboard"
import { QueueDashboard } from "@/components/app/QueueDashboard"
import { AuditDashboard } from "@/components/app/AuditDashboard"
import { AppHeader } from "@/components/app/AppHeader"
import { ContextRail, type ContextRailTab } from "@/components/app/ContextRail"
import { useAdminAuth } from "@/components/app/providers/AdminAuthProvider"

import { useAuditTrail } from "@/components/app/hooks/useAuditTrail"
import { useEvaluationQueue } from "@/components/app/hooks/useEvaluationQueue"
import { usePersonaCatalog } from "@/components/app/hooks/usePersonaCatalog"
import { useScenarioLibrary } from "@/components/app/hooks/useScenarioLibrary"
import { useAppBootstrap } from "@/components/app/hooks/useAppBootstrap"
import { useEvaluationManager } from "@/components/app/hooks/useEvaluationManager"

import { selectRecentAudit } from "@/lib/appSelectors"
import { transformPersonaSummary, transformScenarioSummary } from "@/lib/appTransformers"
import { localPersonaFallback, mockScenarios } from "@/lib/mockData"
import type {
  EvaluationResult,
  PersonaData,
  PersonaSummaryResponse,
  ScenarioData,
  ScenarioSummaryResponse,
} from "@/lib/appTypes"

function App() {
  const [activeTab, setActiveTab] = useState("runs")
  const [selectedScenario, setSelectedScenario] = useState<string>(mockScenarios[0]?.id ?? "")
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>([])
  const [results, setResults] = useState<EvaluationResult[]>([])
  const [showEvaluationRunner, setShowEvaluationRunner] = useState(false)

  const { authorizedApiFetch, hasAdminAccess } = useAdminAuth()
  const { auditLog, recordAuditEvent, setAuditLog } = useAuditTrail()
  const { personas, setPersonas, savePersona } = usePersonaCatalog({
    initialPersonas: localPersonaFallback,
    recordAuditEvent,
  })
  const { scenarios, setScenarios, saveScenario } = useScenarioLibrary({
    initialScenarios: mockScenarios,
    recordAuditEvent,
  })
  const {
    evaluationQueue,
    queueSummary,
    queueError,
    isQueueSyncing,
    lastSyncedAt,
    setEvaluationQueue,
    setQueueSummary,
    addQueueEntries,
    replaceQueueEntry,
    mergeQueueEntry,
    createQueueEntryRemote,
    updateQueueEntryRemote,
    refreshQueue,
  } = useEvaluationQueue()

  const handleScenariosHydrated = useCallback(
    (combined: ScenarioData[]) => {
      setSelectedScenario((current) =>
        current && combined.some((entry) => entry.id === current)
          ? current
          : combined[0]?.id ?? ""
      )
    },
    [setSelectedScenario]
  )

  const { isSyncing, loadError } = useAppBootstrap({
    setPersonas,
    setScenarios,
    setEvaluationQueue,
    setQueueSummary,
    setAuditLog,
    onScenariosHydrated: handleScenariosHydrated,
  })

  const selectedScenarioData = useMemo(
    () => scenarios.find((scenario) => scenario.id === selectedScenario),
    [scenarios, selectedScenario]
  )

  const selectedPersonaData = useMemo(
    () =>
      selectedPersonas
        .map((id: string) => personas.find((persona: PersonaData) => persona.id === id))
        .filter((persona): persona is PersonaData => Boolean(persona)),
    [personas, selectedPersonas]
  )

  const recentAudit = useMemo(() => selectRecentAudit(auditLog), [auditLog])
  const lastResultTimestamp = useMemo(() => {
    if (results.length > 0) {
      return results[results.length - 1]?.timestamp ?? null
    }
    return queueSummary.lastCompletedAt ?? null
  }, [queueSummary.lastCompletedAt, results])

  const handleNavigate = useCallback(
    (tab: ContextRailTab) => {
      setActiveTab(tab)
    },
    [setActiveTab]
  )

  const isEvaluationRunning = useMemo(
    () => showEvaluationRunner || queueSummary.runningEntries > 0,
    [queueSummary.runningEntries, showEvaluationRunner]
  )
  const importPersonas = useCallback(
    async (definitions: Record<string, any>[]) => {
      const result = { created: 0, updated: 0, errors: [] as string[] }

      if (!hasAdminAccess) {
        result.errors.push("Admin key required to import personas.")
        return result
      }

      for (const original of definitions) {
        const definition = JSON.parse(JSON.stringify(original))
        const personaName = typeof definition.name === "string" ? definition.name : "<unknown>"
        try {
          const requestBody = JSON.stringify({ definition })
          let response = await authorizedApiFetch("/personas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: requestBody,
          })
          let wasUpdate = false

          if (response.status === 409) {
            wasUpdate = true
            response = await authorizedApiFetch(`/personas/${encodeURIComponent(personaName)}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: requestBody,
            })
          }

          if (!response.ok) {
            let detail = await response.text().catch(() => "")
            if (!detail) {
              detail = `Request failed with status ${response.status}`
            }
            throw new Error(detail)
          }

          const payload: PersonaSummaryResponse = await response.json()
          const normalized = transformPersonaSummary(payload)
          setPersonas((current) => {
            const index = current.findIndex((entry) => entry.id === normalized.id)
            if (index >= 0) {
              const next = [...current]
              next[index] = normalized
              return next
            }
            return [...current, normalized]
          })

          if (wasUpdate) {
            result.updated += 1
          } else {
            result.created += 1
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error"
          console.error(`[persona import] ${personaName}: ${message}`)
          result.errors.push(`${personaName}: ${message}`)
        }
      }

      return result
    },
    [authorizedApiFetch, hasAdminAccess, setPersonas]
  )

  const importScenarios = useCallback(
    async (records: Record<string, any>[]) => {
      const result = { created: 0, updated: 0, errors: [] as string[] }

      if (!hasAdminAccess) {
        result.errors.push("Admin key required to import scenarios.")
        return result
      }

      for (const original of records) {
        const scenarioId = typeof original.id === "string" ? original.id : "<unknown>"
        const environmentValue =
          typeof original.environment === "string" && original.environment.trim().length > 0
            ? original.environment.trim()
            : "custom"
        const definition = JSON.parse(JSON.stringify({ ...original }))
        delete definition.environment

        try {
          const requestBody = JSON.stringify({ environment: environmentValue, definition })
          let response = await authorizedApiFetch("/scenarios", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: requestBody,
          })
          let wasUpdate = false

          if (response.status === 409) {
            wasUpdate = true
            response = await authorizedApiFetch(`/scenarios/${encodeURIComponent(scenarioId)}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: requestBody,
            })
          }

          if (!response.ok) {
            let detail = await response.text().catch(() => "")
            if (!detail) {
              detail = `Request failed with status ${response.status}`
            }
            throw new Error(detail)
          }

          const payload: ScenarioSummaryResponse = await response.json()
          const normalized = transformScenarioSummary(payload)
          setScenarios((current) => {
            const index = current.findIndex((entry) => entry.id === normalized.id)
            if (index >= 0) {
              const next = [...current]
              next[index] = normalized
              return next
            }
            return [...current, normalized]
          })

          if (wasUpdate) {
            result.updated += 1
          } else {
            result.created += 1
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error"
          console.error(`[scenario import] ${scenarioId}: ${message}`)
          result.errors.push(`${scenarioId}: ${message}`)
        }
      }

      return result
    },
    [authorizedApiFetch, hasAdminAccess, setScenarios]
  )
  const { runEvaluation, bulkEvaluate, completeEvaluation, cancelEvaluation } = useEvaluationManager({
    selectedScenarioId: selectedScenario,
    selectedScenarioData,
    selectedPersonas,
    setSelectedPersonas,
    setResults,
    setPersonas: (updater) => setPersonas(updater),
    setShowEvaluationRunner,
    setActiveTab,
    recordAuditEvent,
    queue: {
      evaluationQueue,
      setEvaluationQueue,
      addQueueEntries,
      replaceQueueEntry,
      mergeQueueEntry,
      createQueueEntryRemote,
      updateQueueEntryRemote,
      refreshQueue,
    },
  })

  if (showEvaluationRunner && selectedScenarioData) {
    return (
      <div className="min-h-screen bg-background p-6">
        <EvaluationRunner
          personas={selectedPersonaData}
          scenario={selectedScenarioData}
          onComplete={completeEvaluation}
          onCancel={cancelEvaluation}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-gutter py-section">
        <div className="mb-section">
          <AppHeader />
        </div>

        <div className="mb-section">
          <ContextRail
            scenario={selectedScenarioData}
            selectedPersonas={selectedPersonaData}
            queueSummary={queueSummary}
            isEvaluationRunning={isEvaluationRunning}
            lastResultTimestamp={lastResultTimestamp}
            onNavigate={handleNavigate}
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex w-full flex-wrap gap-2 rounded-xl bg-card/80 p-1.5 shadow-soft backdrop-blur">
            <TabsTrigger value="runs" className="flex-1 min-w-[150px] rounded-lg text-sm font-medium text-ink-600 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Runs ({queueSummary.totalEntries})
            </TabsTrigger>
            <TabsTrigger value="compare" className="flex-1 min-w-[150px] rounded-lg text-sm font-medium text-ink-600 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Compare ({results.length})
            </TabsTrigger>
            <TabsTrigger value="personas" className="flex-1 min-w-[150px] rounded-lg text-sm font-medium text-ink-600 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Personas ({personas.length})
            </TabsTrigger>
            <TabsTrigger value="scenarios" className="flex-1 min-w-[150px] rounded-lg text-sm font-medium text-ink-600 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Scenarios &amp; Games ({scenarios.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="runs" className="space-y-6">
            <Card>
              <CardContent className="py-12 text-center">
                <h3 className="mb-2 text-lg font-medium">No evaluation running</h3>
                <p className="mb-4 text-muted-foreground">
                  Select personas and scenarios, then run evaluations to see live progress here.
                </p>
                <Button onClick={() => handleNavigate("personas")}>Go to Personas</Button>
              </CardContent>
            </Card>

            <LibraryDashboard
              personas={personas}
              scenarios={scenarios}
              queueSummary={queueSummary}
              queueError={queueError}
              lastSyncedAt={lastSyncedAt}
              recentAudit={recentAudit}
              onRefreshQueue={refreshQueue}
              onNavigateToTab={(tab) => handleNavigate(tab)}
              onImportPersonas={importPersonas}
              onImportScenarios={importScenarios}
            />

            <QueueDashboard
              evaluationQueue={evaluationQueue}
              queueSummary={queueSummary}
              queueError={queueError}
              isSyncing={isQueueSyncing}
              lastSyncedAt={lastSyncedAt}
              onRefresh={refreshQueue}
              personas={personas}
              scenarios={scenarios}
            />

            <AuditDashboard auditLog={auditLog} />
          </TabsContent>

          <TabsContent value="compare" className="space-y-6">
            <ResultsAnalytics personas={personas} scenarios={scenarios} results={results} />
            <FeedbackReview scenarios={scenarios} />
          </TabsContent>

          <TabsContent value="personas" className="space-y-6">
            <PersonaWorkspace
              personas={personas}
              isSyncing={isSyncing}
              loadError={loadError}
              onSavePersona={savePersona}
              onRunEvaluation={runEvaluation}
              onImportPersonas={importPersonas}
            />
          </TabsContent>

          <TabsContent value="scenarios" className="space-y-6">
            <ScenarioWorkbench
              personas={personas}
              scenarios={scenarios}
              selectedScenario={selectedScenario}
              isSyncing={isSyncing}
              loadError={loadError}
              selectedPersonas={selectedPersonas}
              onSelectScenario={setSelectedScenario}
              onSelectAllPersonas={setSelectedPersonas}
              onRunBulkEvaluation={bulkEvaluate}
              onSaveScenario={saveScenario}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default App