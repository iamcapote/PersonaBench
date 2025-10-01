import { ChangeEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface VoteComposerProps {
  reviewerName: string;
  confidenceInput: string;
  rationale: string;
  submittingVote: boolean;
  loadingPair: boolean;
  comparisonReady: boolean;
  onReviewerChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onConfidenceChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRationaleChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onResetSelection: () => void;
  onSubmit: () => void;
}

export const VoteComposer = ({
  reviewerName,
  confidenceInput,
  rationale,
  submittingVote,
  loadingPair,
  comparisonReady,
  onReviewerChange,
  onConfidenceChange,
  onRationaleChange,
  onResetSelection,
  onSubmit,
}: VoteComposerProps) => (
  <div className="space-y-5">
  <div className="grid gap-3 md:grid-cols-2">
      <div className="space-y-1">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Reviewer</Label>
        <Input
          placeholder="Optional reviewer handle"
          value={reviewerName}
          onChange={onReviewerChange}
          disabled={submittingVote}
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Confidence (0-1)</Label>
        <Input
          type="number"
          min="0"
          max="1"
          step="0.05"
          placeholder="e.g. 0.7"
          value={confidenceInput}
          onChange={onConfidenceChange}
          disabled={submittingVote}
        />
      </div>
    </div>

    <div className="space-y-3">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">Rationale (optional)</Label>
      <Textarea
        placeholder="Explain the decisive factors behind your selection."
        value={rationale}
        onChange={onRationaleChange}
        disabled={submittingVote}
        rows={4}
      />
    </div>

    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="text-xs text-muted-foreground">
        Votes are logged to the feedback pipeline and aggregated via Bradley–Terry ranking.
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="ghost" onClick={onResetSelection} disabled={submittingVote && !loadingPair}>
          Clear selection
        </Button>
        <Button
          type="button"
          onClick={onSubmit}
          disabled={!comparisonReady || submittingVote || loadingPair}
        >
          {submittingVote ? "Submitting…" : "Submit vote"}
        </Button>
      </div>
    </div>
  </div>
);
