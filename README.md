# Keepers

A collaborative photo workspace where people show intent through **choices, drawings, notes, and layout**, and a **WebMCP** agent turns those signals into organized, edited, export-ready photos.

The canvas is the shared context. This is not an AI photo editor with a chat panel.

> Working title: Keepers. Rename in `src/domain/product.ts` if you want a different public name (Devpost asks humans to name the project).

## Why WebMCP

Without WebMCP, an agent has to scrape the DOM, guess which scribble belongs to which photo, and click around tldraw. Keepers registers intent-level tools on the page:

```js
document.modelContext.registerTool({
  name: "get_spatial_intent",
  description: "Resolve drawings and selection into which photo, region, and notes to act on.",
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
  execute: async () => { /* same workspace commands as the UI */ },
});
```

The human and the agent read and write the **same** workspace. Tool availability changes with state (open group → preference tools; pointed photo → edit tools) using abortable registrations.

## What people and agents do together

1. **Choose** — pick the expressive burst frame over the sharpest one. The preference profile updates in plain language.
2. **Point** — circle the cooler on the lakeside photo. `get_spatial_intent` returns a target and mask, not tldraw JSON.
3. **Create** — `edit_image` starts a job, a ghost variant appears, provenance is visible, the original is never overwritten.

## Run locally

```bash
cp .env.example .env.local
npm install
npm test
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment

| Variable | Required | Purpose |
|---|---|---|
| `UPLOADTHING_TOKEN` | No | Direct uploads for originals / derivatives |
| `HF_TOKEN` | No | Hugging Face Inference Providers for pixel edits |
| `HF_EDIT_MODEL` / `HF_EDIT_PROVIDER` | No | Override the instruct-edit model |
| `TLDRAW_LICENSE_KEY` | No | Removes the tldraw watermark |
| `NEXT_PUBLIC_ALLOW_DEMO_FALLBACK` | Defaults on | Labeled local preview when no HF token |

The tray starts empty. Drop photos to upload them through UploadThing (or keep them locally if the token is missing). **Load demo** in the workspace fills the prepared July weekend collection for judges. Pixel edits without `HF_TOKEN` use a **labeled local preview**, not a silent fake model.

## Test WebMCP

Judges should use **ChatGPT’s in-app browser** (site tools on by default) or **Chrome 149+** with `chrome://flags/#enable-webmcp-testing`.

Suggested prompts:

- “Read the workspace, then surface only the groups that need a taste decision.”
- “I prefer the laughing dock-jump over the sharpest frame. Record that and apply it where you’re confident.”
- “Place the keepers on the canvas. I circled the cooler — remove it.”
- “What is the spatial intent of my drawing?”

You should see `get_workspace_state`, `record_preference`, `get_spatial_intent`, and `edit_image` in the browser’s site-tool list. Tools are registered on the **top-level page** (ChatGPT does not discover iframe tools).

## Stack

- Next.js App Router + React
- tldraw canvas
- WebMCP via `document.modelContext.registerTool` (`use-webmcp-tool`)
- UploadThing for blobs
- Hugging Face Inference Providers behind an `ImageProvider` interface
- Catalog store seam (localStorage adapter now; Convex can be a second adapter)

## Architecture

See `CONTEXT.md` for domain language and `docs/PRD.md` for the product requirements.

Deep modules:

- **Workspace commands** — the only mutation path for UI and agents
- **Spatial intent** — drawings → target photo + region + mask
- **Preference profile** — comparisons → interpretable weights
- **WebMCP registry** — app state → which tools exist

## License

MIT
