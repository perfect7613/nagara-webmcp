# WebMCP Human–Agent Photo Workspace — Final Product Plan

## 1. Product definition

Build a shared visual workspace where a person and an AI agent organize, select, edit, compose, and export photos together.

The core interaction is:

> The human expresses taste and spatial intent through choices, selections, drawings, placement, and notes. The agent reads those signals through WebMCP, applies them at scale, and changes the same visible workspace non-destructively.

This is not an AI photo editor with a chat panel. The canvas is the shared context between the human and the agent.

### Product promise

Users can:

- upload a messy set of photos;
- let the agent group similar shots and surface uncertain decisions;
- teach the agent their taste by choosing between alternatives;
- place photos on a canvas and point, circle, scribble, draw, or write what should change;
- ask the agent to edit pixels or arrange canvas elements;
- compare variants, inspect provenance, undo any action, and export the result.

### Three product verbs

**Choose. Point. Create.**

- Choose teaches the agent what matters.
- Point tells the agent where to act.
- Create combines human direction with agent execution.

## 2. Why WebMCP is essential

Without WebMCP, an agent must inspect DOM elements, infer the selected photo, guess which drawing refers to which image, and operate controls indirectly.

With WebMCP, the page exposes semantic application state and intent-level actions:

- current selection and viewport;
- photo groups and recommendations;
- human choices and learned preferences;
- canvas frames, notes, annotations, and image placements;
- normalized image-edit masks and regions;
- versions, variants, jobs, provenance, and export targets.

The defining loop is:

```text
human changes the workspace
        ↓
page state becomes agent-readable through WebMCP
        ↓
agent performs a meaningful application action
        ↓
the same visible workspace changes
        ↓
human evaluates, adjusts, or continues
```

WebMCP tools are registered with structured schemas through `document.modelContext.registerTool`. Tool availability changes with application state and permissions, using abortable registrations so the agent sees only relevant capabilities.

## 3. User experience

Use one canvas-centered application rather than separate disconnected products.

### Main layout

```text
┌─────────────────────────────────────────────────────────────┐
│ Project name       Sync status        Undo       Export     │
├──────────────┬───────────────────────────────┬──────────────┤
│ Photo tray   │                               │ Agent dock   │
│              │        tldraw canvas          │              │
│ Groups       │                               │ Activity     │
│ Unreviewed   │                               │ Jobs         │
│ Archived     │                               │ Provenance   │
│              │                               │              │
├──────────────┴───────────────────────────────┴──────────────┤
│ Versions / variants for the current selection              │
└─────────────────────────────────────────────────────────────┘
```

The photo tray handles library-scale work without forcing the user to leave the canvas. Review queues, version history, and export open as focused drawers or panels.

### End-to-end journey

1. The user uploads photos or opens a built-in demo collection.
2. The app creates thumbnails, extracts safe metadata, and computes similarity and quality signals.
3. The agent groups duplicates and bursts, then places uncertain groups into a review tray.
4. The human picks preferred shots. The application records both the choice and the feature tradeoff behind it.
5. The agent applies the learned preference to similar groups and leaves low-confidence cases for the human.
6. Selected photos are placed on the canvas in frames such as “Keepers,” “Postcard,” or “Carousel.”
7. The human circles or scribbles over an object, selects the photo, and asks the agent to remove it.
8. WebMCP resolves the drawing into a normalized source-image mask, starts an asynchronous edit, and immediately places a ghost result beside the original.
9. Completed variants appear in a comparison tray. The human accepts one or keeps several.
10. The human writes a note such as “warmer, less contrast” on a frame. The agent applies the note to the photos in that frame.
11. The user and agent arrange text, shapes, and photos into a final composition.
12. The user exports a photo derivative, selected photos, or the complete canvas.

## 4. Core capabilities

### A. Photo ingestion and analysis

- Direct client uploads to UploadThing.
- Immutable originals.
- Thumbnail and preview derivatives.
- Perceptual hashing for exact and near duplicates.
- Embeddings plus capture-time proximity for bursts and similar scenes.
- Simple quality signals: blur, exposure, resolution, face visibility, and composition.
- Screenshot detection.
- No claim that the system knows which memory is emotionally best.

### B. Preference learning

The system learns from comparisons rather than asking the user to configure sliders.

For each human choice, store:

