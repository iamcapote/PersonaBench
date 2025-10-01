import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Code, Info, X } from "@phosphor-icons/react"

interface PersonaTransparencyData {
  name: string
  markdown: string
  config: {
    archetype: string
    riskTolerance: number
    planningHorizon: string
    deceptionAversion: number
    toolPermissions: string[]
    memoryWindow: number
  }
  sourcePath?: string
  rawDefinition?: Record<string, unknown>
}

interface PersonaTransparencyPanelProps {
  persona: PersonaTransparencyData
  onClose: () => void
}

const formatPercent = (value: number) => `${Math.round(value * 100)}%`

export function PersonaTransparencyPanel({ persona, onClose }: PersonaTransparencyPanelProps) {
  const source = persona.rawDefinition
    ? JSON.stringify(persona.rawDefinition, null, 2)
    : "// Persona created locally; no source definition available."

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <Code size={18} />
            Persona Transparency · {persona.name}
          </CardTitle>
          {persona.sourcePath && (
            <div className="text-xs text-muted-foreground font-mono">{persona.sourcePath}</div>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="self-end md:self-auto">
          <X size={16} className="mr-1" />
          Close
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Info size={16} /> Persona Summary
              </h4>
              <div className="space-y-3 rounded border border-border bg-muted/40 p-3 text-sm">
                <div className="space-y-2">
                  <div className="font-medium">Archetype</div>
                  <div className="text-muted-foreground">{persona.config.archetype}</div>
                </div>
                <div className="h-px bg-border" />
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Risk</div>
                    <div>{formatPercent(persona.config.riskTolerance)}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Horizon</div>
                    <div>{persona.config.planningHorizon}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Deception</div>
                    <div>{formatPercent(persona.config.deceptionAversion)}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Memory Window</div>
                    <div>{persona.config.memoryWindow || "—"}</div>
                  </div>
                </div>
                <div className="h-px bg-border" />
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Tool Permissions</div>
                  <div className="flex flex-wrap gap-1">
                    {persona.config.toolPermissions.length > 0 ? (
                      persona.config.toolPermissions.map((tool) => (
                        <Badge key={tool} variant="outline" className="text-xs">
                          {tool}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground">None specified</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2">Markdown Preview</h4>
              <pre className="max-h-64 overflow-auto rounded border border-border bg-muted/30 p-3 text-xs">
                {persona.markdown}
              </pre>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Persona Source JSON</h4>
              <Badge variant="outline" className="text-xs">json</Badge>
            </div>
            <pre className="max-h-[28rem] overflow-auto rounded border border-border bg-background font-mono text-xs p-3 whitespace-pre">
              {source}
            </pre>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
