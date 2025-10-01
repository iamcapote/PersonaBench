export const AUTO_TARGET_VALUE = "__auto__";

export type ComparisonSlot = "A" | "B";

export interface ComparisonResponse {
  slot: ComparisonSlot;
  response_id: string;
  recorded_at?: string | null;
  adapter?: string | null;
  summary: Record<string, unknown>;
  steps: Array<Record<string, unknown>>;
  trace: Array<Record<string, unknown>>;
  metadata: Record<string, unknown>;
}

export interface ComparisonPairPayload {
  id: string;
  target_id: string;
  target_kind: "scenario" | "game";
  created_at: string;
  adapter?: string | null;
  status: string;
  responses: ComparisonResponse[];
  metadata: Record<string, unknown>;
}

export interface TargetSelection {
  id?: string;
  kind?: "scenario" | "game";
}

export interface ScenarioOption {
  id: string;
  name: string;
  kind?: "scenario" | "game";
  description?: string;
  tags?: string[];
}
