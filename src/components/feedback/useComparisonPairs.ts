import { useCallback, useState } from "react";
import { toast } from "sonner";

import { ComparisonPairPayload, TargetSelection } from "./types";
import { useAdminAuth } from "@/components/app/providers/AdminAuthProvider";

const normalizePair = (payload: ComparisonPairPayload): ComparisonPairPayload => ({
  ...payload,
  responses: [...payload.responses].sort((a, b) => (a.slot > b.slot ? 1 : -1)),
});

export interface PairRequestOutcome {
  pair: ComparisonPairPayload | null;
  status: "success" | "empty" | "error";
}

export interface UseComparisonPairsResult {
  currentPair: ComparisonPairPayload | null;
  loadingPair: boolean;
  error: string | null;
  requestPair: (selection: TargetSelection) => Promise<PairRequestOutcome>;
  clearPair: () => void;
  setError: (value: string | null) => void;
}

export const useComparisonPairs = (): UseComparisonPairsResult => {
  const [currentPair, setCurrentPair] = useState<ComparisonPairPayload | null>(null);
  const [loadingPair, setLoadingPair] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { authorizedApiFetch, hasAdminAccess } = useAdminAuth();

  const clearPair = useCallback(() => {
    setCurrentPair(null);
  }, []);

  const requestPair = useCallback(async (selection: TargetSelection): Promise<PairRequestOutcome> => {
    setLoadingPair(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {};
      if (selection.id) {
        payload.target_id = selection.id;
      }
      if (selection.kind) {
        payload.target_kind = selection.kind;
      }

      if (!hasAdminAccess) {
        const message = "Admin key required to request comparison pairs.";
        setError(message);
        toast.warning(message);
        return { pair: null, status: "error" };
      }

  const response = await authorizedApiFetch("/admin/evaluations/pairs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        if (response.status === 404) {
          setCurrentPair(null);
          const message =
            detail ||
            "No eligible evaluation responses were found. Run additional evaluations and try again.";
          setError(message);
          toast.warning(message);
          return { pair: null, status: "empty" };
        }
        throw new Error(detail || `Failed to generate comparison pair (status ${response.status})`);
      }

      const data: ComparisonPairPayload = await response.json();
      const normalized = normalizePair(data);
      setCurrentPair(normalized);
      toast.success("Comparison pair ready for review.");
      return { pair: normalized, status: "success" };
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Failed to generate comparison pair.";
      setError(message);
      toast.error(message);
      return { pair: null, status: "error" };
    } finally {
      setLoadingPair(false);
    }
  }, [authorizedApiFetch, hasAdminAccess]);

  return {
    currentPair,
    loadingPair,
    error,
    requestPair,
    clearPair,
    setError,
  };
};
