export type ScenarioKind = "scenario" | "game"

export interface PersonaData {
	id: string
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
	lastScore?: number
	source?: "remote" | "local"
	sourcePath?: string
	rawDefinition?: Record<string, any>
}

export interface PersonaSummaryResponse {
	name: string
	version: string
	description?: string
	risk_tolerance?: number
	planning_horizon?: number | string
	deception_aversion?: number
	memory_window?: number
	tools?: string[]
	definition?: Record<string, any>
	source_path?: string
}

export interface ScenarioData {
	id: string
	name: string
	description: string
	domain: "games" | "social" | "web" | "text" | "reasoning" | "creative" | "technical"
	difficulty: "easy" | "medium" | "hard"
	estimatedTime: number
	instructions: string
	setupSteps: string[]
	evaluationCriteria: Array<{
		id: string
		name: string
		description: string
		weight: number
		type: "algorithmic" | "human" | "both"
	}>
	expectedOutputFormat: string
	context: string
	constraints: string[]
	tags: string[]
	source?: "remote" | "local"
	kind?: ScenarioKind
	family?: string
	sourcePath?: string
	rawDefinition?: Record<string, any>
	environment?: string
}

export interface ScenarioSummaryResponse {
	key: string
	title: string
	environment: string
	tags: string[]
	description?: string
	mode?: string
	definition?: Record<string, any>
	source_path?: string
}

export interface GameSummaryResponse {
	key: string
	title: string
	family: string
	tags: string[]
	description?: string
	mode?: string
	difficulty?: string
	estimated_time?: number
	definition?: Record<string, any>
	source_path?: string
}

export interface AssetSnippetPayload {
	path: string
	content: string
	language?: string | null
}

export interface GameAssets {
	manifest: AssetSnippetPayload
	rulePack?: AssetSnippetPayload | null
	adapter?: AssetSnippetPayload | null
}

export interface GameAssetResponseApi {
	manifest: AssetSnippetPayload
	rule_pack?: AssetSnippetPayload | null
	adapter?: AssetSnippetPayload | null
}

export type EvaluationQueueStatus = "queued" | "running" | "completed" | "failed"

export type EvaluationTargetKind = "scenario" | "game"

export interface EvaluationQueueItem {
	id: string
	personaId: string
	scenarioId: string
	targetKind: EvaluationTargetKind
	status: EvaluationQueueStatus
	requestedAt: string
	startedAt?: string
	completedAt?: string
	error?: string
	metadata?: Record<string, unknown>
}

export interface EvaluationQueueResponse {
	id: string
	persona_id: string
	target_id: string
	target_kind: EvaluationTargetKind
	status: string
	requested_at: string
	started_at?: string | null
	completed_at?: string | null
	error?: string | null
	metadata?: Record<string, unknown> | null
}

export interface EvaluationResult {
	personaId: string
	scenarioId: string
	type: "algorithmic" | "human"
	scores: Record<string, number>
	overallScore: number
	timestamp: string
	response?: string
	humanEvaluatorId?: string
}

export interface AuditEvent {
	id: string
	timestamp: string
	actor: string
	action: string
	subject: string
	status: "success" | "failure"
	metadata?: Record<string, unknown>
}

export interface AuditEventResponse {
	id: string
	timestamp: string
	actor: string
	action: string
	subject: string
	status: string
	metadata?: Record<string, unknown> | null
}
