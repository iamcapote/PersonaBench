import { useMemo, useState } from "react"
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

import { useAuditTrail } from "@/components/app/hooks/useAuditTrail"
import { useEvaluationQueue } from "@/components/app/hooks/useEvaluationQueue"
import { usePersonaCatalog } from "@/components/app/hooks/usePersonaCatalog"
import { useScenarioLibrary } from "@/components/app/hooks/useScenarioLibrary"
import { useAppBootstrap } from "@/components/app/hooks/useAppBootstrap"
import { useEvaluationManager } from "@/components/app/hooks/useEvaluationManager"

import { selectRecentAudit } from "@/lib/appSelectors"
import { localPersonaFallback, mockScenarios } from "@/lib/mockData"
import type { EvaluationResult, PersonaData, ScenarioData } from "@/lib/appTypes"

function App() {
  const [activeTab, setActiveTab] = useState("personas")
  const [selectedScenario, setSelectedScenario] = useState<string>(mockScenarios[0]?.id ?? "")
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>([])
  const [results, setResults] = useState<EvaluationResult[]>([])
  const [showEvaluationRunner, setShowEvaluationRunner] = useState(false)

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
    setEvaluationQueue,
    addQueueEntries,
    replaceQueueEntry,
    mergeQueueEntry,
    createQueueEntryRemote,
    updateQueueEntryRemote,
  } = useEvaluationQueue()

  const { isSyncing, loadError } = useAppBootstrap({
    setPersonas,
    setScenarios,
    setEvaluationQueue,
    setAuditLog,
    onScenariosHydrated: (combined: ScenarioData[]) => {
      setSelectedScenario((current) =>
        current && combined.some((entry) => entry.id === current)
          ? current
          : combined[0]?.id ?? ""
      )
    },
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex w-full flex-wrap gap-2 rounded-xl bg-card/80 p-1.5 shadow-soft backdrop-blur">
            <TabsTrigger value="personas" className="flex-1 min-w-[150px] rounded-lg text-sm font-medium text-ink-600 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Personas ({personas.length})
            </TabsTrigger>
            <TabsTrigger value="scenarios" className="flex-1 min-w-[150px] rounded-lg text-sm font-medium text-ink-600 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Scenarios &amp; Games ({scenarios.length})
            </TabsTrigger>
            <TabsTrigger value="evaluation" className="flex-1 min-w-[150px] rounded-lg text-sm font-medium text-ink-600 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Evaluation
            </TabsTrigger>
            <TabsTrigger value="results" className="flex-1 min-w-[150px] rounded-lg text-sm font-medium text-ink-600 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Results
            </TabsTrigger>
            <TabsTrigger value="feedback" className="flex-1 min-w-[150px] rounded-lg text-sm font-medium text-ink-600 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Feedback
            </TabsTrigger>
            <TabsTrigger value="library" className="flex-1 min-w-[150px] rounded-lg text-sm font-medium text-ink-600 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Library
            </TabsTrigger>
            <TabsTrigger value="queue" className="flex-1 min-w-[150px] rounded-lg text-sm font-medium text-ink-600 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Queue
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex-1 min-w-[150px] rounded-lg text-sm font-medium text-ink-600 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Audit Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personas" className="space-y-6">
            <PersonaWorkspace
              personas={personas}
              isSyncing={isSyncing}
              loadError={loadError}
              onSavePersona={savePersona}
              onRunEvaluation={runEvaluation}
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

          <TabsContent value="evaluation" className="space-y-6">
            <Card>
              <CardContent className="text-center py-12">
                <h3 className="text-lg font-medium mb-2">No evaluation running</h3>
                <p className="text-muted-foreground mb-4">
                  Select personas and scenarios, then run evaluations to see live progress here
                </p>
                <Button onClick={() => setActiveTab("personas")}>Go to Personas</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
            <ResultsAnalytics personas={personas} scenarios={scenarios} results={results} />
          </TabsContent>

          <TabsContent value="feedback" className="space-y-6">
            <FeedbackReview scenarios={scenarios} />
          </TabsContent>

          <TabsContent value="library" className="space-y-6">
            <LibraryDashboard
              personas={personas}
              scenarios={scenarios}
              evaluationQueue={evaluationQueue}
              recentAudit={recentAudit}
              onNavigateToTab={(tab) => setActiveTab(tab)}
            />
          </TabsContent>

          <TabsContent value="queue" className="space-y-6">
            <QueueDashboard evaluationQueue={evaluationQueue} personas={personas} scenarios={scenarios} />
          </TabsContent>

          <TabsContent value="audit" className="space-y-6">
            <AuditDashboard auditLog={auditLog} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default App