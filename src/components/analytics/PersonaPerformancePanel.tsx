import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

import { getScoreTone } from "./utils"
import type { PersonaAnalysis } from "./types"

interface PersonaPerformancePanelProps {
  personaAnalysis: PersonaAnalysis[]
}

export function PersonaPerformancePanel({ personaAnalysis }: PersonaPerformancePanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Persona Performance Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Persona</TableHead>
              <TableHead>Overall Score</TableHead>
              <TableHead>Algorithmic</TableHead>
              <TableHead>Human</TableHead>
              <TableHead>Best Domain</TableHead>
              <TableHead>Evaluations</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {personaAnalysis.map((persona) => (
              <TableRow key={persona.personaId}>
                <TableCell className="font-medium">{persona.name}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className={getScoreTone(persona.averageScore)}>
                      {(persona.averageScore * 100).toFixed(1)}%
                    </span>
                    <Progress value={persona.averageScore * 100} className="h-2 w-16" />
                  </div>
                </TableCell>
                <TableCell>
                  {persona.algorithmicAverage > 0 ? `${(persona.algorithmicAverage * 100).toFixed(1)}%` : "N/A"}
                </TableCell>
                <TableCell>
                  {persona.humanAverage > 0 ? `${(persona.humanAverage * 100).toFixed(1)}%` : "N/A"}
                </TableCell>
                <TableCell>
                  {persona.strengths.length > 0 ? (
                    <Badge variant="outline">{persona.strengths[0]}</Badge>
                  ) : (
                    "N/A"
                  )}
                </TableCell>
                <TableCell>{persona.evaluationCount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
