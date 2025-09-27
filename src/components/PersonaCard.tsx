import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Play, Gear, TrendUp } from "@phosphor-icons/react"

interface PersonaCardProps {
  id: string
  name: string
  description: string
  archetype: string
  riskTolerance: number
  planningHorizon: string
  lastScore?: number
  onRun: (personaId: string) => void
  onEdit: (personaId: string) => void
}

export function PersonaCard({ 
  id, 
  name, 
  description, 
  archetype, 
  riskTolerance, 
  planningHorizon, 
  lastScore, 
  onRun, 
  onEdit 
}: PersonaCardProps) {
  const getRiskColor = (risk: number) => {
    if (risk < 0.3) return "bg-green-100 text-green-800 border-green-200"
    if (risk < 0.7) return "bg-yellow-100 text-yellow-800 border-yellow-200"
    return "bg-red-100 text-red-800 border-red-200"
  }

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return "text-green-600"
    if (score >= 0.6) return "text-yellow-600"
    return "text-red-600"
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold">{name}</CardTitle>
            <CardDescription className="text-sm">{description}</CardDescription>
          </div>
          {lastScore !== undefined && (
            <div className="flex items-center gap-1 text-sm font-mono">
              <TrendUp size={16} className={getScoreColor(lastScore)} />
              <span className={getScoreColor(lastScore)}>
                {(lastScore * 100).toFixed(0)}%
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-xs">
            {archetype}
          </Badge>
          <Badge 
            variant="outline" 
            className={`text-xs ${getRiskColor(riskTolerance)}`}
          >
            Risk: {(riskTolerance * 100).toFixed(0)}%
          </Badge>
          <Badge variant="outline" className="text-xs">
            Horizon: {planningHorizon}
          </Badge>
        </div>

        <div className="flex gap-2">
          <Button 
            size="sm" 
            onClick={() => onRun(id)}
            className="flex-1"
          >
            <Play size={16} className="mr-1" />
            Run Test
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => onEdit(id)}
          >
            <Gear size={16} />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}