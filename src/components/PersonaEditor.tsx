import { useMemo, useState, type FormEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface PersonaConfig {
  archetype: string;
  riskTolerance: number;
  planningHorizon: string;
  deceptionAversion: number;
  toolPermissions: string[];
  memoryWindow: number;
}

interface PersonaData {
  id: string;
  name: string;
  markdown: string;
  config: PersonaConfig;
  lastScore?: number;
  source?: "remote" | "local";
}

interface PersonaEditorProps {
  persona?: PersonaData;
  onSave: (persona: Omit<PersonaData, "id">) => void;
  onCancel: () => void;
}

const TOOL_PRESET = ["calendar", "search", "calculator"];

const buildTemplate = (
  name: string,
  summary: string,
  archetype: string,
  planningHorizon: string,
  riskTolerance: number,
  deceptionAversion: number,
  tools: string[],
) => {
  const lines = [
    `# ${name || "New Persona"}`,
    "",
    "## Overview",
    summary || "Describe this persona's mission and primary behaviors.",
    "",
    "## Behavioral Traits",
    `- Planning horizon: ${planningHorizon || "3 steps"}`,
    `- Risk tolerance: ${(riskTolerance * 100).toFixed(0)}%`,
    `- Deception aversion: ${(deceptionAversion * 100).toFixed(0)}%`,
    "",
    "## Tool Preferences",
    ...(tools.length > 0 ? tools.map((tool) => `- ${tool}`) : ["- None specified"]),
    "",
    "## Negotiation Style",
    archetype || "Strategic decision-maker",
  ];
  return lines.join("\n");
};

export function PersonaEditor({ persona, onSave, onCancel }: PersonaEditorProps) {
  const [activeTab, setActiveTab] = useState("details");
  const [name, setName] = useState(persona?.name ?? "");
  const [summary, setSummary] = useState(() => {
    if (!persona?.markdown) return "";
    const overview = persona.markdown
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line && !line.startsWith("#"));
    return overview ?? "";
  });
  const [archetype, setArchetype] = useState(persona?.config.archetype ?? "Strategic decision-maker");
  const [riskTolerance, setRiskTolerance] = useState<number>(persona?.config.riskTolerance ?? 0.5);
  const [planningHorizon, setPlanningHorizon] = useState(persona?.config.planningHorizon ?? "3 steps");
  const [deceptionAversion, setDeceptionAversion] = useState<number>(persona?.config.deceptionAversion ?? 0.4);
  const [memoryWindow, setMemoryWindow] = useState<number>(persona?.config.memoryWindow ?? 5);
  const [toolInput, setToolInput] = useState<string>((persona?.config.toolPermissions ?? TOOL_PRESET).join(", "));
  const [markdown, setMarkdown] = useState(() => persona?.markdown ?? buildTemplate(name, summary, archetype, planningHorizon, riskTolerance, deceptionAversion, TOOL_PRESET));

  const tools = useMemo(
    () =>
      toolInput
        .split(",")
        .map((item: string) => item.trim())
        .filter(Boolean),
    [toolInput],
  );

  const canSave = name.trim().length > 0 && markdown.trim().length > 0;

  const regenerateMarkdown = () => {
    setMarkdown(buildTemplate(name, summary, archetype, planningHorizon, riskTolerance, deceptionAversion, tools));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSave) return;

    onSave({
      name: name.trim(),
      markdown,
      config: {
        archetype: archetype.trim() || "Strategic decision-maker",
        riskTolerance,
        planningHorizon: planningHorizon || "3 steps",
        deceptionAversion,
        toolPermissions: tools.length > 0 ? tools : TOOL_PRESET,
        memoryWindow,
      },
      lastScore: persona?.lastScore,
      source: persona?.source ?? "local",
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">{persona ? "Edit Persona" : "Create Persona"}</h2>
          <p className="text-sm text-muted-foreground">
            Configure persona attributes and markdown documentation for evaluation.
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={!canSave}>
            Save Persona
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Persona details</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Overview</TabsTrigger>
              <TabsTrigger value="configuration">Configuration</TabsTrigger>
              <TabsTrigger value="markdown">Markdown</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="persona-name">Persona name</Label>
                  <Input
                    id="persona-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="e.g., Cooperative Planner"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="persona-archetype">Archetype</Label>
                  <Input
                    id="persona-archetype"
                    value={archetype}
                    onChange={(event) => setArchetype(event.target.value)}
                    placeholder="Negotiation style or behavioral pattern"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="persona-summary">Overview summary</Label>
                <Textarea
                  id="persona-summary"
                  value={summary}
                  onChange={(event) => setSummary(event.target.value)}
                  placeholder="Brief description shown in persona listings"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="persona-tools">Tool permissions</Label>
                <Input
                  id="persona-tools"
                  value={toolInput}
                  onChange={(event) => setToolInput(event.target.value)}
                  placeholder="Comma separated list, e.g., calendar, search"
                />
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {tools.length > 0 ? tools.map((tool) => <Badge key={tool}>{tool}</Badge>) : <span>No tools configured</span>}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="configuration" className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="persona-risk">Risk tolerance</Label>
                  <Input
                    id="persona-risk"
                    type="number"
                    min={0}
                    max={1}
                    step={0.05}
                    value={riskTolerance}
                    onChange={(event) => setRiskTolerance(Number(event.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Value between 0 and 1 describing appetite for risk.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="persona-deception">Deception aversion</Label>
                  <Input
                    id="persona-deception"
                    type="number"
                    min={0}
                    max={1}
                    step={0.05}
                    value={deceptionAversion}
                    onChange={(event) => setDeceptionAversion(Number(event.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Higher values prefer truthful strategies.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="persona-planning">Planning horizon</Label>
                  <Input
                    id="persona-planning"
                    value={planningHorizon}
                    onChange={(event) => setPlanningHorizon(event.target.value)}
                    placeholder="e.g., 4 steps"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="persona-memory">Memory window</Label>
                  <Input
                    id="persona-memory"
                    type="number"
                    min={0}
                    step={1}
                    value={memoryWindow}
                    onChange={(event) => setMemoryWindow(Number(event.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Button type="button" variant="outline" onClick={regenerateMarkdown}>
                  Refresh markdown template
                </Button>
                <p className="text-xs text-muted-foreground">
                  Regenerates markdown using the current configuration. Manual edits to the markdown field can be applied afterward.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="markdown" className="space-y-2">
              <Label htmlFor="persona-markdown">Persona markdown</Label>
              <Textarea
                id="persona-markdown"
                value={markdown}
                onChange={(event) => setMarkdown(event.target.value)}
                rows={16}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                The markdown is stored verbatim and provided to persona agents during evaluation.
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </form>
  );
}
