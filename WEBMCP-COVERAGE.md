# WebMCP interaction coverage

Nagara treats WebMCP as the application's interaction API, not as a parallel demo layer. Human controls and agent tools call the same `VoiceCommands` command layer, so the visible UI remains the source of shared context.

## UI-to-tool matrix

| Page | Human control | WebMCP equivalent | Visible result |
|---|---|---|---|
| `/` | Enter the world | `navigate_app { destination: "overview" }` | Opens the city overview |
| `/world` | How it works / For agents | `navigate_app` | Opens the matching section |
| `/world` | Map / File a voice / Open the map | `navigate_app { destination: "map" }` | Opens the filing map |
| `/world` | Open latest voice | `navigate_app { destination: "latest-voice" }` | Opens and focuses the latest pin |
| `/world` | Source | `get_link_target { link: "source-code" }` | Returns the public repository URL |
| `/create` | World / wordmark | `navigate_app { destination: "overview" }` | Opens the overview |
| `/create` | Use my location | `use_current_location` | Adds coordinates and resolves a ward |
| `/create` | Photo drop/picker | `attach_photo` or `set_draft` | Shows evidence in the form |
| `/create` | Area, title, description | `set_draft` | Updates the visible fields |
| `/create` | Category chips | `select_category` | Selects the visible chip |
| `/create` | Put it on record | `file_voice` | Adds and focuses a map pin |
| `/create` | Clear form | `clear_draft` | Resets all visible draft fields |
| `/create` | Map pins | `focus_voice` | Pans and selects the same voice |
| `/create` | Join this voice | `support_voice` | Increments support and timeline |
| `/create` | Open source | `get_link_target { link: "selected-record" }` | Returns the public-record URL |

Call `list_ui_actions` on any route to discover this mapping from inside the browser.

## Tool behavior

- Tools use JSON Schema enums and URI formats to reduce ambiguous calls.
- Read-only tools carry `readOnlyHint`; tools returning resident or scraped content also carry `untrustedContentHint`.
- Mutations return explicit `stateChanges` and are mirrored in the on-page agent activity log.
- Tool registration follows the document lifecycle through an `AbortSignal`, so navigation and unmounting unregister stale tools.
- Unsupported browsers degrade cleanly while keeping every human workflow available.

## In-app browser check

The deployed app was verified in Codex's in-app browser: the page reports **WebMCP ready**, tools are discoverable on the origin, and tool calls update the same form and map visible to the person.
