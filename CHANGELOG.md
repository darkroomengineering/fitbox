# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Releases before `0.2.1` are recorded in the git history.

## [0.2.1] - 2026-06-24

No public API or behavior changes — a maintenance release (dependency
modernization, internal refactors, security, and docs). Drop-in for `0.2.0`.

### Changed

- Upgrade `@chenglou/pretext` `0.0.5` → `0.0.8`. All consumed APIs are
  unchanged; no source changes were required.
- Modernize the dev toolchain: TypeScript `5` → `6`, Vitest `2` → `4`,
  lint-staged `15` → `17`, Biome `2.4.2` → `2.5.1`. Added
  `ignoreDeprecations: "6.0"` to `tsconfig.json` for the TypeScript 6 cutover
  (tsup's declaration pipeline injects the now-deprecated `baseUrl`).
- Split the core into focused modules (`fit`, `layout`, `fluid`) behind a
  thin barrel. The public API is byte-identical — 6 runtime exports and 11
  types, with `clamp`/`round` kept internal.
- Dedupe the font-readiness gate shared by `useFit` and `useFitText` into a
  single `awaitFontsReady` helper, and replace `FitText`'s runtime
  prop-splitter (`splitProps` + a hand-maintained key set, three casts) with
  direct destructuring. The React adapter is now ~1.5KB min+gz (was ~1.6KB).

### Fixed

- Eliminate the `layoutWithLines` dead-import build warning. `layoutFit` now
  lives in its own module, so any build that never calls it (the React
  adapter) tree-shakes both the function and its Pretext import away.

### Security

- Pin the transitive `esbuild` to `^0.28.1` via `overrides`, resolving
  [GHSA-g7r4-m6w7-qqqr](https://github.com/advisories/GHSA-g7r4-m6w7-qqqr)
  (dev-server arbitrary file read on Windows). Dev-tooling only — esbuild is
  never shipped in `dist`.

### Docs

- Lead the README with the zero-runtime-JS fluid CSS path (`fluidFit` +
  `<FitText fluid>`) and a decision table, answering the common "can't this
  be CSS instead of JS?" question for responsive headings.
- Document units: `minSize`/`maxSize` and viewports are **px**, `lineHeight`
  is a unitless multiplier. The type JSDoc now ships in the `.d.ts`, so
  editors answer "`maxSize: 48` = 48px?" on hover.
- Correct the bundle-size figures to measured min+gz values.
