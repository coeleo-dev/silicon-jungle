## Summary

<!-- What does this PR change and why? -->

## Test plan

- [ ] `npm test` (or `node --test 'js/**/*.test.mjs'`)
- [ ] Played the affected flow with `python3 serve.py` (http://localhost:4321) when UI/input/rendering changed

## Checklist

- [ ] No debug ingest / port `7736` in `js/` (except `noDebugIngest.test.mjs`)
- [ ] Module `?v=` stamps stay unique per file (bump every import if you bump one)
