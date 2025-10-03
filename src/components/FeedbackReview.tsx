import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader } from "@/components/ui/card";

import {
  AUTO_TARGET_VALUE,
  ComparisonSlot,
  ScenarioOption,
  TargetSelection,
} from "@/components/feedback/types";
import { useComparisonPairs } from "@/components/feedback/useComparisonPairs";
import { ComparisonTargetPicker } from "@/components/feedback/ComparisonTargetPicker";
import { ComparisonPairViewer } from "@/components/feedback/ComparisonPairViewer";
import { VoteComposer } from "@/components/feedback/VoteComposer";
import { useAdminAuth } from "@/components/app/providers/AdminAuthProvider";

interface FeedbackReviewProps {
  scenarios: ScenarioOption[];
}

const getMetadataString = (
  metadata: Record<string, unknown> | undefined,
  key: string,
): string | undefined => {
  const value = metadata?.[key];
  return typeof value === "string" ? value : undefined;
};

export function FeedbackReview({ scenarios }: FeedbackReviewProps) {
  const [selection, setSelection] = useState<TargetSelection>({});
  const [selectionValue, setSelectionValue] = useState<string>(AUTO_TARGET_VALUE);
  const [selectedWinner, setSelectedWinner] = useState<ComparisonSlot | null>(null);
  const [reviewerName, setReviewerName] = useState("");
  const [rationale, setRationale] = useState("");
  const [confidenceInput, setConfidenceInput] = useState("");
  const [submittingVote, setSubmittingVote] = useState(false);

  const { currentPair, loadingPair, error, requestPair, clearPair, setError } = useComparisonPairs();
  const { authorizedApiFetch, hasAdminAccess } = useAdminAuth();

  const activeTargetLabel = useMemo(() => {
    if (!currentPair) {
      return selection.id ? `Awaiting pair for ${selection.id}` : "No comparison loaded";
    }
    const hint = getMetadataString(currentPair.metadata, "target_title");
    if (hint && hint.trim().length > 0) {
      return hint;
    }
    const scenarioMatch = scenarios.find((entry) => entry.id === currentPair.target_id);
    if (scenarioMatch) {
      return scenarioMatch.name;
    }
    return currentPair.target_id;
  }, [currentPair, scenarios, selection.id]);

  const handleTargetChange = useCallback(
    (value: string) => {
      setSelectionValue(value);
      if (value === AUTO_TARGET_VALUE) {
        setSelection({});
        return;
      }
      const match = scenarios.find((entry) => entry.id === value);
      if (match) {
        setSelection({ id: match.id, kind: match.kind === "game" ? "game" : "scenario" });
      } else {
        setSelection({});
      }
    },
    [scenarios],
  );

  const resetVoteState = useCallback(() => {
    setSelectedWinner(null);
    setRationale("");
    setConfidenceInput("");
  }, []);

  const handleGeneratePair = useCallback(async () => {
    const outcome = await requestPair(selection);
    if (outcome.status === "success" || outcome.status === "empty") {
      resetVoteState();
    }
    if (outcome.status === "empty") {
      clearPair();
    }
  }, [requestPair, selection, resetVoteState, clearPair]);

  const handleSubmitVote = useCallback(async () => {
    if (!currentPair || !selectedWinner) {
      toast.error("Select a response before submitting your vote.");
      return;
    }

    const trimmedName = reviewerName.trim();
    const trimmedRationale = rationale.trim();
    const trimmedConfidence = confidenceInput.trim();

    let confidence: number | undefined;
    if (trimmedConfidence.length > 0) {
      const parsed = Number.parseFloat(trimmedConfidence);
      if (Number.isNaN(parsed)) {
        toast.error("Confidence must be a number between 0 and 1.");
        return;
      }
      if (parsed < 0 || parsed > 1) {
        toast.error("Confidence must be between 0 and 1.");
        return;
      }
      confidence = parsed;
    }

    setSubmittingVote(true);
    setError(null);

  try {
      if (!hasAdminAccess) {
        const message = "Admin key required to submit comparison votes.";
        setError(message);
        toast.warning(message);
        setSubmittingVote(false);
        return;
      }

  const response = await authorizedApiFetch(`/admin/evaluations/pairs/${currentPair.id}/votes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          winner_slot: selectedWinner,
          reviewer: trimmedName || undefined,
          rationale: trimmedRationale || undefined,
          confidence,
        }),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error(detail || `Failed to record comparison vote (status ${response.status})`);
      }

      toast.success("Vote recorded. Loading another comparison…");
      await handleGeneratePair();
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Failed to submit vote.";
      setError(message);
      toast.error(err instanceof Error ? err.message : "Failed to submit vote. Try again in a moment.");
    } finally {
      setSubmittingVote(false);
    }
  }, [
  authorizedApiFetch,
    confidenceInput,
    currentPair,
    handleGeneratePair,
    hasAdminAccess,
    rationale,
    reviewerName,
    selectedWinner,
    setError,
  ]);

  const comparisonReady = Boolean(currentPair && currentPair.responses.length === 2);

  return (
    <Card className="border-primary/20 shadow-xl">
      <CardHeader className="space-y-4">
        <ComparisonTargetPicker
          scenarios={scenarios}
          selectionValue={selectionValue}
          selection={selection}
          loadingPair={loadingPair}
          submittingVote={submittingVote}
          onSelectionChange={handleTargetChange}
          onGeneratePair={handleGeneratePair}
          error={error}
        />
      </CardHeader>
      <CardContent className="space-y-6">
        <ComparisonPairViewer
          pair={currentPair}
          selection={selection}
          activeTargetLabel={activeTargetLabel}
          loadingPair={loadingPair}
          submittingVote={submittingVote}
          selectedWinner={selectedWinner}
          onSelectWinner={setSelectedWinner}
        />

        <VoteComposer
          reviewerName={reviewerName}
          confidenceInput={confidenceInput}
          rationale={rationale}
          submittingVote={submittingVote}
          loadingPair={loadingPair}
          comparisonReady={comparisonReady}
          onReviewerChange={(event) => setReviewerName(event.target.value)}
          onConfidenceChange={(event) => setConfidenceInput(event.target.value)}
          onRationaleChange={(event) => setRationale(event.target.value)}
          onResetSelection={resetVoteState}
          onSubmit={handleSubmitVote}
        />
      </CardContent>
    </Card>
  );
}
