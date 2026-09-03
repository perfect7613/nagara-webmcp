# Nagara

A Bengaluru civic-voice map. A person drops a **photo** and an **area name**. The page resolves the **GBA ward**, pins a **Voice**, and shows **related public tenders** (stormwater, lakes, UGD). ChatGPT uses **WebMCP** on the same map.

Open [http://localhost:3000](http://localhost:3000). Product at `/world`. File a voice at `/create`.

## Why WebMCP

The human and the agent share one city. Tools are registered on this origin:

- `get_workspace_state`
- `resolve_ward`
- `list_voices` / `get_voice`
- `file_voice` / `classify_issue`
- `support_voice` / `focus_voice`
- `list_related_tenders` / `enrich_source`

Suggested prompts (none are potholes):

- Photo of stormwater overflowing into houses in HSR Layout after rain from Madiwala/BTM toward Bellandur. Resolve the ward, file a Flooding voice, list related SWD tenders.
- Street waterlogged at Kaikondrahalli. Classify as Flooding, file it, check lake/drain tenders.
- This Bellandur bund still takes sewage from stormwater drains. File a Lakes voice.
- BWSSB cut this freshly laid stretch for UGD and left it open. File a Works voice.

Judges: ChatGPT in-app browser, or Chrome 149+ with `chrome://flags/#enable-webmcp-testing`.

## Run locally

```bash
cp .env.example .env.local
npm install
npm test
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Product at `/world`. File a voice at `/create`.

| Variable | Required | Purpose |
|---|---|---|
| `UPLOADTHING_TOKEN` | No | Evidence photo hosting |
| `FIRECRAWL_API_KEY` | No | Allowlisted enrich; otherwise labeled stub JSON |

## Design

Visual language from a Firecrawl design-clone of [swarajapp.com](https://swarajapp.com/) — see [`DESIGN.md`](DESIGN.md). `/` is a Bengaluru aerial hero. Product copy lives on `/world`. Original brand. No Swaraj logos or slogans.

## Data

- Seeded wards are locality aliases for the demo.
- `public/data/tenders-sample.json` is mixed SWD/lake/UGD/water rows from a public listing style.
- Aerial film: Pexels, Anil Sharma.

## License

MIT
