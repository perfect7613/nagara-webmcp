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

Tools register on this origin with `use-webmcp-tool` (`document.modelContext.registerTool` under the hood). They are available on `/`, `/world`, and `/create`.

| Tool | What it does |
|---|---|
| `get_workspace_state` | Voice counts, selected pin, current form |
| `attach_photo` | Host a public image URL with UploadThing and put it on the form |
| `set_draft` | Fill the form the human can see |
| `classify_issue` | Flooding / water / lakes / works from a caption |
| `resolve_ward` | Area name or coordinates to a GBA ward |
| `file_voice` | Pin the voice and select it |
| `focus_voice` / `support_voice` | Pan the map or join an existing pin |
| `list_related_tenders` / `refresh_tenders` / `enrich_source` | Public records via bundled OpenCity sources and live Firecrawl |

Agent instructions also live at `/llms.txt`.

## Codex prompt

Open https://nagara-webmcp.vercel.app/create. I took a photo of a civic failure in Bengaluru. Use the page's WebMCP tools: get_workspace_state, attach_photo or set_draft with the photo, set the area name, classify_issue, resolve_ward, then file_voice. The pin should appear on the map.

Judges: ChatGPT in-app browser, or Chrome 149+ with `chrome://flags/#enable-webmcp-testing`.

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