- preferred and rejected photos;
- relevant feature differences;
- confidence that the choice reveals a stable preference;
- which unresolved groups would be affected.

The preference model should remain legible. Show conclusions such as:

```text
Expression is usually more important than maximum sharpness.
Composition is important.
Brightness has weak evidence.
```

The agent may recommend or resolve groups above a user-visible confidence threshold. It must never permanently delete rejected photos.

### C. Spatial intent

The user can communicate location and layout with:

- selection — scope of the next action;
- circle or rectangle — region of interest;
- scribble — direct edit mask;
- arrow — target or relationship;
- rough sketch — desired visual addition;
- sticky note — instruction or frame-level constraint;
- spatial arrangement — grouping, priority, and sequence.

A dedicated spatial-intent resolver converts tldraw state into application semantics. The agent receives semantic intent, not raw tldraw JSON.

The resolver must account for:

- image translation, scale, rotation, and crop;
- page-to-shape and shape-to-source transforms;
- annotation overlap and explicit selection;
- clipping to image bounds;
- rasterization of scribbles into an alpha mask;
- ambiguity when one annotation touches multiple images.

Ambiguous targeting returns a clarification result instead of editing the wrong asset.

### D. Canvas-level editing

Use native tldraw operations for deterministic changes:

- place, move, resize, align, and arrange photos;
- create frames and groups;
- add or edit text;
- add arrows, shapes, labels, and decorations;
- create grid, comparison, postcard, contact-sheet, and carousel layouts.

Do not call an image model for operations that can be performed losslessly on the canvas.

### E. Pixel-level editing

Use a provider-agnostic server-side image-edit pipeline for:

- object removal / inpainting;
- instruction-based editing;
- enhance / denoise / upscale;
- relighting and color consistency;
- background removal or replacement;
- sketch-guided additions;
- optional image generation.

Hugging Face Inference Providers can be the first adapter. Other providers can be added behind the same capability contract.

Every operation creates a new immutable version. An edit never overwrites its input.

### F. Variants, provenance, and undo

- Every edit creates a child in a version DAG.
- Multiple generated options are sibling versions.
- Each canvas placement points to an active version.
- The same asset may appear in multiple placements with different active versions.
- Accepting a variant changes the placement pointer; it does not delete alternatives.
- Every agent canvas mutation is one labeled tldraw undo transaction.
- The provenance panel shows actor, time, parent version, operation, prompt, mask, provider, model, and parameters.
- Archive is reversible. Permanent deletion remains a deliberate human action.

### G. Export

Export targets:

- active photo version;
- selected photo versions;
- a canvas frame;
- the complete canvas.

Formats:

- PNG;
- JPEG;
- WebP;
- SVG for compatible canvas compositions;
- ZIP for multiple assets.

Presets can cover social posts, stories, contact sheets, wallpapers, and original resolution. Originals remain untouched.

## 5. WebMCP tool surface

Expose intent-level tools. Avoid one tool per low-level canvas mutation.

### Read and navigation

```text
get_workspace_state
get_selection
look_at
find_photos
get_photo_group
get_versions
get_job
focus_on
```

### Library and taste

```text
group_photos
create_review_queue
record_preference
apply_preferences
archive_photos
restore_photos
```

### Canvas and spatial intent

```text
get_spatial_intent
place_photos
arrange_selection
create_canvas_content
```

### Image operations

```text
edit_image
enhance_images
generate_image
accept_variant
revert_placement
```

### Export

```text
get_export_options
prepare_export
```

### Tool-design rules

- Defaults are selection-aware: omitted targets mean the current valid selection.
- Read tools return bounded semantic JSON.
- Pixels never travel as base64 in tool arguments or results; tools use opaque asset/version handles.
- Image tools return immediately with a `jobId` and placeholder placement.
- Mutating calls accept idempotency keys.
- Large, expensive, destructive, or external-provider operations require confirmation.
- Tool results include a human-readable summary and machine-readable state changes.
- Tool handlers use the same application services as the visible UI so agent and human actions cannot diverge.

### Context-sensitive registration

Always expose safe read tools. Register additional tools according to state:

- a photo group is open → preference tools;
- a valid image and annotation are selected → image-edit tools;
- several shapes are selected → arrange tools;
- an exportable frame is selected → export tools;
- the privacy policy permits a provider → provider-backed tools.

