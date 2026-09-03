# GridBrief TR submission checklist

## Product and demo

- [ ] Public deployment works in a clean browser.
- [ ] Main scenario works: short 50 MWh, tomorrow 17:00–22:00 inclusive, snapshot, stress, draft, manual edit, human approval.
- [ ] WebMCP scenario uses the equivalent exclusive tool boundary: `startHour: 17`, `endHour: 23`.
- [ ] WebMCP invocation is demonstrated in a compatible browser-agent environment.
- [ ] No tool can execute or place an order.
- [ ] Synthetic data is used only when credentials are absent and is explicitly labelled `synthetic` / `not EPİAŞ`; a live failure shows warnings and null metrics instead.
- [ ] No EPİAŞ credentials, TGT, `.env`, or account data are in browser assets, git history, screen recording, or repository.

## Repository

- [x] Public repository URL is final and opens without authentication: https://github.com/haakanergun/gridbrief-tr
- [x] `npm install`, `npm run lint`, and `npm run build` succeed.
- [ ] README setup, mode disclosures, WebMCP explanation, test instructions, and deploy instructions match the final code.
- [ ] The six verified EPİAŞ reports and the official technical-documentation link are present and correct.
- [x] Confirm the root `LICENSE` contains the intended MIT text.
- [x] Confirm `.gitignore` excludes `.env`, build outputs, and browser-test artifacts.

## Devpost

- [ ] Replace the three placeholders in `work/devpost-submission.md` with final live app, public repository, and public YouTube URLs.
- [ ] Paste the English copy into its matching Devpost fields.
- [ ] Upload a public video under three minutes; verify it plays while signed out.
- [ ] State any synthetic mode in the submission and video description.
- [ ] Verify Devpost’s current eligibility, required fields, licence, and deadline against the official rules before submitting.
- [ ] Submit before the deadline and preserve the submitted repo/deployment state as required by the rules.
