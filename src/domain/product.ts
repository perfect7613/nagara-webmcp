export const PRODUCT_NAME = "Nagara";
export const PRODUCT_TAGLINE = "Flooded streets and dry taps sit on one map.";
export const PRODUCT_PROMISE =
  "A Bengaluru map that a person and a WebMCP agent share. You add a photo and an area name. The app matches the GBA ward, pins the voice, and shows public stormwater, lake, and UGD records next to it.";
export const PRODUCT_CITY = "Bengaluru";
export const GITHUB_REPO = "https://github.com/perfect7613/nagara-webmcp";
export const LIVE_URL = "https://nagara-webmcp.vercel.app";
export const CODEX_PROMPT = `Open ${LIVE_URL}/create. I took a photo of a civic failure in Bengaluru. Use the page's WebMCP tools: get_workspace_state, attach_photo or set_draft with the photo, set the area name, classify_issue, resolve_ward, then file_voice. The pin should appear on the map.`;
