# Security policy

## Supported versions

This project has no numbered releases yet. Security fixes land on the default branch.

## Reporting a vulnerability

**Do not** open a public GitHub issue for security problems.

Use [GitHub Private Vulnerability Advisories](https://docs.github.com/en/code-security/security-advisories/working-with-repository-security-advisories/privately-reporting-a-security-vulnerability) on this repository (Security tab → Report a vulnerability).

If advisories are not enabled yet, contact the maintainers through a private channel and wait for them to open a draft advisory.

Please include:

- A short description of the issue
- Steps to reproduce
- Affected files or URLs if known
- Impact (for example XSS in the HUD, save-file injection, or unexpected network calls)

You should hear back within 14 days. We will coordinate a fix and a public disclosure after a patch is available.

## Scope

This is a local static game (Python or any HTTP server + browser). Typical reports we care about:

- Unexpected network requests from game code (debug ingest, telemetry)
- XSS or HTML injection through save data or UI strings
- Path or file issues in `serve.py` if it ever grows beyond a static file server
