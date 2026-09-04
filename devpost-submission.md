# Title

Nagara

## One-line Summary

Bengaluru civic reporting where people and WebMCP agents share one visible, actionable map.

## Problem

Civic failures are experienced locally but reported through fragmented, repetitive workflows. A resident may have the strongest evidence—a photo and a locality—but still needs to identify the issue type, find the correct ward, avoid filing a duplicate, and connect the report to relevant public works. A general browser agent can try to click through that process, but DOM guessing is brittle and makes it hard for the resident to see or trust what changed.

## Solution

Nagara is a public Bengaluru civic-voice map designed as a shared workspace for a person and an agent. The resident supplies context and evidence. A WebMCP-enabled agent discovers the current page's actions, fills the same visible form, classifies the issue, resolves the GBA ward, files or supports a voice, focuses the matching map pin, and retrieves related public records. Human and agent actions use one command layer and one local state model, so the interface never drifts into a hidden agent-only workflow.

## Why This Matters

WebMCP turns civic reporting from a fragile sequence of inferred clicks into a legible collaboration. People retain judgment and visual confirmation; agents handle structured lookup and repetitive coordination. The result is faster reporting, fewer duplicates, better geographic routing, and a clearer connection between a resident's evidence and the city's published work.

## How We Used AI

Nagara exposes 19 structured WebMCP tools on every route. `list_ui_actions` gives an agent a route-aware manifest of meaningful controls. `set_draft`, `select_category`, `classify_issue`, `resolve_ward`, `use_current_location`, and `file_voice` form a complete filing workflow. `focus_voice` and `support_voice` preserve shared follow-up. `list_related_tenders`, `refresh_tenders`, and `enrich_source` connect the selected voice to public information. Each mutation returns explicit `stateChanges` and updates the visible UI and activity log.

The implementation uses JSON Schema enums and URI formats, `readOnlyHint`, `untrustedContentHint`, titled tools, structured error results, and AbortSignal-based lifecycle cleanup. Unsupported browsers retain the full human workflow.

## How We Used Codex

Codex was used as an engineering partner to inspect the existing Next.js application, fetch the current WebMCP and Next.js documentation, audit every visible interaction, implement the missing semantic tools, refactor the shared state provider for React 19, add lifecycle-safe tool registration, write judge-facing documentation and tests, and exercise the resulting tools from the Codex in-app browser. The browser verification caught an intentional-unregistration promise rejection that ordinary unit tests did not; the registration wrapper was then fixed and rechecked against a production build with a clean browser console.

## Key Features

- Route-aware `list_ui_actions` manifest covering every meaningful control
- Shared human/agent form with visible field, category, reset, and filing updates
- Public evidence-photo attachment by URL or human file upload
- Bengaluru locality or coordinate lookup to a GBA ward and corporation
- Issue classification across flooding, water, lakes, works, encroachment, footpaths, lights, waste, and other
- Duplicate-aware voice filing and community support
- Shared MapLibre pin selection and focus
- Related civic-record discovery with bundled OpenCity/news data and optional Firecrawl refresh
- WebMCP readiness indicator and on-page agent activity trail
- `/llms.txt`, a public UI-to-tool coverage matrix, and reproducible judge instructions

## Architecture

- **Next.js 16 / React 19 / TypeScript:** public application and route handlers
- **WebMCP bridge:** lifecycle-safe `document.modelContext.registerTool` registrations with titled tools and structured schemas
- **Tool registry:** 19 descriptors plus route-aware UI mappings and a single execution dispatcher
- **Voice command layer:** one command surface used by both React controls and WebMCP tools
- **MapLibre GL:** shared geospatial map and focused pins
- **UploadThing:** optional public evidence-photo hosting
- **Firecrawl:** optional refresh/enrichment of allowlisted civic sources
- **Local-first state:** browser persistence keeps the public demo usable without an account or backend setup

## Testing Instructions

