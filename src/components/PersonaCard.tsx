import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Play, Gear, TrendUp, Code, CircleNotch, CopySimple } from "@phosphor-icons/react"

interface PersonaCardProps {
  id: string
  name: string
  description: string
  archetype: string
  riskTolerance: number
  planningHorizon: string
  lastScore?: number
  isSaving?: boolean
  onRun: (personaId: string) => void
  onEdit: (personaId: string) => void
  onInspect?: (personaId: string) => void
  onDuplicate?: (personaId: string) => void
}

export function PersonaCard({ 
  id, 
  name, 
  description, 
  archetype, 
  riskTolerance, 
  planningHorizon, 
  lastScore, 
  isSaving,
  onRun, 
  onEdit,
  onInspect,
  onDuplicate,
}: PersonaCardProps) {
  const getRiskColor = (risk: number) => {
    if (risk < 0.3) return "bg-brand-emerald-200 text-brand-emerald-500 border-transparent"
    if (risk < 0.7) return "bg-brand-amber-500/20 text-brand-amber-500 border-transparent"
    return "bg-brand-rose-500/20 text-brand-rose-500 border-transparent"
  }

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return "text-brand-emerald-500"
    if (score >= 0.6) return "text-brand-amber-500"
    return "text-brand-rose-500"
  }

  return (
    <Card
      className="relative border border-border-strong bg-card/95 backdrop-blur-sm transition-transform transition-shadow hover:-translate-y-0.5 hover:shadow-card"
      aria-busy={isSaving ?? false}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold text-ink-900">{name}</CardTitle>
            <CardDescription className="text-sm text-ink-600">{description}</CardDescription>
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
        {isSaving && (
          <Badge variant="secondary" className="inline-flex items-center gap-2 text-xs font-medium">
            <CircleNotch size={14} className="animate-spin" /> Saving…
          </Badge>
        )}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="border-brand-azure-200/60 bg-brand-azure-200/30 text-xs font-medium text-brand-azure-500">
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

        <div className="flex flex-wrap gap-2">
          <Button 
            size="sm" 
            onClick={() => onRun(id)}
            disabled={isSaving}
            className="flex-1 justify-center gap-1 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Play size={16} />
            Run Test
          </Button>
          {onDuplicate && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDuplicate(id)}
              disabled={isSaving}
              className="border-border-strong text-ink-600 hover:bg-secondary"
            >
              <CopySimple size={16} />
            </Button>
          )}
          {onInspect && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onInspect(id)}
              disabled={isSaving}
              className="border-border-strong text-ink-600 hover:bg-secondary"
            >
              <Code size={16} />
            </Button>
          )}
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => onEdit(id)}
            disabled={isSaving}
            className="border-border-strong text-ink-600 hover:bg-secondary"
          >
            <Gear size={16} />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}