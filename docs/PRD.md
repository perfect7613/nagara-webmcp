# PRD: Keepers — human–agent photo workspace

## Problem Statement

Photographers, families, and small creative teams dump hundreds of near-duplicate shots into a folder and then lose an evening to culling, retouching, and layout. Today’s “AI photo editors” put a chat panel next to a canvas the agent cannot actually see: the agent guesses which photo is selected, which scribble belongs to which image, and which slider the human meant. The human and the agent do not share a workspace. Taste stays trapped in one person’s head. Pointing stays trapped in pixels the agent cannot name.

## Solution

Keepers is a single canvas-centered workspace where a person and a WebMCP agent share the same photos, groups, drawings, notes, versions, and jobs.

The human expresses taste and spatial intent by choosing, selecting, circling, scribbling, arranging, and writing notes. The page exposes that state as intent-level WebMCP tools. The agent groups, recommends, edits, and arranges at scale — and every action shows up on the same light table, with undo, provenance, and no overwritten originals.

Product verbs: **Choose. Point. Create.**

## User Stories

1. As a photographer, I want to dump a weekend of photos into one workspace, so that I do not have to jump between a library app and an editor.
2. As a photographer, I want similar bursts grouped for me, so that I only spend attention on decisions that need taste.
3. As a photographer, I want the agent to admit when two shots are a taste call, so that it does not silently pick the sharpest frame.
4. As a photographer, I want to keep the laughing, slightly softer frame, so that the agent learns expression matters more than maximum sharpness.
5. As a photographer, I want to see that lesson in plain language, so that I can trust or correct the preference profile.
6. As a photographer, I want the agent to apply that lesson to similar groups, so that I am not repeating the same comparison.
7. As a photographer, I want uncertain groups left for me, so that the agent never bulk-decides my memories.
8. As a family member, I want to archive rejects without deleting them, so that I can restore a shot later.
9. As a family member, I want rejected photos to remain in the catalog, so that an agent cannot destroy originals.
10. As a photographer, I want to place keepers onto a canvas, so that layout and library live in one place.
11. As a photographer, I want frames such as Keepers, Postcard, or Carousel, so that I can think in outputs rather than files.
12. As a photographer, I want to circle an object on a photo, so that I can point without writing coordinates.
13. As a photographer, I want a scribble to become a mask on the source image, so that inpainting follows my mark through pan, zoom, and crop.
14. As a photographer, I want an arrow or note to count as pointing, so that I can brief the agent the way I brief a retoucher.
15. As a photographer, I want ambiguous drawings to pause for clarification, so that the agent does not edit the wrong photo.
16. As a photographer, I want to say “remove this” after pointing, so that the agent uses spatial intent instead of guessing.
17. As a photographer, I want a ghost variant to appear immediately, so that the canvas shows the job I just asked for.
18. As a photographer, I want completed variants beside the original, so that I can compare before accepting.
19. As a photographer, I want accepting a variant to change the placement pointer only, so that alternatives stay in the version DAG.
20. As a photographer, I want to revert a placement to the original, so that an agent edit is never permanent.
21. As a photographer, I want provenance for every generated version, so that I know who, when, which model, and which prompt.
22. As a photographer, I want a sticky note on a frame (“warm, consistent, postcard”), so that the agent can apply a brief to several photos.
23. As a photographer, I want the agent to arrange selected photos as a grid or postcard without coordinate math, so that layout stays lossless.
24. As a photographer, I want deterministic canvas moves (align, resize, text) to skip the image model, so that I do not pay or wait for lossless work.
25. As a photographer, I want to export a frame, a photo, or the whole canvas, so that I can leave with a file.
26. As a photographer, I want originals untouched by export presets, so that I can still go back to full resolution.
27. As an agent, I want `get_workspace_state`, so that I can see groups, selection, jobs, and placements without scraping the DOM.
28. As an agent, I want `get_spatial_intent`, so that I receive a photo handle and region instead of raw tldraw JSON.
29. As an agent, I want omitted targets to mean the current selection, so that I do not re-specify what the human already pointed at.
30. As an agent, I want mutating tools to take an idempotency key, so that a retry does not duplicate jobs.
31. As an agent, I want image tools to return a `jobId` immediately, so that I can keep talking while pixels render.
32. As an agent, I want pixels never sent as base64 through tools, so that context stays small and private.
33. As an agent, I want tools to appear and disappear with preconditions, so that I am not offered inpaint when nothing is pointed at.
34. As an agent, I want the same commands as the human UI, so that I cannot diverge from what the person sees.
35. As a judge, I want to open the live URL with no login, so that I can test site tools in ChatGPT’s browser or Chrome.
36. As a judge, I want a prepared demo collection, so that the Choose / Point / Create loop is obvious in under three minutes.
37. As a judge, I want WebMCP tools registered on the top-level page, so that ChatGPT can discover them (no iframe tools).
38. As a privacy-conscious user, I want GPS stripped from derivatives, so that sharing a postcard does not leak a home.
39. As a privacy-conscious user, I want first-use consent before any external image provider, so that photos do not leave the browser silently.
40. As a privacy-conscious user, I want a data-flow log, so that I can see when a photo was sent to a provider.
41. As a privacy-conscious user, I want no face naming or biometric identification, so that grouping never becomes surveillance.
42. As a user on a flaky network, I want failed jobs preserved with their inputs, so that I am not left with a blank shape.
43. As a user, I want every agent canvas mutation grouped into one undo step, so that I can revert a turn, not a dozen shape ops.
44. As a user, I want human and agent actions on one timeline, so that collaboration is visible.
45. As a developer adding a second image vendor, I want a single `ImageProvider` interface, so that Hugging Face is an adapter, not the product.
46. As a developer, I want the catalog behind a store seam, so that Convex or another backend can replace localStorage without rewriting tools.
47. As a developer, I want spatial intent tested as a pure module, so that mask math does not require spinning up tldraw.
48. As a developer, I want preference learning tested through comparisons, so that the profile stays interpretable.
49. As a user with no API keys, I want a labeled local preview, so that the Point → Create loop still completes and never pretends to be a model.
50. As a user, I want to reload the demo collection, so that a judge can reset to a known start.

