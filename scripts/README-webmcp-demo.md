# Native WebMCP demo harness

`webmcp-demo.mjs` is a deterministic sample agent workflow for the Devpost recording. It connects to a headed Chrome 152 browser over the Chrome DevTools Protocol, discovers the tools exposed by the page's native `document.modelContext`, and executes those discovered tools. It does not emulate WebMCP or replace tool calls with direct API requests.

## Live local demo

Start GridBrief with its existing server-only EPİAŞ credentials and the live switch enabled. Do not put credentials on the command line:

```powershell
$env:EPTR_LIVE_ENABLED = "true"
npm run dev
```

In a second terminal:

```powershell
node scripts/webmcp-demo.mjs --url http://127.0.0.1:3000/en --with-brief
```

The script launches a separate, headed Chrome 152 profile with `--enable-features=WebMCP`. It first proves a live EPİAŞ PTF dataset response with a visible provider and retrieval timestamp. With `--with-brief`, it then requires a successful, live-labelled `get_market_snapshot` before it invokes the local-only what-if and draft tools.

## Protected deployment

For a protected URL, let the script launch Chrome and enter only the GridBrief evaluator credentials in the browser prompt while it waits:

```powershell
node scripts/webmcp-demo.mjs --url https://gridbrief-tr.vercel.app/en --wait-ms 300000 --with-brief
```

Alternatively, launch a dedicated Chrome profile yourself and attach:

```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" `
  --remote-debugging-port=9222 `
  --remote-debugging-address=127.0.0.1 `
  --enable-features=WebMCP `
  --user-data-dir="C:\Temp\gridbrief-webmcp"

node scripts/webmcp-demo.mjs --attach --url https://gridbrief-tr.vercel.app/en --wait-ms 300000 --with-brief
```

## Evidence

The default output directory is `output/webmcp-demo/`:

- `evidence.json` contains bounded, recursively sanitized discovery and execution evidence;
- `01-tools-discovered.png` shows the ready workspace;
- `02-catalog-search.png` (or `05-catalog-search.png` with the brief flow) shows a successful native catalogue tool call and the visible WebMCP trace;
- `03-live-dataset.png` (or `06-live-dataset.png` with the brief flow) shows the real dataset rendered with its source and retrieval time; and
- when `--with-brief` is used, screenshots 02–04 show the verified live snapshot, local what-if, and English draft.

The CLI has no username, password, token, cookie, or authorization-header option. URL credentials are rejected. The evidence sanitizer redacts credential-like keys and removes URL query strings. EPİAŞ credentials and TGTs remain on the GridBrief server.

Run `node scripts/webmcp-demo.mjs --help` for all options.
