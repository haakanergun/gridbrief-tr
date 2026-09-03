# GridBrief TR demo script (2:35)

**Goal:** show a browser agent invoking the site’s WebMCP tools in a real, inspectable workflow. Record in English, keep browser chrome visible for the agent portion, and show `Synthetic demo` if live EPİAŞ credentials are not configured. Do not call synthetic numbers live.

| Time | Screen / action | Voice-over |
| --- | --- | --- |
| 0:00–0:12 | Title card, then the GridBrief TR workspace. Pause on the source/freshness legend. | “GridBrief TR is an agent-native risk workspace for Türkiye’s electricity-market participants. It does not trade. It creates a reviewable shift brief from a stated exposure.” |
| 0:12–0:28 | Show the seeded scope. Highlight: synthetic next-day reference scenario dated 4 September 2026; 50 MWh short; 17:00 through 22:00 inclusive; Türkiye time. | “This synthetic reference scenario is dated September fourth: our participant is short 50 megawatt-hours from five through ten PM, inclusive. The risk is not a hidden prompt; it is structured workspace state.” |
| 0:28–0:42 | Open the compatible browser-agent UI. Give one concise instruction: “Use `set_analysis_scope` with startHour 17 and exclusive endHour 23. Then call `get_market_snapshot`, call `stress_test_position` with direction short, volumeMwh 50, and a 20% upward price shock, and call `draft_shift_brief` in English for operations.” | “The WebMCP tool uses an exclusive end hour, so 23 means the UI’s visible 17:00 through 22:59 range. The browser agent invokes four tools and returns results directly to the interface.” |
| 0:42–0:57 | Show tool activity / results: scope set and snapshot loaded. Zoom or linger on the source, retrieval time, source note, and mode badge. | “First it sets the scope and gathers the labelled reference snapshot. The workspace preserves source, retrieval time, and report-delay notes. This recording uses synthetic replay mode; these are not EPİAŞ observations.” |
| 0:57–1:15 | Show the stress result. Point to formula/assumption and scenario deltas. | “Next it runs disclosed price sensitivities against the position. These are transparent what-if calculations, not price forecasts or trade instructions.” |
| 1:15–1:34 | Show the draft shift brief. Scroll only enough to reveal evidence, source/freshness, risks, and the approval state. | “The agent drafts a concise shift brief with the position, evidence, freshness, and assumptions preserved. The brief is a draft—there is no execution endpoint.” |
| 1:34–1:51 | Manually edit one material assumption, such as the adverse price move; show changed stress amount and re-drafted brief. | “The human changes an assumption in the UI. The same workspace state updates the stress result and the brief. The agent is accelerating the work, not taking control of the decision.” |
| 1:51–2:08 | Point to the approval control. Click approval if the implementation records it locally; otherwise visibly explain it is pending. | “Only a human can approve this shift brief. Approval records the reviewed draft; it never sends an order or connects to a trading venue.” |
| 2:08–2:24 | Return to data legend/mode panel. Show the explicit synthetic warning. | “This public build does not retrieve or redistribute EPİAŞ data. It uses deterministic synthetic demo data and marks it clearly. The optional live gateway is for an authorized user and remains subject to EPİAŞ terms.” |
| 2:24–2:35 | Closing title: “WebMCP: shared state, visible evidence, human approval.” | “GridBrief turns a fragmented, manual handoff into a source-aware human-and-agent workflow. That is the WebMCP difference.” |

## Recording checklist

- Total exported duration: **under 3:00**.
- Record a working deployed URL, not mocked slides.
- Use the app’s English demo language; keep all visible public demo copy and signals in English.
- Make WebMCP tool invocation visible at least once.
- Do not show EPİAŞ credentials, tokens, or `.env` values.
- Use a `LIVE EPİAŞ` label only if the current recording actually retrieved the shown response from the configured live path. Otherwise say and show `SYNTHETIC DEMO`.
- Before upload, watch at 1× speed and confirm source/freshness labels and human approval are readable.
