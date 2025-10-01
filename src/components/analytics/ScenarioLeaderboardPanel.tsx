import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

import { getDifficultyTone, getScoreTone } from "./utils"
import type { ScenarioAnalysis } from "./types"

interface ScenarioLeaderboardPanelProps {
  scenarioAnalysis: ScenarioAnalysis[]
}

export function ScenarioLeaderboardPanel({ scenarioAnalysis }: ScenarioLeaderboardPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Scenario Difficulty Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Scenario</TableHead>
              <TableHead>Domain</TableHead>
              <TableHead>Difficulty</TableHead>
              <TableHead>Avg Score</TableHead>
              <TableHead>Best Performer</TableHead>
              <TableHead>Participants</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {scenarioAnalysis.map((scenario) => (
              <TableRow key={scenario.scenarioId}>
                <TableCell className="font-medium">{scenario.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{scenario.domain}</Badge>
                </TableCell>
                <TableCell>
                  <Badge className={getDifficultyTone(scenario.difficulty)}>{scenario.difficulty}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className={getScoreTone(scenario.averageScore)}>
                      {(scenario.averageScore * 100).toFixed(1)}%
                    </span>
                    <Progress value={scenario.averageScore * 100} className="h-2 w-16" />
                  </div>
                </TableCell>
                <TableCell>{scenario.bestPersona}</TableCell>
                <TableCell>{scenario.participantCount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
