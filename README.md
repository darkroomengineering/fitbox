# fitbox

Reflow-free text-to-box fitting for React, built on [`@chenglou/pretext`](https://github.com/chenglou/pretext).

A modern take on [Fitty](https://github.com/rikschennink/fitty). Where Fitty binary-searches font-size while measuring the DOM (one reflow per iteration, every resize), fitbox measures text via canvas once and solves the fit in closed form or with pure arithmetic.

## Why

| | Fitty | fitbox |
|---|---|---|
| Measurement | `getBoundingClientRect()` on every probe | `canvas.measureText()` once per (text, font) |
| Single-line fit | Binary search over DOM | Closed form: `width / naturalWidth` |
| Multi-line fit | Not supported | Binary search with `maxLines` / `height` bounds |
| Fluid CSS | Not supported | Emits `clamp(…)` for static responsive fits |
| SSR | Not possible (needs DOM) | Supported via server canvas polyfill |
| Bundle | ~4KB min+gz | ~3KB core + ~3KB react adapter |

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
// fluid.cssClamp === 'clamp(24px, calc(-… + …vw), 180px)'

<FitText family="Inter" fluid={fluid}>Fitbox</FitText>
```

For multi-line fluid (wrapping text), use `fluidFitMultiLine` — it probes the viewport range, finds the breakpoints where line count changes, and emits a stylesheet of media-query-scoped clamps.

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

- [Rik Schennink](https://github.com/rikschennink) — Fitty, the canonical "fit text to box" library.
- [Cheng Lou](https://github.com/chenglou) — Pretext, the reflow-free measurement primitive this is built on.

## License

MIT — darkroom.engineering
