import { layoutWithLines } from '@chenglou/pretext';
import {
  DEFAULT_LINE_HEIGHT,
  type FitHandle,
  type FitOptions,
  type FitResult,
  fit,
} from './fit.js';

export type LayoutFitLine = {
  text: string;
  /** Width of this line in px at the fitted fontSize. */
  width: number;
  /** Top offset of this line from the text block's origin, in px. */
  y: number;
};

export type LayoutFitResult = FitResult & {
  /** Per-line text, width, and y-offset — API-agnostic output suitable for
   *  WebGL/WebGPU/Canvas/SVG/any custom renderer. */
  lines: LayoutFitLine[];
};

/**
 * Like `fit`, but also returns the per-line layout at the fitted fontSize.
 *
 * The output is rendering-backend-agnostic: `{ text, width, y }` per line,
 * with y measured from the block's top edge and width in pixels at the
 * fitted size. Feed directly into drei's `<Text>`, troika-three-text, a
 * custom SDF shader, Canvas, SVG — whatever you're drawing with.
 *
 * Isolated in its own module on purpose: it is the only core function that
 * pulls Pretext's `layoutWithLines`, so the React adapter (which never calls
 * it) tree-shakes both this function and that import out of its bundle.
 */
export function layoutFit(target: FitHandle, opts: FitOptions): LayoutFitResult {
  const f = fit(target, opts);
  const { lineHeight = DEFAULT_LINE_HEIGHT, width } = opts;
  if (width <= 0) return { ...f, lines: [] };
  // Scaling invariant: layout at 1px with maxWidth (width / fontSize)
  // produces the same wrapping as layout at fontSize with maxWidth (width).
  const raw = layoutWithLines(target.pretext, width / f.fontSize, lineHeight);
  const pitch = f.fontSize * lineHeight;
  const lines = raw.lines.map((line, i) => ({
    text: line.text,
    width: line.width * f.fontSize,
    y: i * pitch,
  }));
  return { ...f, lines };
}
