# ADR-0001: Catalog lives behind a store seam, IndexedDB-first

## Status

Accepted for the WebMCP Challenge submission.

## Context

The product plan named Convex as application truth and UploadThing as blob storage. Judges must open a live URL with no login. Convex would add an account, deploy step, and auth story that the demo does not need.

## Decision

The photo catalog (assets, versions, groups, choices, jobs, events) is accessed only through a `CatalogStore` interface. The shipping adapter is an in-memory store hydrated from localStorage. UploadThing remains blob storage only. A Convex adapter can satisfy the same store interface later.

## Consequences

- Human UI and WebMCP tools already share workspace commands; swapping persistence does not fork those paths.
- Refresh keeps the catalog in the browser. It is not multi-device.
- Image jobs still run on the server; job records are written back into the local catalog.