Use an `AbortController` for each contextual tool set and abort it when the context becomes invalid.

## 6. Architecture

```text
Next.js + React application
        │
        ├── tldraw document and selection state
        ├── WebMCP registry and tool handlers
        ├── UploadThing direct uploads
        └── realtime catalog/job subscriptions
                         │
                         ▼
                 Application services
        ┌────────────────┼──────────────────┐
        ▼                ▼                  ▼
 Metadata/state     Image job worker     Export service
 (Convex)           (server-side)        (server-side)
        │                │                  │
        └──────────┬─────┴──────────────────┘
                   ▼
             UploadThing blobs
                   │
                   ▼
          Image provider adapters
```

### Responsibilities

**tldraw**

- shapes, frames, notes, selection, viewport, and undo;
- custom image placement metadata;
- canvas rendering and compatible exports.

**UploadThing**

- originals, thumbnails, previews, masks, derivatives, and rendered exports;
- signed/private delivery where supported;
- binary storage only, never application truth.

**Convex**

- users and workspaces;
- asset catalog and versions;
- groups, analysis, choices, and preference profiles;
- placements, jobs, action events, and export records;
- realtime updates between the UI and WebMCP-triggered work.

**Image worker**

- fetches authorized source versions;
- prepares model-specific masks and dimensions;
- calls provider adapters;
- normalizes failures;
- writes derivatives to UploadThing;
- creates version and provenance records;
- updates job progress.

## 7. Data model

### `assets`

```ts
{
  id, workspaceId, ownerId,
  kind: "photo" | "canvas_export" | "generated",
  originalVersionId,
  createdAt, archivedAt?
}
```

### `versions`

```ts
{
  id, assetId, parentVersionId?,
  originalBlobKey, previewBlobKey, thumbnailBlobKey,
  width, height, mimeType, sha256,
  createdBy: "human" | "agent" | "system",
  operation,
  instruction?, maskBlobKey?,
  provider?, model?, parameters?, agentTurnId?,
  createdAt
}
```

### `placements`

```ts
{
  id, workspaceId, assetId, activeVersionId,
  tldrawShapeId, createdAt, updatedAt
}
```

The tldraw shape references a tldraw asset plus `placementId`. The asset resolver obtains the active version and a signed image URL. URLs are replaceable delivery details, not identity.

### `photoAnalysis`

```ts
{
  versionId,
  perceptualHash?, embeddingRef?,
  blurScore?, exposureScore?, faceCount?,
  screenshotProbability?, qualitySignals?,
  capturedAt?, analyzedAt
}
```

### `photoGroups`

```ts
{
  id, workspaceId,
  type: "duplicate" | "near_duplicate" | "burst" | "similar",
  assetIds[], recommendation?, confidence?, status
}
```

### `humanChoices` and `preferenceProfiles`

Store the selected asset, rejected alternatives, inferred feature tradeoffs, confidence, and the current interpretable preference weights.

### `jobs`

```ts
{
  id, workspaceId, operation, status,
  inputVersionIds[], outputVersionIds[],
  idempotencyKey, progress?, errorCode?,
  requestedBy, createdAt, completedAt?
}
```

### `actionEvents`

Store actor, operation, affected entities, undo label, timestamp, and agent turn. This powers the visible collaboration timeline.

## 8. Image-provider contract

```ts
type Capability =
  | "instruct_edit"
  | "inpaint"
  | "upscale"
  | "remove_background"
  | "segment"
  | "generate"

interface ImageProvider {
  capabilities: Capability[]
  edit(input: {
    sourceUrl: string
    instruction: string
    maskUrl?: string
    strength?: number
    outputCount?: number
  }): Promise<ProviderResult>
}
```

Normalize:

- masks as 8-bit alpha PNG;
- strength to a provider-independent `0..1` range;
- output metadata and safety results;
- errors as `refused`, `too_large`, `rate_limited`, `transient`, or `failed`.

Provider selection must respect capability and privacy policy before cost or quality preferences.

## 9. Privacy and safety