1. Open https://nagara-webmcp.vercel.app/create in ChatGPT's or Codex's in-app browser.
2. Confirm the page displays **WebMCP ready**.
3. Call `list_ui_actions`; it should return 10 mapped interaction groups for `/create`.
4. Call `get_workspace_state` to inspect the same selected voice and form visible on screen.
5. Call `set_draft` with `areaName: "HSR Layout"`, a factual `title`, a short `body`, and any public image URL in `photoUrl`. Watch the form fill.
6. Call `select_category { "category": "flooding" }`, then `resolve_ward { "areaName": "HSR Layout" }`.
7. Call `file_voice`. A new pin should appear, become selected, and show a timeline and related records.
8. Call `focus_voice` or `support_voice` with a returned voice ID. The same visible pin/rail should update.
9. Call `clear_draft`; the visible filing form should reset.

No account or credentials are required. Optional live UploadThing and Firecrawl paths have bundled/local fallbacks, so the core WebMCP demo remains judge-testable.

## Public Demo Link

https://nagara-webmcp.vercel.app/

## Public Repository Link

https://github.com/perfect7613/nagara-webmcp

## Demo Video

https://drive.google.com/drive/folders/1d6CDT6Ks_Jx9Z-tvACH4L2WMHQ-2cQPj?usp=sharing

## Project Thumbnail

`public/media/nagara-devpost-thumbnail.png`

## Screenshot Shot List

### Bengaluru landing experience

![Nagara landing experience](https://nagara-webmcp.vercel.app/media/devpost/nagara-home.png)

### Shared civic overview

![Nagara shared Bengaluru civic overview](https://nagara-webmcp.vercel.app/media/devpost/nagara-world.png)

### Filing workspace, live map, and public records

![Nagara filing workspace with map and public records](https://nagara-webmcp.vercel.app/media/devpost/nagara-create.png)

## Submission Readiness Notes

- Project draft created on Devpost: https://devpost.com/software/nagara
- Registration verified live for The WebMCP Challenge
- Source history begins during the official submission period; the project qualifies as **New** based on the repository timestamps
- App verified locally with 11 passing tests, clean ESLint, and a successful Next.js production build
- All 19 tools were discovered in Codex's in-app browser; visible form mutation, category selection, reset, and the 10-action UI manifest were exercised through WebMCP
- Final live deployment still needs the latest commit pushed and Vercel deployment verified
- Submitter type and country must be confirmed by the project owner
- Official rules still require the project owner's explicit acknowledgment before the plugin can unlock final preparation/submission

## Known Limitations

- Voice data persists in the current browser rather than a shared production database
- Ward lookup is a focused demo dataset of Bengaluru localities, not a complete authoritative city GIS
- Live UploadThing and Firecrawl behavior depends on deployment credentials; core filing and bundled records continue to work without them
- `get_link_target` returns external URLs for deliberate agent navigation instead of forcing a popup or navigating away from the active tool context

## TODO Official Form Fields

- **Submitter Type (required):** TODO — confirm Individual, Team of Individuals, or Organization
- **Country of residence (required):** TODO — confirm exact country value
- **Organization name:** N/A unless Submitter Type is Organization
- **App Status:** New
- **Existing-project update explanation:** N/A; initial commit is dated September 3, 2026, inside the submission period
- **Live URL:** https://nagara-webmcp.vercel.app/
- **Testing instructions:** use the steps above
- **Public repo:** https://github.com/perfect7613/nagara-webmcp
- **Agents/clients tested:** Codex in-app browser with native WebMCP discovery and tool calls
- **AI tools leveraged:** Codex for current API research, architecture audit, implementation, testing, browser verification, and Devpost preparation; repository history also records Claude Opus review and Qwen-assisted edits
- **Learning level:** Significant
- **Career AI value:** Yes
- **Demo video:** https://drive.google.com/drive/folders/1d6CDT6Ks_Jx9Z-tvACH4L2WMHQ-2cQPj?usp=sharing
