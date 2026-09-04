# GridBrief TR Devpost demo script (1:54)

**Goal:** present the English product, a real completed-day EPİAŞ result, and an inspectable native WebMCP sample agent workflow. Keep the browser and the page's WebMCP trace visible during tool execution. Do not describe deterministic orchestration as an LLM, and do not use a live label unless `output/webmcp-demo/evidence.json` has `status: "passed"` plus a verified EPİAŞ provider and retrieval timestamp.

| Time | Screen / action | English voice-over |
| --- | --- | --- |
| 0:00–0:10 | Brand opener, then the English GridBrief workspace. | “Energy-market decisions happen in minutes, but the evidence is still scattered across screens, tables, and team handoffs.” |
| 0:10–0:24 | Show `/en`: Market overview, All EPİAŞ data, Organizations, Power plants, and Planning. Pause on source and freshness labels. | “GridBrief TR turns EPİAŞ Transparency 2.0 into one English decision workspace while preserving the familiar market, organization, plant, and planning structure.” |
| 0:24–0:38 | In headed Chrome 152, show `WebMCP ready`, `8 browser tools`, and the discovery evidence. | “The difference is native WebMCP. The page exposes eight structured tools through `document.modelContext`, so an authorized browser agent can act on the same visible workspace as the user.” |
| 0:38–0:55 | Run the sample workflow. Show the successful native `search_transparency_datasets` call selecting `markets.dam.mcp` in the visible catalogue. | “This deterministic sample agent workflow discovers the page-defined tools and searches the Transparency catalogue. It never receives an EPİAŞ password or token.” |
| 0:55–1:08 | Show the authorized production market, planning, PURE, and ACARSOY screens for the completed 2026-09-03 day, including visible source times and coverage. | “These production views use real completed-day EPİAŞ data. The native verification run’s upstream read timed out, so the harness failed closed and never substituted synthetic rows.” |
| 1:08–1:23 | Show the conditional example-agent chain: `get_market_snapshot` must return `mode: live` before the local stress and deterministic brief tools can run. Do not present those skipped calls as an executed trace. | “After a live market snapshot is verified, an agent may calculate a disclosed local sensitivity and draft an English shift brief. These steps change only the visible workspace; they never place or recommend an order.” |
| 1:23–1:40 | Show business-unit callouts: Trading, Operations, Planning, Portfolio Risk, Management. | “A trading agent can inspect price and imbalance context. Operations checks generation. Planning compares programs and capacity. Portfolio risk tests assumptions. Management receives one source-linked decision record.” |
| 1:40–1:50 | Show source, timestamp, warnings, and the on-page WebMCP trace together. | “Every team works from the same evidence with visible scope, timestamps, warnings, and provenance. Human review remains part of every operational decision.” |
| 1:50–1:54 | Closing card: “Türkiye energy data, agent-ready.” | “GridBrief TR: Türkiye’s energy-market data, transformed into agent-ready decision infrastructure.” |

## Exact native sample workflow

Run GridBrief locally with the live switch and existing server-only credentials. Then run:

```powershell
node scripts/webmcp-demo.mjs --url http://127.0.0.1:3000/en --date 2026-09-03 --with-brief
```

The harness performs this bounded sequence:

1. discover all eight page-defined tools from `document.modelContext.getTools()`;
2. call `get_market_snapshot` for 17:00–23:00 using the tool's exclusive end-hour convention;
3. invoke `stress_test_position` and `draft_shift_brief` only if the snapshot is successfully labelled `live`, identifies EPİAŞ, has a valid `fetchedAt`, and contains a numeric PTF observation;
4. call `search_transparency_datasets` and `get_transparency_dataset` for the allowlisted PTF dataset;
5. require a visible EPİAŞ provider, valid `retrievedAt`, and at least one real row before marking the evidence as passed; and
6. write bounded, sanitized JSON evidence and screenshots to `output/webmcp-demo/`.

This is a **sample agent workflow**, not an LLM simulation. It demonstrates the same browser-side tool discovery and execution boundary that an agent uses. The app remains useful without a chat box or a manual approval button.

## Recording checklist

- Export duration must remain under **3:00**.
- Record the English route and a working deployed or local live build, not mocked slides.
- Make `WebMCP ready`, the count of eight tools, and at least one successful WebMCP trace readable.
- Show a real completed historical day; do not use future-dated observations as actuals.
- Show `EPİAŞ LIVE` for production screens only when the UI visibly includes the provider and retrieval time. Describe a native WebMCP retrieval as live only when the current evidence file passes the provenance checks.
- If EPİAŞ is unavailable, postpone the live-data clip; do not relabel synthetic or cached structural catalogue data as live observations.
- Never show EPİAŞ credentials, evaluator credentials, tokens, `.env` files, cookies, or browser storage.
- Keep the distinction clear: market and dataset tools read EPİAŞ evidence; stress and brief tools are local decision-support actions; none executes a trade.
- Watch the final export at 1× speed and confirm English labels, source, freshness, warnings, and safety text are readable.
