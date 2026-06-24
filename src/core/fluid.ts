import {
  clamp,
  DEFAULT_LINE_HEIGHT,
  DEFAULT_MAX_SIZE,
  DEFAULT_MIN_SIZE,
  type FitHandle,
  fit,
  round,
} from './fit.js';

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

export function fluidFit(target: FitHandle, opts: FluidFitOptions): FluidFitResult {
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

  const slope = (sMax - sMin) / (maxViewport - minViewport);
  const intercept = sMin - slope * minViewport;

  const preferred = `calc(${round(intercept)}px + ${round(slope * 100)}vw)`;
  const cssClamp = `clamp(${round(sMin)}px, ${preferred}, ${round(sMax)}px)`;

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

  type Probe = { vw: number; size: number; lineCount: number };
  const probes: Probe[] = [];
  for (let i = 0; i <= samples; i++) {
    const vw = minViewport + ((maxViewport - minViewport) * i) / samples;
    const r = fit(target, {
      width: vw * widthFraction,
      maxLines,
      lineHeight,
      minSize,
      maxSize,
    });
    probes.push({ vw, size: r.fontSize, lineCount: r.lineCount });
  }

  const segments: FluidFitSegment[] = [];
  for (let start = 0; start < probes.length; ) {
    const a = probes[start]!;
    let end = start + 1;
    while (end < probes.length && probes[end]!.lineCount === a.lineCount) end++;
    const b = probes[end - 1]!;
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
    start = end;
  }

  const rules = segments.map((seg, idx) => {
    if (idx === 0) {
      return `${selector} { font-size: ${seg.cssClamp} }`;
    }
    return `@media (min-width: ${round(seg.minViewport)}px) { ${selector} { font-size: ${seg.cssClamp} } }`;
  });

  return { segments, css: rules.join('\n') };
}
