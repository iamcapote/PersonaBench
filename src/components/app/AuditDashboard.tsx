import { useMemo } from "react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatTimestamp } from "@/lib/appTransformers"
import type { AuditEvent } from "@/lib/appTypes"

interface AuditDashboardProps {
  auditLog: AuditEvent[]
}

export function AuditDashboard({ auditLog }: AuditDashboardProps) {
  const auditSummary = useMemo(() => {
    const success = auditLog.filter((entry) => entry.status === "success").length
    const failure = auditLog.length - success
    return {
      total: auditLog.length,
      success,
      failure,
    }
  }, [auditLog])

  const recentAudit = useMemo(() => auditLog.slice(0, 20), [auditLog])

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Events</CardTitle>
            <CardDescription>Cumulative log entries this session.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{auditSummary.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Successes</CardTitle>
            <CardDescription>Persona and scenario operations that completed.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-emerald-600 dark:text-emerald-400">{auditSummary.success}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Failures</CardTitle>
            <CardDescription>Actions that need operator review.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-red-600 dark:text-red-400">{auditSummary.failure}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest {recentAudit.length} audit entries.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentAudit.length === 0 ? (
            <p className="text-sm text-muted-foreground">No audit events recorded yet.</p>
          ) : (
            recentAudit.map((event) => (
              <div key={event.id} className="rounded-lg border px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={
                        event.status === "success"
                          ? "border-emerald-300 text-emerald-600 dark:border-emerald-800 dark:text-emerald-300"
                          : "border-red-300 text-red-600 dark:border-red-800 dark:text-red-300"
                      }
                    >
                      {event.status === "success" ? "Success" : "Failure"}
                    </Badge>
                    <span className="text-sm font-medium">{event.action}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatTimestamp(event.timestamp)}</span>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Subject: {event.subject} · Actor: {event.actor}
                </div>
                {event.metadata && Object.keys(event.metadata).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    {Object.entries(event.metadata).map(([key, value]) => (
                      <span key={key} className="rounded bg-muted px-2 py-1">
                        {key}: {typeof value === "string" ? value : value === null ? "—" : JSON.stringify(value)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
