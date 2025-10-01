import { useMemo } from "react";
import { ArrowsLeftRight, Shuffle } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { CardDescription, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { ScenarioOption, TargetSelection, AUTO_TARGET_VALUE } from "./types";

export interface ComparisonTargetPickerProps {
  scenarios: ScenarioOption[];
  selectionValue: string;
  selection: TargetSelection;
  loadingPair: boolean;
  submittingVote: boolean;
  onSelectionChange: (value: string) => void;
  onGeneratePair: () => void;
  error?: string | null;
}

export const ComparisonTargetPicker = ({
  scenarios,
  selectionValue,
  selection,
  loadingPair,
  submittingVote,
  onSelectionChange,
  onGeneratePair,
  error,
}: ComparisonTargetPickerProps) => {
  const sortedScenarios = useMemo(
    () => scenarios.slice().sort((a, b) => a.name.localeCompare(b.name)),
    [scenarios],
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-xl">
            <ArrowsLeftRight size={22} className="text-primary" />
            Double-Blind Reviewer Workspace
          </CardTitle>
          <CardDescription>
            Compare anonymised persona responses side-by-side and submit Bradley–Terry votes.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onGeneratePair}
          disabled={loadingPair || submittingVote}
        >
          <Shuffle size={16} className="mr-2" />
          {loadingPair ? "Loading…" : "Generate Pair"}
        </Button>
      </div>

      <div className="space-y-1">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Target</Label>
        <Select value={selectionValue} onValueChange={onSelectionChange}>
          <SelectTrigger disabled={loadingPair || submittingVote}>
            <SelectValue placeholder="Any scenario or game" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={AUTO_TARGET_VALUE}>Any scenario or game</SelectItem>
            {sortedScenarios.map((scenario) => (
              <SelectItem key={scenario.id} value={scenario.id}>
                {scenario.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selection.id && (
          <p className="text-xs text-muted-foreground">
            Constraining comparisons to <span className="font-medium">{selection.id}</span>.
          </p>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      )}
    </div>
  );
};
