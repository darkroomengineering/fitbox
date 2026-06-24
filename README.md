# fitbox

Reflow-free text-to-box fitting for React, built on [`@chenglou/pretext`](https://github.com/chenglou/pretext).

---

## Features

- **Reflow-free measurement** — uses canvas.measureText(), never getBoundingClientRect(), so it never thrashes layout
- **Closed-form single line** — single-line fit is fontSize = W / w1, with no DOM search
- **Reflow-free multi-line** — multi-line fit is a binary search to pixel precision, still pure arithmetic
- **Static fluid CSS** — emits a clamp() so the responsive curve runs with zero runtime JS
- **SSR-ready** — computes on a server canvas polyfill and hydrates with no layout shift
- **Backend-agnostic** — the layout feeds WebGL/WebGPU, Canvas, SVG, or PDF, not just the DOM
- **Tiny** — around 1.3KB core and 1.6KB for the React adapter, min+gz

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
| Bundle | ~4KB min+gz | ~1.3KB core / ~1.6KB react / ~1.7KB server (min+gz, each entry standalone) |

fitbox is narrower than Fitty in one way — it ships a React adapter, not a plain-DOM binding — and wider in several others. Reach for Fitty if you need plain DOM or are supporting very old browsers. Reach for hand-rolled CSS fluid-typography recipes if you are comfortable guessing at your text's natural width. Reach for fitbox when you want the fit to be exact, to work under SSR, or to disappear into a static CSS string after the first render.

### Beyond the DOM

Because measurement is reflow-free, nothing about the fit algorithm depends on the text ending up in an HTML element. `layoutFit` returns the per-line layout in a rendering-backend-agnostic shape:

```ts
import { prepare, layoutFit } from '@darkroomengineering/fitbox';

const handle = prepare('Hello world', 'Inter');
const { fontSize, lines } = layoutFit(handle, { width: 1024, maxLines: 2 });
// lines: Array<{ text: string; width: number; y: number }>
```

Those numbers feed directly into a WebGL/WebGPU text renderer (troika-three-text, drei's `<Text>`, a custom SDF shader), an offscreen Canvas, an SVG generator, a PDF pipeline — anywhere you want typography with correct fit and no DOM.

---

## Install

```sh
bun add @darkroomengineering/fitbox
```

## Reach for CSS first, JS only when you must

A common first reaction is "sizing text with JavaScript isn't ideal — can't it be CSS?" For the most common case, **it is CSS**. fitbox computes the fit **once** (at build or load time) and emits a static `clamp()` that the browser interpolates for free — no `ResizeObserver`, no per-frame JS, no layout shift:

```tsx
import { prepare, fluidFit } from '@darkroomengineering/fitbox';
import { FitText } from '@darkroomengineering/fitbox/react';

// computed once; ships as a static string
const fluid = fluidFit(prepare('Headline', 'Inter'), { minViewport: 320, maxViewport: 1440 });

<FitText fluid={fluid}>Headline</FitText>
// → <div style="font-size: clamp(…)"> — zero runtime JS
```

JavaScript measurement only earns its place when a static curve *can't* know the answer ahead of time — an exact per-element fit, or text that changes at runtime. Pick by what your text is:

| Your text is… | Use | Runtime cost |
|---|---|---|
| A responsive heading, sized by viewport | `fluidFit` + `<FitText fluid>` | **zero JS** — static `clamp()` |
| Wrapping, sized by viewport | `fluidFitMultiLine` | **zero JS** — `@media` clamps |
| An exact fit to a specific container, or dynamic/user text | `useFit` / `<FitText>` | measures on resize (still reflow-free) |
| SSR, no layout shift | `fitCached` + `preset` | server-computed, hydrates static |

Units, everywhere: `minSize` / `maxSize` are **px** (`maxSize: 48` means never larger than 48px), viewports are px, and `lineHeight` is a unitless multiplier like CSS — never px.

## `useFit` — drop a ref on any element

```tsx
import { useFit } from '@darkroomengineering/fitbox/react';

<h1 ref={useFit()}>Hello</h1>
<p ref={useFit({ maxLines: 3, maxSize: 48 })}>{text}</p>
// maxSize/minSize are px → here the text never grows past 48px
```

That's the whole API for the common case. The hook reads `textContent` and the element's computed `font-family`/`font-weight`/`font-style`, runs `prepare` once, then mutates `element.style.fontSize` directly — no React re-render per resize frame, no `style` prop to merge.

- A `ResizeObserver` refits on container resize.
- A `MutationObserver` refits when the text changes (so `<p ref={useFit()}>{dynamic}</p>` works).
- `document.fonts.ready` gates first measurement.
- Requires React 19+ (uses the callback-ref cleanup pattern).

## `<FitText>` — component sugar

For the cases where a component wrapper is tidier:

```tsx
import { FitText } from '@darkroomengineering/fitbox/react';

<FitText maxLines={3} as="h1">
  Typography that actually fits its container.
</FitText>
```

Internally uses `useFit`. Also accepts `fluid={…}` for static-clamp CSS and `preset={…}` for SSR-shipped initial sizes.

## `useFitText` — explicit text + React-styled

Escape hatch when you want React to own the styling (CSS-in-JS composition, or you need the full `FitResult` for downstream logic):

```tsx
import { useFitText } from '@darkroomengineering/fitbox/react';

const { ref, style, result } = useFitText<HTMLHeadingElement>(text, {
  maxLines: 2,
  maxSize: 120,
});
return <h1 ref={ref} style={style}>{text}</h1>;
```

## Fluid CSS — no JS at runtime

For responsive single-line headings, emit a static `clamp()` and let the browser interpolate:

```tsx
import { prepare, fluidFit } from '@darkroomengineering/fitbox';
import { FitText } from '@darkroomengineering/fitbox/react';

const fluid = fluidFit(prepare('Fitbox', 'Inter'), {
  minViewport: 320,
  maxViewport: 1440,
  minSize: 24,
  maxSize: 180,
});
// fluid.cssClamp === 'clamp(120.755px, calc(103.827px + 5.29vw), 180px)'
// (bounds are derived: sMin/sMax = clamp(viewport / naturalWidth, minSize, maxSize),
//  so for short text the floor often lands above your minSize — here 'Fitbox' is wide
//  enough at 320px viewport that the lower bound is 120.755px, not 24px.)

<FitText fluid={fluid}>Fitbox</FitText>
```

For wrapping text, `fluidFitMultiLine` probes the viewport range, finds breakpoints where line count changes, and emits a stylesheet of media-query-scoped clamps.

## SSR

```ts
// entry.server.ts
import { createCanvas } from '@napi-rs/canvas';
import { configureServerCanvas } from '@darkroomengineering/fitbox/server';

configureServerCanvas(() => createCanvas(1, 1), { cacheMax: 1024 });
```

```ts
// routes/home.ts — react-router loader
import { fitCached } from '@darkroomengineering/fitbox/server';

export async function loader() {
  return {
    title: fitCached('Hello', 'Inter', { width: 1200, maxLines: 1 }),
  };
}
```

```tsx
// routes/home.tsx
import { FitText } from '@darkroomengineering/fitbox/react';
import { useLoaderData } from 'react-router';

export default function Home() {
  const { title } = useLoaderData();
  return <FitText preset={title}>Hello</FitText>;
}
```

`fitCached` / `fluidFitCached` / `fluidFitMultiLineCached` memoize in bounded LRUs so repeated calls (nav labels, common strings) don't re-measure. The multi-line variant is the most expensive call — it runs ~33 binary-search fits per invocation — so caching matters most there.

## API

### `@darkroomengineering/fitbox`

- `prepare(text, fontFamily, options?)` — build a 1px Pretext handle.
- `fit(handle, { width, height?, maxLines?, minSize?, maxSize?, lineHeight? })` — closed-form single-line or binary-search multi-line. `width`/`height`/`minSize`/`maxSize` are px; `lineHeight` is a unitless multiplier.
- `layoutFit(handle, fitOpts)` — same as `fit`, plus `lines: Array<{ text, width, y }>` for non-DOM renderers (WebGL, WebGPU, Canvas, SVG).
- `fluidFit(handle, { minViewport, maxViewport, widthFraction?, minSize?, maxSize? })` — single-line CSS clamp.
- `fluidFitMultiLine(handle, { …, maxLines, samples?, selector? })` — piecewise `@media` stylesheet for wrapping text.

### `@darkroomengineering/fitbox/react`

- `useFit(options?)` — callback ref. Fits `textContent` to container, mutates `style.fontSize` directly. The primary one-liner.
- `useFitText<E>(text, options)` — returns `{ ref, style, result }`. Escape hatch when you want React to own styling or need the raw `FitResult`.
- `<FitText>` — element wrapper. Accepts `as`, `preset`, `fluid`.

### `@darkroomengineering/fitbox/server`

- `configureServerCanvas(factory, options?)` — install canvas shim, configure cache.
- `fitCached(text, family, fitOpts, prepareOpts?)` — cached `prepare + fit`.
- `fluidFitCached(text, family, fluidOpts, prepareOpts?)` — cached `prepare + fluidFit`.
- `fluidFitMultiLineCached(text, family, fluidOpts, prepareOpts?)` — cached `prepare + fluidFitMultiLine`.
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
