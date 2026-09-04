# GridBrief TR

[Protected live EPİAŞ workspace](https://gridbrief-tr.vercel.app/) · [OpenAI WebMCP Challenge](https://webmcp.devpost.com/)

**GridBrief TR** is an agent-native operations and data workspace for participants in Türkiye’s electricity market. It brings market risk, organizations, power plants, production planning, and the EPİAŞ Şeffaflık Platformu 2.0 electricity catalogue into one source- and freshness-aware interface.

The current challenge deployment is the protected Vercel workspace above. Evaluation access credentials can be supplied separately without exposing the server-side EPİAŞ account. GridBrief is a decision-support prototype: it does not place orders, connect to a trading account, alter source data, or recommend an execution.

## Why WebMCP

Energy-market analysis often alternates between operator pages, spreadsheets, and chat. That fragments the selected scope and makes it difficult to determine which source, publication level, and timestamp support an answer.

The surrounding information surface is substantial: EPİAŞ reports that its Transparency Platform served 28,006 registered users in 2025 through 181 report screens and 253 web services. Those figures describe the EPİAŞ platform—not GridBrief’s user count—and ground the workflow opportunity in a real operating context. See the official [EPİAŞ 2025 Annual Report](https://www.epias.com.tr/wp-content/uploads/2026/04/4-FAALIYET-RAPORU-2025.pdf).

GridBrief exposes the current workspace through eight imperative WebMCP tools:

1. `set_analysis_scope` sets the delivery date and time range;
2. `get_market_snapshot` reads the selected market snapshot with provenance and warnings;
3. `find_market_entities` searches organization and power-plant references and opens the matching workspace;
4. `compare_plan_actual` loads KGÜP, KUDÜP, EAK, generation, load-plan, and consumption evidence at their published data levels;
5. `stress_test_position` applies a disclosed what-if price shock to a stated exposure;
6. `draft_shift_brief` renders a visible, source-attributed shift brief;
7. `search_transparency_datasets` searches the full electricity catalogue by name or section and synchronizes the visible catalogue; and
8. `get_transparency_dataset` queries one allowlisted catalogue dataset by stable `datasetId` or official `menuId` and renders the result in the page.

All eight tools are read-only with respect to EPİAŞ, market accounts, and trading systems. Some tools update the visible local workspace so the user and browser agent share the same scope and evidence; none exposes an arbitrary upstream URL, modifies EPİAŞ data, or performs a market action. Human review remains essential for operational decisions, but the challenge flow does not depend on a separate approval button.

## Professional Transparency catalogue

The **Tüm EPİAŞ verileri** view turns the official electricity menu tree into a professional three-pane workspace:

- nine electricity data areas and 134 official catalogue items remain searchable without overloading the primary product navigation;
- section filters, favourites, grouped dataset lists, Turkish/English labels, breadcrumbs, update cadence, unit family, source metadata, and technical-documentation links keep discovery inspectable;
- allowlisted datasets expose only their declared date fields and filters, then render normalized quality metadata, tables, and charts in the same workspace; and
- desktop panes preserve section, list, and detail context, while the mobile layout keeps all five primary product destinations available without horizontal page overflow.

The catalogue currently maps **132 of 134** official selectable menu leaves to allowlisted, documentation-mapped JSON adapters across the EPİAŞ electricity and reporting services. The two explicit exceptions are intentional:

- menu 59, **Kurulu Güç**, remains disabled until the official date-switch rule between its two endpoints is verified; and
- menu 254, **Elektrik Piyasası Bültenleri**, links to EPİAŞ’s official bulletin page because it is a document publication rather than a JSON dataset.

This is adapter coverage, not a claim that every source is continuously available or that every endpoint returned data during one test run. Unknown dataset IDs, arbitrary paths, undeclared filters, invalid dates, excessive ranges, and oversized pages are rejected by the gateway.

## Data modes and integrity

Market observations and catalogue structure have separate, explicit runtime states.

| State | Meaning |
| --- | --- |
| Live EPİAŞ | Live mode is enabled and server-only credentials are configured. Supported market or dataset requests are retrieved from EPİAŞ and returned with source, retrieval time, scope, and quality metadata. |
| Synthetic market demo | When the server-only live switch is disabled, deterministic market fixtures demonstrate the risk workflow and are labelled synthetic. They are not EPİAŞ observations or forecasts. |
| Live catalogue | The current official EPİAŞ electricity menu tree was fetched and its expected adapter coverage was checked. |
| `degraded-live` catalogue | A current menu tree was fetched, but its menu or adapter coverage differs from the verified expectation. The mismatch is warned and affected adapters are disabled safely. |
| `stale-live` catalogue | A previously fetched live menu tree is retained when a later catalogue refresh temporarily fails. The UI shows that it is the last successful live catalogue rather than a current synchronization. |
| `auth-fallback` catalogue | EPİAŞ authentication failed, so the available cached or verified catalogue structure is shown with an authentication warning. Live dataset queries may remain unavailable until access is restored. |
| `verified-snapshot` catalogue | If no cached live tree is available, GridBrief can display the bundled catalogue structure verified on 3 September 2026. This preserves navigation metadata only; it does not fabricate live dataset rows. |

If a live dataset request fails, GridBrief surfaces the error or partial-quality state; it does not substitute synthetic rows. A catalogue fallback therefore cannot masquerade as a successful live data query. Missing market metrics remain null with warnings rather than being silently converted to zero or demo values.

EPİAŞ access requires a registered Transparency Platform account and a ticket-granting token (TGT). The server obtains the TGT through EPİAŞ authentication, keeps it only in server memory for up to two hours with a five-minute renewal buffer, and never returns or logs the credential or TGT. Do not place credentials or tokens in browser code, prompts, screenshots, commits, or public deployments.

Data availability differs by report. Retrieval timestamps indicate when GridBrief received a response, not that every value is real time. Publication delays, empty results, coverage gaps, and capped responses remain visible in the result metadata.

GridBrief is independent and is not affiliated with or endorsed by EPİAŞ. Optional live use requires the operator’s own authorized account and remains subject to EPİAŞ terms and any applicable limits on use, storage, display, or redistribution. Complete a production and legal review before operational use.

## Run locally

Requirements: a current Node.js LTS release and npm.

```bash
npm install
npm run dev
```

Without live configuration, the market workspace uses its clearly labelled synthetic fixtures, while the catalogue and dataset APIs fail closed. After an authorized gateway is configured, a failed live menu refresh can use the explicitly labelled cached or verified structural fallback; live dataset queries never receive fabricated fallback rows.

### Optional live EPİAŞ configuration

Create `.env.local` from `.env.example`, then provide the server-only values below. Never prefix them with `NEXT_PUBLIC_`, and never commit `.env.local`. The explicit switch prevents live traffic from being enabled merely because credentials exist in an environment.

```bash
EPTR_LIVE_ENABLED=true
EPTR_USERNAME=your_epias_username
EPTR_PASSWORD=your_epias_password
GRIDBRIEF_ACCESS_USERNAME=choose_a_judge_username
GRIDBRIEF_ACCESS_PASSWORD=choose_a_long_random_password
```

When live mode is enabled in production, the application fails closed unless both GridBrief access credentials and EPİAŞ credentials are configured. The page and APIs use HTTP Basic authentication; share only the **GridBrief access credentials** with evaluators, never the EPİAŞ credentials.

The server applies same-origin checks to production POST requests, caps UTF-8 request bodies, validates every dataset against the allowlisted registry, constrains filters and pagination, and caches selected responses briefly in memory. These controls reduce exposure but do not replace hosting-provider access protection, a shared production rate limiter, or a formal security review.

The gateway defaults to the Transparency Platform ticket endpoint, `https://giris.epias.com.tr/cas/v1/tickets`, as specified in EPİAŞ’s [electricity-service technical documentation](https://seffaflik.epias.com.tr/electricity-service/technical/tr/index.html) and [ticket-service announcement](https://www.epias.com.tr/tum-duyurular/seffaflik-platformu-web-servisleri-ticket-tgt-alma-servisinde-degisiklik/). `EPTR_AUTH_URL` is an optional server-side override for a future endpoint supplied by EPİAŞ.

## Verify

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Fast WebMCP walkthrough:

1. Open the [protected Vercel workspace](https://gridbrief-tr.vercel.app/) with the GridBrief evaluator credentials.
2. In a compatible WebMCP browser environment, confirm that the page reports WebMCP availability and discovers eight unique tools.
3. Ask the agent to use `search_transparency_datasets` for a named dataset or section, then use the returned `datasetId` with `get_transparency_dataset` for a bounded date range.
4. Confirm that catalogue selection, query scope, result quality, source, runtime state, and any warning are also visible in the page.
5. Optionally continue through entity search, plan comparison, market snapshot, stress scenario, and shift-brief drafting. Inspect the evidence before using it in an operational decision; no additional approval control is required to demonstrate the read-only WebMCP flow.

The server routes can also be checked directly after authentication:

```bash
curl --user "judge:your_gridbrief_access_password" https://gridbrief-tr.vercel.app/api/health
curl --user "judge:your_gridbrief_access_password" https://gridbrief-tr.vercel.app/api/catalog
curl --user "judge:your_gridbrief_access_password" https://gridbrief-tr.vercel.app/api/dataset
```

Use a completed historical date for the first authorized data smoke test. A current or next-day selection may legitimately have unpublished or delayed series.

## Deploy

The current challenge workspace is deployed to the protected Node-compatible Vercel URL:

[https://gridbrief-tr.vercel.app/](https://gridbrief-tr.vercel.app/)

Build with the repository’s standard command and store every server-only value in the host’s encrypted environment configuration:

```bash
npm run build
```

Do not enable the static GitHub Pages flags on the Vercel deployment. Before sharing evaluator access, verify `GET /api/health`, all eight WebMCP registrations, `/api/catalog`, `/api/dataset` capability discovery, one bounded historical dataset query, catalogue runtime labels, and the live-mode kill switch. Never place evaluator or EPİAŞ credentials in the repository or a command transcript.

## Project notes

- Challenge explanation and copy: [work/devpost-submission.md](work/devpost-submission.md)
- Submission checks: [work/submission-checklist.md](work/submission-checklist.md)
- Design and interaction QA: [design-qa.md](design-qa.md)
- License: [MIT](LICENSE)

## Safety and limits

This prototype is not financial, legal, or operational advice. It does not calculate collateral, credit, imbalance settlement, or an executable hedge. Scenario values are transparent sensitivity calculations, not forecasts. Validate data, timestamps, report semantics, market rules, and any decision in the participant’s approved risk process.
