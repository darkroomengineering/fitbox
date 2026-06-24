import {
  measureLineStats,
  measureNaturalWidth,
  type PreparedTextWithSegments,
  prepareWithSegments,
} from '@chenglou/pretext';

export const DEFAULT_LINE_HEIGHT = 1.2;
export const DEFAULT_MIN_SIZE = 1;
export const DEFAULT_MAX_SIZE = 10_000;
const BINARY_SEARCH_EPSILON = 0.25;

export type FitHandle = {
  readonly pretext: PreparedTextWithSegments;
  readonly naturalWidth: number;
};

export type PrepareOptions = {
  whiteSpace?: 'normal' | 'pre-wrap';
  wordBreak?: 'normal' | 'keep-all';
};

/**
 * Build a 1px Pretext handle for the given text.
 *
 * `font` accepts either a bare family (`'Inter'`, `'system-ui, sans-serif'`)
 * or a full canvas font shorthand (`'bold italic 16px Inter'`). In the
 * shorthand case the size is normalized to `1px` so the scaling invariant
 * used by `fit` and `layoutFit` still holds.
 */
export function prepare(text: string, font: string, options?: PrepareOptions): FitHandle {
  const pretext = prepareWithSegments(text, normalizeFontTo1px(font), options);
  return { pretext, naturalWidth: measureNaturalWidth(pretext) };
}

const FONT_SIZE_RE = /\b\d+(?:\.\d+)?\s*(?:px|pt|em|rem|%)(?:\s*\/\s*\S+)?/i;

function normalizeFontTo1px(font: string): string {
  return FONT_SIZE_RE.test(font) ? font.replace(FONT_SIZE_RE, '1px') : `1px ${font}`;
}

export type FitOptions = {
  /** Container width to fit the text into, in px. */
  width: number;
  /** Optional container height cap, in px. When set, the fit also shrinks to stay within this height. */
  height?: number;
  /** Cap on wrapped line count. Omit (with no `height`) for an unconstrained single-line fit. */
  maxLines?: number;
  /** Lower bound on the resulting font-size, in **px**. Default 1. */
  minSize?: number;
  /** Upper bound on the resulting font-size, in **px** (e.g. `maxSize: 48` → never larger than 48px). Default 10000. */
  maxSize?: number;
  /** Line-height as a unitless multiplier, like CSS `line-height: 1.2` — not px. Default 1.2. */
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
    const withinHeight = height === undefined || lineCount * s * lineHeight <= height;
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

/** Shared numeric helpers — internal to core, not part of the public API. */
export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}
