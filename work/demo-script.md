# GridBrief TR demo script (2:35)

**Goal:** show a browser agent invoking the site’s WebMCP tools in a real, inspectable workflow. Record in English, keep browser chrome visible for the agent portion, and show `Synthetic demo` when live mode is disabled. Do not call synthetic numbers live.

| Time | Screen / action | Voice-over |
| --- | --- | --- |
| 0:00–0:12 | Title card, then the GridBrief TR workspace. Pause on the source/freshness legend. | “GridBrief TR is an agent-native risk workspace for Türkiye’s electricity-market participants. It does not trade. It creates a reviewable shift brief from a stated exposure.” |
| 0:12–0:28 | Show the seeded scope. Highlight: synthetic next-day reference scenario dated 4 September 2026; 50 MWh short; 17:00 through 22:00 inclusive; Türkiye time. | “This synthetic reference scenario is dated September fourth: our participant is short 50 megawatt-hours from five through ten PM, inclusive. The risk is not a hidden prompt; it is structured workspace state.” |
| 0:28–0:42 | Open the compatible browser-agent UI. Give one concise instruction: “Find the Marmara demo organization, compare plan and actual layers for September 4, then set the 17–23 exclusive market window, get the snapshot, stress a 50 MWh short position by +20%, and draft an English operations brief.” | “The browser agent invokes six WebMCP tools. It can navigate entities and planning evidence as well as complete the risk-brief workflow, with every result returned to the visible interface.” |
| 0:42–0:57 | Show the organization search result and Planlama view. Linger on the source/mode badge and the ‘Tüketim · Sistem’ scope boundary. | “The first tools open the selected entity and plan comparison. Production plans can reach organization or UEVÇB level; the load plan and consumption stay Türkiye-system data. In this public build every entity and value is explicitly fictional.” |
| 0:57–1:15 | Show the scope, snapshot, then stress result. Point to the exclusive hour convention, source time, and formula. | “The agent then gathers the labelled snapshot and runs a disclosed sensitivity. Exclusive hour 23 means the UI’s 17:00 through 22:59 range. These are transparent what-if calculations, not forecasts or trade instructions.” |
| 1:15–1:34 | Show the draft shift brief. Scroll only enough to reveal evidence, source/freshness, risks, and the approval state. | “The agent drafts a concise shift brief with the position, evidence, freshness, and assumptions preserved. The brief is a draft—there is no execution endpoint.” |
| 1:34–1:51 | Manually edit one material assumption, such as the adverse price move; show changed stress amount and re-drafted brief. | “The human changes an assumption in the UI. The same workspace state updates the stress result and the brief. The agent is accelerating the work, not taking control of the decision.” |
| 1:51–2:08 | Point to the approval control. Click approval if the implementation records it locally; otherwise visibly explain it is pending. | “Only a human can approve this shift brief. Approval records the reviewed draft; it never sends an order or connects to a trading venue.” |
| 2:08–2:24 | Return to data legend/mode panel. Show the explicit synthetic warning. | “This public build does not retrieve or redistribute EPİAŞ data. It uses deterministic synthetic demo data and marks it clearly. The optional live gateway is for an authorized user and remains subject to EPİAŞ terms.” |
| 2:24–2:35 | Closing title: “WebMCP: shared state, visible evidence, human approval.” | “GridBrief turns a fragmented, manual handoff into a source-aware human-and-agent workflow. That is the WebMCP difference.” |

## Recording checklist

- Total exported duration: **under 3:00**.
- Record a working deployed URL, not mocked slides.
- Keep the Turkish market interface visible and use English voice-over/subtitles for the international judging audience.
- Make WebMCP tool invocation visible at least once.
- Do not show EPİAŞ credentials, tokens, or `.env` values.
- Use a `LIVE EPİAŞ` label only if the current recording actually retrieved the shown response from the configured live path. Otherwise say and show `SYNTHETIC DEMO`.
- Before upload, watch at 1× speed and confirm source/freshness labels and human approval are readable.
