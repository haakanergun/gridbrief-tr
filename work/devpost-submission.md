# Devpost submission copy — GridBrief TR

Use this as the English submission text. Replace the video placeholder only after the final public upload is ready.

## Project name

GridBrief TR — agent-ready infrastructure for Türkiye's energy market

## Tagline

Turn source-attributed EPİAŞ market data into a shared, reviewable workflow for trading, operations, planning, risk, and management teams.

## Inspiration

Energy-market participants must reconcile prices, system conditions, generation, consumption, and planning data before a shift decision. That work often spans operator pages, spreadsheets, and chat, forcing each team to rebuild the same context and making it difficult to answer a basic question: which source and timestamp support this decision?

Türkiye's EPİAŞ Transparency Platform makes a broad electricity-market information surface available to authorized users, but reports have different scopes and publication schedules. GridBrief TR treats source, freshness, data level, and missing coverage as first-class parts of the product instead of hiding them.

EPİAŞ's official [2025 Annual Report](https://www.epias.com.tr/wp-content/uploads/2026/04/4-FAALIYET-RAPORU-2025.pdf) reports 28,006 registered Transparency Platform users, 181 report screens, and 253 web services. Those are EPİAŞ platform figures, not GridBrief usage claims.

## What it does

GridBrief TR is an English/Turkish decision-support workspace for Türkiye's electricity market. It combines market overview, the Transparency 2.0 electricity catalogue, organization and power-plant discovery, and production/consumption planning in one light, source-aware interface.

A compatible browser agent can use eight page-defined WebMCP tools:

1. `set_analysis_scope` sets the delivery date and exclusive hour window in the visible workspace;
2. `get_market_snapshot` retrieves the selected market snapshot with provenance and warnings;
3. `find_market_entities` searches public organization and power-plant catalogues;
4. `compare_plan_actual` loads planning and actual series at their published data levels;
5. `stress_test_position` calculates a disclosed, local-only what-if sensitivity;
6. `draft_shift_brief` renders an editable, source-attributed draft;
7. `search_transparency_datasets` searches the electricity catalogue and synchronizes the visible selection; and
8. `get_transparency_dataset` retrieves one allowlisted dataset by stable `datasetId` or official `menuId` and renders its rows, quality, source, and retrieval time.

The Devpost walkthrough shows an authorized production workspace on a completed historical day, with visible EPİAŞ provenance, retrieval time, coverage, and warnings. Separately, the native sample workflow proves eight-tool discovery and a successful `search_transparency_datasets` execution that updates the visible catalogue. During the recorded verification run, upstream EPİAŞ reads timed out and the harness failed closed; it did not relabel a synthetic fixture or structural catalogue fallback as a live observation.

The local what-if and shift-brief actions run only after a live market snapshot passes those checks. The user can then inspect and revise the visible assumptions and evidence. GridBrief exposes no market-order, trading-account, message-sending, or source-data mutation tool.

## How we used WebMCP

WebMCP is the interaction model, not a chat box attached to a dashboard. GridBrief registers structured tools on `document.modelContext`; a compatible browser discovers them with `getTools()` and executes a selected descriptor with JSON-stringified arguments. Each successful tool call also updates the same visible workspace the participant uses, so the agent and human share scope, results, warnings, and provenance.

The eight-tool surface supports two complementary paths. The decision path sets scope, retrieves a market snapshot, searches entities, compares planning evidence, calculates a local sensitivity, and drafts a shift note. The catalogue path searches the broader Transparency information architecture and retrieves a specific allowlisted dataset. This makes WebMCP useful to several business units without pretending that one generic prompt has access to every kind of private portfolio data.

The data-level boundary is part of the contract. Organization and UEVÇB filters apply only where EPİAŞ publishes those planning series. System generation and consumption remain system-level and are not relabelled as organization actuals. Missing hours remain null, aggregates report coverage, and a full-day deviation is withheld unless both series have complete comparable coverage.

The visible UI uses an inclusive final hour, while the WebMCP scope contract uses an exclusive `endHour`. A tool call with `startHour: 17` and `endHour: 23` therefore represents the visible 17:00–22:59 window. Stating that convention in the schema prevents an off-by-one delivery error.