## Implementation Decisions

- Next.js App Router hosts the page. WebMCP tools register in the top-level client workspace, never inside an iframe (ChatGPT site tools do not discover iframe tools).
- tldraw is the canvas for shapes, frames, notes, selection, viewport, and undo. Image identity is a placement that points at an asset version; signed URLs are delivery, not identity.
- UploadThing stores blobs only. Application truth is the catalog store.
- The catalog is reached only through a store interface. The shipping adapter is in-memory + localStorage so judges need no login. A Convex adapter remains possible behind the same interface (ADR-0001).
- Human UI and WebMCP tools call one workspace command module. That module is the test surface for mutations.
- Spatial intent is a pure module: canvas view in, clear / ambiguous / none out. Scribbles rasterize to an 8-bit alpha mask in source-image space, accounting for translation, scale, rotation, and crop.
- Preference learning is comparison-based and interpretable. It never permanently deletes.
- Image jobs are asynchronous. A ghost placement is created immediately. Hugging Face Inference Providers is the first `ImageProvider` adapter. A labeled local-preview adapter runs when no token is present.
- Tool descriptors live in the WebMCP registry. Availability is a function of workspace snapshot. React registration uses `use-webmcp-tool` with `enabled`, so the hook count stays stable and AbortController cleanup still matches the spec.
- Image tools return handles and job ids. Pixels do not travel through WebMCP arguments or results.
- Mutating tools accept idempotency keys. External generation requires consent.
- Demo photos are a prepared collection with bursts, near-duplicates, an unwanted object, and postcard candidates.
- No React Flow version DAG; provenance is a compact rail. No low-level canvas tool for every tldraw mutation. No face recognition.

## Testing Decisions

A good test exercises a module through its interface: given a canvas view, selection, or comparison, assert the observable result (clear target, ambiguous candidates, preference summary, archived-then-restored asset). Tests do not inspect tldraw internals, React trees, or Hugging Face HTTP.

Modules under test:

- Spatial intent resolver (overlap, ambiguity, scribble masks)
- Preference profile (expression vs sharpness, summaries)
- Workspace commands (record preference, archive/restore)
- WebMCP registry (read tools always present; `generate_image` withheld without consent)

Prior art: none in this repo yet; these tests are the first. Browser verification of tldraw + WebMCP registration is manual against Chrome’s WebMCP flag and ChatGPT’s in-app browser.

## Out of Scope

- Multi-user realtime collaboration on one workspace
- Face identity clustering or naming
- Public image URLs as permanent identity
- Arbitrary low-level canvas mutation tools
- Provider-specific UI outside adapters
- A separate library app disconnected from the canvas
- Silent autonomous bulk edits
- Presenting model output as the original
- Full Convex production tenancy (deferred; seam exists)
- Video, RAW processing, and print ordering

## Further Notes

Judging criteria this PRD is designed to hit:

1. **WebMCP leverage** — intent-level tools, contextual registration, shared command module, spatial intent instead of DOM scraping.
2. **Execution** — a coherent Choose / Point / Create product, not a tool dump.
3. **Potential impact** — real culling + retouch + layout pain for photographers and families.
4. **Creativity** — the canvas is the conversation, not a chat sidecar.

Canonical demo (also the video script):

1. Ask the agent to group the collection and surface only taste decisions.
2. Choose the expressive dock-jump over the sharp recommendation.
3. Show the preference line and apply it to remaining groups.
4. Place keepers on the canvas.
5. Circle the lakeside cooler and say “Remove this.”
6. Show `get_spatial_intent`, then a ghost job.
7. Accept a variant and open provenance.
8. Add a frame note and ask for a postcard layout.
9. Export the frame.
