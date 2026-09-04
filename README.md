# Nagara

Live: https://nagara-webmcp.vercel.app

A Bengaluru civic-voice map. A person (or a WebMCP agent) adds a photo and an area name. The page matches the GBA ward, pins the voice, and shows public stormwater, lake, and UGD records next to it.

Product copy: `/world`. Filing map: `/create`.

## Why this is a WebMCP app

Filing a civic report is a shared task. The human has the photo. The agent can type the area, classify the issue, match the ward, and drop the pin. If the agent only clicked around the DOM, the form and the map would drift. WebMCP tools call the same commands the form uses, so both of you watch the fields fill and the pin land.

What that unlocks:

- Codex or ChatGPT can open `/create`, take your photo URL and area name, and file the voice without guessing buttons.
- You can still drop the photo yourself. The agent only fills what you did not.
- `enrich_source` and `refresh_tenders` pull OpenCity and related civic pages through Firecrawl, then attach them to the pin the agent just filed.

## How WebMCP is implemented

Nineteen tools register on this origin with `use-webmcp-tool` (`document.modelContext.registerTool` under the hood). They are lifecycle-managed and available on `/`, `/world`, and `/create`. Start with `list_ui_actions`: it returns the current route and the semantic tool mapping for every meaningful visible control, so an agent never has to infer the interface from the DOM.

| Tool | What it does |
|---|---|
| `list_ui_actions` | Discover every visible link, button, field, map action, and its semantic tool mapping |
| `navigate_app` | Open the home, overview, map, How it works, agent guide, or latest voice |
| `get_workspace_state` | Voice counts, selected pin, current form |
| `attach_photo` | Host a public image URL with UploadThing and put it on the form |
| `set_draft` | Fill the form the human can see |
| `select_category` / `clear_draft` | Press a category chip or clear the visible form |
| `use_current_location` | Mirror the location button, update coordinates, and resolve the GBA ward |
| `classify_issue` | Flooding / water / lakes / works from a caption |
| `resolve_ward` | Area name or coordinates to a GBA ward |
| `file_voice` | Pin the voice and select it |
| `focus_voice` / `support_voice` | Pan the map or join an existing pin |
| `get_link_target` | Resolve the visible repo, live-app, or selected public-record link |
| `list_related_tenders` / `refresh_tenders` / `enrich_source` | Public records via bundled OpenCity sources and live Firecrawl |

Agent instructions also live at `/llms.txt`.

## Codex prompt

Open https://nagara-webmcp.vercel.app/create. Call list_ui_actions, then get_workspace_state. I took a photo of a civic failure in Bengaluru. Use attach_photo or set_draft with the photo, set the area name, classify_issue, resolve_ward, then file_voice. The visible form should fill and the pin should appear on the map.

Judges: ChatGPT in-app browser, or Chrome 149+ with `chrome://flags/#enable-webmcp-testing`.

### Judge verification

1. Open the live `/create` URL in ChatGPT's in-app browser.
2. Confirm the page says **WebMCP ready**.
3. Call `list_ui_actions`; it should report the 10 meaningful interaction groups on the map page.
4. Call `set_draft` with `areaName`, `title`, `body`, and a public `photoUrl`; watch the visible form update.
5. Call `select_category`, `resolve_ward`, and `file_voice`; watch the category chip, result status, map pin, selected voice, timeline, and related records update.
6. Call `focus_voice` or `support_voice` to verify the agent and person continue from the same shared state.

Read [`WEBMCP-COVERAGE.md`](./WEBMCP-COVERAGE.md) for the complete UI-to-tool matrix and implementation notes.

## Run locally

```bash
cp .env.example .env.local
# add UPLOADTHING_TOKEN and FIRECRAWL_API_KEY
npm install
npm test
npm run dev
```

| Variable | Required for live data | Purpose |
|---|---|---|
| `UPLOADTHING_TOKEN` | Photo hosting for humans and `attach_photo` | Evidence photos |
| `FIRECRAWL_API_KEY` | `/api/tenders` and `enrich_source` | OpenCity and allowlisted civic pages |

Without the keys, filing still works with a local photo. Tender rails fall back to the bundled OpenCity and news records in `public/data/tenders-sample.json`.

## Data

Bundled map records are real public sources (OpenCity SWD maps and CAG audit, The News Minute on the Rs 175 crore KR Market to Bellandur drain). Live refresh scrapes OpenCity when `FIRECRAWL_API_KEY` is set. Ward pins use locality aliases for the demo. Aerial film: Pexels, Anil Sharma. Bellandur stills: Wikimedia Commons.

## License

MIT
