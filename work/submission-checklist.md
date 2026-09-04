# GridBrief TR submission checklist

## Product and demo

- [x] Protected English/Turkish production deployment works in desktop Chrome: https://gridbrief-tr.vercel.app/en
- [x] The recorded real-data scenario uses the completed 2026-09-03 market day and keeps provider, retrieval time, coverage, and warnings visible.
- [x] WebMCP scenario uses the equivalent exclusive tool boundary: `startHour: 17`, `endHour: 23`.
- [x] Chrome 152 discovers all eight native `document.modelContext` tools; the sample agent successfully executes `search_transparency_datasets`, while unavailable live reads fail closed without substituting synthetic rows.
- [x] No tool can execute or place an order.
- [x] Synthetic data is used only when live mode is explicitly disabled and is labelled `synthetic` / `not EPİAŞ`; enabling live mode with missing credentials fails closed, while a partial live-source failure shows warnings and null metrics instead.
- [x] No EPİAŞ credentials, TGT, `.env`, or account data are in browser assets, git history, or repository. Re-check the screen recording before upload.

## Repository

- [x] Public repository URL is final and opens without authentication: https://github.com/haakanergun/gridbrief-tr
- [x] `npm install`, `npm run lint`, and `npm run build` succeed.
- [x] README setup, mode disclosures, WebMCP explanation, test instructions, and deploy instructions match the final code.
- [x] The market and explorer adapters link to the official technical documentation; authorized live smoke tests cover the market snapshot, catalogs, organization/UEVÇB plans, plant generation/UEVM request contracts, and system planning series without exposing credentials.
- [x] Confirm the root `LICENSE` contains the intended MIT text.
- [x] Confirm `.gitignore` excludes `.env`, build outputs, and browser-test artifacts.

## Devpost

- [ ] Replace the remaining YouTube placeholder in `work/devpost-submission.md` after upload.
- [ ] Paste the English copy into its matching Devpost fields.
- [ ] Upload a public video under three minutes; verify it plays while signed out.
- [ ] State any synthetic mode in the submission and video description.
- [ ] Verify Devpost’s current eligibility, required fields, licence, and deadline against the official rules before submitting.
- [ ] Submit before the deadline and preserve the submitted repo/deployment state as required by the rules.
