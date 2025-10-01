import { Eye, Clock } from "@phosphor-icons/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { formatDisplayValue, formatTimestamp, titleCaseFromSnake } from "@/lib/formatters";

import { ComparisonPairPayload, ComparisonSlot, TargetSelection } from "./types";

interface ComparisonPairViewerProps {
  pair: ComparisonPairPayload | null;
  selection: TargetSelection;
  activeTargetLabel: string;
  loadingPair: boolean;
  submittingVote: boolean;
  selectedWinner: ComparisonSlot | null;
  onSelectWinner: (slot: ComparisonSlot) => void;
}

const getMetadataNumber = (
  metadata: Record<string, unknown> | undefined,
  key: string,
): number | undefined => {
  const value = metadata?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
};

const renderSummary = (summary: Record<string, unknown>) => {
  const entries = Object.entries(summary);
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No summary metrics provided.</p>;
  }
  return (
    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {entries.map(([key, value]) => (
        <div key={key} className="rounded-lg border border-dashed border-border/60 bg-muted/30 p-3">
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">{titleCaseFromSnake(key)}</dt>
          <dd className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground">
            {formatDisplayValue(value)}
          </dd>
        </div>
      ))}
    </dl>
  );
};

const renderJsonBlock = (title: string, payload: Array<Record<string, unknown>>) => {
  if (!payload || payload.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-3 text-sm text-muted-foreground">
        No {title.toLowerCase()} captured.
      </div>
    );
  }

  const preview = payload.slice(0, 4);
  const serializedPreview = preview
    .map((entry, index) => `#${index + 1}\n${formatDisplayValue(entry)}`)
    .join("\n\n");
  const hasExtra = payload.length > preview.length;

  return (
    <div className="space-y-2">
      <pre className="max-h-64 overflow-y-auto rounded-lg bg-background/60 p-3 text-xs font-mono leading-relaxed shadow-inner">
        {serializedPreview}
      </pre>
      {hasExtra && (
        <details className="rounded-lg border border-dashed border-border/50 bg-muted/10 p-3 text-sm">
          <summary className="cursor-pointer select-none font-medium">View complete {title.toLowerCase()} log</summary>
          <pre className="mt-3 max-h-96 overflow-y-auto rounded-md bg-background/80 p-3 text-xs font-mono leading-relaxed shadow-inner">
            {formatDisplayValue(payload)}
          </pre>
        </details>
      )}
    </div>
  );
};

const renderMetadata = (metadata: Record<string, unknown>) => {
  const entries = Object.entries(metadata);
  if (entries.length === 0) {
    return null;
  }
  return (
    <div className="space-y-2 text-xs text-muted-foreground">
      {entries.map(([key, value]) => (
        <div key={key} className="flex gap-2">
          <span className="shrink-0 uppercase tracking-wide text-muted-foreground/80">
            {titleCaseFromSnake(key)}:
          </span>
          <span className="whitespace-pre-wrap break-words text-foreground">{formatDisplayValue(value)}</span>
        </div>
      ))}
    </div>
  );
};

export const ComparisonPairViewer = ({
  pair,
  selection,
  activeTargetLabel,
  loadingPair,
  submittingVote,
  selectedWinner,
  onSelectWinner,
}: ComparisonPairViewerProps) => {
  const comparisonReady = Boolean(pair && pair.responses.length === 2);
  const primaryBadge = pair ? pair.target_kind : selection.kind ?? "unassigned";
  const voteCount = getMetadataNumber(pair?.metadata, "vote_count");

  if (!comparisonReady) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-xs uppercase tracking-wide">
            {primaryBadge}
          </Badge>
          <span className="text-sm font-medium text-foreground">{activeTargetLabel}</span>
        </div>
        <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
          {loadingPair
            ? "Generating anonymised comparison…"
            : "Generate a comparison pair to begin reviewing responses."}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="text-xs uppercase tracking-wide">
          {primaryBadge}
        </Badge>
        {pair?.adapter && pair.adapter.trim().length > 0 && (
          <Badge variant="secondary" className="text-xs uppercase tracking-wide">
            Adapter: {pair.adapter}
          </Badge>
        )}
        {pair?.created_at && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock size={14} />
            {formatTimestamp(pair.created_at)}
          </div>
        )}
        <span className="text-sm font-medium text-foreground">{activeTargetLabel}</span>
        {typeof voteCount === "number" && voteCount > 0 && (
          <Badge variant="outline" className="text-xs">
            {voteCount} prior votes
          </Badge>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {pair?.responses.map((response) => {
          const isSelected = selectedWinner === response.slot;
          return (
            <div
              key={response.response_id}
              className={`relative flex flex-col gap-4 rounded-2xl border p-5 transition-shadow ${
                isSelected
                  ? "border-primary shadow-lg shadow-primary/20"
                  : "border-border hover:border-primary/40 hover:shadow-md"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => onSelectWinner(response.slot)}
                    disabled={submittingVote}
                  >
                    Choose {response.slot}
                  </Button>
                  <Badge variant="outline" className="text-xs uppercase tracking-wide">
                    Slot {response.slot}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  Recorded {formatTimestamp(response.recorded_at)}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Summary Metrics</div>
                  <div className="mt-2">{renderSummary(response.summary)}</div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Eye size={16} className="text-muted-foreground" />
                    <span className="text-sm font-medium">Plan → Act → React Trace</span>
                  </div>
                  {renderJsonBlock("Steps", response.steps)}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Eye size={16} className="text-muted-foreground" />
                    <span className="text-sm font-medium">Structured Logs</span>
                  </div>
                  {renderJsonBlock("Trace", response.trace)}
                </div>

                {renderMetadata(response.metadata)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
