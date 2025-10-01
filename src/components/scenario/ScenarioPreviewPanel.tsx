import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

interface ScenarioPreviewPanelProps {
  previewJson: string
  previewYaml: string
}

export function ScenarioPreviewPanel({ previewJson, previewYaml }: ScenarioPreviewPanelProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Scenario JSON Definition</Label>
        <Card className="border-dashed">
          <CardContent className="py-4">
            <pre className="max-h-72 overflow-auto rounded bg-muted p-4 text-xs leading-relaxed">
{previewJson}
            </pre>
          </CardContent>
        </Card>
      </div>

      <div>
        <Label>Scenario YAML Definition</Label>
        <Card className="border-dashed">
          <CardContent className="py-4">
            <pre className="max-h-72 overflow-auto rounded bg-muted p-4 text-xs leading-relaxed">
{previewYaml}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
