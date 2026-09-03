# GridBrief TR submission checklist

## Product and demo

- [x] Public deployment works in clean desktop and mobile browsers: https://haakanergun.github.io/gridbrief-tr/
- [x] Main scenario works: synthetic next-day reference dated 2026-09-04, short 50 MWh, 17:00–22:00 inclusive, snapshot, stress, draft, manual edit, human approval.
- [x] WebMCP scenario uses the equivalent exclusive tool boundary: `startHour: 17`, `endHour: 23`.
- [x] The original four-tool flow was verified in Chrome 152; the current compatible browser runtime discovers all six tools and successfully executes the two new entity/planning tools.
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
