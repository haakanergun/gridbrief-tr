# GridBrief TR submission checklist

## Product and demo

- [x] Public deployment works in clean desktop and mobile browsers: https://haakanergun.github.io/gridbrief-tr/
- [x] Main scenario works: synthetic next-day reference dated 2026-09-04, short 50 MWh, 17:00–22:00 inclusive, snapshot, stress, draft, manual edit, human approval.
- [x] WebMCP scenario uses the equivalent exclusive tool boundary: `startHour: 17`, `endHour: 23`.
- [x] WebMCP invocation is verified in Chrome 152's experimental implementation; all four discovered tools execute successfully in sequence.
- [x] No tool can execute or place an order.
- [x] Synthetic data is used only when credentials are absent and is explicitly labelled `synthetic` / `not EPİAŞ`; a live failure shows warnings and null metrics instead.
- [x] No EPİAŞ credentials, TGT, `.env`, or account data are in browser assets, git history, or repository. Re-check the screen recording before upload.

## Repository

- [x] Public repository URL is final and opens without authentication: https://github.com/haakanergun/gridbrief-tr
- [x] `npm install`, `npm run lint`, and `npm run build` succeed.
- [x] README setup, mode disclosures, WebMCP explanation, test instructions, and deploy instructions match the final code.
- [x] The six verified EPİAŞ reports and the official technical-documentation link are present and correct.
- [x] Confirm the root `LICENSE` contains the intended MIT text.
- [x] Confirm `.gitignore` excludes `.env`, build outputs, and browser-test artifacts.

## Devpost

- [ ] Replace the remaining YouTube placeholder in `work/devpost-submission.md` after upload.
- [ ] Paste the English copy into its matching Devpost fields.
- [ ] Upload a public video under three minutes; verify it plays while signed out.
- [ ] State any synthetic mode in the submission and video description.
- [ ] Verify Devpost’s current eligibility, required fields, licence, and deadline against the official rules before submitting.
- [ ] Submit before the deadline and preserve the submitted repo/deployment state as required by the rules.
