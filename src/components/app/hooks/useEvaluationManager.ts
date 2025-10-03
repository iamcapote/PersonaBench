import { useCallback } from "react"
import { toast } from "sonner"

import { generateClientId } from "@/lib/appTransformers"
import type {
  EvaluationQueueItem,
  EvaluationResult,
  PersonaData,
  ScenarioData,
} from "@/lib/appTypes"
import type { UseAuditTrailResult } from "@/components/app/hooks/useAuditTrail"
import type { UseEvaluationQueueResult } from "@/components/app/hooks/useEvaluationQueue"
import type { Dispatch, SetStateAction } from "react"

interface EvaluationQueueDependencies {
  evaluationQueue: EvaluationQueueItem[]
  setEvaluationQueue: UseEvaluationQueueResult["setEvaluationQueue"]
  addQueueEntries: UseEvaluationQueueResult["addQueueEntries"]
  replaceQueueEntry: UseEvaluationQueueResult["replaceQueueEntry"]
  mergeQueueEntry: UseEvaluationQueueResult["mergeQueueEntry"]
  createQueueEntryRemote: UseEvaluationQueueResult["createQueueEntryRemote"]
  updateQueueEntryRemote: UseEvaluationQueueResult["updateQueueEntryRemote"]
  refreshQueue: UseEvaluationQueueResult["refreshQueue"]
}

interface UseEvaluationManagerParams {
  selectedScenarioId: string
  selectedScenarioData?: ScenarioData
  selectedPersonas: string[]
  setSelectedPersonas: (personaIds: string[]) => void
  setResults: Dispatch<SetStateAction<EvaluationResult[]>>
  setPersonas: (updater: (current: PersonaData[]) => PersonaData[]) => void
  setShowEvaluationRunner: (visible: boolean) => void
  setActiveTab: (tab: string) => void
  recordAuditEvent: UseAuditTrailResult["recordAuditEvent"]
  queue: EvaluationQueueDependencies
}

interface EvaluationManager {
  runEvaluation: (personaId: string) => void
  bulkEvaluate: () => void
  completeEvaluation: (results: EvaluationResult[]) => void
  cancelEvaluation: () => void
}

