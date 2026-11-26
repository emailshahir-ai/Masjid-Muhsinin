# Project memory

## Product intent & audience

- Data-driven web app with charts and PDF/report export capabilities (inferred from `recharts`, `jspdf`, `html2canvas`, `canvg`, `dompurify`).
- Uses Firebase for authentication (`@firebase/auth`, `@firebase/util`).

## Brand personality & voice

- Not yet established from context.

## Visual design & UX direction

- Charts rendered with `recharts` (Cartesian, pie, polar, Sankey variants present in dependency tree).
- Icons from `lucide-react`.
- PDF export pipeline includes `jspdf` + `html2canvas` + `canvg` + `dompurify`, likely for client-side document/image generation.

## Decisions, constraints & rationale

- Build tooling: `vite` with Rolldown (`rolldownOptions`), package manager: `bun`.
- `react-is` was a missing transitive dependency required by `recharts`; installed via bun to resolve build failure.
- Large single JS chunk (~1.3 MB / 390 kB gzip) triggers chunk-size warning; dynamic `import()` and code-splitting recommended but not yet applied.
- Heavy vendor dependencies (recharts, firebase, jspdf/html2canvas, decimal.js, core-js, es-toolkit, redux-thunk) contribute to bundle size.

## Open questions & assumptions

- Code-splitting strategy for vendor chunks not yet decided.
- Whether `react-is` should be pinned to a specific version for stability with recharts.
- No explicit `.bolt/prompt` authored yet; global instructions may be added later.