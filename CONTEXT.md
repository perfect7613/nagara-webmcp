# Keepers — domain model

Working title: **Keepers**. Public product name is a human decision (Devpost asks not to let an AI name the submission). Change the visible name in `src/domain/product.ts` if you pick something else.

Keepers is a shared visual workspace where a person and a WebMCP agent organize, select, edit, compose, and export photos together. The canvas is the shared context. This is not an AI photo editor with a chat panel.

## Product verbs

- **Choose** — the human teaches taste by picking between alternatives.
- **Point** — the human tells the agent where to act, by selecting, circling, scribbling, drawing, or writing.
- **Create** — human direction plus agent execution on the same visible workspace.

## Terms

**Workspace**
One project: a photo library, a tldraw canvas, preference state, jobs, and history. The human and the agent share this workspace. There is no separate “agent view.”

**Photo tray**
Library-scale photo organization beside the canvas. Holds groups, unreviewed items, and archived photos. The human never has to leave the canvas to manage the library.

**Asset**
An immutable identity for a photo (or generated image, or canvas export). An asset is not a URL. URLs are replaceable delivery details.

**Version**
One immutable rendering of an asset. Every pixel edit creates a child version. Originals are never overwritten. Multiple generated options are sibling versions.

**Version DAG**
The parent/child graph of versions. Accepting a variant changes which version a placement points at; it does not delete the others.

**Placement**
A canvas occurrence of an asset. Points at an `activeVersionId` and a tldraw shape. The same asset may appear in multiple placements with different active versions.

**Ghost placement**
A placeholder placement created the moment an image job starts, so the canvas reflects the requested action before pixels exist.

**Photo group**
A set of related assets: duplicate, near-duplicate, burst, or similar scene. Groups can carry a recommendation, a confidence, and a review status.

**Human choice**
A recorded comparison: preferred asset, rejected alternatives, inferred feature tradeoffs, and confidence that the choice reveals a stable preference.

**Preference profile**
Interpretable weights learned from human choices (expression vs sharpness, composition, brightness, …). The agent may recommend or resolve high-confidence groups. It must never permanently delete rejected photos.

**Selection**
The current scope of the next action: selected photos, shapes, frames, or annotations. Omitted WebMCP targets mean the current valid selection.

**Spatial intent**
Application meaning extracted from tldraw state: which image, which region, which mask, which frame instruction. The agent receives semantic intent, not raw tldraw JSON.

**Annotation**
A human mark on the canvas used as pointing: circle, rectangle, scribble, arrow, rough sketch, or sticky note.

**Frame note**
A sticky-note or text instruction attached to a frame, treated as a constraint on the photos inside that frame.

**Image job**
An asynchronous pixel operation (inpaint, instruct-edit, enhance, generate, …). Returns immediately with a `jobId` and a ghost placement. Progress and errors stay visible.

**Provenance**
Visible record of how a version was made: actor, time, parent version, operation, prompt, mask, provider, model, parameters.

**Action event**
One labeled entry on the collaboration timeline: actor, operation, affected entities, undo label, timestamp, agent turn.

**Export target**
What can be exported: an active photo version, selected versions, a frame, or the complete canvas.

## Invariants

- Pixels never travel as base64 through WebMCP. Tools use opaque asset/version handles.
- UploadThing stores blobs only. Application truth lives in the catalog.
- Human UI actions and WebMCP tools call the same workspace command module.
- Ambiguous spatial intent returns clarification candidates; it does not edit the wrong asset.
- Archive is reversible. Permanent deletion is a deliberate human action.
- Provider-backed edits require first-use consent and appear in a data-flow log.
- No biometric identification or face naming.
- Demo fallbacks, if used, are explicitly labeled as precomputed examples.

## Actors

- **Human** — chooses, points, arranges, judges, exports.
- **Agent** — reads workspace state through WebMCP, generalizes preferences, executes image jobs, arranges canvas content.
- **System** — thumbnails, analysis, job progress, signed URL delivery.
