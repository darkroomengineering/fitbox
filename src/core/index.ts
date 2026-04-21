import {
  measureLineStats,
  measureNaturalWidth,
  prepareWithSegments,
  type PreparedTextWithSegments,
} from '@chenglou/pretext';

export const DEFAULT_LINE_HEIGHT = 1.2;
const DEFAULT_MIN_SIZE = 1;
const DEFAULT_MAX_SIZE = 10_000;
const BINARY_SEARCH_EPSILON = 0.25;

export type FitHandle = {
  readonly pretext: PreparedTextWithSegments;
  readonly naturalWidth: number;
};

export type PrepareOptions = {
  whiteSpace?: 'normal' | 'pre-wrap';
  wordBreak?: 'normal' | 'keep-all';
};

export function prepare(
  text: string,
  fontFamily: string,
  options?: PrepareOptions,
): FitHandle {
  const pretext = prepareWithSegments(text, `1px ${fontFamily}`, options);
  return { pretext, naturalWidth: measureNaturalWidth(pretext) };
}

export type FitOptions = {
  width: number;
  height?: number;
  maxLines?: number;
  minSize?: number;
  maxSize?: number;
  lineHeight?: number;
};

export type FitResult = {
  fontSize: number;
  lineCount: number;
  height: number;
};

export function fit(target: FitHandle, opts: FitOptions): FitResult {
  const {
    width,
    height,
    maxLines,
    minSize = DEFAULT_MIN_SIZE,
    maxSize = DEFAULT_MAX_SIZE,
    lineHeight = DEFAULT_LINE_HEIGHT,
  } = opts;

  if (width <= 0) {
    return { fontSize: minSize, lineCount: 1, height: minSize * lineHeight };
  }

  // Single-line closed form: no wrapping or height constraints.
  if (maxLines === undefined && height === undefined) {
    const raw = width / Math.max(target.naturalWidth, Number.EPSILON);
    const fontSize = clamp(raw, minSize, maxSize);
    return { fontSize, lineCount: 1, height: fontSize * lineHeight };
  }

  // Scaling invariant: stats at fontSize s with box width
  //   equal stats at 1px with box (width / s).
  const probe = (s: number) => {
    const { lineCount } = measureLineStats(target.pretext, width / s);
    const withinLines = maxLines === undefined || lineCount <= maxLines;
    const withinHeight =
      height === undefined || lineCount * s * lineHeight <= height;
    return { ok: withinLines && withinHeight, lineCount };
  };

  const maxProbe = probe(maxSize);
  if (maxProbe.ok) {
    return {
      fontSize: maxSize,
      lineCount: maxProbe.lineCount,
      height: maxProbe.lineCount * maxSize * lineHeight,
    };
  }

  const minProbe = probe(minSize);
  let best = minSize;
  let bestLineCount = minProbe.lineCount;
  if (!minProbe.ok) {
    return { fontSize: minSize, lineCount: bestLineCount, height: minSize * lineHeight };
  }

  let lo = minSize;
  let hi = maxSize;
  while (hi - lo > BINARY_SEARCH_EPSILON) {
    const mid = (lo + hi) / 2;
    const p = probe(mid);
    if (p.ok) {
      best = mid;
      bestLineCount = p.lineCount;
      lo = mid;
    } else {
      hi = mid;
    }
  }

  return {
    fontSize: best,
    lineCount: bestLineCount,
    height: bestLineCount * best * lineHeight,
  };
}

export type FluidFitOptions = {
  minViewport: number;
  maxViewport: number;
  widthFraction?: number;
  minSize?: number;
  maxSize?: number;
};

export type FluidFitResult = {
  cssClamp: string;
  minSize: number;
  maxSize: number;
  slope: number;
  intercept: number;
};

