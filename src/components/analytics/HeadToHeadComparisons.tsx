import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TrendUp } from "@phosphor-icons/react"

import { formatPercentage, getComparisonTone } from "./utils"
import type { ComparisonHighlight, ComparisonMatrix } from "./types"

interface HeadToHeadComparisonsProps {
  personaNameMap: Map<string, string>
  comparisonPersonaIds: string[]
  comparisonMatrix: ComparisonMatrix
  comparisonHighlights: ComparisonHighlight[]
}

export function HeadToHeadComparisons({
  personaNameMap,
  comparisonPersonaIds,
  comparisonMatrix,
  comparisonHighlights,
}: HeadToHeadComparisonsProps) {
  const renderEmptyState = () => (
    <div className="py-12 text-center text-muted-foreground">
      <TrendUp size={48} className="mx-auto mb-4" />
      <h3 className="mb-2 text-lg font-medium">Need more overlap</h3>
      <p>
        Make sure at least two personas have results for the selected filters (try switching Persona to 'All') to
        unlock the comparison matrix.
      </p>
    </div>
  )

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle>Head-to-Head Comparisons</CardTitle>
        <p className="text-sm text-muted-foreground">
          Compare personas on shared scenarios. Win rate counts per-scenario victories; average edge shows the mean score
          difference across those matchups.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {comparisonPersonaIds.length < 2 ? (
          renderEmptyState()
        ) : (
          <>
            {comparisonHighlights.length > 0 && (
              <div className="grid gap-4 md:grid-cols-3">
                {comparisonHighlights.map((highlight, index) => (
                  <div
                    key={`${highlight.leader}-${highlight.challenger}-${index}`}
                    className="rounded-lg border border-border bg-muted/40 p-4"
                  >
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Key matchup</p>
                    <h3 className="mt-1 text-sm font-semibold text-ink-600">
                      {highlight.leader} vs {highlight.challenger}
                    </h3>
                    <div className="mt-4 flex items-baseline justify-between">
                      <span className="text-2xl font-bold text-brand-emerald-600">
                        {formatPercentage(highlight.winRate, 0)}
                      </span>
                      <span className="text-xs text-muted-foreground">win rate</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>+{(highlight.diff * 100).toFixed(1)}% avg. edge</span>
                      <span>{highlight.shared} shared scenarios</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px]">Persona</TableHead>
                    {comparisonPersonaIds.map((personaId) => (
                      <TableHead key={personaId} className="min-w-[140px] text-center">
                        {personaNameMap.get(personaId) ?? personaId}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparisonPersonaIds.map((rowId) => (
                    <TableRow key={rowId} className="align-top">
                      <TableCell className="font-medium">{personaNameMap.get(rowId) ?? rowId}</TableCell>
                      {comparisonPersonaIds.map((columnId) => {
                        if (rowId === columnId) {
                          return (
                            <TableCell key={columnId} className="text-center text-xs text-muted-foreground">
                              —
                            </TableCell>
                          )
                        }

                        const cell = comparisonMatrix[rowId]?.[columnId]

                        if (!cell || cell.shared === 0) {
                          return (
                            <TableCell key={columnId} className="text-center text-xs text-muted-foreground">
                              No overlap
                            </TableCell>
                          )
                        }

                        const tone = getComparisonTone(cell.averageDiff)

                        return (
                          <TableCell key={columnId} className="align-top">
                            <div className={`rounded-lg px-3 py-3 text-xs leading-5 ${tone}`}>
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold">{formatPercentage(cell.winRate)}</span>
                                <span className="text-[10px] uppercase tracking-wide text-ink-500/80">win rate</span>
                              </div>
                              <div className="mt-2 flex items-center justify-between">
                                <span className="text-[11px] font-medium">
                                  {(cell.averageDiff >= 0 ? "+" : "") + (cell.averageDiff * 100).toFixed(1)}%
                                </span>
                                <span className="text-[11px] text-muted-foreground">n={cell.shared}</span>
                              </div>
                            </div>
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
