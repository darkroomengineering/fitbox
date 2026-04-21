# fitbox

Reflow-free text-to-box fitting for React, built on [`@chenglou/pretext`](https://github.com/chenglou/pretext).

---

## Why this exists

[Fitty](https://github.com/rikschennink/fitty) is the canonical "fit text to its container" library. The way it works — and the way every text-fitting library worked for years — is:

1. Put the text in the DOM at some font-size.
2. Read `element.getBoundingClientRect()`.
3. Compare to the container width.
4. Adjust font-size, binary-search, goto 2.

Each iteration of that loop forces a layout reflow. A single fit might be 5–10 reflows. A page with 20 fittable headings resizing during a window drag is thousands of reflows per second. Fitty works hard to batch them, but it can't escape the fundamental shape of the problem: **the browser is both the layout engine and the oracle you're asking**.

In early 2026 [Cheng Lou](https://github.com/chenglou) shipped [Pretext](https://github.com/chenglou/pretext) — a text measurement and layout library that sidesteps the DOM entirely. It uses `canvas.measureText()` as ground truth (which does not trigger reflow) and caches per-glyph widths so subsequent measurements are pure arithmetic. You can measure a paragraph's wrapped height in microseconds, without ever touching layout.

fitbox is what Fitty looks like when you build it on that primitive.

### The math that falls out

The interesting part isn't that we swap `getBoundingClientRect` for `measureText`. It's that once measurement is reflow-free, the algorithm collapses.

**Single-line fit.** Text width scales linearly with font-size. Prepare the text once at 1px; let `w₁` be its natural width. Then for any container of width `W`, the largest single-line fit is simply:

```
fontSize = W / w₁
```

One division. No search.

**Multi-line fit.** Line breaks depend on `(fontSize, maxWidth)` in a non-linear way, so we still search. But there's an invariant: scaling `fontSize` by `k` at container width `W` produces the same wrapping as `fontSize = 1` at container width `W / k`. So we prepare once at 1px and binary-search `fontSize` by calling Pretext's `measureLineStats(handle, W / s)` — still pure arithmetic, no DOM, no reflow. 10–12 iterations for pixel precision.

**Fluid CSS.** Because single-line fit is closed-form, its value at any viewport width is a linear function of the viewport. That means we can emit a CSS `clamp(min, calc(a + b·vw), max)` at build or load time and have the browser interpolate between viewport sizes with zero runtime JavaScript. Fitty has no equivalent — it can't know the fit without measuring.

**SSR.** Pretext's measurement needs a canvas, not a DOM. That means a Node canvas polyfill (e.g. `@napi-rs/canvas`) is enough to compute fits in a loader and ship correctly-sized HTML, hydrating with zero layout shift. Fitty can't do this at all.

### What that adds up to

| | Fitty | fitbox |
|---|---|---|
| Measurement | `getBoundingClientRect()` on every probe | `canvas.measureText()` once per (text, font) |
| Single-line fit | Binary search over DOM | Closed form: `W / w₁` |
| Multi-line fit | Not supported | Binary search over reflow-free stats |
| Fluid CSS | Not supported | Emits static `clamp(…)` — zero JS at runtime |
| SSR | Not possible (needs DOM) | Supported via canvas polyfill |
| Bundle | ~4KB min+gz | ~3KB core + ~3KB react adapter |

fitbox is narrower than Fitty in one way (it assumes you want React; plain-DOM usage needs a small wrapper) and wider in several others (multi-line, fluid CSS, SSR). The shared primitive — "measurement without reflow" — is what unlocks all of them.

---

## Install

```sh
bun add fitbox @chenglou/pretext
```

## Client hook

```tsx
import { useFitText } from 'fitbox/react';

function Headline({ text }: { text: string }) {
  const { ref, style } = useFitText<HTMLHeadingElement>(text, {
    family: 'Inter',
    maxLines: 2,
    maxSize: 120,
  });
  return <h1 ref={ref} style={style}>{text}</h1>;
}
```

A `ResizeObserver` drives refits; `document.fonts.ready` gates first measurement so metrics aren't taken against a fallback font.

## `<FitText>`

```tsx
import { FitText } from 'fitbox/react';

<FitText family="Inter" maxLines={3} as="h1">
  Typography that actually fits its container.
</FitText>
```

## Fluid CSS — no JS at runtime

For responsive single-line headings, emit a static `clamp()` and let the browser interpolate:

```tsx
import { prepare, fluidFit } from 'fitbox';
import { FitText } from 'fitbox/react';

const fluid = fluidFit(prepare('Fitbox', 'Inter'), {
  minViewport: 320,
  maxViewport: 1440,
  minSize: 24,
  maxSize: 180,
});
// fluid.cssClamp === 'clamp(24px, calc(… + …vw), 180px)'

<FitText family="Inter" fluid={fluid}>Fitbox</FitText>
```

For wrapping text, `fluidFitMultiLine` probes the viewport range, finds breakpoints where line count changes, and emits a stylesheet of media-query-scoped clamps.

## SSR

```ts
// entry.server.ts
import { createCanvas } from '@napi-rs/canvas';
import { configureServerCanvas } from 'fitbox/server';

configureServerCanvas(() => createCanvas(1, 1), { cacheMax: 1024 });
```

```ts
// routes/home.ts — react-router loader
import { fitCached } from 'fitbox/server';

export async function loader() {
  return {
    title: fitCached('Hello', 'Inter', { width: 1200, maxLines: 1 }),
  };
}
```

```tsx
// routes/home.tsx
import { FitText } from 'fitbox/react';
import { useLoaderData } from 'react-router';

export default function Home() {
  const { title } = useLoaderData();
  return <FitText family="Inter" preset={title}>Hello</FitText>;
}
```

`fitCached` / `fluidFitCached` memoize in a bounded LRU so repeated calls (nav labels, common strings) don't re-measure.

## API

### `fitbox`

- `prepare(text, fontFamily, options?)` — build a 1px Pretext handle.
- `fit(handle, { width, height?, maxLines?, minSize?, maxSize?, lineHeight? })` — closed-form single-line or binary-search multi-line.
- `fluidFit(handle, { minViewport, maxViewport, widthFraction?, minSize?, maxSize? })` — single-line CSS clamp.
- `fluidFitMultiLine(handle, { …, maxLines, samples?, selector? })` — piecewise `@media` stylesheet for wrapping text.

### `fitbox/react`

- `useFitText<E>(text, options)` — returns `{ ref, style, result }`.
- `<FitText>` — element wrapper. Accepts `as`, `preset`, `fluid`.

### `fitbox/server`

- `configureServerCanvas(factory, options?)` — install canvas shim, configure cache.
- `fitCached(text, family, fitOpts, prepareOpts?)` — cached `prepare + fit`.
- `fluidFitCached(text, family, fluidOpts, prepareOpts?)` — cached `prepare + fluidFit`.
- `clearServerCache()`.

## Caveats

- Pretext uses `canvas.measureText()` as ground truth. On SSR you need `@napi-rs/canvas` or similar and `configureServerCanvas()` called once at startup.
- `fluidFitMultiLine` interpolates linearly within stable-line-count segments; wrapping shifts inside a segment cause minor imprecision. Increase `samples` to narrow.
- The server cache is an LRU by `JSON.stringify` of inputs — fine for curated strings, not suited for unbounded user content without the `cacheMax` cap.

## Acknowledgments

- [Rik Schennink](https://github.com/rikschennink) — Fitty, the canonical fit-text-to-box library and the shape of this problem.
- [Cheng Lou](https://github.com/chenglou) — Pretext, the reflow-free measurement primitive this is built on.

## License

MIT — darkroom.engineering