export function fluidFit(
  target: FitHandle,
  opts: FluidFitOptions,
): FluidFitResult {
  const {
    minViewport,
    maxViewport,
    widthFraction = 1,
    minSize: floor = DEFAULT_MIN_SIZE,
    maxSize: ceil = DEFAULT_MAX_SIZE,
  } = opts;

  const natural = Math.max(target.naturalWidth, Number.EPSILON);
  const sMin = clamp((minViewport * widthFraction) / natural, floor, ceil);
  const sMax = clamp((maxViewport * widthFraction) / natural, floor, ceil);

  const span = Math.max(maxViewport - minViewport, Number.EPSILON);
  const slope = (sMax - sMin) / span;
  const intercept = sMin - slope * minViewport;

  const preferred = `calc(${round(intercept)}px + ${round(slope * 100)}vw)`;
  const [lo, hi] = sMin <= sMax ? [sMin, sMax] : [sMax, sMin];
  const cssClamp = `clamp(${round(lo)}px, ${preferred}, ${round(hi)}px)`;

  return { cssClamp, minSize: sMin, maxSize: sMax, slope, intercept };
}

export type FluidFitMultiLineOptions = FluidFitOptions & {
  maxLines: number;
  lineHeight?: number;
  samples?: number;
  selector?: string;
};

export type FluidFitSegment = {
  minViewport: number;
  maxViewport: number;
  minSize: number;
  maxSize: number;
  lineCount: number;
  cssClamp: string;
};

export type FluidFitMultiLineResult = {
  segments: FluidFitSegment[];
  css: string;
};

/**
 * Compute a piecewise-linear fluid fit when text wraps.
 *
 * Samples `samples+1` viewport widths, groups them into segments where
 * `lineCount` is stable, and emits a stylesheet with `@media` guards.
 * The first segment applies unconditionally; later segments override via
 * `(min-width: …)` so the cascade picks the right one at runtime.
 *
 * Imprecision: within a segment we interpolate linearly between endpoints,
 * but wrapping can shift between words at the same line count — slope is
 * approximate. Increase `samples` to narrow the error.
 */
export function fluidFitMultiLine(
  target: FitHandle,
  opts: FluidFitMultiLineOptions,
): FluidFitMultiLineResult {
  const {
    minViewport,
    maxViewport,
    widthFraction = 1,
    maxLines,
    lineHeight = DEFAULT_LINE_HEIGHT,
    samples = 32,
    selector = '.fitbox-fluid',
    minSize,
    maxSize,
  } = opts;

  const probes: { vw: number; size: number; lineCount: number }[] = [];
  for (let i = 0; i <= samples; i++) {
    const vw = minViewport + ((maxViewport - minViewport) * i) / samples;
    const fitOpts: FitOptions = {
      width: vw * widthFraction,
      maxLines,
      lineHeight,
    };
    if (minSize !== undefined) fitOpts.minSize = minSize;
    if (maxSize !== undefined) fitOpts.maxSize = maxSize;
    const r = fit(target, fitOpts);
    probes.push({ vw, size: r.fontSize, lineCount: r.lineCount });
  }

  const segments: FluidFitSegment[] = [];
  let start = 0;
  for (let i = 1; i <= probes.length; i++) {
    const head = probes[start];
    const curr = probes[i];
    const lastInRun = i === probes.length || (curr && head && curr.lineCount !== head.lineCount);
    if (!lastInRun) continue;
    const a = probes[start];
    const b = probes[i - 1];
    if (!a || !b) continue;
    const slope = b.vw === a.vw ? 0 : (b.size - a.size) / (b.vw - a.vw);
    const intercept = a.size - slope * a.vw;
    const lo = Math.min(a.size, b.size);
    const hi = Math.max(a.size, b.size);
    segments.push({
      minViewport: a.vw,
      maxViewport: b.vw,
      minSize: lo,
      maxSize: hi,
      lineCount: a.lineCount,
      cssClamp: `clamp(${round(lo)}px, calc(${round(intercept)}px + ${round(slope * 100)}vw), ${round(hi)}px)`,
    });
    start = i;
  }

  const rules = segments.map((seg, idx) => {
    if (idx === 0) {
      return `${selector} { font-size: ${seg.cssClamp} }`;
    }
    return `@media (min-width: ${round(seg.minViewport)}px) { ${selector} { font-size: ${seg.cssClamp} } }`;
  });

  return { segments, css: rules.join('\n') };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}
