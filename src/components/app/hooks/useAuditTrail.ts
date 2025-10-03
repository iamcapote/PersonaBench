import { useCallback, useState } from "react"
import { toast } from "sonner"

import { generateClientId, transformAuditEventResponse } from "@/lib/appTransformers"
import type { AuditEvent, AuditEventResponse } from "@/lib/appTypes"
import { useAdminAuth } from "@/components/app/providers/AdminAuthProvider"

const MAX_AUDIT_ENTRIES = 200

const clampEvents = (events: AuditEvent[]): AuditEvent[] => events.slice(0, MAX_AUDIT_ENTRIES)

export interface UseAuditTrailResult {
  auditLog: AuditEvent[]
  setAuditLog: (events: AuditEvent[]) => void
  recordAuditEvent: (event: Omit<AuditEvent, "id" | "timestamp"> & { timestamp?: string }) => void
  replaceAuditEvent: (placeholderId: string, entry: AuditEvent) => void
}

export function useAuditTrail(): UseAuditTrailResult {
  const [auditLog, setAuditLogState] = useState<AuditEvent[]>([])
  const { authorizedApiFetch, hasAdminAccess } = useAdminAuth()

  const replaceAuditEvent = useCallback((placeholderId: string, entry: AuditEvent) => {
    setAuditLogState((current) => {
      const filtered = current.filter((item) => item.id !== placeholderId && item.id !== entry.id)
      const next = [entry, ...filtered]
      return clampEvents(next)
    })
  }, [])

  const recordAuditEvent = useCallback(
    (event: Omit<AuditEvent, "id" | "timestamp"> & { timestamp?: string }) => {
      const placeholderId = generateClientId("audit")
      const timestamp = event.timestamp ?? new Date().toISOString()
      const placeholder: AuditEvent = {
        id: placeholderId,
        timestamp,
        actor: event.actor,
        action: event.action,
        subject: event.subject,
        status: event.status,
        metadata: event.metadata,
      }

      setAuditLogState((current) => clampEvents([placeholder, ...current]))

      const payload: Record<string, unknown> = {
        actor: event.actor,
        action: event.action,
        subject: event.subject,
        status: event.status,
        metadata: event.metadata ?? {},
      }
      if (event.timestamp) {
        payload.timestamp = event.timestamp
      }

      if (!hasAdminAccess) {
        toast("Admin key required to persist audit log events. Recording locally only.")
        return
      }

  authorizedApiFetch("/admin/audit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })
        .then(async (response) => {
          if (!response.ok) {
            const message = await response.text().catch(() => "")
            throw new Error(message || `Failed to persist audit event (status ${response.status})`)
          }

          const data: AuditEventResponse = await response.json()
          const normalized = transformAuditEventResponse(data)
          replaceAuditEvent(placeholderId, normalized)
        })
        .catch((error) => {
          console.error(error)
          toast.error("Unable to persist audit event. Recording locally only.")
        })
    },
  [authorizedApiFetch, hasAdminAccess, replaceAuditEvent]
  )

  const setAuditLog = useCallback((events: AuditEvent[]) => {
    setAuditLogState(clampEvents(events))
  }, [])

  return {
    auditLog,
    setAuditLog,
    recordAuditEvent,
    replaceAuditEvent,
  }
}
