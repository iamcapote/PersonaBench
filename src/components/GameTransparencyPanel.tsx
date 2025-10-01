import type { ComponentType } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, Code } from "@phosphor-icons/react"
import type { AssetSnippetPayload, GameAssets } from "@/lib/appTypes"

interface GameTransparencyPanelProps {
  scenarioName: string
  scenarioFamily?: string
  assets?: GameAssets
  loading: boolean
  error?: string | null
}

const MAX_LINES = 120

const truncateContent = (content: string): string => {
  const lines = content.split("\n")
  if (lines.length <= MAX_LINES) return content
  return [...lines.slice(0, MAX_LINES), "…"].join("\n")
}

const AssetSection = ({ title, snippet, icon: Icon }: { title: string; snippet: AssetSnippetPayload; icon: ComponentType<{ size?: number | string; className?: string }> }) => {
  const languageLabel = snippet.language ? snippet.language.toUpperCase() : "TEXT"

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={16} className="text-muted-foreground" />
          <span className="text-sm font-medium">{title}</span>
        </div>
        <Badge variant="outline" className="text-xs">
          {languageLabel}
        </Badge>
      </div>
      <div className="text-xs text-muted-foreground font-mono">{snippet.path}</div>
      <pre className="bg-muted/40 rounded border border-border text-sm font-mono p-3 overflow-auto max-h-80 whitespace-pre-wrap">
        {truncateContent(snippet.content)}
      </pre>
    </div>
  )
}

export function GameTransparencyPanel({ scenarioName, scenarioFamily, assets, loading, error }: GameTransparencyPanelProps) {
  if (!loading && !assets && !error) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Code size={18} />
          Transparency — {scenarioName}
          {scenarioFamily && <Badge variant="secondary" className="text-xs ml-2">{scenarioFamily}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && (
          <div className="text-sm text-muted-foreground">Loading game assets…</div>
        )}

        {error && (
          <div className="text-sm text-destructive">{error}</div>
        )}

        {!loading && !error && assets && (
          <div className="space-y-6">
            <AssetSection title="Game Manifest" snippet={assets.manifest} icon={FileText} />
            {assets.rulePack && (
              <AssetSection title="Rule Pack" snippet={assets.rulePack} icon={FileText} />
            )}
            {assets.adapter && (
              <AssetSection title="Adapter" snippet={assets.adapter} icon={Code} />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