export function useEvaluationManager({
  selectedScenarioId,
  selectedScenarioData,
  selectedPersonas,
  setSelectedPersonas,
  setResults,
  setPersonas,
  setShowEvaluationRunner,
  setActiveTab,
  recordAuditEvent,
  queue,
}: UseEvaluationManagerParams): EvaluationManager {
  const runEvaluation = useCallback(
    (personaId: string) => {
      if (!selectedScenarioId) {
        toast.error("Please select a scenario or game first")
        setActiveTab("scenarios")
        return
      }

      const targetKind = selectedScenarioData?.kind === "game" ? "game" : "scenario"
      const now = new Date().toISOString()
      const metadata: Record<string, unknown> = {
        mode: "single",
        initiated_by: "operator",
      }
      const placeholderId = generateClientId("run")
      const placeholderEntry: EvaluationQueueItem = {
        id: placeholderId,
        personaId,
        scenarioId: selectedScenarioId,
        targetKind,
        status: "running",
        requestedAt: now,
        startedAt: now,
        metadata,
      }

      queue.addQueueEntries([placeholderEntry])

      queue
        .createQueueEntryRemote({
          personaId,
          targetId: selectedScenarioId,
          targetKind,
          status: "queued",
          requestedAt: now,
          metadata,
        })
        .then(async (createdEntry) => {
          try {
            const updated = await queue.updateQueueEntryRemote(createdEntry.id, {
              status: "running",
              startedAt: now,
            })
            queue.replaceQueueEntry(placeholderId, {
              ...updated,
              status: "running",
              startedAt: updated.startedAt ?? now,
            })
          } catch (patchError) {
            console.error(patchError)
            queue.replaceQueueEntry(placeholderId, {
              ...createdEntry,
              status: "running",
              startedAt: createdEntry.startedAt ?? now,
            })
          }
        })
        .catch((error) => {
          console.error(error)
          toast.error("Unable to persist evaluation queue entry. Tracking locally only.")
        })

      recordAuditEvent({
        actor: "operator",
        action: "evaluation.start",
        subject: placeholderId,
        status: "success",
        metadata: {
          personaId,
          scenarioId: selectedScenarioId,
          mode: "single",
        },
      })

      setSelectedPersonas([personaId])
      setShowEvaluationRunner(true)
    },
    [
      queue,
      recordAuditEvent,
      selectedScenarioData,
      selectedScenarioId,
      setActiveTab,
      setSelectedPersonas,
      setShowEvaluationRunner,
    ]
  )

  const bulkEvaluate = useCallback(() => {
    if (!selectedScenarioId) {
      toast.error("Please select a scenario or game first")
      setActiveTab("scenarios")
      return
    }

    if (selectedPersonas.length === 0) {
      toast.error("Please select personas to evaluate")
      return
    }

    const targetKind = selectedScenarioData?.kind === "game" ? "game" : "scenario"
    const now = new Date().toISOString()
    const placeholders = selectedPersonas.map<EvaluationQueueItem>((personaId, index) => ({
      id: generateClientId("run"),
      personaId,
      scenarioId: selectedScenarioId,
      targetKind,
      status: "running",
      requestedAt: now,
      startedAt: now,
      metadata: {
        mode: "batch",
        initiated_by: "operator",
        order: index,
        total: selectedPersonas.length,
      },
    }))

    if (placeholders.length > 0) {
      queue.addQueueEntries(placeholders)

      let notifiedError = false
      placeholders.forEach((placeholder) => {
        const metadata = placeholder.metadata ?? {}
        queue
          .createQueueEntryRemote({
            personaId: placeholder.personaId,
            targetId: selectedScenarioId,
            targetKind,
            status: "queued",
            requestedAt: now,
            metadata,
          })
          .then(async (createdEntry) => {
            try {
              const updated = await queue.updateQueueEntryRemote(createdEntry.id, {
                status: "running",
                startedAt: now,
              })
              queue.replaceQueueEntry(placeholder.id, {
                ...updated,
                status: "running",
                startedAt: updated.startedAt ?? now,
              })
            } catch (patchError) {
              console.error(patchError)
              queue.replaceQueueEntry(placeholder.id, {
                ...createdEntry,
                status: "running",
                startedAt: createdEntry.startedAt ?? now,
              })
            }
          })
          .catch((error) => {
            console.error(error)
            if (!notifiedError) {
              toast.error("Unable to persist some evaluation queue entries. Tracking locally only.")
              notifiedError = true
            }
          })
      })

      placeholders.forEach((placeholder) => {
        recordAuditEvent({
          actor: "operator",
          action: "evaluation.start",
          subject: placeholder.id,
          status: "success",
          metadata: {
            personaId: placeholder.personaId,
            scenarioId: placeholder.scenarioId,
            mode: "batch",
          },
        })
      })
    }

    setShowEvaluationRunner(true)
  }, [
    queue,
    recordAuditEvent,
    selectedPersonas,
    selectedScenarioData,
    selectedScenarioId,
    setActiveTab,
    setShowEvaluationRunner,
  ])

  const completeEvaluation = useCallback(
    (newResults: EvaluationResult[]) => {
      const completionTimestamp = new Date().toISOString()
      const scenarioId = newResults[0]?.scenarioId
      if (scenarioId) {
        const completedPersonaIds = new Set(newResults.map((result) => result.personaId))
        const affectedEntries = queue.evaluationQueue.filter(
          (entry) =>
            entry.scenarioId === scenarioId &&
            completedPersonaIds.has(entry.personaId) &&
            entry.status !== "completed"
        )

        if (affectedEntries.length > 0) {
          queue.setEvaluationQueue((current) =>
            current.map((entry) => {
              if (
                entry.scenarioId === scenarioId &&
                completedPersonaIds.has(entry.personaId) &&
                entry.status !== "completed"
              ) {
                return { ...entry, status: "completed", completedAt: completionTimestamp }
              }
              return entry
            })
          )

          affectedEntries.forEach((entry) => {
            const result = newResults.find((item) => item.personaId === entry.personaId)
            queue
              .updateQueueEntryRemote(entry.id, {
                status: "completed",
                completedAt: completionTimestamp,
                metadata: {
                  overallScore: result?.overallScore ?? null,
                  evaluationType: result?.type ?? null,
                },
              })
              .then((remoteEntry) => {
                queue.mergeQueueEntry({
                  ...remoteEntry,
                  status: "completed",
                  completedAt: remoteEntry.completedAt ?? completionTimestamp,
                })
              })
              .catch((error) => {
                console.error(error)
              })

            recordAuditEvent({
              actor: "orchestrator",
              action: "evaluation.complete",
              subject: entry.id,
              status: "success",
              metadata: {
                personaId: entry.personaId,
                scenarioId: entry.scenarioId,
                overallScore: result?.overallScore ?? null,
                evaluationType: result?.type,
              },
            })
          })
        }
      }

      queue.refreshQueue().catch(() => {
        // background refresh failure surfaced via queue state
      })

      setResults((currentResults) => [...currentResults, ...newResults])

      setPersonas((currentPersonas) =>
        currentPersonas.map((persona) => {
          const personaResults = newResults.filter((result) => result.personaId === persona.id)
          if (personaResults.length === 0) return persona
          const avgScore =
            personaResults.reduce((sum, result) => sum + result.overallScore, 0) /
            personaResults.length
          return { ...persona, lastScore: avgScore }
        })
      )

  setShowEvaluationRunner(false)
  setActiveTab("compare")
      toast.success(`Evaluation complete! ${newResults.length} results saved.`)
    },
    [
      queue,
      recordAuditEvent,
      setActiveTab,
      setPersonas,
      setResults,
      setShowEvaluationRunner,
    ]
  )

  const cancelEvaluation = useCallback(() => {
    const scenarioId = selectedScenarioId
    if (scenarioId) {
      const cancellationTimestamp = new Date().toISOString()
      const runningEntries = queue.evaluationQueue.filter(
        (entry) => entry.scenarioId === scenarioId && entry.status === "running"
      )

      if (runningEntries.length > 0) {
        queue.setEvaluationQueue((current) =>
          current.map((entry) => {
            if (entry.scenarioId === scenarioId && entry.status === "running") {
              return { ...entry, status: "failed", completedAt: cancellationTimestamp }
            }
            return entry
          })
        )

        runningEntries.forEach((entry) => {
          queue
            .updateQueueEntryRemote(entry.id, {
              status: "failed",
              completedAt: cancellationTimestamp,
              metadata: {
                cancelled: true,
              },
            })
            .then((remoteEntry) => {
              queue.mergeQueueEntry({
                ...remoteEntry,
                status: "failed",
                completedAt: remoteEntry.completedAt ?? cancellationTimestamp,
              })
            })
            .catch((error) => {
              console.error(error)
            })

          recordAuditEvent({
            actor: "operator",
            action: "evaluation.cancel",
            subject: entry.id,
            status: "failure",
            metadata: {
              personaId: entry.personaId,
              scenarioId: entry.scenarioId,
            },
          })
        })

        queue.refreshQueue().catch(() => {
          // background refresh failure surfaced via queue state
        })
      }
    }

    setShowEvaluationRunner(false)
  }, [queue, recordAuditEvent, selectedScenarioId, setShowEvaluationRunner])

  return {
    runEvaluation,
    bulkEvaluate,
    completeEvaluation,
    cancelEvaluation,
  }
}
