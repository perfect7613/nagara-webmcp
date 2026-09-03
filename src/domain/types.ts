export type Actor = "human" | "agent" | "system";

export type AssetKind = "photo" | "canvas_export" | "generated";

export type GroupType = "duplicate" | "near_duplicate" | "burst" | "similar";

export type GroupStatus = "unreviewed" | "resolved" | "needs_taste";

export type JobStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "refused";

export type ImageOperation =
  | "instruct_edit"
  | "inpaint"
  | "enhance"
  | "remove_background"
  | "generate"
  | "local_preview";

export type FeatureName =
  | "sharpness"
  | "expression"
  | "composition"
  | "brightness"
  | "faceVisibility";

export interface Asset {
  id: string;
  workspaceId: string;
  kind: AssetKind;
  originalVersionId: string;
  createdAt: number;
  archivedAt?: number;
  demoId?: string;
}

export interface Version {
  id: string;
  assetId: string;
  parentVersionId?: string;
  originalBlobKey?: string;
  previewBlobKey?: string;
  thumbnailBlobKey?: string;
  localSrc: string;
  width: number;
  height: number;
  mimeType: string;
  createdBy: Actor;
  operation?: ImageOperation | "ingest";
  instruction?: string;
  maskBlobKey?: string;
  provider?: string;
  model?: string;
  parameters?: Record<string, unknown>;
  agentTurnId?: string;
  labeledDemoFallback?: boolean;
  createdAt: number;
}

export interface Placement {
  id: string;
  workspaceId: string;
  assetId: string;
  activeVersionId: string;
  tldrawShapeId?: string;
  ghostJobId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface QualitySignals {
  sharpness: number;
  expression: number;
  composition: number;
  brightness: number;
  faceVisibility: number;
}

export interface PhotoAnalysis {
  versionId: string;
  perceptualHash?: string;
  blurScore?: number;
  exposureScore?: number;
  screenshotProbability?: number;
  qualitySignals: QualitySignals;
  capturedAt?: number;
  analyzedAt: number;
  scene?: string;
}

export interface PhotoGroup {
  id: string;
  workspaceId: string;
  type: GroupType;
  assetIds: string[];
  recommendation?: string;
  confidence?: number;
  status: GroupStatus;
  reason: string;
}

export interface FeatureTradeoff {
  feature: FeatureName;
  preferredDirection: "higher" | "lower";
  magnitude: number;
}

export interface HumanChoice {
  id: string;
  workspaceId: string;
  groupId?: string;
  preferredAssetId: string;
  rejectedAssetIds: string[];
  tradeoffs: FeatureTradeoff[];
  confidence: number;
  createdAt: number;
}

export interface PreferenceProfile {
  workspaceId: string;
  weights: Record<FeatureName, number>;
  evidence: Record<FeatureName, number>;
  summaryLines: string[];
  updatedAt: number;
}

export interface ImageJob {
  id: string;
  workspaceId: string;
  operation: ImageOperation;
  status: JobStatus;
  inputVersionIds: string[];
  outputVersionIds: string[];
  placementId?: string;
  instruction?: string;
  idempotencyKey: string;
  progress?: number;
  errorCode?: string;
  errorMessage?: string;
  requestedBy: Actor;
  labeledDemoFallback?: boolean;
  createdAt: number;
  completedAt?: number;
}

export interface ActionEvent {
  id: string;
  actor: Actor;
  operation: string;
  summary: string;
  undoLabel: string;
  affectedAssetIds: string[];
  agentTurnId?: string;
  createdAt: number;
}

export interface SelectionState {
  assetIds: string[];
  placementIds: string[];
  groupId?: string;
  shapeIds: string[];
  openGroupId?: string;
}

export interface ConsentState {
  externalProvider: boolean;
  acceptedAt?: number;
}

export interface Catalog {
  workspaceId: string;
  name: string;
  assets: Asset[];
  versions: Version[];
  placements: Placement[];
  analyses: PhotoAnalysis[];
  groups: PhotoGroup[];
  choices: HumanChoice[];
  preference: PreferenceProfile;
  jobs: ImageJob[];
  events: ActionEvent[];
  selection: SelectionState;
  consent: ConsentState;
  updatedAt: number;
}

export interface CommandResult {
  ok: boolean;
  summary: string;
  clarification?: string;
  jobId?: string;
  stateChanges: string[];
  data?: Record<string, unknown>;
}

export interface WorkspaceSnapshot {
  name: string;
  workspaceId: string;
  photoCount: number;
  archivedCount: number;
  groups: Array<{
    id: string;
    type: GroupType;
    status: GroupStatus;
    assetIds: string[];
    recommendation?: string;
    confidence?: number;
    reason: string;
  }>;
  selection: SelectionState;
  preference: PreferenceProfile;
  openJobs: Array<{
    id: string;
    operation: ImageOperation;
    status: JobStatus;
    progress?: number;
  }>;
  placements: Array<{
    id: string;
    assetId: string;
    activeVersionId: string;
    ghost: boolean;
  }>;
  recentEvents: ActionEvent[];
  consent: ConsentState;
}