- Private workspaces and tenant-scoped authorization.
- Short-lived signed URLs for provider and browser access.
- Provider API keys only on the server.
- Strip GPS and camera identifiers from normal derivatives by default.
- Never perform biometric identification or face naming.
- Show first-use consent before photos are sent to an external image provider.
- Record asset egress in a visible data-flow log.
- Allow local-only deterministic edits such as crop, rotate, resize, and basic color adjustments.
- Immutable originals, reversible archive, and versioned agent edits.
- Confirmation for permanent deletion, bulk changes, external processing, or paid operations.
- Rate limits, file validation, size limits, and content-type verification on upload.

## 10. Reliability and failure behavior

- All slow image operations are asynchronous jobs.
- A ghost placement appears immediately so the canvas reflects the requested action.
- Retry transient provider and upload failures with the same idempotency key.
- Preserve failed jobs and their inputs; never leave unexplained blank shapes.
- If spatial intent is ambiguous, return candidate targets and request clarification.
- If a provider refuses an edit, report refusal distinctly from an outage.
- Use honest precomputed examples only as an explicitly labeled demo fallback.
- Cache thumbnails and previews; use full-resolution files only for final processing and export.

## 11. Quality bar and acceptance criteria

The product is complete when all of these are true:

### Shared state

- Human selection, frames, notes, and annotations are correctly reflected in WebMCP tool results.
- Agent tool calls update the same visible state used by manual UI actions.
- Contextual tools appear and disappear as their preconditions change.

### Photo organization

- Similar photos can be grouped and reviewed.
- Human choices update an interpretable preference profile.
- Preferences can resolve high-confidence groups while preserving uncertain cases.
- Archived photos can be restored.

### Spatial editing

- A hosted photo renders correctly in tldraw.
- Circle, scribble, arrow, and selection targets resolve correctly through scale, rotation, and crop.
- Ambiguous annotations do not trigger edits.
- A successful provider result becomes a new version and appears beside its source.

### Collaboration

- Human and agent actions appear in one activity timeline.
- Agent canvas mutations are grouped into meaningful undo steps.
- Frame notes and spatial arrangement can guide an agent operation.
- The agent can arrange selected content without issuing low-level coordinate commands.

### Versions and export

- Originals cannot be overwritten.
- Variants branch from the correct parent and can be compared or accepted.
- Provenance is visible for every generated version.
- PNG, JPEG, WebP, and compatible SVG exports work.

### Security and reliability

- Signed URLs and authorization prevent cross-workspace access.
- External image operations require the configured consent.
- Jobs survive refreshes and expose clear progress or errors.
- Tool calls are idempotent and do not duplicate outputs on retry.

## 12. Canonical product demonstration

Use a prepared collection containing bursts, near-duplicates, a clear unwanted object, and photos suitable for a composition.

1. Ask the agent to group the collection by scene and surface only decisions that require taste.
2. Choose one expressive but slightly less sharp photo over the agent's technically sharper recommendation.
3. Show the learned preference and let the agent apply it to related groups.
4. Move the keepers into a canvas frame.
5. Circle the unwanted object and say, “Remove this.”
6. Show `get_spatial_intent` resolving the human drawing, then an edit job creating a ghost variant beside the original.
7. Accept the best completed variant and open its provenance.
8. Add a sticky note to the frame—“warm, consistent, postcard layout”—and ask the agent to apply the frame instructions.
9. Adjust one item manually, ask the agent to rebalance the layout, then export the frame.

This demonstrates the complete thesis: the human teaches, points, arranges, and judges; the agent generalizes, executes, and organizes; both continuously modify the same semantic visual workspace.

## 13. Positioning

Do not position the product as an AI Photoshop, a Google Photos clone, or a chat-controlled editor.

Use this description:

> A collaborative photo workspace where people show their intent through choices, drawings, notes, and layout, and a WebMCP agent turns those signals into organized, edited, export-ready photos.

Use this WebMCP explanation:

> The page is not an interface the agent operates indirectly. It is a shared semantic workspace where the human and agent can understand and modify the same state.

## 14. Deliberate exclusions

- No separate React Flow editor; the version DAG appears in a compact provenance panel.
- No arbitrary low-level canvas tool surface.
- No pixels or base64 payloads through WebMCP.
- No public image URLs as permanent identity.
- No destructive agent deletion.
- No face recognition or identity clustering.
- No provider-specific logic outside adapters.
- No disconnected library and editor experiences.
- No silent autonomous bulk edits.
- No model-generated output presented as certain or as the original.
