# Devpost submission copy — GridBrief TR

Use this as the English submission text. Replace bracketed URLs only after the public deployment, repository, and video are final.

## Project name

GridBrief TR — an agent-native energy-market risk workspace

## Tagline

Turn a Turkish electricity-market exposure into a source- and freshness-aware shift brief, with the human in control.

## Inspiration

Energy-market participants must reconcile price, system, supply, and demand information before a shift decision. Today that often means moving between operator pages, spreadsheets, and chat, then rebuilding the same context when a colleague asks “what changed?” We wanted to make the shared context—scope, evidence, freshness, scenario, and approval—the product itself.

Türkiye’s EPİAŞ Transparency Platform makes rich market information available to authorized users, but availability and publication timing vary by report. That makes provenance and freshness as important as the number on a chart. GridBrief TR is designed around that constraint instead of hiding it.

## What it does

GridBrief TR is a decision-support workspace for a stated electricity-market exposure. In the challenge walkthrough, a participant is short 50 MWh for tomorrow between 17:00 and 22:00 (Türkiye time).

A browser agent uses the workspace's WebMCP tools to:

1. set the delivery date and time window with `set_analysis_scope`;
2. gather the in-scope market snapshot with `get_market_snapshot`;
3. run a transparent price-stress scenario for the stated position with `stress_test_position`; and
4. draft a shift brief with `draft_shift_brief` that carries its evidence and mode labels.

The participant then changes an assumption, sees the stress result and draft update, and explicitly approves the brief. GridBrief neither places a trade nor exposes any execution tool.

Each snapshot is marked with a source, retrieval/as-of time, and mode. In **Live EPİAŞ** mode, the gateway uses six verified reports: day-ahead PTF, balancing-market SMF, intraday weighted-average price, real-time consumption, real-time generation, and system direction. These reports are implemented from the official [EPİAŞ Electricity Service technical documentation](https://seffaflik.epias.com.tr/electricity-service/technical/tr/index.html). Partial upstream failures return null metrics and warnings; they are never filled with demo values. In **Synthetic demo** mode, deterministic demo data is visibly labelled `synthetic` and `not EPİAŞ`; it is never presented as live market data. Synthetic mode is used only when live credentials are not configured.

The public challenge deployment runs in synthetic demo mode so reviewers can reproduce the workflow without an EPİAŞ account. Its values are demonstration-only; a configured live deployment is a separate, authenticated mode.

## How we used WebMCP

WebMCP is not a chat box bolted onto a dashboard. It lets the browser agent use the same stateful workspace as the participant through four tools: `set_analysis_scope`, `get_market_snapshot`, `stress_test_position`, and `draft_shift_brief`. The agent sets a structured delivery scope, retrieves the visible snapshot with provenance, calculates a bounded stress test, and prepares a draft brief. Results are rendered back into the workspace for review.

The visible UI and market API use an inclusive final hour: 17:00–22:59 is `startHour: 17, endHour: 22`. WebMCP uses an exclusive `endHour`, so the equivalent agent tool call is `startHour: 17, endHour: 23`. This explicit convention avoids an off-by-one delivery-hour error.

This improves the UX because the agent no longer has to infer a position from a paragraph or copy values across tabs. It receives structured fields and returns structured results that the user can inspect, amend, and approve in context. The tool surface is intentionally read-only with respect to markets: it supports analysis and communication, never ordering or execution.

Before this workflow, creating a defensible brief meant manually carrying the same scope, timestamps, and sources across several tools, then reconstructing why a number appeared. With GridBrief, the human and agent can jointly produce a reviewable record: the agent accelerates retrieval and synthesis while the human can correct assumptions and retains the approval gate.

## How we built it

The application keeps a single workspace state for position, delivery window, selected assumptions, snapshot, stress result, and draft brief. Its WebMCP registration maps the four safe actions—scope, snapshot, stress, and draft—to that state. This lets a compatible browser agent invoke the workflow and lets ordinary UI controls modify the exact same information.

The data boundary is explicit. Live EPİAŞ requests use server-side configuration and a short-lived TGT authentication flow; credentials are never exposed to the browser. The server retains a TGT in memory for up to two hours with a five-minute renewal buffer. When credentials are absent, the app uses a deterministic synthetic fixture and labels it in the UI and output. A live request with a partial source failure yields a warning and null value rather than synthetic substitution. Each snapshot includes provenance and freshness metadata so a delayed, unavailable, or synthetic source cannot masquerade as real-time information.

Stress results are simple disclosed sensitivities—exposure multiplied by a selected price move—not predictive models or trade recommendations. A final approval is a user action, not an agent call.

## Challenges we ran into

The key challenge was making a useful agent workflow without compromising market-data integrity or human control. EPİAŞ data access requires authentication and reports have different publishing schedules, while a credential-free public demo must remain reproducible. We addressed this by separating live and synthetic modes, preserving source/freshness metadata, keeping secrets server-side, and limiting WebMCP to non-executing analysis tasks. Synthetic mode is selected only when credentials are not configured; it is not a live-data failure fallback.

The design challenge was resisting a broad “AI market terminal.” A single, complete shift-brief workflow made it possible to show why WebMCP matters: an agent completes repetitive context work while the participant can visibly inspect, change, and approve every material assumption.

## What’s next

Next we would validate exact report semantics and usage permissions with EPİAŞ, expand the adapter only for verified reports, add organization-level audit retention and role controls, and test the workflow with licensed market participants. We would also add data-quality checks and scenario libraries, while preserving the no-execution boundary unless separately designed, governed, and authorized.

## Links

- Live application: https://haakanergun.github.io/gridbrief-tr/
- Source code: https://github.com/haakanergun/gridbrief-tr
- Demo video (under three minutes): [YOUTUBE_URL]

## Attribution and disclosures

GridBrief TR is an independent prototype and is not affiliated with or endorsed by EPİAŞ. EPİAŞ Transparency Platform data is used only through appropriately configured access. In the demo, any result labelled `synthetic` is fabricated, deterministic sample data—not an EPİAŞ quote, forecast, or trading signal. The application provides decision support only; it does not trade or provide financial advice.
