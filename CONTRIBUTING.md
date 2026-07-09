# Contributing to Crossroads

Thanks for wanting to help. This project is intentionally small — the bar for merging is "does it make a hard decision easier, and is it backed by evidence?"

## Ground rules

1. **Evidence first.** Any new prompt, checklist item, or step must cite a source in `docs/RESEARCH.md`. Pop-psychology without a primary reference will be (kindly) declined.
2. **Zero dependencies.** No frameworks, no build step, no npm. Plain HTML/CSS/JS only. This is a feature.
3. **Local-first.** Nothing may send user data anywhere. No analytics, no fonts-with-tracking beyond what's already there, no CDNs for logic.
4. **Accessible.** Keyboard navigation, visible focus states, `prefers-reduced-motion` respected. Test with keyboard only before submitting.

## How to contribute

1. Fork the repo and create a branch: `git checkout -b feat/my-improvement`
2. Make your change. Keep the diff focused — one idea per PR.
3. Test by opening `index.html` in at least two browsers.
4. Open a pull request describing **what** changed and **why** (with the citation if it's a content change).

## Good first issues

- Translations (the strings live in `index.html` and `js/app.js` — an i18n extraction would itself be a welcome PR)
- Print stylesheet for the summary step
- Additional bias checks with citations
- JSON import/export of a full decision

## Reporting bugs

Open an issue with: browser + version, steps to reproduce, what you expected, what happened.

## Code style

- 2-space indentation, semicolons on
- No abbreviations in names (`renderProsCons`, not `rndPC`)
- Comment the *why*, not the *what*