All eight tools are read-only with respect to EPİAŞ, market accounts, and trading venues. Some tools intentionally update local page state so the person and agent can work together; none can place an order, change upstream data, or publish a brief. Human review remains required, but the product does not depend on a separate approval-button ceremony.

## Example cross-functional workflow

- A **trading agent** retrieves price and imbalance context for the selected window.
- An **operations agent** inspects generation evidence and publication coverage.
- A **planning agent** compares KGÜP, KUDÜP, EAK, load-plan, and actual series only at valid data levels.
- A **portfolio-risk agent** applies a transparent position sensitivity after the live price reference is verified.
- A **management agent** assembles the sourced evidence, risks, and proposed checks into one draft decision record.

These are role-specific uses of the same WebMCP contract and visible workspace. GridBrief does not claim that a deterministic demo runner is an LLM. The repository includes a CDP-based **sample agent workflow** that exercises the real browser interface and produces inspectable evidence for the demo.

## How we built it

The application is built with Next.js and React. Its server-only EPİAŞ gateway obtains and caches a short-lived ticket-granting token without returning or logging the credential. Live market and dataset responses carry provider, retrieval time, scope, quality, and warnings. Partial upstream market responses preserve nulls and warnings; live dataset errors fail closed and never receive fabricated replacement rows.

The page registers eight imperative WebMCP definitions for the lifetime of the workspace. Chrome 152's native implementation exposes them from `document.modelContext`. Our Node/CDP harness launches headed Chrome with WebMCP enabled, confirms all eight unique registrations, executes the descriptor returned by `getTools()`, and writes bounded sanitized evidence and screenshots. The harness accepts no username, password, token, cookie, or authorization-header argument.

Native discovery of all eight current registrations has been verified in Chrome 152. A run is called **live** only when its returned source identifies EPİAŞ and includes a valid `fetchedAt` or `retrievedAt`; the dataset path additionally requires at least one row. The harness retries an upstream read only once, then records a failed-closed result. Stress and brief tools are skipped unless a live market snapshot succeeds first.

The repository also retains an explicitly labelled deterministic synthetic mode for development when live mode is disabled. That mode is not the real-data evidence used in the Devpost walkthrough.

## Challenges we ran into

The hardest problem was not drawing another dashboard. It was preserving market-data integrity while making the page useful to agents. EPİAŞ authentication stays on the server; report semantics and data levels differ; publication gaps are normal; and upstream availability can change during a demo. We therefore separated structural catalogue availability from successful data retrieval, made provenance visible, preserved nulls, bounded every tool input, and made the recording depend on machine-checkable live evidence.

WebMCP itself is experimental. Chrome 152's native producer-side execution requires the descriptor returned by `getTools()` and JSON-stringified arguments. Our harness uses that real boundary rather than a polyfill, direct API shortcut, or mocked agent panel.

The product-design challenge was keeping the familiar Transparency information architecture while making a large catalogue approachable in English and Turkish. A shared shell, searchable catalogue, explicit source panel, and synchronized agent actions let specialist teams work from one record without losing the operator context they already know.

## What's next

Before production use, we would complete a formal review of report semantics, account authorization, and permitted storage, display, and redistribution under EPİAŞ terms. We would add organization-level audit retention, role controls, shared rate limiting, richer data-quality tests, and approved connections to internal portfolio systems. We would preserve the no-execution boundary unless a separate, governed product were designed and authorized.

## Links

- Protected live application: https://gridbrief-tr.vercel.app/en
- Source code: https://github.com/haakanergun/gridbrief-tr
- Demo video (under three minutes): https://youtu.be/5dGW_ocNZJw

## Attribution and disclosures

GridBrief TR is an independent prototype and is not affiliated with or endorsed by EPİAŞ. Live access uses the operator's own authorized account and remains subject to EPİAŞ terms and applicable limits on use, storage, display, and redistribution. Any screen labelled synthetic is deterministic demonstration data, not an EPİAŞ observation, forecast, or trading signal. GridBrief provides decision support only; it does not trade or provide financial advice.
