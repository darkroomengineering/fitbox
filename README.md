# fitbox

Reflow-free text-to-box fitting for React, built on [`@chenglou/pretext`](https://github.com/chenglou/pretext).

---

## Why this exists

If you have ever used [Fitty](https://github.com/rikschennink/fitty) or written your own "shrink text to container" logic, you know the shape of it: pick a font-size, put the element in the DOM, read `getBoundingClientRect()`, compare to the container, adjust, read again. The loop terminates quickly — five to ten iterations — but every read forces a layout reflow. Drag a window with twenty fittable headings on the page and you are asking the browser's layout engine to recompute itself thousands of times a second.

Every library does it this way because, until recently, the browser was the only oracle that could tell you how text would lay out. That changed when [Cheng Lou](https://github.com/chenglou) released [Pretext](https://github.com/chenglou/pretext), a text measurement and layout library that uses `canvas.measureText()` — which does *not* reflow — as ground truth. With per-glyph widths cached, measuring a wrapped paragraph is microseconds of arithmetic.

fitbox is what a text-fitting library looks like when you build it on that primitive.

### The math

Once measurement stops touching layout, the algorithm collapses.

**Single-line fit is a closed form.** Text width scales linearly with font-size. Prepare the text once at `1px` and call its natural width `w₁`. For any container of width `W`:

```
fontSize = W / w₁
```

One division. No search. No DOM.

**Multi-line fit is a reflow-free binary search.** Line breaks are non-linear in `(fontSize, maxWidth)`, so we search — but there is a scaling invariant: `fontSize = s` at `maxWidth = W` wraps identically to `fontSize = 1` at `maxWidth = W / s`. So we prepare once at 1px and binary-search `s` by querying Pretext's `measureLineStats(handle, W / s)`. Ten iterations to pixel precision, still pure arithmetic.

**Static fluid CSS.** Because single-line fit is linear in viewport width, the entire responsive curve is expressible as `clamp(min, calc(a + b·vw), max)` — a string the browser interpolates for free, zero runtime JavaScript. Fitty cannot produce this; it cannot know the fit without measuring the DOM. fitbox computes the clamp at build or load time and ships it inline.

**SSR.** Pretext needs a canvas, not a DOM. Give it `@napi-rs/canvas` on the server, compute fits in a loader, serialize the result as a `preset`, hydrate with the correct font-size already rendered. No layout shift, ever.

### What fitbox is and isn't

| | Fitty | fitbox |
|---|---|---|
| Measurement | `getBoundingClientRect()` per probe | `canvas.measureText()`, cached |
| Single-line fit | Binary search over DOM | `W / w₁` |
| Multi-line fit | — | Reflow-free binary search |
| Fluid CSS | Hand-rolled clamp | Computed `clamp(…)` |
| SSR | — | Supported via canvas polyfill |
| Bundle | ~4KB min+gz | ~3KB core + ~3KB react adapter |

fitbox is narrower than Fitty in one way — it ships a React adapter, not a plain-DOM binding — and wider in several others. Reach for Fitty if you need plain DOM or are supporting very old browsers. Reach for hand-rolled CSS fluid-typography recipes if you are comfortable guessing at your text's natural width. Reach for fitbox when you want the fit to be exact, to work under SSR, or to disappear into a static CSS string after the first render.

### Beyond the DOM

Because measurement is reflow-free, nothing about the fit algorithm depends on the text ending up in an HTML element. `layoutFit` returns the per-line layout in a rendering-backend-agnostic shape:

```ts
import { prepare, layoutFit } from 'fitbox';

const handle = prepare('Hello world', 'Inter');
const { fontSize, lines } = layoutFit(handle, { width: 1024, maxLines: 2 });
// lines: Array<{ text: string; width: number; y: number }>
```

Those numbers feed directly into a WebGL/WebGPU text renderer (troika-three-text, drei's `<Text>`, a custom SDF shader), an offscreen Canvas, an SVG generator, a PDF pipeline — anywhere you want typography with correct fit and no DOM.

---

## Status

Not yet published to npm. To try it, install directly from GitHub:

```sh
bun add github:darkroomengineering/fitbox
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
- `layoutFit(handle, fitOpts)` — same as `fit`, plus `lines: Array<{ text, width, y }>` for non-DOM renderers (WebGL, WebGPU, Canvas, SVG).
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
