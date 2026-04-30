# AGENTS.md

## Project Identity

This repository is an **Astro** application, not a Next.js app and not a generic SPA.
It renders a **family tree site** backed by structured JSON data in Astro content collections.

Primary goals when working here:

- Preserve the family-tree data model and relationship integrity.
- Follow current Astro conventions before inventing custom architecture.
- Prefer server-rendered or build-time Astro patterns over client-heavy solutions.

## Stack And Runtime

- Framework: `astro`
- Adapter: `@astrojs/node`
- Output mode: `server`
- Package type: ESM (`"type": "module"`)

Important current files:

- `astro.config.mjs`: Astro config with Node standalone adapter
- `src/pages/`: route entry points
- `src/layouts/`: shared Astro layouts
- `src/components/`: reusable UI pieces
- `src/lib/`: domain and utility logic
- `src/content.config.ts`: content collection schemas
- `src/content/family/people/*.json`: person records
- `src/content/family/relations/tree.json`: relationship graph
- `public/`: static assets copied as-is

## Astro Rules

- Treat this as an Astro-first codebase. Use `.astro` pages, layouts, and components unless there is a clear reason not to.
- Keep route files in `src/pages/`. Astro reserves this directory for file-based routing.
- Keep shared page shells in `src/layouts/`.
- Keep reusable presentation units in `src/components/`.
- Keep authored CSS and JS in `src/`, not `public/`, unless the file truly must be served untouched.
- Use `public/` only for unprocessed static assets such as PDFs, fixed images, and files like `robots.txt`.
- Prefer Astro’s server/build primitives before adding client-side hydration or framework islands.

## Content Collection Rules

This project already uses Astro content collections and should continue to do so.

- Define collection shape changes in `src/content.config.ts`.
- Keep schemas strict and explicit with `z` validators.
- Prefer build-time collections for this data. The family tree is structured editorial content, not live real-time data.
- Query content through `astro:content` APIs such as `getCollection()` and related helpers instead of reading JSON ad hoc.
- When changing person or relation schemas, update all affected content entries and any consuming TypeScript logic together.

Current collections:

- `familyPeople`: individual person records with identity and life-event fields
- `familyRelations`: grouped parent/child relationship data

## Family Tree Domain Rules

- A person `id` is a stable identifier. Do not rename IDs casually because relations and route logic may depend on them.
- Keep `src/content/family/people/` entries structurally consistent with the schema.
- Keep `src/content/family/relations/tree.json` internally consistent with existing person IDs.
- When adding or editing relationships, validate both sides of the data model:
  - parent IDs must exist
  - child IDs must exist
  - grouping should remain coherent for tree layout code
- Prefer fixing data at the source content file instead of patching around bad data in UI code.

## Implementation Guidance

- Before changing Astro architecture or conventions, consult the Astro docs via the available MCP docs tooling.
- Prefer small domain helpers in `src/lib/` for tree shaping, auth helpers, and content normalization.
- Keep layouts responsible for page shell concerns and pages responsible for route-level data loading.
- Keep components focused on presentation; avoid hiding core tree rules inside display components.
- If interactivity is needed, add the minimum client-side code required rather than converting pages into app-style state containers.

## Editing Discipline

- Preserve existing file organization unless there is a strong structural reason to change it.
- Do not introduce Next.js concepts such as `app/` router patterns, `getServerSideProps`, or React-specific assumptions that Astro does not use.
- Do not move content data out of Astro collections without a clear migration reason.
- When updating schemas or route behavior, verify the project still builds.

## Validation

After substantive changes, prefer verifying with:

```bash
npm run build
```

If content schemas change, make sure collection validation passes and that pages consuming family data still render.

## Default Approach For Future Agents

1. Read the relevant Astro docs if the task touches routing, layouts, content collections, rendering mode, or assets.
2. Inspect `src/content.config.ts` and the family content files before changing domain behavior.
3. Keep solutions Astro-native and as simple as possible.
4. Validate with a build when changes affect routing, schema, or rendering.
